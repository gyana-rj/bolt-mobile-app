import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { BASE_WORKER_DIR } from "./os";

const ignoredDirs = [
  ".expo",
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
];

const ignoredFiles = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
];

const textFiles = [
  "",
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".md",
  ".scss",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
];

const maxFileSize = 30_000;
const maxPromptSize = 220_000;

function canRead(fileName: string) {
  return (
    !ignoredFiles.includes(fileName) &&
    textFiles.includes(extname(fileName).toLowerCase())
  );
}

async function collectFiles(currentDir: string): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.includes(entry.name)) {
        files.push(...(await collectFiles(join(currentDir, entry.name))));
      }

      continue;
    }

    if (entry.isFile() && canRead(entry.name)) {
      files.push(join(currentDir, entry.name));
    }
  }

  return files;
}

export async function getLatestCodebaseState(): Promise<string> {
  try {
    await stat(BASE_WORKER_DIR);
  } catch {
    return "";
  }

  try {
    const files = await collectFiles(BASE_WORKER_DIR);
    let context = "";

    for (const filePath of files) {
      if (context.length >= maxPromptSize) {
        context +=
          "\n--- Workspace context truncated because it is large ---\n";
        break;
      }

      const relativePath = relative(BASE_WORKER_DIR, filePath);
      let content = await readFile(filePath, "utf-8");

      if (content.length > maxFileSize) {
        content =
          content.slice(0, maxFileSize) +
          "\n\n/* File truncated because it is large. */\n";
      }

      const nextBlock = `<file path="${relativePath}">\n${content}\n</file>\n`;
      context += nextBlock;
    }

    return context.trim();
  } catch (error) {
    console.error("Error building context from workspace: ", error);
    return "";
  }
}
