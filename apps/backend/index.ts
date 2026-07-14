import { prismaClient } from "@bolt/db/client";
import express from "express";
import cors from "cors";
import { authMiddleware } from "./middleware";

const app = express();
app.use(express.json());
app.use(cors());

function getProjectDescription(prompt: string) {
  const firstLine = prompt.split("\n")[0]?.trim() || "Untitled project";
  const cleanedDescription = firstLine
    .replace(/^(create|build|make|generate|design)\s+(a|an|the)?\s*/i, "")
    .replace(/\s+(using|with|in)\s+.*$/i, "")
    .trim();

  return cleanedDescription || firstLine;
}

app.post("/project", authMiddleware, async (req, res) => {
  const prompt = String(req.body.prompt ?? "").trim();

  if (!prompt) {
    res.status(400).json({ message: "Prompt is required" });
    return;
  }

  const userId = req.userId!;
  const description = getProjectDescription(prompt);
  const project = await prismaClient.project.create({
    data: {
      description,
      userId,
      prompt: {
        create: {
          content: prompt,
          type: "USER",
        },
      },
    },
  });
  res.json({ projectId: project.id });
});

app.get("/projects", authMiddleware, async (req, res) => {
  const userId = req.userId!;
  const projects = await prismaClient.project.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json({ projects });
});

app.get("/prompts/:projectId", authMiddleware, async (req, res) => {
  const userId = req.userId!;
  const projectId = String(req.params.projectId || "");

  const project = await prismaClient.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }

  const prompts = await prismaClient.prompt.findMany({
    where: { projectId },
    orderBy: {
      createdAt: "asc",
    },
  });

  res.json({
    prompts,
  });
});

app.get("/actions/:projectId", authMiddleware, async (req, res) => {
  const userId = req.userId!;
  const projectId = String(req.params.projectId || "");

  const project = await prismaClient.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }

  const actions = await prismaClient.action.findMany({
    where: { projectId },
    orderBy: {
      createdAt: "asc",
    },
  });
  res.json({ actions });
});

app.listen(9090, () => {
  console.log("Server is running on port 9090");
});
