"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import axios from "axios";
import { useAuth, useClerk } from "@clerk/nextjs";
import { BACKEND_URL } from "@/config";

interface PromptProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
}

export default function Prompt({ value, onChange, onSubmit }: PromptProps) {
  const { getToken } = useAuth();
  const { openSignIn } = useClerk();

  const handleSubmit = async () => {
    const prompt = value.trim();

    if (!prompt) return;

    try {
      const token = await getToken();

      if (!token) {
        openSignIn();
        return;
      }

      const response = await axios.post(
        `${BACKEND_URL}/project`,
        { prompt },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(response.data);
      onSubmit();
    } catch (error) {
      console.error("Failed to create project", error);
    }
  };
  
  return (
    <div className="relative w-full max-w-2xl bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-sm focus-within:border-zinc-600 focus-within:bg-zinc-900 transition-all">
      <Textarea
        placeholder="Create a chess application..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[120px] max-h-[300px] bg-transparent border-0 resize-none text-white placeholder-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 p-6 text-lg leading-relaxed"
      />
      
      <div className="absolute bottom-3 right-3">
        <Button 
          onClick={handleSubmit}
          disabled={!value.trim()}
          size="icon" 
          className="bg-white hover:bg-zinc-200 text-black rounded-xl h-10 w-10 flex items-center justify-center transition-all disabled:opacity-20 disabled:hover:bg-white cursor-pointer"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
