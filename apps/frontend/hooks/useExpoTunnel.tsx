"use client";

import { WORKER_API_URL } from "@/config";
import { useEffect, useState } from "react";

export type ExpoTunnelStatus =
  | "idle"
  | "installing"
  | "starting"
  | "ready"
  | "error";

export interface ExpoTunnelState {
  status: ExpoTunnelStatus;
  /** The exp://…exp.direct URL for Expo Go, once ready. */
  url: string | null;
  error: string | null;
}

const POLL_INTERVAL_MS = 2500;

/**
 * Drives the worker's server-side `expo start --tunnel` session for a project.
 * When `enabled` flips true it asks the worker to start (or reuse) the session,
 * then polls status until the tunnel URL is ready. Kept lazy on purpose: the
 * server-side dependency install + Expo boot is heavy, so nothing happens until
 * the user actually opens the "Open on phone" panel.
 */
export function useExpoTunnel(
  projectId: string,
  enabled: boolean,
  /**
   * Bump this to force a fresh start attempt. After an error the worker's
   * session is idle again, so re-POSTing restarts it — handy for a "Try again"
   * button without unmounting the panel.
   */
  reloadToken: number = 0,
): ExpoTunnelState {
  const [state, setState] = useState<ExpoTunnelState>({
    status: "idle",
    url: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled || !projectId) {
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const apply = (data: Partial<ExpoTunnelState>) => {
      if (active) setState((prev) => ({ ...prev, ...data }));
    };

    // The worker replies with JSON. A stale worker (missing this route) returns
    // an HTML 404, so guard against non-JSON before trusting the body.
    async function readSession(res: Response): Promise<ExpoTunnelState> {
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? "The worker doesn't have the Expo tunnel endpoint — restart it to pick up the latest routes."
            : `Worker returned ${res.status}.`,
        );
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          "The worker doesn't have the Expo tunnel endpoint — restart it to pick up the latest routes.",
        );
      }
      return (await res.json()) as ExpoTunnelState;
    }

    async function poll() {
      try {
        const data = await readSession(
          await fetch(`${WORKER_API_URL}/expo/session`),
        );
        if (!active) return;
        apply(data);
        if (data.status !== "ready" && data.status !== "error") {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (active) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    async function start() {
      apply({ status: "starting", error: null });
      try {
        const data = await readSession(
          await fetch(`${WORKER_API_URL}/expo/session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // A reload (token > 0) means the user asked for a fresh attempt —
            // force the worker to restart Expo so a stale bundle is rebuilt.
            body: JSON.stringify({ projectId, restart: reloadToken > 0 }),
          }),
        );
        if (!active) return;
        apply(data);
        if (data.status !== "ready" && data.status !== "error") {
          void poll();
        }
      } catch (err) {
        apply({
          status: "error",
          error:
            err instanceof Error
              ? err.message
              : "Couldn't reach the worker to start the Expo tunnel.",
        });
      }
    }

    void start();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [projectId, enabled, reloadToken]);

  return state;
}
