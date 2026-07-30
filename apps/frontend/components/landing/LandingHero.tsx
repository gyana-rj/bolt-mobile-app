"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";
import axios from "axios";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { BACKEND_URL, WORKER_API_URL } from "@/config";
import { PhoneMockup } from "./PhoneMockup";

const suggestions = [
  {
    label: "Fitness Tracker",
    prompt:
      "Build a fitness tracker with workout logging, a step counter and a progress chart, with a clean, modern mobile interface.",
  },
  {
    label: "Todo App",
    prompt: "Build a drag-and-drop kanban todo list manager application.",
  },
  {
    label: "AI Chat",
    prompt:
      "Create an AI chat app with conversation threads and streaming responses.",
  },
  {
    label: "E-commerce",
    prompt:
      "Design an e-commerce app with a product catalog, cart and checkout flow.",
  },
];

export function LandingHero() {
  const [prompt, setPrompt] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { getToken } = useAuth();
  const { openSignIn } = useClerk();
  const router = useRouter();

  async function createProject() {
    const value = prompt.trim();
    if (!value || isCreating) return;

    setIsCreating(true);
    try {
      const token = await getToken();
      if (!token) {
        openSignIn();
        return;
      }

      const response = await axios.post<{ projectId?: string }>(
        `${BACKEND_URL}/project`,
        { prompt: value },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const projectId = response.data.projectId;
      if (!projectId) {
        throw new Error("Backend did not return a projectId");
      }

      router.push(`/project/${projectId}`);
      axios
        .post(`${WORKER_API_URL}/prompt`, {
          prompt: value,
          projectId,
          savePrompt: false,
          resetProject: true,
        })
        .catch((error) => {
          console.error("Failed to start project generation", error);
        });
    } catch (error) {
      console.error("Failed to create project", error);
    } finally {
      setIsCreating(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createProject();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      createProject();
    }
  }

  return (
    <section className="overflow-x-clip px-6 pt-28 pb-24 md:px-10">
      <div className="mx-auto grid max-w-7xl items-center gap-x-20 gap-y-16 lg:grid-cols-[1.25fr_0.75fr]">
        {/* Left column */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-4 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground"
          >
            <span>App Forge</span>
            <span className="h-px w-16 bg-border" />
            <span>2027</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 font-bold tracking-[-0.03em] text-foreground"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.7rem, 5.9vw, 5.1rem)",
              lineHeight: 0.98,
            }}
          >
            Turn plain English into{" "}
            <span className="text-primary">production-ready</span> apps.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/80"
          >
            Describe your idea and App Forge ships clean, typed React Native code
            that runs on iOS and Android — from first prompt to the App Store.
          </motion.p>

          {/* Prompt card — primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 lg:w-[103%]"
          >
            <form
              onSubmit={handleSubmit}
              className="rounded-[28px] border border-border bg-card p-2 shadow-[0_24px_60px_-32px_rgba(22,21,15,0.45)] transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-[0_28px_70px_-30px_rgba(79,70,229,0.35)]"
            >
              <div className="flex min-h-[136px] flex-col p-6 md:p-7">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  disabled={isCreating}
                  placeholder="Describe your mobile app idea..."
                  className="w-full flex-1 resize-none bg-transparent text-lg leading-relaxed text-foreground placeholder:text-muted-foreground/80 focus:outline-none disabled:opacity-70"
                />
                <div className="mt-4 flex items-center justify-between">
                  <span className="hidden text-sm text-muted-foreground sm:block">
                    Press{" "}
                    <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
                      ↵
                    </kbd>{" "}
                    to generate
                  </span>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isCreating}
                    aria-label="Generate app"
                    className="group ml-auto inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-base font-medium text-primary-foreground shadow-[0_12px_28px_-10px_rgba(79,70,229,0.9)] transition-all duration-200 hover:scale-[1.03] active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                  >
                    {isCreating ? (
                      <>
                        Generating
                        <Loader2 className="h-[1.15rem] w-[1.15rem] animate-spin" strokeWidth={2} />
                      </>
                    ) : (
                      <>
                        Generate App
                        <ArrowRight className="h-[1.15rem] w-[1.15rem] transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Suggestion chips */}
            <div className="mt-5 flex flex-wrap gap-2.5">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setPrompt(s.prompt)}
                  className="rounded-full border border-border bg-transparent px-4 py-2 text-sm text-foreground/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right column — mockup */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="relative hidden lg:block lg:translate-x-[1%] lg:scale-105"
        >
          <PhoneMockup />
        </motion.div>
      </div>
    </section>
  );
}
