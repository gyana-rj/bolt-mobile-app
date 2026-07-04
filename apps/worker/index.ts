import cors from "cors";
import express from "express";
import { prismaClient } from "@bolt/db/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);