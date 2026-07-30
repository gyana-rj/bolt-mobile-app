import {
  Smartphone,
  ShieldCheck,
  Route,
  Boxes,
  Server,
  FileType,
  Component,
  FolderTree,
  ArrowDown,
} from "lucide-react";
import { Reveal } from "./Reveal";

const features = [
  {
    icon: Smartphone,
    title: "React Native",
    desc: "Production-ready Expo project with a scalable folder structure.",
  },
  {
    icon: ShieldCheck,
    title: "Authentication",
    desc: "Authentication flows ready for Firebase, Clerk, Supabase or Appwrite.",
  },
  {
    icon: Route,
    title: "Navigation",
    desc: "Automatically generated navigation and routing between screens.",
  },
  {
    icon: Boxes,
    title: "State Management",
    desc: "Clean, organized application state with modern best practices.",
  },
  {
    icon: Server,
    title: "API Layer",
    desc: "Ready-to-use services, API calls and typed data models.",
  },
  {
    icon: FileType,
    title: "TypeScript",
    desc: "Strongly typed codebase that is easy to extend and maintain.",
  },
  {
    icon: Component,
    title: "Reusable Components",
    desc: "Clean UI components designed for scalability and consistency.",
  },
  {
    icon: FolderTree,
    title: "Production Structure",
    desc: "Organized folders, assets, utilities and configuration from day one.",
  },
];

export function EverythingIncluded() {
  return (
    <section className="border-t border-border px-6 py-32 md:px-10">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              03 / Everything included
            </span>
            <h2
              className="mt-5 font-bold tracking-[-0.03em] text-foreground"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                lineHeight: 1,
              }}
            >
              Everything you need to ship faster.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              App Forge generates far more than screens. Every project includes
              production-ready architecture, navigation, reusable components, and
              everything required to continue building immediately.
            </p>
          </div>
        </Reveal>

        <div className="mt-20 grid gap-5 sm:grid-cols-2">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 2) * 0.08} className="h-full">
              <div className="group flex h-full items-start gap-5 rounded-3xl border border-border bg-card p-8 shadow-[0_1px_2px_rgba(22,21,15,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-foreground/25 hover:shadow-[0_24px_50px_-30px_rgba(22,21,15,0.4)]">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-foreground/70 transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-[var(--accent-soft)] group-hover:text-primary">
                  <f.icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Bottom CTA */}
        <Reveal delay={0.1}>
          <div className="mt-20 flex flex-col items-center text-center">
            <p
              className="tracking-[-0.01em] text-foreground"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(1.1rem, 2vw, 1.35rem)",
              }}
            >
              Everything generated is yours to edit, extend and ship.
            </p>
            <span className="mt-6 h-px w-14 bg-border" />
            <ArrowDown
              className="mt-6 h-5 w-5 animate-bounce text-primary"
              strokeWidth={2}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
