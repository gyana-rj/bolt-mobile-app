import { Reveal } from "./Reveal";

const testimonials = [
  {
    quote:
      "We shipped our MVP in a weekend. What used to take a full sprint now happens before lunch. App Forge is genuinely part of our stack now.",
    name: "Maya Chen",
    role: "Founder, Trailhead",
    avatar:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=96&h=96&fit=crop&auto=format",
  },
  {
    quote:
      "The generated code is the cleanest I've seen from any AI tool. No spaghetti — I can actually read it, review it, and extend it.",
    name: "Devin Okafor",
    role: "Staff Engineer, Northwind",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&auto=format",
  },
  {
    quote:
      "As a designer, I finally prototype real, installable apps without waiting on eng. The live preview closed the gap for our whole team.",
    name: "Sofia Ramírez",
    role: "Product Design Lead, Cadence",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&auto=format",
  },
];

const stats: [string, string][] = [
  ["50k+", "Apps generated"],
  ["12k", "Active builders"],
  ["4.9/5", "Average rating"],
  ["99.9%", "Build uptime"],
];

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="border-t border-border px-6 py-32 md:px-10"
    >
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
              Loved by builders everywhere.
            </h2>
            <span className="hidden shrink-0 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground md:block">
              02 / Testimonials
            </span>
          </div>
        </Reveal>

        <div className="mt-20 grid gap-5 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08} className="h-full">
              <figure className="flex h-full flex-col justify-between rounded-3xl border border-border bg-card p-8 shadow-[0_1px_2px_rgba(22,21,15,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(22,21,15,0.4)]">
                <blockquote
                  className="text-xl leading-snug tracking-[-0.01em] text-foreground"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                >
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-8 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="h-10 w-10 rounded-full bg-secondary object-cover"
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {t.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        <div className="mt-20 grid grid-cols-2 gap-8 border-t border-border pt-14 sm:grid-cols-4">
          {stats.map(([stat, label], i) => (
            <Reveal key={label} delay={i * 0.06}>
              <div>
                <div
                  className="font-bold tracking-[-0.02em] text-foreground"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(2rem, 4vw, 3rem)",
                  }}
                >
                  {stat}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
