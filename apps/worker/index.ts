import cors from "cors";
import express from "express";
import { prismaClient } from "@bolt/db/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { systemPrompt } from "./systemPrompt";
import { ArtifactProcessor } from "./parser";
import {
  flushPendingNpmInstall,
  logProjectReady,
  onFileUpdate,
  onShellCommand,
  resetWorkerProject,
  writeWorkspaceFile,
} from "./os";
import { getFileSystemTree, getLatestCodebaseState } from "./workspaceReader";
import {
  ensureExpoSession,
  getExpoSession,
  stopExpoSession,
} from "./expoSession";

const app = express();
app.use(cors());
app.use(express.json());

// Retry configuration for transient AI API outages (503 / 429).
const MAX_AI_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 2000;
// Cap the exponential backoff so a long spike doesn't blow up to minutes.
const MAX_RETRY_DELAY_MS = 30_000;

// Ordered model fallback chain. When the primary is overloaded (503) past its
// retries, we try the next one. Override with GEMINI_MODELS (comma-separated).
// A model that returns 404 ("not available to this key") is skipped, so listing
// an unavailable fallback is harmless.
const AI_MODELS = (process.env.GEMINI_MODELS ?? "gemini-3.5-flash,gemini-3.5-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The Google Generative AI SDK surfaces the HTTP status either as a numeric
// `status` field or embedded in the message (e.g. "[503 Service Unavailable]").
function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") {
      return status;
    }

    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      const match = message.match(/\[(\d{3})\b/);
      if (match) {
        return Number(match[1]);
      }
    }
  }

  return undefined;
}

function isRetryableError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 503 || status === 429;
}

// Runs one generation attempt, trying each model in AI_MODELS in order.
// Within a model: retry 503/429 with capped exponential backoff + jitter.
// A 404 ("model not available to this key") skips to the next model.
// A genuine error (400/401/…) throws immediately.
async function generateWithResilience(
  client: GoogleGenerativeAI,
  systemInstruction: string,
  buildRun: (
    model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  ) => () => Promise<string>,
): Promise<string> {
  let lastError: unknown;
  let lastRetryableError: unknown; // prefer surfacing a 503/429 over a 404

  for (const modelName of AI_MODELS) {
    const model = client.getGenerativeModel({ model: modelName, systemInstruction });
    const run = buildRun(model);

    for (let attempt = 0; ; attempt++) {
      try {
        return await run();
      } catch (error) {
        lastError = error;
        const status = getErrorStatus(error);

        // Genuine, non-transient failure — stop everything.
        if (status !== 404 && !isRetryableError(error)) throw error;

        if (isRetryableError(error)) lastRetryableError = error;

        // Model unavailable for this key → try the next model right away.
        if (status === 404) {
          console.warn(`Model ${modelName} unavailable (404) — trying next model.`);
          break;
        }

        // Transient (503/429): back off and retry until attempts run out.
        if (attempt >= MAX_AI_RETRIES) {
          console.warn(
            `Model ${modelName} still overloaded after ${MAX_AI_RETRIES} retries — trying next model.`,
          );
          break;
        }
        const delayMs =
          Math.min(MAX_RETRY_DELAY_MS, INITIAL_RETRY_DELAY_MS * 2 ** attempt) +
          Math.floor(Math.random() * 500);
        console.warn(
          `AI request to ${modelName} failed (retryable, attempt ${
            attempt + 1
          }/${MAX_AI_RETRIES}). Retrying in ${delayMs}ms.`,
        );
        await sleep(delayMs);
      }
    }
  }

  throw lastRetryableError ?? lastError;
}

app.post("/prompt", async (req, res) => {
  const prompt = String(req.body.prompt ?? "").trim();
  const projectId = String(req.body.projectId ?? "").trim();
  const shouldSavePrompt = req.body.savePrompt !== false;

  if (!prompt || !projectId) {
    res.status(400).json({ error: "Prompt and projectId are required" });
    return;
  }

  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const systemPromptCount = await prismaClient.prompt.count({
    where: {
      projectId,
      type: "SYSTEM",
    },
  });
  const shouldResetProject =
    req.body.resetProject === true || systemPromptCount === 0;

  if (shouldSavePrompt) {
    await prismaClient.prompt.create({
      data: {
        content: prompt,
        projectId,
        type: "USER",
      },
    });
  }

  let allPrompts = await prismaClient.prompt.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!shouldSavePrompt && allPrompts.length === 0) {
    allPrompts = [
      {
        id: "pending-user-prompt",
        content: prompt,
        projectId,
        type: "USER",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  if (shouldResetProject) {
    await resetWorkerProject(projectId);
    // The old workspace (and any Expo tunnel bound to it) is gone; tear the
    // session down so the next phone-preview request starts fresh.
    stopExpoSession();
  }

  const currentCodebase = shouldResetProject
    ? ""
    : await getLatestCodebaseState();

  const systemInstruction = systemPrompt("REACT_NATIVE", currentCodebase);

  // Factory: given a model, returns one full streamed generation attempt.
  // Re-run from scratch on retry with a fresh parser so partially-streamed
  // state from a failed attempt is discarded; files are written by path and
  // simply overwritten on the successful run.
  const buildRun =
    (model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>) =>
    async () => {
      const artifactProcessor = new ArtifactProcessor(
        "",
        (filePath, fileContent) =>
          onFileUpdate(filePath, fileContent, projectId),
        (shellCommand) => onShellCommand(shellCommand, projectId),
      );
      let artifact = "";

      const response = await model.generateContentStream({
        contents: allPrompts.map((p: any) => ({
          role: p.type === "USER" ? "user" : "model",
          parts: [{ text: p.content }],
        })),
      });
      for await (const chunk of response.stream) {
        const text = chunk.text();

        artifactProcessor.append(text);
        await artifactProcessor.parse();
        artifact += text;
      }
      await artifactProcessor.parse();
      return artifact;
    };

  try {
    const artifact = await generateWithResilience(
      client,
      systemInstruction,
      buildRun,
    );
    console.log("Done!");
    await flushPendingNpmInstall(projectId);
    await logProjectReady(projectId);

    await prismaClient.prompt.create({
      data: {
        content: artifact,
        projectId,
        type: "SYSTEM",
      },
    });

    res.json({ response: artifact });
  } catch (error) {
    // All retries exhausted (or a non-retryable failure). Emit a structured
    // error payload over the existing connection so the frontend stops waiting
    // instead of hanging, then let this request unwind cleanly — the process
    // stays up and ready to serve the next job.
    console.error(`Generation failed: ${error}`);

    if (!res.headersSent) {
      const overloaded = isRetryableError(error);
      res.status(overloaded ? 503 : 500).json({
        type: "error",
        message: overloaded
          ? "AI API is currently overloaded. Please try again in a few minutes."
          : "AI generation failed. Please try again.",
      });
    }
  }
});

// Serves the current workspace as a WebContainer FileSystemTree so the frontend
// can mount and run the generated app in the browser sandbox.
app.get("/files", async (_req, res) => {
  try {
    const files = await getFileSystemTree();
    res.json({ files });
  } catch (error) {
    console.error("Failed to build file system tree", error);
    res.status(500).json({ error: "Failed to read workspace files" });
  }
});

app.put("/files", async (req, res) => {
  const filePath = String(req.body.path ?? "").trim();
  const content = String(req.body.content ?? "");

  if (!filePath) {
    res.status(400).json({ error: "path is required" });
    return;
  }

  try {
    const result = await writeWorkspaceFile(filePath, content);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("Failed to write workspace file", error);
    res.status(500).json({ error: "Failed to write workspace file" });
  }
});

// Starts (or reuses) a server-side `expo start --tunnel` session for the given
// project so the app can be opened natively in Expo Go on any phone. Returns
// immediately with the current session status; the client polls GET below.
app.post("/expo/session", async (req, res) => {
  const projectId = String(req.body.projectId ?? "").trim();
  if (!projectId) {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  try {
    await ensureExpoSession(projectId, { restart: req.body.restart === true });
    const { status, url, error } = getExpoSession();
    res.json({ status, url, error });
  } catch (error) {
    console.error("Failed to start Expo tunnel session", error);
    res.status(500).json({ error: "Failed to start Expo tunnel session" });
  }
});

// Current status of the Expo tunnel session (poll this until `status` is
// "ready" and `url` is the exp:// link to render as a QR code).
app.get("/expo/session", (_req, res) => {
  const { status, url, error, logs } = getExpoSession();
  res.json({ status, url, error, logs });
});

app.listen(9091, () => {
  console.log("Server is running on port 9091");
});
