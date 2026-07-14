"use client";

import { BACKEND_URL } from "@/config";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";

export type Prompt = {
  id: string;
  content: string;
  type: "USER" | "SYSTEM";
  createdAt: string;
};

export function usePrompts(projectId: string) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setPrompts([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    async function getPrompts() {
      try {
        const token = await getToken();
        if (!token) {
          return;
        }

        const response = await axios.get<{ prompts: Prompt[] }>(
          `${BACKEND_URL}/prompts/${projectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (isMounted) {
          setPrompts(response.data.prompts ?? []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load chat history");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    getPrompts();
    const interval = window.setInterval(getPrompts, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [getToken, isLoaded, isSignedIn, projectId]);

  return {
    prompts,
    isLoading,
    error,
  };
}
