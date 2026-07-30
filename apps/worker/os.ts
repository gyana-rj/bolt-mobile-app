import { prismaClient } from "@bolt/db/client";
import { access, cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

export const BASE_WORKER_DIR = process.env.BASE_WORK_DIR || "/tmp/bolty-worker";

// Static base template: a standard Expo project plus a pre-generated
// pnpm-lock.yaml. Every project starts from this so the browser can install
// against a known lockfile instead of resolving Expo's tree from scratch.
const TEMPLATE_DIR = join(import.meta.dir, "templates", "expo-base");
const TEMPLATE_FILES = [
  "package.json",
  "app.json",
  "tsconfig.json",
  "babel.config.js",
  // Forces pnpm into a flat, npm-like node_modules; without it Metro can't
  // resolve hoisted transitive deps like @babel/runtime and the web bundle
  // fails to build (blank preview).
  ".npmrc",
  "pnpm-lock.yaml",
];

// Template-owned config files a generated project must never overwrite
// (package.json is handled separately via dependency merging).
const TEMPLATE_OWNED_FILES = new Set([
  "app.json",
  "tsconfig.json",
  "babel.config.js",
  ".npmrc",
  "pnpm-lock.yaml",
]);

await mkdir(BASE_WORKER_DIR, { recursive: true });

let shellCommandQueue = Promise.resolve();

// Pinned to Expo SDK 54 (matches the current Expo Go on the App/Play stores).
const REQUIRED_EXPO_DEPENDENCIES: Record<string, string> = {
  "expo-status-bar": "~3.0.9",
  "expo-linking": "~8.0.12",
  "expo-constants": "~18.0.13",
  "react-native-safe-area-context": "~5.6.0",
  "react-native-screens": "~4.16.0",
  "react-native-gesture-handler": "~2.28.0",
  "react-native-reanimated": "~4.1.1",
  // Reanimated 4 runs its worklets through react-native-worklets; it must be
  // present or the babel plugin (auto-added by babel-preset-expo) fails.
  "react-native-worklets": "0.5.1",
  // Web dependencies so `expo start --web` runs without prompting to install
  // them (an interactive prompt hangs the browser sandbox).
  "react-dom": "19.1.0",
  "react-native-web": "~0.21.0",
  "@expo/metro-runtime": "~6.1.2",
};

function getWorkerPath(filePath: string) {
  const normalizedPath = normalize(filePath)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");

  return join(BASE_WORKER_DIR, normalizedPath);
}

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};

// Copies the base template (package.json, app.json, lockfile) into a freshly
// cleared workspace.
async function seedFromTemplate() {
  for (const file of TEMPLATE_FILES) {
    await cp(join(TEMPLATE_DIR, file), join(BASE_WORKER_DIR, file));
  }
}

async function readWorkspacePackageJson(): Promise<PackageJson | null> {
  try {
    const raw = await readFile(join(BASE_WORKER_DIR, "package.json"), "utf-8");
    return JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }
}

async function writeWorkspacePackageJson(pkg: PackageJson) {
  await Bun.write(
    join(BASE_WORKER_DIR, "package.json"),
    `${JSON.stringify(pkg, null, 2)}\n`,
  );
}

// Splits "name", "name@version", or "@scope/name@version" into its parts.
function parsePackageSpec(spec: string): { name: string; version: string } {
  const trimmed = spec.trim();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex > 0) {
    return {
      name: trimmed.slice(0, atIndex),
      version: trimmed.slice(atIndex + 1) || "latest",
    };
  }
  return { name: trimmed, version: "latest" };
}

// Native modules whose JS version must match the exact build bundled inside the
// Expo Go client for the template's SDK. Expo Go ships the native side; if the
// installed JS is a newer major, it loads but the native module resolves to null
// ("AsyncStorageError: Native module is null…"). The model usually adds these via
// `expo install <pkg>` with no version, which would otherwise land as "latest"
// (an incompatible major), so we force the SDK-correct version regardless of what
// was requested. Keep in sync with the expo-base template's Expo SDK (54).
const EXPO_GO_PINNED_VERSIONS: Record<string, string> = {
  "@react-native-async-storage/async-storage": "2.2.0",
};

// Merges package specs into the base package.json, add-only: versions the base
// template already pins are left untouched so the checked-in lockfile stays
// authoritative. Returns the names actually added.
export async function addDependenciesToWorkspace(
  specs: string[],
): Promise<string[]> {
  const pkg = await readWorkspacePackageJson();
  if (!pkg) {
    return [];
  }

  pkg.dependencies ??= {};
  const added: string[] = [];

  for (const spec of specs) {
    const { name, version: requestedVersion } = parsePackageSpec(spec);
    if (!name || name.startsWith("-")) {
      continue;
    }
    if (pkg.dependencies[name] || pkg.devDependencies?.[name]) {
      continue;
    }
    // Expo-Go native modules are pinned to the SDK-correct version; everything
    // else keeps whatever the model asked for (defaulting to "latest").
    pkg.dependencies[name] = EXPO_GO_PINNED_VERSIONS[name] ?? requestedVersion;
    added.push(name);
  }

  if (added.length > 0) {
    await writeWorkspacePackageJson(pkg);
  }
  return added;
}

// Defensive path: if the model still emits a whole package.json, take only its
// dependencies and merge them into the base rather than overwriting it.
async function mergeGeneratedPackageJson(content: string): Promise<string[]> {
  let incoming: PackageJson;
  try {
    incoming = JSON.parse(content) as PackageJson;
  } catch {
    return [];
  }

  const specs = [
    ...Object.entries(incoming.dependencies ?? {}),
    ...Object.entries(incoming.devDependencies ?? {}),
  ].map(([name, version]) => `${name}@${version}`);

  return addDependenciesToWorkspace(specs);
}

// If `command` installs dependencies, returns the explicit package specs (an
// empty array for a bare install). Returns null for non-install commands.
function extractInstallPackages(command: string): string[] | null {
  const match =
    command.match(
      /^(?:npx\s+)?(?:npm|pnpm|yarn|bun)\s+(?:install|i|add)\b(.*)$/i,
    ) ?? command.match(/^(?:npx\s+)?expo\s+install\b(.*)$/i);
  if (!match) {
    return null;
  }
  return (match[1] ?? "")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length > 0 && !token.startsWith("-") && !token.includes("="),
    );
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
  await logProjectAction(projectId, "Your app is ready in the preview");
}

function isNpmInstallCommand(command: string) {
  return /^npm\s+(install|i)(\s|$)/i.test(command);
}

function isDevServerCommand(command: string) {
  return /^(?:(?:npm|pnpm|yarn)\s+run\s+(?:web|start|ios|android)|pnpm\s+(?:web|start|ios|android)|(?:npx\s+|pnpm\s+exec\s+)?expo\s+start|expo\s+start)\b/i.test(
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
  await mkdir(BASE_WORKER_DIR, { recursive: true });

  const entries = await readdir(BASE_WORKER_DIR);

  await Promise.all(
    entries.map((entry) =>
      rm(join(BASE_WORKER_DIR, entry), { recursive: true, force: true }),
    ),
  );

  // Seed the fresh workspace from the static Expo base template.
  await seedFromTemplate();

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
  const baseName = filePath.replace(/\\/g, "/").split("/").pop() ?? filePath;

  // package.json comes from the base template. We never overwrite it; we only
  // merge in any extra dependencies the model listed.
  if (baseName === "package.json") {
    const added = await mergeGeneratedPackageJson(
      cleanFileContent(fileContent),
    );
    await logProjectAction(
      projectId,
      added.length > 0
        ? `Added dependencies ${added.join(", ")}`
        : "Reviewed dependencies",
    );
    return;
  }

  // These config files are owned by the base template (they wire up Expo Router,
  // Babel, and TypeScript). Never let a generated copy overwrite them.
  if (TEMPLATE_OWNED_FILES.has(baseName)) {
    return;
  }

  console.log(`Writing file: ${filePath}`);
  const targetPath = getWorkerPath(filePath);
  await mkdir(dirname(targetPath), { recursive: true });
  await Bun.write(targetPath, cleanFileContent(fileContent));

  await logProjectAction(projectId, `Updated file ${filePath}`);
}

export type WriteWorkspaceFileResult =
  | { ok: true }
  | { ok: false; error: string };

/** Persists a user edit from the browser IDE without logging project actions. */
export async function writeWorkspaceFile(
  filePath: string,
  fileContent: string,
): Promise<WriteWorkspaceFileResult> {
  const normalized = filePath.replace(/\\/g, "/").trim();
  if (!normalized || normalized.includes("..")) {
    return { ok: false, error: "Invalid file path" };
  }

  const baseName = normalized.split("/").pop() ?? normalized;
  if (baseName === "package.json" || TEMPLATE_OWNED_FILES.has(baseName)) {
    return { ok: false, error: `Cannot edit protected file: ${baseName}` };
  }

  const targetPath = getWorkerPath(normalized);
  if (!targetPath.startsWith(BASE_WORKER_DIR)) {
    return { ok: false, error: "Invalid file path" };
  }

  await mkdir(dirname(targetPath), { recursive: true });
  await Bun.write(targetPath, cleanFileContent(fileContent));
  return { ok: true };
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

    // Install commands are not executed here. Named packages are merged into
    // package.json; the actual install runs in the browser WebContainer.
    const installPackages = extractInstallPackages(trimmedCommand);
    if (installPackages !== null) {
      if (installPackages.length > 0) {
        const added = await addDependenciesToWorkspace(installPackages);
        await logProjectAction(
          projectId,
          added.length > 0
            ? `Added dependencies ${added.join(", ")}`
            : `Skipped install command ${trimmedCommand}`,
        );
      } else {
        await logProjectAction(
          projectId,
          `Skipped install command ${trimmedCommand}`,
        );
      }
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

// Dependency installation now happens in the browser WebContainer against the
// template lockfile, so the worker no longer runs any install itself. Kept for
// the existing call site; it only drains the shell queue.
export async function flushPendingNpmInstall(_projectId: string) {
  await shellCommandQueue.catch(() => undefined);
}
