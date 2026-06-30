"use client";

interface TemplateButtonsProps {
  onSelectTemplate: (text: string) => void;
}

const TEMPLATES = [
  { label: "Build a chess app", prompt: "Create a fully functional chess application with a clean UI using React and Tailwind." },
  { label: "Create a todo app", prompt: "Build a drag-and-drop kanban todo list manager application." },
  { label: "Create a docs app", prompt: "Design a markdown documentation viewer with side navigation and search capability." },
  { label: "Create a base app", prompt: "Set up a clean boilerplate full-stack workspace setup." },
];

export default function TemplateButtons({ onSelectTemplate }: TemplateButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center max-w-2xl mt-2">
      {TEMPLATES.map((item, idx) => (
        <button
          key={idx}
          onClick={() => onSelectTemplate(item.prompt)}
          className="px-4 py-2 text-sm font-medium rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}