"use client";

import { useWebContainer } from "@/components/WebContainerProvider";
import { ensureExpoServer } from "@/utils/expoServer";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// The Expo dev server emits `server-ready` the instant it starts listening, but
// Metro is still bundling the web bundle at that point (the "82.1%" progress
// lines). If we revealed the iframe immediately the user would stare at a blank
// white page until the bundle finished. Instead we keep an overlay up until we
// detect the bundle is done — or, as a safety net, until this many ms elapse.
const BUNDLE_REVEAL_FALLBACK_MS = 60_000;

// Pulls the "82.1%" bundling progress out of a Metro log line, if present.
function parseBundlePercent(line: string): number | null {
  const match = line.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const value = Number.parseFloat(match[1]!);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;
}

// Light-hearted lines shown while the (free-tier) sandbox spins up, so a slow
// first build feels intentional and friendly rather than broken.
const WAIT_QUIPS = [
  "Waking up the free-tier hamsters that power our servers… 🐹",
  "Compiling your app with love and a single CPU core… 💙",
  "Free servers run on hope, coffee, and a bit of duct tape ☕🔧",
  "No fast lane on the free tier, but we're hustling for you 🏃💨",
  "Bribing the cloud gremlins to hurry things along… 👾",
  "Assembling pixels one by one — free plans take the scenic route 🛤️",
];

/** Rotating funny line + a steady "be patient, it's a free instance" note. */
function FreeTierWaitNote({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * WAIT_QUIPS.length),
  );
  useEffect(() => {
    const id = window.setInterval(
      () => setIndex((n) => (n + 1) % WAIT_QUIPS.length),
      3500,
    );
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className={`max-w-sm text-xs leading-5 ${className}`}>
      <p className="text-zinc-300">{WAIT_QUIPS[index]}</p>
      <p className="mt-1 text-zinc-500">
        Heads up: this is running on a free instance, so it can take a little
        while. Thanks for your patience! 🙏
      </p>
    </div>
  );
}

/** Guidance shown when the preview won't come up, so users can get unstuck. */
function PreviewTroubleHint({ className = "" }: { className?: string }) {
  return (
    <p
      className={`max-w-sm rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] leading-5 text-zinc-500 ${className}`}
    >
      Preview still not showing? Open{" "}
      <span className="font-medium text-zinc-300">Logs</span> (top-right), copy
      the output, and paste it into the chat so we can help — or fix it locally.
    </p>
  );
}

interface WebContainerPreviewProps {
  /** Whether the Expo log overlay is visible (controlled from the workspace header). */
  showLogs?: boolean;
  /** Fired when the live preview URL changes (empty string when not ready). */
  onPreviewUrlChange?: (url: string) => void;
}

export default function WebContainerPreview({
  showLogs = false,
  onPreviewUrlChange,
}: WebContainerPreviewProps) {
  const {
    instance,
    status: containerStatus,
    error: bootError,
    statusMessage,
  } = useWebContainer();
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState("Waiting for sandbox…");
  const [error, setError] = useState<string | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [bundled, setBundled] = useState(false);
  const [bundlePercent, setBundlePercent] = useState<number | null>(null);
  // Subscribe to the page-level Expo server store. It is started exactly once
  // per WebContainer, so a follow-up prompt that remounts this component
  // reattaches to the already-running server (and its known URL) instead of
  // spawning a second `pnpm run web` that would collide on port 8081.
  useEffect(() => {
    if (containerStatus !== "ready" || !instance) {
      return;
    }

    const server = ensureExpoServer(instance);

    const sync = () => {
      const {
        url,
        error: serverError,
        logs: serverLogs,
        bundled: serverBundled,
      } = server.getState();
      if (url) {
        setPreviewUrl(url);
        setStatus("Bundling your app…");
      } else {
        setStatus("Starting Expo web server…");
      }
      setError(serverError);
      setLogs(serverLogs);
      if (serverBundled) setBundled(true);

      // Track the latest "82.1%" progress for the overlay's progress bar.
      let latestPercent: number | null = null;
      for (const line of serverLogs) {
        const percent = parseBundlePercent(line);
        if (percent !== null) latestPercent = percent;
      }
      if (latestPercent !== null) setBundlePercent(latestPercent);
    };

    sync();
    return server.subscribe(sync);
  }, [instance, containerStatus]);

  useEffect(() => {
    onPreviewUrlChange?.(previewUrl);
  }, [previewUrl, onPreviewUrlChange]);

  useEffect(() => {
    logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight });
  }, [logs]);

  // Count up the elapsed timer while we're still waiting for a live app.
  useEffect(() => {
    if ((previewUrl && bundled) || error || bootError) {
      return;
    }
    const interval = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(interval);
  }, [previewUrl, bundled, error, bootError]);

  // Safety net: if we never see a "Bundled" log line (fast/cached builds can
  // race past it), reveal the iframe anyway after a grace period so the user is
  // never stuck behind the overlay forever.
  useEffect(() => {
    if (!previewUrl || bundled) return;
    const timer = window.setTimeout(
      () => setBundled(true),
      BUNDLE_REVEAL_FALLBACK_MS,
    );
    return () => window.clearTimeout(timer);
  }, [previewUrl, bundled]);

  if (bootError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-zinc-950 p-8 text-center">
        <p className="text-sm text-red-400">{bootError}</p>
        <PreviewTroubleHint />
      </div>
    );
  }

  // Phase 1 — WebContainer is still booting / installing dependencies. No URL
  // exists yet, so there's nothing to scan; show the install progress instead.
  if (containerStatus !== "ready" || !instance) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-zinc-950 p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        <p className="text-sm font-medium text-zinc-100">{statusMessage}</p>
        <FreeTierWaitNote />
        <p className="text-xs text-zinc-600">{elapsed}s elapsed</p>
      </div>
    );
  }

  const showBundlingOverlay = !!previewUrl && !bundled && !error;
  const roundedPercent =
    bundlePercent !== null ? Math.round(bundlePercent) : null;

  return (
    <div className="relative h-full w-full bg-zinc-950">
      {/* The iframe is mounted as soon as we have a URL so its request kicks off
          Metro's bundling; the overlay sits on top until the bundle is done. */}
      {previewUrl && (
        <iframe
          title="App preview"
          src={previewUrl}
          className="h-full w-full border-0 bg-white"
          allow="cross-origin-isolated"
        />
      )}

      {/* Bundling overlay — replaces the blank white page while Metro builds. */}
      {showBundlingOverlay && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-zinc-950/98 p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />

            <div className="mt-1 text-sm font-medium text-zinc-100">
              {status || "Bundling your app…"}
            </div>
            <FreeTierWaitNote />
            <p className="max-w-sm text-[11px] text-zinc-600">
              Want it on your phone? Tap “Open on phone” for a scannable Expo Go
              code.
            </p>

            <div className="w-full max-w-xs">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{
                    width: `${roundedPercent ?? 8}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
                <span>{roundedPercent !== null ? `${roundedPercent}%` : "Starting…"}</span>
                <span>{elapsed}s elapsed</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBundled(true)}
              className="text-[11px] text-zinc-600 underline-offset-2 hover:text-zinc-400 hover:underline"
            >
              Show preview anyway
            </button>

            {elapsed > 25 && <PreviewTroubleHint className="mt-1" />}
          </div>
        </div>
      )}

      {/* Error / pre-URL waiting state. */}
      {(!previewUrl || error) && (
        <div className="absolute inset-0 z-10 flex flex-col items-stretch justify-center gap-6 bg-zinc-950 p-8">
          <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
            {error ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400">
                !
              </div>
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            )}
            <p
              className={`mt-4 text-sm font-medium ${
                error ? "text-red-400" : "text-zinc-100"
              }`}
            >
              {error ?? status}
            </p>
            {error ? (
              <>
                <p className="mt-1 text-xs text-zinc-500">
                  Something went wrong starting the preview.
                </p>
                <PreviewTroubleHint className="mt-3" />
              </>
            ) : (
              <>
                <FreeTierWaitNote className="mt-3 text-center" />
                <p className="mt-2 text-xs text-zinc-600">
                  {elapsed}s elapsed
                </p>
              </>
            )}
          </div>

          {logs.length > 0 && (
            <div
              ref={logsRef}
              className="mx-auto h-40 w-full max-w-md overflow-y-auto rounded-lg border border-zinc-800 bg-black/40 p-3 font-mono text-[11px] leading-5 text-zinc-400"
            >
              {logs.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-all">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expo log overlay, toggled from the workspace header. */}
      {previewUrl && showLogs && (
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-[45%] overflow-y-auto border-t border-zinc-800 bg-black/90 p-3 font-mono text-[11px] leading-5 text-zinc-300">
          {logs.length === 0 ? (
            <span className="text-zinc-500">No Expo output yet…</span>
          ) : (
            logs.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {line}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
