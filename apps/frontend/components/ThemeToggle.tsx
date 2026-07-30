"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, mounted } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground",
        className,
      )}
    >
      {/* Render neither icon until mounted, so SSR and client agree. */}
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4" strokeWidth={2} />
        ) : (
          <Moon className="h-4 w-4" strokeWidth={2} />
        )
      ) : (
        <span className="h-4 w-4" />
      )}
    </button>
  );
}
