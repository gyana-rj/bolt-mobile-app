"use client";

import { WORKER_API_URL } from "@/config";
import {
  getSnapshot,
  hashDependencies,
  putSnapshot,
} from "@/utils/snapshotCache";
import { bootWebContainer } from "@/utils/webcontainer";
import type { FileSystemTree, WebContainer } from "@webcontainer/api";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type WebContainerStatus = "idle" | "booting" | "ready" | "error";

interface WebContainerContextValue {
  instance: WebContainer | null;
  status: WebContainerStatus;
  error: string | null;
  statusMessage: string;
}

const WebContainerContext = createContext<WebContainerContextValue>({
  instance: null,
  status: "idle",
  error: null,
  statusMessage: "Waiting for the build to finish…",
});

export function useWebContainer() {
  return useContext(WebContainerContext);
}

// Applied to every spawn so nothing blocks on a prompt.
const NON_INTERACTIVE_ENV = {
  npm_config_yes: "true",
  EXPO_NO_TELEMETRY: "1",
  BROWSER: "none",
};

async function fetchWorkspaceFiles(): Promise<FileSystemTree> {
  const response = await fetch(`${WORKER_API_URL}/files`);
  if (!response.ok) {
    throw new Error(`Failed to load workspace files (${response.status})`);
  }
  const data = (await response.json()) as { files?: FileSystemTree };
  return data.files ?? {};
}

function readPackageJson(files: FileSystemTree): string {
  const pkgNode = files["package.json"];
  if (pkgNode && "file" in pkgNode && "contents" in pkgNode.file) {
    return String(pkgNode.file.contents);
  }
  return "";
}

interface WebContainerProviderProps {
  ready: boolean;
  children: ReactNode;
}

export function WebContainerProvider({
  ready,
  children,
}: WebContainerProviderProps) {
  const [instance, setInstance] = useState<WebContainer | null>(null);
  const [status, setStatus] = useState<WebContainerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Waiting for the build to finish…",
  );
  const startedRef = useRef(false);

  useEffect(() => {
    if (!ready || startedRef.current) {
      return;
    }
    startedRef.current = true;
    let isMounted = true;

    async function boot() {
      try {
        setStatus("booting");
        setStatusMessage("Booting WebContainer…");
        const wc = await bootWebContainer();
        if (!isMounted) return;

        setStatusMessage("Loading generated project…");
        const files = await fetchWorkspaceFiles();
        if (!files || Object.keys(files).length === 0) {
          throw new Error("No generated files found in the workspace yet.");
        }
        if (!isMounted) return;

        setStatusMessage("Mounting project files…");
        await wc.mount(files);

        const depHash = await hashDependencies(readPackageJson(files));
        const cached = await getSnapshot(depHash);
        if (!isMounted) return;

        let depsReady = false;
        if (cached) {
          setStatusMessage("Restoring cached dependencies…");
          await wc.mount(cached, { mountPoint: "node_modules" });
          try {
            await wc.fs.readFile("node_modules/expo/package.json", "utf-8");
            depsReady = true;
          } catch {
            // Snapshot was incomplete — fall through to a fresh install.
          }
        }

        if (!depsReady) {
          setStatusMessage("Installing dependencies with pnpm…");
          const install = await wc.spawn(
            "pnpm",
            ["install", "--no-frozen-lockfile"],
            { env: NON_INTERACTIVE_ENV },
          );
          install.output.pipeTo(new WritableStream({ write: () => {} }));
          const installExitCode = await install.exit;
          if (installExitCode !== 0) {
            throw new Error(`pnpm install failed (exit ${installExitCode})`);
          }
          if (!isMounted) return;

          setStatusMessage("Caching dependencies for next time…");
          try {
            const snapshot = await wc.export("node_modules", {
              format: "binary",
            });
            await putSnapshot(depHash, snapshot);
          } catch {
            // Snapshotting is best-effort.
          }
          if (!isMounted) return;
        }

        setInstance(wc);
        setStatus("ready");
        setStatusMessage("Sandbox ready");
      } catch (err) {
        if (isMounted) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "WebContainer failed");
        }
      }
    }

    boot();

    return () => {
      isMounted = false;
    };
  }, [ready]);

  return (
    <WebContainerContext.Provider
      value={{ instance, status, error, statusMessage }}
    >
      {children}
    </WebContainerContext.Provider>
  );
}

export { NON_INTERACTIVE_ENV };
