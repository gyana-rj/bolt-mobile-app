"use client";

import { BACKEND_URL } from "@/config";
import { Show, SignOutButton, useAuth } from "@clerk/nextjs";
import axios from "axios";
import {
  LogOut,
  MessageSquare,
  PanelLeft,
  Plus,
  Search,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Project = {
  id: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getProjectName(project: Project) {
  const rawName = project.description?.trim();

  if (!rawName) {
    return `Project ${project.id.slice(0, 8)}`;
  }

  return titleCase(rawName).slice(0, 48);
}

function getProjectDate(project: Project) {
  const date = new Date(project.createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Recent projects";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function Sidebar() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadProjects() {
      try {
        const token = await getToken();

        if (!token) {
          return;
        }

        const response = await axios.get<{ projects: Project[] }>(
          `${BACKEND_URL}/projects`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (isMounted) {
          setProjects(response.data.projects ?? []);
        }
      } catch {
        if (isMounted) {
          setProjects([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [getToken, isLoaded, isSignedIn]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return projects;
    }

    return projects.filter((project) =>
      getProjectName(project).toLowerCase().includes(query),
    );
  }, [projects, searchQuery]);

  const groupedProjects = useMemo(() => {
    return filteredProjects.reduce<Record<string, Project[]>>(
      (groups, project) => {
        const date = getProjectDate(project);
        groups[date] = groups[date] ?? [];
        groups[date].push(project);
        return groups;
      },
      {},
    );
  }, [filteredProjects]);

  function focusSearch() {
    setIsHovered(true);
    window.setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative z-50 flex h-screen shrink-0 flex-col overflow-hidden border-r border-zinc-800/80 bg-[#0A0A0B] py-3 transition-all duration-300 ease-in-out ${
        isHovered ? "w-[260px] px-3" : "w-[60px] px-2"
      }`}
    >
      <div
        className={`flex items-center gap-1 ${
          isHovered ? "justify-start px-1" : "flex-col gap-2"
        }`}
      >
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800/80 hover:text-zinc-200"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={focusSearch}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800/80 hover:text-zinc-200 ${
            isHovered ? "hidden" : "flex"
          }`}
          aria-label="Search projects"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 flex flex-1 flex-col overflow-hidden">
        <h2
          className={`mb-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase transition-opacity duration-300 ${
            isHovered ? "px-3 opacity-100" : "hidden opacity-0"
          }`}
        >
          Your projects
        </h2>

        <div
          className={`relative mb-4 transition-opacity duration-300 ${
            isHovered ? "block px-1 opacity-100" : "hidden opacity-0"
          }`}
        >
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-[#141416] py-1.5 pr-3 pl-9 text-sm text-zinc-200 transition-colors placeholder-zinc-500 focus:border-zinc-700 focus:outline-none"
          />
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 px-1">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-9 animate-pulse rounded-md bg-zinc-900"
                />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <p
              className={`text-sm text-zinc-500 ${
                isHovered ? "px-3" : "sr-only"
              }`}
            >
              No projects yet.
            </p>
          ) : (
            Object.entries(groupedProjects).map(([date, dateProjects]) => (
              <div key={date}>
                <h3
                  className={`mb-2 text-[11px] font-medium whitespace-nowrap text-zinc-500 transition-opacity duration-300 ${
                    isHovered ? "px-3 opacity-100" : "hidden opacity-0"
                  }`}
                >
                  {date}
                </h3>

                <div className="flex flex-col space-y-0.5">
                  {dateProjects.map((project) => {
                    const isActive = pathname === `/project/${project.id}`;

                    return (
                      <button
                        key={project.id}
                        onClick={() => router.push(`/project/${project.id}`)}
                        className={`group flex w-full items-center gap-3 rounded-md border py-2 text-left transition-colors ${
                          isActive
                            ? "border-zinc-800 bg-zinc-800/80"
                            : "border-transparent hover:border-zinc-800/50 hover:bg-zinc-800/60"
                        } ${isHovered ? "mx-0 px-2" : "mx-0 justify-center px-0"}`}
                        title={getProjectName(project)}
                        type="button"
                      >
                        <MessageSquare className="h-4 w-4 shrink-0 text-zinc-500 group-hover:text-zinc-400" />
                        <span
                          className={`truncate text-sm transition-opacity duration-300 ${
                            isActive
                              ? "text-zinc-100"
                              : "text-zinc-400 group-hover:text-zinc-200"
                          } ${isHovered ? "block opacity-100" : "hidden opacity-0"}`}
                        >
                          {getProjectName(project)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div
        className={`mt-auto flex flex-col gap-1 border-t border-zinc-800/50 pt-3 ${
          isHovered ? "px-1" : "items-center px-0"
        }`}
      >
        <button
          onClick={() => router.push("/")}
          className={`flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium whitespace-nowrap transition-colors hover:bg-zinc-800/80 ${
            isHovered ? "px-3 text-zinc-200" : "justify-center px-0"
          }`}
          type="button"
          title="Start new project"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900 text-zinc-200">
            <Plus className="h-5 w-5" />
          </span>
          <span
            className={`transition-opacity duration-300 ${
              isHovered ? "block opacity-100" : "hidden opacity-0"
            }`}
          >
            Start new project
          </span>
        </button>

        <Show when="signed-in">
          <SignOutButton>
            <button
              className={`flex w-full items-center gap-3 rounded-lg py-2 text-sm font-medium whitespace-nowrap text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200 ${
                isHovered ? "px-3" : "justify-center px-0"
              }`}
              type="button"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span
                className={`transition-opacity duration-300 ${
                  isHovered ? "block opacity-100" : "hidden opacity-0"
                }`}
              >
                Logout
              </span>
            </button>
          </SignOutButton>
        </Show>
      </div>
    </aside>
  );
}
