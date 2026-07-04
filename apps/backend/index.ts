import { prismaClient } from "@bolt/db/client";
import express from "express";
import cors from "cors"
import { authMiddleware } from "./middleware";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/project", authMiddleware, async(req, res) => {
    const prompt = String(req.body.prompt ?? "").trim();

    if (!prompt) {
        res.status(400).json({ message: "Prompt is required" });
        return;
    }

    const userId = req.userId!;
    // add logic to get a useful name for the project from the prompt
    const description = prompt.split("\n")[0];
    const project = await prismaClient.project.create({
        data: {
            description,
            userId
        }
    });
    res.json({ projectId: project.id });
})

app.get("/projects", authMiddleware, async(req, res) => {
    const userId = req.userId!;
    const project = await prismaClient.project.findFirst({
        where:{
            userId, 
        }
    });
    res.json(project)
})

app.listen(8080, () => {
    console.log("Server is running on port 8080");
});
