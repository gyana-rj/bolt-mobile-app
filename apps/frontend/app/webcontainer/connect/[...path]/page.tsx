"use client";

import { setupConnect } from "@webcontainer/api/connect";
import { useEffect, useState } from "react";

export default function WebContainerConnectPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This route is only meant to be opened by WebContainer (as a popup /
    // new tab with window.opener). Visiting it directly will fail.
    if (!window.opener) {
      setError(
        "Open this preview from the workspace (Open in new tab). Visiting the connect URL directly will not work.",
      );
      return;
    }

    try {
      setupConnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect preview");
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-sm text-zinc-700">
      <p>{error ?? "Connecting preview..."}</p>
    </main>
  );
}
