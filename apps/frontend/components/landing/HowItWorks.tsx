import { Sparkles, Workflow, Rocket } from "lucide-react";
import { Reveal } from "./Reveal";

const steps = [
  {
    num: "01",
    icon: Sparkles,
    title: "Describe your idea",
    desc: "Tell App Forge what you want to build using plain English. Describe features, design preferences, authentication, APIs, or integrations in a single prompt.",
  },
  {
    num: "02",
    icon: Workflow,
    title: "AI plans your application",
    desc: "App Forge designs the architecture, creates screens, navigation, reusable components, state management, and backend structure automatically.",
  },
  {
    num: "03",
    icon: Rocket,
    title: "Generate production-ready code",
    desc: "Receive a clean React Native project with TypeScript, organized folders, reusable components, and everything needed to continue development.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="testimonials"
      className="border-t border-border px-6 py-32 md:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="flex items-end justify-between gap-8">
            <div className="max-w-2xl">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
                02 / How it works
              </span>
              <h2
                className="mt-5 font-bold tracking-[-0.03em] text-foreground"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  lineHeight: 1,
                }}
              >
                How App Forge builds your app.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                From a single prompt to a production-ready React Native
                application in minutes.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Steps */}
        <div className="relative mt-20">
          {/* connecting line (desktop) */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-[46px] hidden lg:block"
          >
            <div className="mx-[16.6%] flex items-center">
              <span className="h-2 w-2 shrink-0 rounded-full border border-border bg-background" />
              <span className="h-px flex-1 bg-border" />
              <span className="h-2 w-2 shrink-0 rounded-full border border-border bg-background" />
              <span className="h-px flex-1 bg-border" />
              <span className="h-2 w-2 shrink-0 rounded-full border border-border bg-background" />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.1} className="h-full">
                <div className="group relative h-full rounded-3xl border border-border bg-card p-9 shadow-[0_1px_2px_rgba(22,21,15,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-foreground/25 hover:shadow-[0_24px_50px_-30px_rgba(22,21,15,0.4)]">
                  <div className="flex items-start justify-between">
                    <span
                      className="tracking-[-0.03em] text-muted-foreground/50"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: "3.25rem",
                        lineHeight: 1,
                      }}
                    >
                      {s.num}
                    </span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-primary transition-transform duration-300 group-hover:scale-105">
                      <s.icon className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                  </div>
                  <h3 className="mt-8 text-xl font-semibold tracking-tight text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {s.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
