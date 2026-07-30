"use client";

import { useWebContainer } from "@/components/WebContainerProvider";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef } from "react";

const NON_INTERACTIVE_ENV = {
  npm_config_yes: "true",
  EXPO_NO_TELEMETRY: "1",
  BROWSER: "none",
};

export default function WebContainerTerminal() {
  const { instance, status } = useWebContainer();
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current || status !== "ready" || !instance) {
      return;
    }

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
      fontSize: 12,
      theme: {
        background: "#09090b",
        foreground: "#e4e4e7",
        cursor: "#e4e4e7",
        selectionBackground: "#3f3f46",
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();
    terminalRef.current = terminal;

    let shellProcess: Awaited<ReturnType<typeof instance.spawn>> | null = null;
    let inputWriter: WritableStreamDefaultWriter<string> | null = null;
    let disposed = false;

    const startShell = async () => {
      shellProcess = await instance.spawn("jsh", {
        terminal: { cols: terminal.cols, rows: terminal.rows },
        env: NON_INTERACTIVE_ENV,
      });

      if (disposed) {
        shellProcess.kill();
        return;
      }

      shellProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.write(data);
          },
        }),
      );

      inputWriter = shellProcess.input.getWriter();
      terminal.onData((data) => {
        void inputWriter?.write(data);
      });
    };

    void startShell();

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      shellProcess?.resize({ cols: terminal.cols, rows: terminal.rows });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      void inputWriter?.close();
      shellProcess?.kill();
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [instance, status]);

  if (status !== "ready") {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950 text-xs text-zinc-500">
        {status === "booting"
          ? "Starting terminal…"
          : status === "error"
            ? "Terminal unavailable"
            : "Waiting for sandbox…"}
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full bg-zinc-950 p-1" />;
}
