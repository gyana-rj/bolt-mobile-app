import { prismaClient } from "@bolt/db/client";
import { access, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

export const BASE_WORKER_DIR = process.env.BASE_WORK_DIR || "/tmp/bolty-worker";

await mkdir(BASE_WORKER_DIR, { recursive: true });

let shellCommandQueue = Promise.resolve();
let pendingNpmInstall = false;

const REQUIRED_EXPO_DEPENDENCIES: Record<string, string> = {
  "expo-status-bar": "~1.12.1",
  "expo-linking": "~6.3.1",
  "expo-constants": "~16.0.2",
  "react-native-safe-area-context": "4.10.5",
  "react-native-screens": "3.31.1",
  "react-native-gesture-handler": "~2.16.1",
  "react-native-reanimated": "~3.10.1",
};

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

export async function logProjectReady(projectId: string) {
  await logProjectAction(projectId, "You can run your app with npm run web");
}

function isNpmInstallCommand(command: string) {
  return /^npm\s+(install|i)(\s|$)/i.test(command);
}

function isDevServerCommand(command: string) {
  return /^(npm\s+run\s+(web|start|ios|android)|npx\s+expo\s+start|expo\s+start)\b/i.test(
    command,
  );
}

function normalizeShellCommand(command: string) {
  const normalizedCommand = command.replace(/\s+/g, " ").trim();

  if (isNpmInstallCommand(normalizedCommand)) {
    const baseCommand = normalizedCommand.replace(/\s+--yes\b/gi, "");
    const requiredFlags = [
      "--legacy-peer-deps",
      "--no-audit",
      "--no-fund",
      "--prefer-offline",
    ].filter((flag) => !baseCommand.includes(flag));

    return [baseCommand, ...requiredFlags].join(" ");
  }

  return normalizedCommand;
}

export function ensureExpoPackageJson(fileContent: string) {
  try {
    const pkg = JSON.parse(fileContent) as {
      main?: string;
      dependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };

    pkg.dependencies ??= {};
    pkg.scripts ??= {};

    for (const [name, version] of Object.entries(REQUIRED_EXPO_DEPENDENCIES)) {
      if (!pkg.dependencies[name]) {
        pkg.dependencies[name] = version;
      }
    }

    if (pkg.dependencies["expo-router"]) {
      // Without this, Expo falls back to AppEntry.js and looks for ../../App.
      pkg.main = "expo-router/entry";
    }

    if (pkg.dependencies.expo || pkg.dependencies["expo-router"]) {
      pkg.scripts.web ??= "npx expo start --web";
      pkg.scripts.start ??= "npx expo start";
    }

    return `${JSON.stringify(pkg, null, 2)}\n`;
  } catch {
    return fileContent;
  }
}

export function sanitizeExpoAppJson(fileContent: string) {
  try {
    const config = JSON.parse(fileContent) as {
      expo?: Record<string, any>;
      [key: string]: any;
    };
    const expo = config.expo ?? config;

    delete expo.icon;

    if (expo.splash && typeof expo.splash === "object") {
      delete expo.splash.image;
    }

    if (expo.android?.adaptiveIcon) {
      delete expo.android.adaptiveIcon.foregroundImage;
    }

    if (expo.web && typeof expo.web === "object") {
      delete expo.web.favicon;
      expo.web.bundler ??= "metro";
    }

    return `${JSON.stringify(config, null, 2)}\n`;
  } catch {
    return fileContent;
  }
}

function prepareFileContent(filePath: string, fileContent: string) {
  const cleanedContent = cleanFileContent(fileContent);
  const baseName = filePath.replace(/\\/g, "/").split("/").pop() ?? filePath;

  if (baseName === "package.json") {
    return ensureExpoPackageJson(cleanedContent);
  }

  if (baseName === "app.json") {
    return sanitizeExpoAppJson(cleanedContent);
  }

  return cleanedContent;
}

export async function resetWorkerProject(projectId: string) {
  pendingNpmInstall = false;
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
  const preparedContent = prepareFileContent(filePath, fileContent);
  const targetPath = getWorkerPath(filePath);
  const baseName = filePath.replace(/\\/g, "/").split("/").pop() ?? filePath;

  await mkdir(dirname(targetPath), { recursive: true });
  await Bun.write(targetPath, preparedContent);

  if (baseName === "package.json") {
    pendingNpmInstall = true;
  }

  await logProjectAction(projectId, `Updated file ${filePath}`);
}

export async function onShellCommand(shellCommand: string, projectId: string) {
  const queuedCommand = shellCommandQueue
    .catch(() => undefined)
    .then(() => runShellCommand(shellCommand, projectId));

  shellCommandQueue = queuedCommand.catch(() => undefined);

  await queuedCommand;
}

async function executeCommand(command: string, projectId: string) {
  console.log(`Running command: ${command}`);
  const result = Bun.spawnSync({
    cmd: command.split(/\s+/),
    cwd: BASE_WORKER_DIR,
  });
  console.log(result.stdout.toString());
  console.log(result.stderr.toString());

  await logProjectAction(projectId, `Ran command ${command}`);
}

async function runShellCommand(shellCommand: string, projectId: string) {
  const commands = shellCommand.split("&&");
  for (const command of commands) {
    const trimmedCommand = normalizeShellCommand(command);

    if (!trimmedCommand) {
      continue;
    }

    if (isNpmInstallCommand(trimmedCommand)) {
      pendingNpmInstall = true;
      console.log(`Deferring npm install until generation finishes`);
      await logProjectAction(projectId, `Queued command ${trimmedCommand}`);
      continue;
    }

    if (isDevServerCommand(trimmedCommand)) {
      console.log(`Skipping auto-start command: ${trimmedCommand}`);
      await logProjectAction(
        projectId,
        `Skipped auto-start command ${trimmedCommand}`,
      );
      continue;
    }

    await executeCommand(trimmedCommand, projectId);
  }
}

async function packageJsonExists() {
  try {
    await access(join(BASE_WORKER_DIR, "package.json"));
    return true;
  } catch {
    return false;
  }
}

export async function flushPendingNpmInstall(projectId: string) {
  const runInstall = async () => {
    if (!pendingNpmInstall) {
      return;
    }

    if (!(await packageJsonExists())) {
      pendingNpmInstall = false;
      return;
    }

    pendingNpmInstall = false;
    const installCommand = normalizeShellCommand("npm install");
    await executeCommand(installCommand, projectId);
  };

  const queuedInstall = shellCommandQueue
    .catch(() => undefined)
    .then(runInstall);

  shellCommandQueue = queuedInstall.catch(() => undefined);

  await queuedInstall;
}
