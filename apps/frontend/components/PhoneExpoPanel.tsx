"use client";

import { useExpoTunnel } from "@/hooks/useExpoTunnel";
import { Check, Copy, Loader2, RotateCcw, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";

const STATUS_LABEL: Record<string, string> = {
  installing: "Installing dependencies on the server…",
  starting: "Starting the Expo tunnel…",
  idle: "Preparing…",
};

// Turns a raw worker/Expo error into a short, human explanation. Falls back to
// the original text so we never hide a genuinely novel failure.
function friendlyError(raw: string | null): string {
  if (!raw) return "The phone preview couldn't be started.";
  if (/in use|eaddrinuse|another (?:expo|metro)/i.test(raw)) {
    return "Another dev server is still running on the port the preview needs. Give it a few seconds to shut down, then try again.";
  }
  if (/timed out/i.test(raw)) {
    return "Setting up the tunnel took too long. This is usually a slow network or the server still installing — try again in a moment.";
  }
  if (/worker/i.test(raw)) {
    return "Couldn't reach the build server to start the phone preview. Make sure the workspace preview is running, then try again.";
  }
  return raw;
}

/**
 * Renders the native Expo Go entry point: a QR encoding the worker's
 * `exp://…exp.direct` tunnel URL. Because the tunnel is public, scanning it in
 * Expo Go opens the real native app from any network — no shared WiFi needed.
 */
export default function PhoneExpoPanel({
  projectId,
  buildCount,
}: {
  projectId: string;
  buildCount: number;
}) {
  // Bumping this restarts the (now-idle) worker session after a failure.
  const [reloadToken, setReloadToken] = useState(0);
  // Mounting this panel is the signal to start the (heavy) server-side session.
  const { status, url, error } = useExpoTunnel(projectId, true, reloadToken);
  const [copied, setCopied] = useState(false);

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  // The build count this tunnel was serving when it became ready. If a later
  // build lands, the phone's Metro bundle is stale until we restart Expo.
  const [buildAtReady, setBuildAtReady] = useState<number | null>(null);
  useEffect(() => {
    if (status !== "ready") {
      setBuildAtReady(null);
      return;
    }
    setBuildAtReady((prev) => (prev === null ? buildCount : prev));
  }, [status, buildCount]);
  const isTunnelStale = buildAtReady !== null && buildCount > buildAtReady;

  // Auto-restart the tunnel when a newer build lands, at most once per build.
  // The restart flips status away from "ready" (clearing staleness), then a
  // fresh tunnel URL comes back — so re-triggering for the same build can't
  // loop. A later build bumps buildCount again and re-arms this.
  const autoRestartedForBuild = useRef<number | null>(null);
  useEffect(() => {
    if (isTunnelStale && autoRestartedForBuild.current !== buildCount) {
      autoRestartedForBuild.current = buildCount;
      retry();
    }
  }, [isTunnelStale, buildCount, retry]);

  // Whether the tunnel has been ready at least once: distinguishes a first-run
  // boot from an auto-rebuild so the loading copy can tell the user to re-scan.
  const hasBeenReady = useRef(false);
  useEffect(() => {
    if (status === "ready") hasBeenReady.current = true;
  }, [status]);

  const copyUrl = useCallback(() => {
    if (!url) return;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }, [url]);

  if (status === "error") {
    return (
      <div className="flex w-[240px] flex-col items-center gap-3 py-2 text-center">
        <Smartphone className="h-7 w-7 text-zinc-600" />
        <p className="text-sm font-medium text-red-400">
          Couldn&apos;t start the phone preview
        </p>
        <p className="text-xs leading-4 text-zinc-500">{friendlyError(error)}</p>
        <button
          type="button"
          onClick={retry}
          className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:text-zinc-100"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    );
  }

  if (status !== "ready" || !url) {
    const rebuilding = hasBeenReady.current;
    return (
      <div className="flex w-[240px] flex-col items-center gap-3 py-4 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
        <p className="text-sm font-medium text-zinc-100">
          {rebuilding
            ? "Rebuilding with your latest changes…"
            : (STATUS_LABEL[status] ?? "Preparing…")}
        </p>
        <p className="text-xs text-zinc-500">
          {rebuilding
            ? "A new QR code will appear in a moment — scan it again to update the app on your phone."
            : "First run builds the tunnel and installs dependencies on the server — this can take a minute."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-[240px] flex-col items-center gap-3">
      <div className="rounded-xl bg-white p-3 shadow-lg">
        <QRCodeSVG
          value={url}
          size={148}
          level="M"
          marginSize={0}
          fgColor="#0b0b0d"
          bgColor="#ffffff"
        />
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
        <Smartphone className="h-3.5 w-3.5 text-blue-400" />
        Scan in Expo Go
      </div>
      <ol className="w-full space-y-1 text-[11px] leading-4 text-zinc-500">
        <li>1. Install “Expo Go” from the App Store / Play Store.</li>
        <li>2. Open Expo Go → Scan QR code (Android) or the Camera app (iOS).</li>
        <li>3. Point it at the code above to launch the app.</li>
      </ol>
      <button
        type="button"
        onClick={copyUrl}
        className="flex w-full items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[11px] text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
        title="Copy the exp:// URL"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        )}
        <span className="truncate">{copied ? "Copied!" : url}</span>
      </button>
    </div>
  );
}
