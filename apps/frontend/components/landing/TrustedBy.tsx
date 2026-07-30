import { Reveal } from "./Reveal";

const techs = [
  "React Native",
  "Expo",
  "Firebase",
  "Supabase",
  "OpenAI",
  "TypeScript",
];

export function TrustedBy() {
  return (
    <section className="px-6 pb-8 md:px-10">
      <Reveal>
        <div className="mx-auto max-w-7xl border-t border-border pt-10">
          <p className="text-center font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Builds on the tools you already trust
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {techs.map((t) => (
              <span
                key={t}
                className="text-lg font-semibold tracking-tight text-foreground/45 transition-colors hover:text-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
