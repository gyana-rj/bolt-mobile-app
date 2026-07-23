"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import axios from "axios";
import { useAuth, useClerk } from "@clerk/nextjs";
import { BACKEND_URL, WORKER_API_URL } from "@/config";
import { useRouter } from "next/navigation";
import { type FormEvent, type KeyboardEvent, useState } from "react";

interface PromptProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
}

export default function Prompt({ value, onChange, onSubmit }: PromptProps) {
  const { getToken } = useAuth();
  const { openSignIn } = useClerk();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function createProject() {
    const prompt = value.trim();

    if (!prompt || isCreating) {
      return;
    }

    setIsCreating(true);

    try {
      const token = await getToken();

      if (!token) {
        openSignIn();
        return;
      }

      const response = await axios.post<{ projectId?: string }>(
        `${BACKEND_URL}/project`,
        { prompt },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const projectId = response.data.projectId;
      if (!projectId) {
        throw new Error("Backend did not return a projectId");
      }

      router.push(`/project/${projectId}`);
      axios
        .post(`${WORKER_API_URL}/prompt`, {
          prompt,
          projectId: response.data.projectId,
          savePrompt: false,
          resetProject: true,
        })
        .catch((error) => {
          console.error("Failed to start project generation", error);
        });
      onSubmit();
    } catch (error) {
      console.error("Failed to create project", error);
    } finally {
      setIsCreating(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    <form
      onSubmit={handleSubmit}
      className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#121214]/90 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-colors focus-within:border-zinc-600"
    >
      <Textarea
        placeholder="e.g. A fitness tracker with workout logging, a step counter and a progress chart..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isCreating}
        className="min-h-[140px] max-h-[300px] w-full resize-none border-0 bg-transparent p-5 pb-14 text-base leading-relaxed text-white placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-[15px]"
      />

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-3">
        <span className="text-xs text-zinc-600">Shift + Enter for new line</span>
        <Button
          type="submit"
          disabled={!value.trim() || isCreating}
          size="icon"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#2B7FFF] text-white transition-all hover:bg-[#1A6FEF] disabled:opacity-30 disabled:hover:bg-[#2B7FFF]"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
