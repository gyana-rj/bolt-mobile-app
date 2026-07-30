import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { BASE_WORKER_DIR } from "./os";

// Native Expo dev server port. `expo start --tunnel` bundles for both native
// (Expo Go) and web on this port and exposes it through an ngrok tunnel, so a
// phone on any network — even cellular — can reach it via the printed `exp://`
// URL. No same-network / public-IP requirement, unlike a raw LAN dev server.
const EXPO_PORT = Number(process.env.EXPO_PORT ?? 8081);

// Overridable so the image can swap package managers. Defaults match the
// expo-base template (pnpm + a committed lockfile + flat .npmrc).
const INSTALL_CMD =
  process.env.EXPO_INSTALL_CMD ?? "pnpm install --no-frozen-lockfile";
const START_CMD =
  process.env.EXPO_START_CMD ??
  `npx --yes expo start --tunnel --port ${EXPO_PORT}`;

// `expo start --tunnel` needs @expo/ngrok, which it can't auto-install in
// non-interactive mode. We install it into the workspace with --no-save so the
// project's package.json (and therefore the browser WebContainer web-preview
// install) is left completely untouched — this is a server-side-only concern.
const TUNNEL_DEP_CMD =
  process.env.EXPO_TUNNEL_DEP_CMD ??
  "npm install @expo/ngrok@^4.1.0 --no-save --no-package-lock";

// If the tunnel URL hasn't appeared in Expo's output within this window we give
// up and surface an error rather than leaving the client polling forever.
const TUNNEL_READY_TIMEOUT_MS = Number(
  process.env.EXPO_TUNNEL_TIMEOUT_MS ?? 120_000,
);

// Strips ANSI escape sequences. Built from char codes (ESC=27, CSI=0x9B) so the
// source stays free of literal control characters.
const ANSI = new RegExp(
  `[${String.fromCharCode(27, 0x9b)}][[\\]()#;?]*(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nqry=><]`,
  "g",
);

export type ExpoSessionStatus =
  | "idle"
  | "installing"
  | "starting"
  | "ready"
  | "error";

interface ExpoSessionState {
  status: ExpoSessionStatus;
  /** The `exp://…exp.direct` tunnel URL Expo Go opens, once available. */
  url: string | null;
  /** The project this session was started for. */
  projectId: string | null;
  error: string | null;
  logs: string[];
}

const state: ExpoSessionState = {
  status: "idle",
  url: null,
  projectId: null,
  error: null,
  logs: [],
};

let child: ChildProcessWithoutNullStreams | null = null;
let readyTimer: ReturnType<typeof setTimeout> | null = null;
// Set when Expo/Metro reports the dev-server port is already taken, so the exit
// handler can surface an actionable message instead of a bare "exited (code 1)".
let portConflict = false;

function log(line: string) {
  state.logs = [...state.logs, line].slice(-80);
}

// Recognises the various ways Expo/Metro/Node announce that EXPO_PORT is busy.
// Expo may say "Port 8081 is already in use", Metro "…is running this app in
// another window", and Node "EADDRINUSE: address already in use".
function isPortInUse(line: string): boolean {
  return /eaddrinuse|address already in use|port \d+ is (?:already )?(?:in use|running)/i.test(
    line,
  );
}

// `expo start --tunnel` prints a line containing the connection URL, e.g.
//   Metro waiting on exp://abc-anonymous.8081.exp.direct
// We accept exp:// (Expo Go) first and fall back to the https tunnel host.
function extractTunnelUrl(text: string): string | null {
  const clean = text.replace(ANSI, "");
  const exp = clean.match(/exp:\/\/[^\s"']+/);
  if (exp) return exp[0];
  const https = clean.match(/https:\/\/[^\s"']*\.exp\.direct[^\s"']*/);
  return https ? https[0] : null;
}

async function depsInstalled(): Promise<boolean> {
  try {
    await access(join(BASE_WORKER_DIR, "node_modules", "expo", "package.json"));
    return true;
  } catch {
    return false;
  }
}

async function ngrokInstalled(): Promise<boolean> {
  try {
    await access(
      join(BASE_WORKER_DIR, "node_modules", "@expo", "ngrok", "package.json"),
    );
    return true;
  } catch {
    return false;
  }
}

// Makes sure @expo/ngrok is present in the workspace, then boots Expo. Runs the
// dep install only when it's actually missing so warm workspaces start fast.
async function ensureTunnelDepThenStart() {
  if (await ngrokInstalled()) {
    startExpo();
    return;
  }
  const dep = run(TUNNEL_DEP_CMD, "installing");
  dep.on("exit", (code) => {
    if (code === 0) {
      startExpo();
    } else if (state.status !== "error") {
      state.status = "error";
      state.error = `Failed to install @expo/ngrok for tunneling (exit ${code ?? "unknown"}).`;
    }
  });
}

function run(
  command: string,
  phase: ExpoSessionStatus,
  { ci = true }: { ci?: boolean } = {},
): ChildProcessWithoutNullStreams {
  const [cmd, ...args] = command.split(" ");
  const proc = spawn(cmd!, args, {
    cwd: BASE_WORKER_DIR,
    env: {
      ...process.env,
      // The spawn has no TTY, so Expo/npm are already non-interactive and never
      // block on a prompt. We only force CI for install phases; for `expo start`
      // CI=1 additionally disables Metro reloads (no live-reload on the phone),
      // so it's left off there.
      ...(ci ? { CI: "1" } : {}),
      npm_config_yes: "true",
      EXPO_NO_TELEMETRY: "1",
      BROWSER: "none",
    },
  });

  const onData = (buf: Buffer) => {
    const text = buf.toString();
    for (const raw of text.split(/[\r\n]+/)) {
      const line = raw.replace(ANSI, "").trim();
      if (!line) continue;
      log(`[${phase}] ${line}`);
      if (isPortInUse(line)) portConflict = true;
    }
    // Some Expo versions do print the URL to stdout; capture it if so, but the
    // manifest poll below is the reliable source in non-interactive mode.
    if (state.status === "starting" && !state.url) {
      const url = extractTunnelUrl(text);
      if (url) setReady(url);
    }
  };

  proc.stdout.on("data", onData);
  proc.stderr.on("data", onData);

  // Without an 'error' listener a failed spawn (e.g. pnpm/npx not on PATH)
  // throws an uncaught exception and takes the whole worker down. Handle it so
  // the session just reports a clean error instead.
  proc.on("error", (err) => {
    const bin = command.split(" ")[0];
    log(`[${phase}] failed to spawn ${bin}: ${err.message}`);
    if (readyTimer) {
      clearTimeout(readyTimer);
      readyTimer = null;
    }
    state.status = "error";
    state.error = `Couldn't run "${bin}" on the worker (${err.message}). Make sure it's installed and on PATH.`;
  });

  return proc;
}

function setReady(hostOrUrl: string) {
  const stripped = hostOrUrl.replace(/^https?:\/\//, "");
  state.url = stripped.startsWith("exp://") ? stripped : `exp://${stripped}`;
  state.status = "ready";
  if (readyTimer) {
    clearTimeout(readyTimer);
    readyTimer = null;
  }
}

// In non-interactive mode Expo doesn't print the tunnel QR/URL, but its
// manifest at localhost:EXPO_PORT carries the public `hostUri` (…exp.direct)
// once the tunnel is connected. Poll it until that appears.
async function resolveTunnelUrl(): Promise<string | null> {
  try {
    const res = await fetch(`http://localhost:${EXPO_PORT}/`, {
      headers: {
        "Expo-Platform": "ios",
        Accept: "application/expo+json,application/json",
      },
    });
    if (!res.ok) return null;
    const manifest = (await res.json()) as {
      hostUri?: string;
      extra?: { expoGo?: { debuggerHost?: string } };
    };
    const hostUri = manifest.hostUri ?? manifest.extra?.expoGo?.debuggerHost;
    if (typeof hostUri === "string" && hostUri.includes(".exp.direct")) {
      return hostUri;
    }
    return null;
  } catch {
    return null;
  }
}

function pollForTunnelUrl() {
  const tick = async () => {
    if (state.status !== "starting") return;
    const hostUri = await resolveTunnelUrl();
    if (hostUri) {
      setReady(hostUri);
      return;
    }
    if (state.status === "starting") setTimeout(tick, 2000);
  };
  setTimeout(tick, 2000);
}

function startExpo() {
  state.status = "starting";
  portConflict = false;
  // ci:false keeps Metro's live-reload enabled for the phone.
  child = run(START_CMD, "starting", { ci: false });
  pollForTunnelUrl();

  readyTimer = setTimeout(() => {
    if (state.status !== "ready") {
      state.status = "error";
      state.error =
        "Timed out waiting for the Expo tunnel URL. Check that @expo/ngrok is installed and the tunnel could be established.";
    }
  }, TUNNEL_READY_TIMEOUT_MS);

  child.on("exit", (code) => {
    if (readyTimer) {
      clearTimeout(readyTimer);
      readyTimer = null;
    }
    child = null;
    if (state.status === "ready") {
      // The live server went away (clean shutdown, crash, or was killed). Reset
      // to idle so the next request starts a fresh session instead of handing
      // back a dead tunnel URL.
      state.status = "idle";
      state.url = null;
      return;
    }
    if (state.status !== "error") {
      state.status = "error";
      state.error = portConflict
        ? `Port ${EXPO_PORT} is already in use — another Expo or Metro dev server is still running on the worker. Wait a few seconds for it to shut down, then try again.`
        : (state.error ??
          `The Expo dev server stopped unexpectedly (exit code ${code ?? "unknown"}) before the tunnel was ready. Try again — if it keeps happening, check the project's dependencies.`);
    }
  });
}

/**
 * Idempotently ensures a native Expo tunnel session is running for `projectId`.
 * Installs dependencies server-side on first run, then launches
 * `expo start --tunnel` and resolves the `exp://` URL asynchronously (poll
 * {@link getExpoSession} for status). Safe to call repeatedly — it no-ops while
 * a session for the same project is installing/starting/ready.
 */
export async function ensureExpoSession(
  projectId: string,
  opts: { restart?: boolean } = {},
): Promise<void> {
  // A session for a different project must be torn down first. `restart` forces
  // the same teardown even for the same project — used when the workspace files
  // changed (a follow-up prompt) and the live Metro bundle is now stale, so the
  // phone needs a fresh `expo start` rather than the cached one.
  if (opts.restart || (state.projectId && state.projectId !== projectId)) {
    stopExpoSession();
  }

  if (
    state.projectId === projectId &&
    (state.status === "installing" ||
      state.status === "starting" ||
      state.status === "ready")
  ) {
    return; // already in flight or live
  }

  state.projectId = projectId;
  state.error = null;
  state.url = null;
  state.logs = [];
  // Claim the session synchronously (before the first await) so a second
  // concurrent request sees a non-idle status and no-ops instead of spawning a
  // duplicate install/server.
  state.status = "installing";

  if (await depsInstalled()) {
    await ensureTunnelDepThenStart();
    return;
  }

  // Install dependencies once, server-side, then boot Expo.
  const installer = run(INSTALL_CMD, "installing");
  installer.on("exit", (code) => {
    if (code === 0) {
      void ensureTunnelDepThenStart();
    } else {
      state.status = "error";
      state.error = `Dependency install failed (exit ${code ?? "unknown"}).`;
    }
  });
}

export function getExpoSession(): ExpoSessionState {
  return state;
}

export function stopExpoSession() {
  if (readyTimer) {
    clearTimeout(readyTimer);
    readyTimer = null;
  }
  if (child) {
    child.kill("SIGTERM");
    child = null;
  }
  state.status = "idle";
  state.url = null;
  state.error = null;
}
