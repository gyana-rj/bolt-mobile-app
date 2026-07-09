import cors from "cors";
import express from "express";
import { prismaClient } from "@bolt/db/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { systemPrompt } from "./systemPrompt";
import { ArtifactProcessor } from "./parser";

const app = express();
app.use(cors());
app.use(express.json());


app.post("/prompt", async(req, res) => {
    const { prompt, projectId } = req.body;
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const promptDb = await prismaClient.prompt.create({
        data: {
            content: prompt,
            projectId,
            type: "USER",
        },
    });

    const allPrompts = await prismaClient.prompt.findMany({
        where: {
            projectId
        },
        orderBy: {
            createdAt: "asc"
        }
    })
    const onFileUpdate = (filePath: string, content: string) => {};
    const onShellCommand = (cmd: string) => {};

    let artifactProcessor = new ArtifactProcessor("", onFileUpdate, onShellCommand);
    let artifact = "";
    
    const model = client.getGenerativeModel({ 
        model: "gemini-1.5-pro", 
        systemInstruction: systemPrompt("REACT_NATIVE")
    });
    try{
        const response = await model.generateContentStream({
        contents: allPrompts.map((p: any) => ({
            role: p.type === "USER" ? "user" : "model",
            parts: [{ text: p.content }]
        })),

    })
    for await(const chunk of response.stream){
        const text = chunk.text();

        artifactProcessor.append(text);
        artifactProcessor.parse();
        artifact += text;
    }
    console.log("Done!");

    await prismaClient.prompt.create({
        data: {
            content: artifact,
            projectId,
            type: "SYSTEM"
        }
    });
    
    res.json({response: artifact})
}catch(error){
    console.log(`error: ${error}`);
    res.status(500).json({error: "Generation failed"});
}
    
});

app.listen(9091, () => {
    console.log("Server is running on port 9091");
})