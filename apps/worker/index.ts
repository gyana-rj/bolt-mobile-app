import cors from "cors";
import express from "express";
import { prismaClient } from "@bolt/db/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { systemPrompt } from "./systemPrompt";
import { ArtifactProcessor } from "./parser";
import { onFileUpdate, onShellCommand, resetWorkerProject } from "./os";
import { getLatestCodebaseState } from "./workspaceReader";

const app = express();
app.use(cors());
app.use(express.json());

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
  }

  const currentCodebase = shouldResetProject
    ? ""
    : await getLatestCodebaseState();

  let artifactProcessor = new ArtifactProcessor(
    "",
    (filePath, fileContent) => onFileUpdate(filePath, fileContent, projectId),
    (shellCommand) => onShellCommand(shellCommand, projectId),
  );
  let artifact = "";

  const model = client.getGenerativeModel({
    model: "gemini-3.5-flash",
    systemInstruction: systemPrompt("REACT_NATIVE", currentCodebase),
  });
  try {
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
    console.log("Done!");

    await prismaClient.prompt.create({
      data: {
        content: artifact,
        projectId,
        type: "SYSTEM",
      },
    });

    res.json({ response: artifact });
  } catch (error) {
    console.log(`error: ${error}`);
    res.status(500).json({ error: "Generation failed" });
  }
});

app.listen(9091, () => {
  console.log("Server is running on port 9091");
});
