"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WORKER_API_URL, WORKER_URL } from "@/config";
import { type Action, useAction } from "@/hooks/useAction";
import { type Prompt, usePrompts } from "@/hooks/usePrompt";
import { UserButton } from "@clerk/nextjs";
import axios from "axios";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Circle,
  Code2,
  Database,
  Eye,
  FileText,
  Folder,
  History,
  Lightbulb,
  Loader2,
  MessageSquareText,
  MousePointer2,
  PanelLeft,
  Plus,
  Rocket,
  Search,
  Send,
  Settings,
  Terminal,
  Zap,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface ProjectWorkspaceProps {
  projectId: string;
}

const fallbackFiles = [
  "app/_layout.tsx",
  "app/index.tsx",
  "app.json",
  "package.json",
  "tsconfig.json",
];

function getDisplayTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getProjectTitle(prompts: Prompt[], projectId: string) {
  const firstUserPrompt = prompts.find((prompt) => prompt.type === "USER");
  const promptTitle = firstUserPrompt?.content
    .split("\n")[0]
    ?.replace(/^(create|build|make|generate)\s+(a|an|the)?\s*/i, "")
    .trim();

  if (!promptTitle) {
    return `Project ${projectId.slice(0, 8)}`;
  }

  const appTitle = /\bapp\b/i.test(promptTitle)
    ? promptTitle
    : `${promptTitle} app`;

  return `${titleCase(appTitle).slice(0, 48)} Development`;
}

function getActionLabel(content: string) {
  return content
    .replace(/^Updated file\s+/i, "Update ")
    .replace(/^Ran command\s+/i, "Run ")
    .replace(/^Started clean project workspace$/i, "Start clean workspace");
}

function getActionFilePath(action: Action) {
  return action.content.match(/^Updated file\s+(.+)$/i)?.[1];
}

function getActionIcon(content: string) {
  const normalizedContent = content.toLowerCase();

  if (normalizedContent.includes("updated file")) {
    return FileText;
  }

  if (normalizedContent.includes("ran command")) {
    return Terminal;
  }

  return Zap;
}

function ActivityRail() {
  const items = [
    { label: "Menu", icon: PanelLeft },
    { label: "Search", icon: Search, active: true },
    { label: "Messages", icon: MessageSquareText },
    { label: "Source", icon: Code2 },
    { label: "Database", icon: Database },
    { label: "Output", icon: Rocket },
  ];

  return (
    <aside className="flex w-[76px] shrink-0 flex-col items-center border-r border-zinc-800 bg-[#111318] py-4">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-2xl font-black italic text-zinc-950">
        b
      </div>

      <nav className="flex flex-1 flex-col items-center gap-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              title={item.label}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                item.active
                  ? "border-zinc-700 bg-zinc-800 text-white"
                  : "border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
              type="button"
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </nav>

      <button
        title="New project"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
        type="button"
      >
        <Plus className="h-5 w-5" />
      </button>
    </aside>
  );
}

function WorkspaceHeader({ projectTitle }: { projectTitle: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 bg-[#0d0d10] px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-2 text-zinc-500">
          <span className="text-2xl font-black italic text-white">b</span>
          <span>/</span>
        </div>
        <div className="min-w-0 truncate text-sm font-medium text-zinc-100 sm:text-base">
          {projectTitle}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950 p-1 md:flex">
          <button
            title="Preview"
            className="flex h-8 items-center gap-2 rounded-full px-3 text-sm text-zinc-400 hover:text-white"
            type="button"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            title="Code"
            className="flex h-8 items-center gap-2 rounded-full bg-blue-500/15 px-3 text-sm font-medium text-blue-300"
            type="button"
          >
            <Code2 className="h-4 w-4" />
            Code
          </button>
          <button
            title="Database"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:text-white"
            type="button"
          >
            <Database className="h-4 w-4" />
          </button>
        </div>

        <button
          title="History"
          className="hidden h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white sm:flex"
          type="button"
        >
          <History className="h-4 w-4" />
        </button>
        <button
          title="Settings"
          className="hidden h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white sm:flex"
          type="button"
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          title="GitHub"
          className="hidden h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white lg:flex"
          type="button"
        >
          <Code2 className="h-4 w-4" />
        </button>
        <Button
          type="button"
          variant="outline"
          className="hidden border-zinc-800 bg-zinc-950 text-zinc-100 hover:bg-zinc-900 sm:inline-flex"
        >
          Share
        </Button>
        <Button
          type="button"
          className="bg-white text-zinc-950 hover:bg-zinc-200"
        >
          Publish
        </Button>
        <UserButton />
      </div>
    </header>
  );
}

export default function ProjectWorkspace({ projectId }: ProjectWorkspaceProps) {
  const { prompts, isLoading, error: historyError } = usePrompts(projectId);
  const {
    actions,
    isLoading: isActionLoading,
    error: actionError,
  } = useAction(projectId);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const sortedActions = useMemo(
    () =>
      [...actions].sort(
        (firstAction, secondAction) =>
          new Date(firstAction.createdAt).getTime() -
          new Date(secondAction.createdAt).getTime(),
      ),
    [actions],
  );

  const projectTitle = useMemo(
    () => getProjectTitle(prompts, projectId),
    [projectId, prompts],
  );

  const userPrompts = useMemo(
    () => prompts.filter((prompt) => prompt.type === "USER"),
    [prompts],
  );

  const workspaceFiles = useMemo(() => {
    const actionFiles = sortedActions
      .map(getActionFilePath)
      .filter((filePath): filePath is string => Boolean(filePath));

    return actionFiles.length > 0
      ? Array.from(new Set(actionFiles)).slice(-12)
      : fallbackFiles;
  }, [sortedActions]);

  const fileUpdates = sortedActions.filter((action) =>
    /^Updated file/i.test(action.content),
  ).length;
  const commandRuns = sortedActions.filter((action) =>
    /^Ran command/i.test(action.content),
  ).length;

  useEffect(() => {
    historyRef.current?.scrollTo({
      top: historyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [prompts.length, sortedActions.length]);

  async function sendPrompt() {
    const prompt = message.trim();

    if (!prompt || isSending) {
      return;
    }

    setMessage("");
    setIsSending(true);
    setSendError(null);

    try {
      await axios.post(`${WORKER_API_URL}/prompt`, {
        prompt,
        projectId,
      });
    } catch (err) {
      setMessage(prompt);
      setSendError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendPrompt();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendPrompt();
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0b0d] text-zinc-100">
      <ActivityRail />

      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceHeader projectTitle={projectTitle} />

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[620px] shrink-0 flex-col border-r border-zinc-800 bg-[#0d0d10]">
            <div
              ref={historyRef}
              className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
            >
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Project
                    </p>
                    <p className="mt-1 max-w-[420px] truncate text-lg font-semibold text-white">
                      {projectTitle}
                    </p>
                  </div>
                  <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-sm font-medium text-emerald-300">
                    Live
                  </span>
                </div>

                <section className="space-y-4">
                  {isLoading ? (
                    <div className="ml-auto h-16 w-56 animate-pulse rounded-xl bg-zinc-800" />
                  ) : userPrompts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-800 p-5 text-sm text-zinc-500">
                      No messages yet.
                    </div>
                  ) : (
                    userPrompts.map((prompt) => (
                      <article key={prompt.id} className="flex justify-end">
                        <div className="max-w-[72%] rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 shadow-lg">
                          <div className="mb-1 flex items-center justify-between gap-3 text-xs text-zinc-500">
                            <span>You</span>
                            <span>{getDisplayTime(prompt.createdAt)}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-100">
                            {prompt.content}
                          </p>
                        </div>
                      </article>
                    ))
                  )}
                </section>

                <section className="rounded-xl border border-zinc-900 bg-[#101014] p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-2xl font-black italic text-white">
                      bolt
                    </span>
                    <span className="rounded-md bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-300">
                      workspace
                    </span>
                  </div>

                  <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-100">
                    <Activity className="h-4 w-4 text-zinc-500" />
                    Plan
                  </div>

                  <div className="space-y-3">
                    {isActionLoading ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-6 animate-pulse rounded bg-zinc-800/80"
                        />
                      ))
                    ) : sortedActions.length > 0 ? (
                      sortedActions.slice(-6).map((action) => {
                        const Icon = getActionIcon(action.content);

                        return (
                          <div
                            key={action.id}
                            className="flex items-start gap-3 text-sm text-zinc-200"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <Icon className="h-4 w-4 shrink-0 text-zinc-500" />
                                <span className="truncate">
                                  {getActionLabel(action.content)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="flex items-start gap-3 text-sm text-zinc-300">
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                          Create a clean project workspace
                        </div>
                        <div className="flex items-start gap-3 text-sm text-zinc-300">
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                          Write the requested app files
                        </div>
                        <div className="flex items-start gap-3 text-sm text-zinc-300">
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                          Run the generated project
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-5 border-t border-zinc-800 pt-4 text-sm leading-6 text-zinc-300">
                    {actionError ? (
                      <p className="text-red-300">{actionError}</p>
                    ) : sortedActions.length > 0 ? (
                      <>
                        <p className="font-medium text-zinc-100">
                          Build progress
                        </p>
                        <ul className="mt-2 space-y-1 text-zinc-400">
                          <li>{fileUpdates} file updates written</li>
                          <li>{commandRuns} commands run</li>
                          <li>Workspace is ready for the next change</li>
                        </ul>
                      </>
                    ) : (
                      <p className="text-zinc-500">
                        Waiting for the worker to report build activity.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="shrink-0 border-t border-zinc-800 p-5"
            >
              {(historyError || sendError) && (
                <p className="mb-2 text-xs text-red-400">
                  {sendError ?? historyError}
                </p>
              )}
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 shadow-[0_0_0_1px_rgba(59,130,246,0.12)] focus-within:border-blue-500/70">
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="How can Bolt help you today? (or /command)"
                  disabled={isSending}
                  className="max-h-40 min-h-24 resize-none border-0 bg-transparent px-4 py-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
                />
                <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      title="Add"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                      type="button"
                    >
                      Standard
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="hidden items-center gap-1 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 sm:flex"
                      type="button"
                    >
                      <MousePointer2 className="h-4 w-4" />
                      Select
                    </button>
                    <button
                      className="hidden items-center gap-1 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 sm:flex"
                      type="button"
                    >
                      <Lightbulb className="h-4 w-4" />
                      Plan
                    </button>
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!message.trim() || isSending}
                      className="rounded-full bg-blue-500 text-white hover:bg-blue-400"
                      aria-label="Send message"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </aside>

          <main className="min-w-0 flex-1 bg-[#111113] p-3">
            <section className="flex h-full min-h-0 overflow-hidden rounded-xl border border-zinc-800 bg-[#151518]">
              <aside className="hidden w-[292px] shrink-0 border-r border-zinc-800 bg-[#141417] lg:block">
                <div className="flex h-12 items-center gap-6 border-b border-zinc-800 px-4">
                  <button
                    className="text-sm font-semibold text-zinc-100"
                    type="button"
                  >
                    Files
                  </button>
                  <button className="text-sm text-zinc-500" type="button">
                    Search
                  </button>
                </div>

                <div className="space-y-1 px-3 py-3 text-sm">
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                    type="button"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <Folder className="h-4 w-4" />
                    .bolt
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                    type="button"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <Folder className="h-4 w-4" />
                    app
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                    type="button"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <Folder className="h-4 w-4" />
                    components
                  </button>

                  <div className="mt-3 border-t border-zinc-800 pt-3">
                    {workspaceFiles.map((filePath) => (
                      <button
                        key={filePath}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                        type="button"
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate">{filePath}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 bg-[#151518] px-4">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <FileText className="h-4 w-4" />
                    <span className="text-zinc-100">Code workspace</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>TypeScript</span>
                    <span>Expo</span>
                  </div>
                </div>

                <div className="min-h-0 flex-1 bg-zinc-950">
                  <iframe
                    title={`Project ${projectId} code workspace`}
                    src={`${WORKER_URL}/`}
                    className="h-full w-full border-0"
                  />
                </div>

                <div className="h-[218px] shrink-0 border-t border-zinc-800 bg-[#101014]">
                  <div className="flex h-12 items-center gap-2 border-b border-zinc-800 px-4">
                    <span className="flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-100">
                      <Zap className="h-4 w-4 text-blue-300" />
                      Bolt
                    </span>
                    <span className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400">
                      <Rocket className="h-4 w-4" />
                      Publish Output
                    </span>
                    <span className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400">
                      <Terminal className="h-4 w-4" />
                      Terminal
                    </span>
                  </div>

                  <div className="h-[166px] overflow-y-auto px-5 py-4 font-mono text-xs leading-6">
                    {sortedActions.length > 0 ? (
                      sortedActions.slice(-8).map((action) => (
                        <div key={action.id} className="flex gap-3">
                          <span className="shrink-0 text-zinc-600">
                            {getDisplayTime(action.createdAt)}
                          </span>
                          <span
                            className={
                              /^Ran command/i.test(action.content)
                                ? "text-emerald-300"
                                : "text-blue-300"
                            }
                          >
                            [bolt]
                          </span>
                          <span className="truncate text-zinc-300">
                            {action.content}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="space-y-1 text-zinc-500">
                        <div>waiting for worker activity...</div>
                        <div>
                          generated files and command output will appear here
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
