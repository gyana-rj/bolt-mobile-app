"use client";

import { Button } from "@/components/ui/button";

export default function Appbar() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span className="text-xl font-bold text-white tracking-tight">
          bolt<span className="text-zinc-500">.new</span>
        </span>
      </div>
      <div className="flex items-center space-x-4">
        <Button variant="ghost" className="text-zinc-400 hover:text-white">
          Sign In
        </Button>
        <Button className="bg-white hover:bg-zinc-200 text-black font-medium">
          Get Started
        </Button>
      </div>
    </header>
  );
}