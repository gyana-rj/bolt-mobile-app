"use client";

import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Smartphone } from "lucide-react";
import Link from "next/link";

export default function Appbar() {
  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-4">
      <Link
        href="/"
        className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-90"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2B7FFF] shadow-[0_0_20px_rgba(43,127,255,0.35)]">
          <Smartphone className="h-4 w-4 text-white" strokeWidth={2.25} />
        </span>
        <span className="text-[17px] font-semibold tracking-tight">
          App Forge
        </span>
      </Link>

      <div className="flex items-center gap-1 sm:gap-2">
        <a
          href="#docs"
          className="hidden rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-white sm:inline-block"
        >
          Docs
        </a>

        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button
              variant="ghost"
              className="cursor-pointer text-zinc-400 hover:bg-transparent hover:text-white"
            >
              Sign In
            </Button>
          </SignInButton>

          <SignUpButton mode="modal">
            <Button className="cursor-pointer rounded-lg bg-[#2B7FFF] px-4 font-medium text-white hover:bg-[#1A6FEF]">
              Get Started
            </Button>
          </SignUpButton>
        </Show>

        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
