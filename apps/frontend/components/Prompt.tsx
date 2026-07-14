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
      className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-sm transition-all focus-within:border-zinc-600 focus-within:bg-zinc-900"
    >
      <Textarea
        placeholder="Create a chess application..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isCreating}
        className="w-full min-h-[120px] max-h-[300px] bg-transparent border-0 resize-none text-white placeholder-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 p-6 text-lg leading-relaxed"
      />

      <div className="absolute bottom-3 right-3">
        <Button
          type="submit"
          disabled={!value.trim() || isCreating}
          size="icon"
          className="bg-white hover:bg-zinc-200 text-black rounded-xl h-10 w-10 flex items-center justify-center transition-all disabled:opacity-20 disabled:hover:bg-white cursor-pointer"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
}
