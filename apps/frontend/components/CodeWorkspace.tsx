"use client";

import CodeEditor from "@/components/CodeEditor";
// PhoneExpoPanel (Expo Go tunnel QR) is temporarily disabled — the tunnel only
// works while the local worker runs, so we show a "coming soon" note instead.
// Re-enable by rendering <PhoneExpoPanel projectId={projectId} buildCount={buildCount} />.
import { useWebContainer } from "@/components/WebContainerProvider";
import WebContainerPreview from "@/components/WebContainerPreview";
import WebContainerTerminal from "@/components/WebContainerTerminal";
import { WORKER_API_URL } from "@/config";
import { createZip, type ZipEntry } from "@/utils/zip";
import type { FileSystemTree } from "@webcontainer/api";
import {
  ChevronDown,
  ChevronRight,
  Code2,
  Download,
  ExternalLink,
  Eye,
  File as FileIcon,
  QrCode,
  RefreshCw,
  Smartphone,
  ScrollText,
  Terminal,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Tab = "code" | "preview";
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface CollectedFile {
  path: string;
  content: string;
}

function collectFiles(tree: FileSystemTree, prefix = ""): CollectedFile[] {
  const files: CollectedFile[] = [];
  for (const [name, node] of Object.entries(tree)) {
    const path = prefix ? `${prefix}/${name}` : name;
    if ("file" in node && "contents" in node.file) {
      files.push({ path, content: String(node.file.contents) });
    } else if ("directory" in node) {
      files.push(...collectFiles(node.directory, path));
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function pickDefaultFile(files: CollectedFile[]): string | null {
  if (files.length === 0) return null;
  const preferred = files.find(
    (f) => f.path === "app/index.tsx" || f.path === "App.tsx",
  );
  if (preferred) return preferred.path;
  const firstTsx = files.find((f) => f.path.endsWith(".tsx"));
  return (firstTsx ?? files[0]).path;
}

async function fetchFiles(): Promise<FileSystemTree> {
  const response = await fetch(`${WORKER_API_URL}/files`);
  if (!response.ok) {
    throw new Error(`Failed to load files (${response.status})`);
  }
  const data = (await response.json()) as { files?: FileSystemTree };
  return data.files ?? {};
}

async function persistFile(path: string, content: string) {
  const response = await fetch(`${WORKER_API_URL}/files`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(data.error ?? `Failed to save (${response.status})`);
  }
}

interface TreeNode {
  name: string;
  path: string;
  children?: TreeNode[];
}

function buildDisplayTree(files: CollectedFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [] };

  for (const file of files) {
    const segments = file.path.split("/");
    let node = root;
    let acc = "";
    segments.forEach((segment, index) => {
      acc = acc ? `${acc}/${segment}` : segment;
      const isLeaf = index === segments.length - 1;
      node.children ??= [];
      let child = node.children.find((c) => c.name === segment);
      if (!child) {
        child = { name: segment, path: acc };
        if (!isLeaf) child.children = [];
        node.children.push(child);
      }
      node = child;
    });
  }

  const sortNodes = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .map((n) => (n.children ? { ...n, children: sortNodes(n.children) } : n))
      .sort((a, b) => {
        const aDir = a.children ? 0 : 1;
        const bDir = b.children ? 0 : 1;
        return aDir - bDir || a.name.localeCompare(b.name);
      });

  return sortNodes(root.children ?? []);
}

function FileTree({
  nodes,
  selectedPath,
  onSelect,
  depth = 0,
}: {
  nodes: TreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  return (
    <ul>
      {nodes.map((node) =>
        node.children ? (
          <Directory
            key={node.path}
            node={node}
            selectedPath={selectedPath}
            onSelect={onSelect}
            depth={depth}
          />
        ) : (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => onSelect(node.path)}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className={`flex w-full items-center gap-1.5 py-1 pr-2 text-left text-xs ${
                selectedPath === node.path
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <FileIcon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span className="truncate">{node.name}</span>
            </button>
          </li>
        ),
      )}
    </ul>
  );
}

function Directory({
  node,
  selectedPath,
  onSelect,
  depth,
}: {
  node: TreeNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className="flex w-full items-center gap-1 py-1 pr-2 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-800/50"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {open && node.children && (
        <FileTree
          nodes={node.children}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={depth + 1}
        />
      )}
    </li>
  );
}

interface CodeWorkspaceProps {
  projectId: string;
  ready: boolean;
  /** Increments once per completed build; used to detect a stale preview. */
  buildCount: number;
}

export default function CodeWorkspace({
  projectId,
  ready,
  buildCount,
}: CodeWorkspaceProps) {
  const { instance, status: containerStatus, statusMessage } = useWebContainer();
  const [tab, setTab] = useState<Tab>("code");
  const [tree, setTree] = useState<FileSystemTree | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [previewUrl, setPreviewUrl] = useState("");
  const [showPhoneQr, setShowPhoneQr] = useState(false);
  // The build count the running WebContainer preview was mounted at. Once a
  // later build lands, the in-browser preview is stale until a full page reload
  // re-fetches the workspace files — so we surface a "refresh" prompt.
  const [mountedBuild, setMountedBuild] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePreviewUrlChange = useCallback((url: string) => {
    setPreviewUrl(url);
  }, []);

  const loadFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    setFilesError(null);
    try {
      setTree(await fetchFiles());
    } catch (err) {
      setFilesError(
        err instanceof Error ? err.message : "Failed to load files",
      );
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles, ready]);

  // Snapshot the build count the moment the preview first goes live. A fresh
  // page load re-runs this at the latest count, which is why a refresh clears
  // the stale state.
  useEffect(() => {
    if (containerStatus === "ready") {
      setMountedBuild((prev) => (prev === null ? buildCount : prev));
    }
  }, [containerStatus, buildCount]);

  const isPreviewStale = mountedBuild !== null && buildCount > mountedBuild;

  // A newer build has landed, so the in-browser WebContainer is showing stale
  // files. Auto-reload the page once: a fresh load remounts the WebContainer
  // and re-fetches the latest workspace files. The ref guards against firing
  // twice before the navigation actually starts (after reload, React state
  // resets and mountedBuild re-captures the current count, so it won't loop).
  const hasAutoReloadedRef = useRef(false);
  useEffect(() => {
    if (isPreviewStale && !hasAutoReloadedRef.current) {
      hasAutoReloadedRef.current = true;
      window.location.reload();
    }
  }, [isPreviewStale]);

  const files = useMemo(() => (tree ? collectFiles(tree) : []), [tree]);
  const displayTree = useMemo(() => buildDisplayTree(files), [files]);

  useEffect(() => {
    setSelectedPath((current) => {
      if (current && files.some((f) => f.path === current)) return current;
      return pickDefaultFile(files);
    });
  }, [files]);

  // Load file content when selection changes.
  useEffect(() => {
    if (!selectedPath) {
      setEditorContent("");
      return;
    }

    let cancelled = false;

    async function loadContent() {
      if (containerStatus === "ready" && instance) {
        try {
          const content = await instance.fs.readFile(selectedPath!, "utf-8");
          if (!cancelled) {
            setEditorContent(content);
          }
          return;
        } catch {
          // Fall through to worker tree.
        }
      }

      const file = files.find((f) => f.path === selectedPath);
      if (!cancelled) {
        setEditorContent(file?.content ?? "");
      }
    }

    setSaveStatus("idle");
    setSaveError(null);
    loadContent();

    return () => {
      cancelled = true;
    };
  }, [selectedPath, containerStatus, instance, files]);

  const handleEditorChange = useCallback(
    (content: string) => {
      setEditorContent(content);
      setSaveStatus("saving");
      setSaveError(null);

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      if (!selectedPath) return;

      saveTimerRef.current = setTimeout(() => {
        void (async () => {
          try {
            if (containerStatus === "ready" && instance) {
              await instance.fs.writeFile(selectedPath, content);
            }
            await persistFile(selectedPath, content);
            setTree((prev) => {
              if (!prev) return prev;
              const updated = { ...prev };
              const segments = selectedPath.split("/");
              let node: FileSystemTree = updated;
              for (let i = 0; i < segments.length - 1; i++) {
                const seg = segments[i]!;
                const child = node[seg];
                if (child && "directory" in child) {
                  node[seg] = { directory: { ...child.directory } };
                  node = (node[seg] as { directory: FileSystemTree }).directory;
                }
              }
              const fileName = segments[segments.length - 1]!;
              node[fileName] = { file: { contents: content } };
              return updated;
            });
            setSaveStatus("saved");
          } catch (err) {
            setSaveStatus("error");
            setSaveError(err instanceof Error ? err.message : "Save failed");
          }
        })();
      }, 500);
    },
    [selectedPath, containerStatus, instance],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const downloadZip = useCallback(() => {
    const entries: ZipEntry[] = files.map((f) => ({
      path: f.path,
      content: new TextEncoder().encode(
        f.path === selectedPath ? editorContent : f.content,
      ),
    }));
    const blob = new Blob([createZip(entries) as BlobPart], {
      type: "application/zip",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-${projectId.slice(0, 8)}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [files, projectId, selectedPath, editorContent]);

  const saveLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? (saveError ?? "Save failed")
          : containerStatus !== "ready"
            ? statusMessage
            : null;

  return (
    <section className="flex h-full min-h-0 overflow-hidden rounded-lg border border-zinc-800 bg-[#151518]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-800 bg-[#151518] px-3">
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTab("code")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                tab === "code"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Code2 className="h-4 w-4" />
              Code
            </button>
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                tab === "preview"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>

            {ready && (
              <button
                type="button"
                onClick={() => setShowPhoneQr((v) => !v)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  showPhoneQr
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Open on phone — coming soon"
              >
                <QrCode className="h-4 w-4 text-blue-400" />
                Open on phone
              </button>
            )}

            {ready && showPhoneQr && (
              <div className="absolute left-0 top-full z-40 mt-2 flex w-[264px] flex-col items-center gap-3 rounded-xl border border-zinc-800 bg-[#101014] p-5 text-center shadow-2xl">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10">
                  <Smartphone className="h-5 w-5 text-blue-400" />
                </div>
                <p className="text-sm font-semibold text-zinc-100">
                  Open on phone — coming soon
                </p>
                <p className="text-xs leading-5 text-zinc-500">
                  Scanning your app straight into Expo Go is still in
                  development. We&apos;re polishing it and it&apos;ll land soon —
                  thanks for your patience! 🙏
                </p>
                <button
                  type="button"
                  onClick={() => setShowPhoneQr(false)}
                  className="mt-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                >
                  Got it
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {tab === "code" && (
              <>
                <button
                  type="button"
                  onClick={() => setShowTerminal((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    showTerminal
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  Terminal
                </button>
                <button
                  type="button"
                  onClick={loadFiles}
                  disabled={isLoadingFiles}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
                  aria-label="Refresh files"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isLoadingFiles ? "animate-spin" : ""}`}
                  />
                </button>
              </>
            )}
            {tab === "preview" && previewUrl && (
              <button
                type="button"
                onClick={() => setShowLogs((v) => !v)}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
              >
                {showLogs ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <ScrollText className="h-3.5 w-3.5" />
                )}
                {showLogs ? "Hide logs" : "Logs"}
              </button>
            )}
            {tab === "preview" && previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in New Tab
              </a>
            )}
            <button
              type="button"
              onClick={downloadZip}
              disabled={files.length === 0}
              className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Download ZIP
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <div className={tab === "preview" ? "absolute inset-0" : "hidden"}>
            {isPreviewStale && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-zinc-950/80 text-center backdrop-blur-sm">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                <p className="text-sm font-medium text-zinc-100">
                  Updating preview with the latest changes…
                </p>
              </div>
            )}
            <WebContainerPreview
              showLogs={showLogs}
              onPreviewUrlChange={handlePreviewUrlChange}
            />
          </div>

          {tab === "code" && (
            <div className="absolute inset-0 flex bg-zinc-950">
              <aside className="w-56 shrink-0 overflow-y-auto border-r border-zinc-800 py-2">
                {files.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-zinc-500">
                    {isLoadingFiles
                      ? "Loading files…"
                      : (filesError ?? "No files yet.")}
                  </p>
                ) : (
                  <FileTree
                    nodes={displayTree}
                    selectedPath={selectedPath}
                    onSelect={setSelectedPath}
                  />
                )}
              </aside>

              <div className="flex min-w-0 flex-1 flex-col">
                {selectedPath ? (
                  <>
                    <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-2 text-xs text-zinc-400">
                      <span className="truncate">{selectedPath}</span>
                      {saveLabel && (
                        <span
                          className={
                            saveStatus === "error"
                              ? "text-red-400"
                              : saveStatus === "saved"
                                ? "text-emerald-400"
                                : "text-zinc-500"
                          }
                        >
                          {saveLabel}
                        </span>
                      )}
                    </div>
                    <div
                      className="min-h-0 flex-1"
                      style={{
                        height: showTerminal ? "calc(100% - 200px)" : "100%",
                      }}
                    >
                      <CodeEditor
                        path={selectedPath}
                        value={editorContent}
                        onChange={handleEditorChange}
                        readOnly={containerStatus !== "ready"}
                      />
                    </div>
                    {showTerminal && (
                      <div className="h-[200px] shrink-0 border-t border-zinc-800">
                        <WebContainerTerminal />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
                    Select a file to edit its code.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
