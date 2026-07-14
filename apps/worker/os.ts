import { prismaClient } from "@bolt/db/client";
import { mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

export const BASE_WORKER_DIR = process.env.BASE_WORK_DIR || "/tmp/bolty-worker";

await mkdir(BASE_WORKER_DIR, { recursive: true });

function getWorkerPath(filePath: string) {
  const normalizedPath = normalize(filePath)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");

  return join(BASE_WORKER_DIR, normalizedPath);
}

export function cleanFileContent(fileContent: string) {
  return fileContent
    .replace(/<\/?boltArtifact\b[^>]*>\s*/gi, "")
    .replace(/<\/?boltAction\b[^>]*>\s*/gi, "")
    .trim()
    .replace(/^```[a-zA-Z0-9_-]*\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();
}

async function logProjectAction(projectId: string, content: string) {
  try {
    await prismaClient.action.create({
      data: {
        projectId,
        content,
      },
    });
  } catch (error) {
    console.error(`Failed to log project action: ${content}`);
    console.error(error);
  }
}

export async function resetWorkerProject(projectId: string) {
  await mkdir(BASE_WORKER_DIR, { recursive: true });

  const entries = await readdir(BASE_WORKER_DIR);

  await Promise.all(
    entries.map((entry) =>
      rm(join(BASE_WORKER_DIR, entry), { recursive: true, force: true }),
    ),
  );

  try {
    await prismaClient.action.deleteMany({
      where: {
        projectId,
      },
    });
  } catch (error) {
    console.error("Failed to clear project actions");
    console.error(error);
  }

  await logProjectAction(projectId, "Started clean project workspace");
}

export async function onFileUpdate(
  filePath: string,
  fileContent: string,
  projectId: string,
) {
  console.log(`Writing file: ${filePath}`);
  const cleanedContent = cleanFileContent(fileContent);
  const targetPath = getWorkerPath(filePath);

  await mkdir(dirname(targetPath), { recursive: true });
  await Bun.write(targetPath, cleanedContent);

  await logProjectAction(projectId, `Updated file ${filePath}`);
}

export async function onShellCommand(shellCommand: string, projectId: string) {
  const commands = shellCommand.split("&&");
  for (const command of commands) {
    const trimmedCommand = command.trim();

    if (!trimmedCommand) {
      continue;
    }

    console.log(`Running command: ${trimmedCommand}`);
    const result = Bun.spawnSync({
      cmd: trimmedCommand.split(/\s+/),
      cwd: BASE_WORKER_DIR,
    });
    console.log(result.stdout.toString());
    console.log(result.stderr.toString());

    await logProjectAction(projectId, `Ran command ${trimmedCommand}`);
  }
}
