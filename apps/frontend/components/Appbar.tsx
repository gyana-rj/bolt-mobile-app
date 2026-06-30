"use client";

import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs';

export default function Appbar() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span className="text-xl font-bold text-white tracking-tight">
          bolt<span className="text-zinc-500">.new</span>
        </span>
      </div>
      <div className="flex items-center space-x-4">
        <Show when="signed-out">
          
          {/* Removed asChild */}
          <SignInButton mode="modal">
            <Button variant="ghost" className="text-zinc-400 hover:text-white cursor-pointer">
              Sign In
            </Button>
          </SignInButton>
          
          {/* Removed asChild */}
          <SignUpButton mode="modal">
            <Button className="bg-white hover:bg-zinc-200 text-black font-medium cursor-pointer">
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