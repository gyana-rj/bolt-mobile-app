"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Logo } from "./Logo";
import { Reveal } from "./Reveal";

export function Contact() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSent(true);
  };

  return (
    <section id="contact" className="border-t border-border px-6 py-32 md:px-10">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            03 / Contact
          </span>

          <div className="mt-8 grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <h2
              className="font-bold tracking-[-0.03em] text-foreground"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
                lineHeight: 0.98,
              }}
            >
              Let&apos;s build something worth shipping.
            </h2>

            <div>
              <p className="max-w-md text-lg text-foreground/80">
                Join the waitlist for early access, or reach out to talk to our
                team about your project.
              </p>

              <form
                onSubmit={submit}
                className="mt-6 flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="flex-1 rounded-full border border-border bg-[var(--input-background)] px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-[0_8px_20px_-8px_rgba(79,70,229,0.8)] transition-transform hover:scale-[1.03] active:scale-95"
                >
                  {sent ? (
                    <>
                      <Check className="h-4 w-4" /> Joined
                    </>
                  ) : (
                    <>
                      Get started <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
              <p className="mt-4 text-xs text-muted-foreground">
                No spam. Unsubscribe anytime · hello@appforge.dev
              </p>
            </div>
          </div>
        </Reveal>

        <footer className="mt-28 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <Logo />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} App Forge. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="transition-colors hover:text-primary">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-primary">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-primary">
              Docs
            </a>
          </div>
        </footer>
      </div>
    </section>
  );
}
