"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CodeWorkspace from "@/components/CodeWorkspace";
import { WebContainerProvider } from "@/components/WebContainerProvider";
import { WORKER_API_URL } from "@/config";
import { type Action, useAction } from "@/hooks/useAction";
import { type Prompt, usePrompts } from "@/hooks/usePrompt";
import { UserButton } from "@clerk/nextjs";
import axios from "axios";
import {
  Activity,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Terminal,
  Zap,
} from "lucide-react";
import Link from "next/link";
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

type ChatTurn = {
  id: string;
  prompt: Prompt;
  actions: Action[];
  isLatest: boolean;
};

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
    .replace(/^Queued command\s+/i, "Queue ")
    .replace(/^Skipped auto-start command\s+/i, "Skip ")
    .replace(
      /^You can run your app with (?:npm|pnpm) run web$/i,
      "You can run your app",
    )
    .replace(/^Started clean project workspace$/i, "Start clean workspace");
}

function getActionIcon(content: string) {
  const normalizedContent = content.toLowerCase();

  if (normalizedContent.includes("updated file")) {
    return FileText;
  }

  if (
    normalizedContent.includes("ran command") ||
    normalizedContent.includes("queued command")
  ) {
    return Terminal;
  }

  return Zap;
}

function isReadyAction(content: string) {
  return (
    /^Your app is ready\b/i.test(content) ||
    // Backward-compat: older projects logged a "run it yourself" message.
    /^You can run your app with (?:npm|pnpm) run web$/i.test(content)
  );
}

function getTurnActions(
  prompt: Prompt,
  nextPrompt: Prompt | undefined,
  sortedActions: Action[],
) {
  const start = new Date(prompt.createdAt).getTime();
  const end = nextPrompt
    ? new Date(nextPrompt.createdAt).getTime()
    : Number.POSITIVE_INFINITY;

  return sortedActions.filter((action) => {
    const createdAt = new Date(action.createdAt).getTime();
    return createdAt >= start && createdAt < end;
  });
}

function WorkspaceHeader({
  projectTitle,
  chatCollapsed,
  onToggleChat,
}: {
  projectTitle: string;
  chatCollapsed: boolean;
  onToggleChat: () => void;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-zinc-800 bg-[#0d0d10] px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onToggleChat}
          className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/80 px-3 text-sm font-medium text-zinc-100 shadow-sm transition-colors hover:border-blue-500/60 hover:bg-zinc-700"
          aria-label={chatCollapsed ? "Show chat panel" : "Hide chat panel"}
          title={chatCollapsed ? "Show chat panel" : "Hide chat panel"}
        >
          {chatCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 text-blue-400" />
          ) : (
            <PanelLeftClose className="h-4 w-4 text-blue-400" />
          )}
          <span className="hidden sm:inline">
            {chatCollapsed ? "Show chat" : "Hide chat"}
          </span>
        </button>
        <div className="flex items-center gap-2 text-zinc-500">
          <Link
            href="/"
            className="text-lg font-bold text-white hover:opacity-90"
          >
            App Forge
          </Link>
          <span>/</span>
        </div>
        <div className="min-w-0 truncate text-sm font-medium text-zinc-100 sm:text-base">
          {projectTitle}
        </div>
      </div>

      <div className="flex min-w-0 shrink items-center justify-end gap-3">
        <UserButton />
      </div>
    </header>
  );
}

function TurnBuildCard({
  actions,
  isBuilding,
}: {
  actions: Action[];
  isBuilding: boolean;
}) {
  const fileUpdates = actions.filter((action) =>
    /^Updated file/i.test(action.content),
  ).length;
  const commandRuns = actions.filter((action) =>
    /^Ran command/i.test(action.content),
  ).length;
  const isReady = actions.some((action) => isReadyAction(action.content));
  const visibleActions = actions.filter(
    (action) => !isReadyAction(action.content),
  );

  return (
    <section className="rounded-lg border border-zinc-900 bg-[#101014] p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">App Forge</span>
          <span className="rounded-md bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-300">
            workspace
          </span>
        </div>
        {isBuilding ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Building
          </span>
        ) : isReady ? (
          <span className="text-xs font-medium text-emerald-300">Ready</span>
        ) : null}
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-100">
        <Activity className="h-4 w-4 text-zinc-500" />
        Plan
      </div>

      <div className="space-y-3">
        {visibleActions.length > 0 ? (
          visibleActions.map((action) => {
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
        ) : isBuilding ? (
          <>
            <div className="flex items-start gap-3 text-sm text-zinc-300">
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-300" />
              Thinking and preparing files
            </div>
            <div className="flex items-start gap-3 text-sm text-zinc-500">
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
              Waiting for worker activity
            </div>
          </>
        ) : (
          <div className="flex items-start gap-3 text-sm text-zinc-500">
            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
            No file changes for this message
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-zinc-800 pt-4 text-sm leading-6 text-zinc-300">
        <p className="font-medium text-zinc-100">Build progress</p>
        <ul className="mt-2 space-y-1 text-zinc-400">
          <li>
            {fileUpdates} file update{fileUpdates === 1 ? "" : "s"} written
          </li>
          <li>
            {commandRuns} command{commandRuns === 1 ? "" : "s"} run
          </li>
          <li>
            {isBuilding
              ? "Working on your request"
              : isReady
                ? "Your app is running in the Preview tab"
                : "Finished this step"}
          </li>
        </ul>
      </div>
    </section>
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
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
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

  // The worker logs this action once the generated app is ready to run.
  const isProjectReady = useMemo(
    () => sortedActions.some((action) => isReadyAction(action.content)),
    [sortedActions],
  );

  // One ready-marker is logged per completed build, so this counts how many
  // times the app has been (re)generated. The preview/QR mounted at an earlier
  // count is stale — see CodeWorkspace, which drives the refresh prompts.
  const buildCount = useMemo(
    () => sortedActions.filter((action) => isReadyAction(action.content)).length,
    [sortedActions],
  );

  const userPrompts = useMemo(
    () => prompts.filter((prompt) => prompt.type === "USER"),
    [prompts],
  );

  const chatTurns = useMemo<ChatTurn[]>(() => {
    return userPrompts.map((prompt, index) => ({
      id: prompt.id,
      prompt,
      actions: getTurnActions(prompt, userPrompts[index + 1], sortedActions),
      isLatest: index === userPrompts.length - 1 && !pendingPrompt,
    }));
  }, [pendingPrompt, sortedActions, userPrompts]);

  useEffect(() => {
    if (!pendingPrompt) {
      return;
    }

    const hasMatchingPrompt = userPrompts.some(
      (prompt) => prompt.content.trim() === pendingPrompt.trim(),
    );

    if (hasMatchingPrompt) {
      setPendingPrompt(null);
    }
  }, [pendingPrompt, userPrompts]);

  useEffect(() => {
    historyRef.current?.scrollTo({
      top: historyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatTurns.length, pendingPrompt, sortedActions.length, isSending]);

  async function sendPrompt() {
    const prompt = message.trim();

    if (!prompt || isSending) {
      return;
    }

    setMessage("");
    setIsSending(true);
    setPendingPrompt(prompt);
    setSendError(null);

    try {
      await axios.post(`${WORKER_API_URL}/prompt`, {
        prompt,
        projectId,
      });
    } catch (err) {
      setMessage(prompt);
      setPendingPrompt(null);
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
      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceHeader
          projectTitle={projectTitle}
          chatCollapsed={isChatCollapsed}
          onToggleChat={() => setIsChatCollapsed((v) => !v)}
        />

        <div className="flex min-h-0 flex-1">
          <aside
            className={`${
              isChatCollapsed ? "hidden" : "flex"
            } w-[380px] shrink-0 flex-col border-r border-zinc-800 bg-[#0d0d10] xl:w-[420px] 2xl:w-[460px]`}
          >
            <div
              ref={historyRef}
              className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Project
                    </p>
                    <p className="mt-1 max-w-[300px] truncate text-base font-semibold text-white">
                      {projectTitle}
                    </p>
                  </div>
                  <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                    Live
                  </span>
                </div>

                {actionError && (
                  <p className="text-xs text-red-400">{actionError}</p>
                )}

                <section className="space-y-5">
                  {isLoading || isActionLoading ? (
                    <div className="space-y-3">
                      <div className="ml-auto h-16 w-56 animate-pulse rounded-xl bg-zinc-800" />
                      <div className="h-40 animate-pulse rounded-lg bg-zinc-900" />
                    </div>
                  ) : chatTurns.length === 0 && !pendingPrompt ? (
                    <div className="rounded-lg border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">
                      No messages yet.
                    </div>
                  ) : (
                    <>
                      {chatTurns.map((turn) => (
                        <div key={turn.id} className="space-y-3">
                          <article className="flex justify-end">
                            <div className="max-w-[82%] rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 shadow-lg">
                              <div className="mb-1 flex items-center justify-between gap-3 text-xs text-zinc-500">
                                <span>You</span>
                                <span>
                                  {getDisplayTime(turn.prompt.createdAt)}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-100">
                                {turn.prompt.content}
                              </p>
                            </div>
                          </article>

                          <TurnBuildCard
                            actions={turn.actions}
                            isBuilding={
                              turn.isLatest &&
                              (isSending ||
                                !turn.actions.some((action) =>
                                  isReadyAction(action.content),
                                ))
                            }
                          />
                        </div>
                      ))}

                      {pendingPrompt && (
                        <div className="space-y-3">
                          <article className="flex justify-end">
                            <div className="max-w-[82%] rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 shadow-lg">
                              <div className="mb-1 flex items-center justify-between gap-3 text-xs text-zinc-500">
                                <span>You</span>
                                <span>now</span>
                              </div>
                              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-100">
                                {pendingPrompt}
                              </p>
                            </div>
                          </article>

                          <TurnBuildCard actions={[]} isBuilding />
                        </div>
                      )}
                    </>
                  )}
                </section>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="shrink-0 border-t border-zinc-800 p-4"
            >
              {(historyError || sendError) && (
                <p className="mb-2 text-xs text-red-400">
                  {sendError ?? historyError}
                </p>
              )}
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 shadow-[0_0_0_1px_rgba(59,130,246,0.12)] focus-within:border-blue-500/70">
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="How can App Forge help you today? (or /command)"
                  disabled={isSending}
                  className="max-h-32 min-h-20 resize-none border-0 bg-transparent px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
                />
                <div className="flex items-center justify-end border-t border-zinc-800 px-3 py-2.5">
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
            </form>
          </aside>

          <main className="min-w-0 flex-1 bg-[#111113] p-2">
            <WebContainerProvider ready={isProjectReady}>
              <CodeWorkspace
                projectId={projectId}
                ready={isProjectReady}
                buildCount={buildCount}
              />
            </WebContainerProvider>
          </main>
        </div>
      </div>
    </div>
  );
}
