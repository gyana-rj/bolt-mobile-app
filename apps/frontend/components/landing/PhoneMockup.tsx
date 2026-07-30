"use client";

import { motion } from "motion/react";
import { Activity, Flame, Footprints, Check, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

function FloatCard({
  children,
  className = "",
  delay = 0,
  drift = 10,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  drift?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute z-20 ${className}`}
    >
      <motion.div
        animate={{ y: [0, -drift, 0] }}
        transition={{
          duration: 5 + drift / 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="rounded-2xl border border-border bg-background/90 p-4 shadow-[0_20px_50px_-20px_rgba(22,21,15,0.35)] backdrop-blur"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function PhoneMockup() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      {/* soft glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-soft)] blur-[80px]"
      />

      {/* Phone */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotate: -4 }}
        animate={{ opacity: 1, y: 0, rotate: -4 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="relative h-[440px] w-[216px] rounded-[2.75rem] border border-border bg-foreground p-2 shadow-[0_40px_80px_-30px_rgba(22,21,15,0.5)]">
          {/* notch */}
          <div className="absolute left-1/2 top-3 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-foreground" />
          <div className="flex h-full w-full flex-col overflow-hidden rounded-[2.25rem] bg-background">
            {/* app header */}
            <div className="px-5 pb-4 pt-8">
              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Tuesday
              </div>
              <div
                className="mt-1 text-foreground"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "1.35rem",
                }}
              >
                Today&apos;s Move
              </div>
            </div>

            {/* ring stat */}
            <div className="mx-5 rounded-2xl bg-primary p-4 text-primary-foreground">
              <div className="flex items-center justify-between">
                <span className="text-xs opacity-80">Daily goal</span>
                <Flame className="h-4 w-4" />
              </div>
              <div
                className="mt-2"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "1.6rem",
                }}
              >
                8,240
              </div>
              <div className="text-[11px] opacity-80">steps · 82% complete</div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                <div className="h-full w-[82%] rounded-full bg-white" />
              </div>
            </div>

            {/* list rows */}
            <div className="mt-4 space-y-2 px-5">
              {[
                { icon: Footprints, label: "Morning walk", meta: "2.1 km" },
                { icon: Activity, label: "Strength", meta: "34 min" },
                { icon: Flame, label: "Calories", meta: "512 kcal" },
              ].map((r) => (
                <div
                  key={r.label}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-primary">
                    <r.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] font-medium text-foreground">
                      {r.label}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.meta}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating: AI status */}
      <FloatCard className="left-0 top-8 hidden sm:block" delay={0.3} drift={12}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[12px] font-medium text-foreground">
              Generating app…
            </div>
            <div className="flex items-center gap-1 text-[11px] text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              screens · navigation · state
            </div>
          </div>
        </div>
      </FloatCard>

      {/* Floating: code snippet */}
      <FloatCard className="bottom-10 left-2 hidden md:block" delay={0.5} drift={9}>
        <div className="w-52">
          <div className="mb-2 flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-border" />
            <span className="h-2 w-2 rounded-full bg-border" />
            <span className="h-2 w-2 rounded-full bg-border" />
          </div>
          <pre className="font-mono text-[10px] leading-relaxed text-foreground/80">
            {`export function `}
            <span className="text-primary">Home</span>
            {`() {
  return (
    <`}
            <span className="text-primary">Screen</span>
            {`>
      <StepRing />
    </Screen>
  )
}`}
          </pre>
        </div>
      </FloatCard>

      {/* Floating: component ready */}
      <FloatCard className="right-0 top-24 hidden sm:block" delay={0.7} drift={11}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-primary">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[12px] font-medium text-foreground">
              Component ready
            </div>
            <div className="text-[11px] text-muted-foreground">
              ProgressChart.tsx
            </div>
          </div>
        </div>
      </FloatCard>
    </div>
  );
}
