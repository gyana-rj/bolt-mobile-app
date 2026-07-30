"use client";

import { useEffect, useState } from "react";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "./Logo";

const links = [
  { label: "Features", href: "#features", id: "features" },
  { label: "How it works", href: "#testimonials", id: "testimonials" },
  { label: "Contact", href: "#contact", id: "contact" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    links.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
        <Logo />

        <div className="hidden items-center gap-2 md:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                active === l.id
                  ? "text-foreground"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {l.label}
              {active === l.id && (
                <span className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-primary" />
              )}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="mr-2 sm:mr-4" />

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="hidden cursor-pointer rounded-full px-4 py-2 text-sm text-foreground/70 transition-colors hover:text-foreground sm:inline-block">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="cursor-pointer rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_8px_20px_-8px_rgba(79,70,229,0.8)] transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_10px_28px_-8px_rgba(79,70,229,0.9)] active:scale-95">
                Get Started
              </button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </nav>
    </header>
  );
}
