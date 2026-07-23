import { Smartphone } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-zinc-800/80 px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-white transition-opacity hover:opacity-90"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2B7FFF]">
              <Smartphone className="h-3.5 w-3.5 text-white" strokeWidth={2.25} />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              App Forge
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500">
            Turn plain-English prompts into production-ready React Native apps
            for iOS and Android.
          </p>
        </div>

        <div className="flex gap-12 text-sm">
          <div>
            <p className="font-medium text-zinc-300">Product</p>
            <ul className="mt-3 space-y-2 text-zinc-500">
              <li>
                <a
                  href="#docs"
                  className="transition-colors hover:text-zinc-300"
                >
                  Docs
                </a>
              </li>
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-zinc-300"
                >
                  Start building
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-zinc-300">Account</p>
            <ul className="mt-3 space-y-2 text-zinc-500">
              <li>
                <Link
                  href="/sign-in"
                  className="transition-colors hover:text-zinc-300"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-up"
                  className="transition-colors hover:text-zinc-300"
                >
                  Get started
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-3xl border-t border-zinc-800/60 pt-6 text-center text-xs text-zinc-600 sm:text-left">
        © {new Date().getFullYear()} App Forge. Build mobile apps with a
        prompt.
      </div>
    </footer>
  );
}
