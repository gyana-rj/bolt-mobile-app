"use client";

import { BACKEND_URL } from "@/config";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";

export type Action = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
};

export function useAction(projectId: string) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setActions([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    async function getActions() {
      try {
        const token = await getToken();
        if (!token) {
          return;
        }

        const response = await axios.get<{ actions: Action[] }>(
          `${BACKEND_URL}/actions/${projectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (isMounted) {
          setActions(response.data.actions ?? []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load build activity");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    getActions();
    const interval = window.setInterval(getActions, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [getToken, isLoaded, isSignedIn, projectId]);

  return {
    actions,
    isLoading,
    error,
  };
}
