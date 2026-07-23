"use client";

interface TemplateButtonsProps {
  onSelectTemplate: (text: string) => void;
}

const TEMPLATES = [
  {
    label: "Build a chess app",
    prompt:
      "Create a fully functional chess application with a clean UI using React and Tailwind.",
  },
  {
    label: "Create a todo app",
    prompt: "Build a drag-and-drop kanban todo list manager application.",
  },
  {
    label: "Create a docs app",
    prompt:
      "Design a markdown documentation viewer with side navigation and search capability.",
  },
  {
    label: "Create a base app",
    prompt: "Set up a clean boilerplate full-stack workspace setup.",
  },
];

export default function TemplateButtons({
  onSelectTemplate,
}: TemplateButtonsProps) {
  return (
    <div className="mt-1 flex max-w-2xl flex-wrap justify-center gap-2.5">
      {TEMPLATES.map((item) => (
        <button
          key={item.label}
          onClick={() => onSelectTemplate(item.prompt)}
          type="button"
          className="cursor-pointer rounded-full border border-zinc-800 bg-transparent px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:border-zinc-600 hover:bg-zinc-900/80 hover:text-zinc-200"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
