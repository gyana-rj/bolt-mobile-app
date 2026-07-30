import {
  FolderOpen,
  MessageSquarePlus,
  MonitorPlay,
  Sparkles,
  UserRound,
} from "lucide-react";

const STEPS = [
  {
    icon: UserRound,
    title: "Sign in",
    description:
      "Create an account or sign in so your projects stay saved and linked to you.",
  },
  {
    icon: Sparkles,
    title: "Describe your app",
    description:
      "Type what you want in plain English, or pick a starter template like a chess or todo app.",
  },
  {
    icon: MessageSquarePlus,
    title: "Generate & iterate",
    description:
      "We create a project and start building. In the workspace, keep chatting to refine screens, features, and UI.",
  },
  {
    icon: MonitorPlay,
    title: "Preview your app live",
    description:
      "Watch file updates and build steps as they happen. When generation finishes, your app builds and runs automatically in the Preview tab — no commands to type.",
  },
  {
    icon: FolderOpen,
    title: "Find past work",
    description:
      "Hover the sidebar to search and reopen previous projects, or hit + to start a new one.",
  },
];

export default function Docs() {
  return (
    <section
      id="docs"
      className="relative z-10 scroll-mt-8 border-t border-zinc-800/80 px-6 py-20"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <p className="text-sm font-medium tracking-wide text-[#2B7FFF]">
            Docs
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            How to use App Forge
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-zinc-400">
            Prompt your way from idea to a working React Native app. Here is the
            flow from first prompt to a live preview.
          </p>
        </div>

        <ol className="space-y-4">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-[#0A0A0B] text-[#2B7FFF]">
                <step.icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 pt-0.5 text-left">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-zinc-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-semibold text-white">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5 text-left">
          <h3 className="text-sm font-semibold text-white">Tips for better builds</h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-400">
            <li>
              Be specific about screens, data, and interactions (e.g. “a fitness
              tracker with workout logging and a progress chart”).
            </li>
            <li>
              Use Shift + Enter for a new line in the prompt. Enter submits.
            </li>
            <li>
              After the first build, send follow-up prompts in the project chat
              to add features or fix issues.
            </li>
            <li>
              Your app starts automatically once the build finishes — switch to
              the{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
                Preview
              </code>{" "}
              tab to see it running live.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
