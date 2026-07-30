import {
  Wand2,
  Smartphone,
  GitBranch,
  Gauge,
  ShieldCheck,
  Boxes,
} from "lucide-react";
import { Reveal } from "./Reveal";

const features = [
  {
    icon: Wand2,
    title: "Prompt to production",
    desc: "Describe a feature in plain English and get clean, typed React Native components in seconds.",
  },
  {
    icon: Smartphone,
    title: "iOS & Android, one codebase",
    desc: "Every build targets both platforms natively — no separate teams, no drift between apps.",
  },
  {
    icon: GitBranch,
    title: "Real code you own",
    desc: "Export to a Git repo anytime. No lock-in, no proprietary runtime, just readable source.",
  },
  {
    icon: Gauge,
    title: "Live preview",
    desc: "See changes render instantly on a device simulator as you refine your prompt.",
  },
  {
    icon: ShieldCheck,
    title: "Type-safe by default",
    desc: "Generated code ships with TypeScript, sensible state management, and passing lint.",
  },
  {
    icon: Boxes,
    title: "Component library built in",
    desc: "Navigation, forms, charts, and auth flows come pre-wired and ready to customize.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-border px-6 py-32 md:px-10">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="flex items-end justify-between gap-8">
            <h2
              className="max-w-2xl font-bold tracking-[-0.03em] text-foreground"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                lineHeight: 1,
              }}
            >
              Everything you need to ship a mobile app.
            </h2>
            <span className="hidden shrink-0 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground md:block">
              01 / Features
            </span>
          </div>
        </Reveal>

        <div className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08}>
              <div className="group h-full rounded-3xl border border-border bg-card p-8 shadow-[0_1px_2px_rgba(22,21,15,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_50px_-30px_rgba(22,21,15,0.4)]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-primary transition-transform duration-300 group-hover:scale-105">
                  <f.icon className="h-7 w-7" strokeWidth={1.75} />
                </div>
                <h3 className="mt-7 text-lg font-semibold tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
