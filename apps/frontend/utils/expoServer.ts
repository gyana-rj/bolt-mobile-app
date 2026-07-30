import type { WebContainer, WebContainerProcess } from "@webcontainer/api";

// The canonical Expo web dev-server port. The store only ever resolves a URL
// for this port, so a stray server started manually in the terminal (which Expo
// bumps to 8082, 8083, …) can never hijack the live preview.
export const PREVIEW_PORT = 8081;

// Passed to the spawn so the process never blocks on a prompt. `CI=true` is the
// important one: without it, if 8081 is already taken Expo asks
// "Use port 8082 instead? (Y/n)" on stdin and hangs forever. With CI set it
// runs fully non-interactively.
const EXPO_ENV = {
  npm_config_yes: "true",
  EXPO_NO_TELEMETRY: "1",
  BROWSER: "none",
  CI: "true",
};

// Matches ANSI escape sequences so npm's colors/cursor codes don't render as
// "[1G", "[0K" etc. Built from char codes (ESC=27, CSI=0x9B) to keep the source
// free of literal control characters.
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = new RegExp(
  `[${String.fromCharCode(27, 0x9b)}][[\\]()#;?]*(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nqry=><]`,
  "g",
);

function toCleanLines(chunk: string): string[] {
  return chunk
    .replace(ANSI_PATTERN, "")
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^[\\|/-]$/.test(line));
}

// Metro prints "Web Bundled 3456ms …" once the web bundle is fully built.
// A 100% progress line is treated as done too, as a belt-and-braces signal.
function isBundleDoneLine(line: string): boolean {
  return /bundled/i.test(line) || /\b100(?:\.0+)?\s*%/.test(line);
}

export interface ExpoServerState {
  /** Live preview URL once the dev server is ready, else null. */
  url: string | null;
  /** Fatal error message if the server crashed, else null. */
  error: string | null;
  /** True once Metro has finished bundling at least once (sticky). */
  bundled: boolean;
  /** Cleaned Expo/Metro log lines (bounded buffer). */
  logs: string[];
}

export interface ExpoServerHandle {
  getState(): ExpoServerState;
  subscribe(listener: () => void): () => void;
}

interface Entry extends ExpoServerHandle {
  /** The spawned Expo process, once it has started. */
  process: WebContainerProcess | null;
}

// One Expo server per WebContainer instance. Because `bootWebContainer` returns
// a page-level singleton, this map effectively holds a single entry for the
// life of the page — which is exactly what prevents a second `pnpm run web`
// from being spawned (and colliding on port 8081) when the preview component
// remounts after a follow-up prompt.
const servers = new WeakMap<WebContainer, Entry>();

/**
 * Starts the Expo web dev server for this WebContainer, or returns the existing
 * one. Idempotent: safe to call on every mount. The returned handle is a small
 * observable store whose state (URL, logs, error) survives remounts, so a
 * remounted preview immediately sees the already-running server instead of
 * starting a duplicate.
 */
export function ensureExpoServer(instance: WebContainer): ExpoServerHandle {
  const existing = servers.get(instance);
  if (existing) {
    return existing;
  }

  const state: ExpoServerState = {
    url: null,
    error: null,
    bundled: false,
    logs: [],
  };
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };

  instance.on("server-ready", (port, url) => {
    if (port !== PREVIEW_PORT || state.url) return;
    state.url = url;
    emit();
  });

  const entry: Entry = {
    process: null,
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  servers.set(instance, entry);

  void (async () => {
    try {
      const spawned = await instance.spawn(
        "pnpm",
        ["run", "web", "--", "--port", String(PREVIEW_PORT)],
        { env: EXPO_ENV },
      );
      entry.process = spawned;

      spawned.output.pipeTo(
        new WritableStream({
          write(chunk) {
            const lines = toCleanLines(chunk);
            if (lines.length === 0) return;
            state.logs = [...state.logs, ...lines].slice(-60);
            if (!state.bundled && lines.some(isBundleDoneLine)) {
              state.bundled = true;
            }
            emit();
          },
        }),
      );

      void spawned.exit.then((code) => {
        if (code === 0 || state.url) return;
        state.error = `Expo web server exited (code ${code}). Check the logs for details.`;
        emit();
      });
    } catch (err) {
      state.error = err instanceof Error ? err.message : "Preview failed";
      emit();
    }
  })();

  return entry;
}
