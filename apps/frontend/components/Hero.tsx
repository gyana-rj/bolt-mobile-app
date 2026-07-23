"use client";

import { useState } from "react";
import Prompt from "./Prompt";
import TemplateButtons from "./TemplateButtons";

export default function Hero() {
  const [promptValue, setPromptValue] = useState("");

  const handleBuild = () => {
    if (!promptValue.trim()) return;
  };

  return (
    <section className="relative flex w-full flex-col items-center justify-center px-4 py-8 text-white">
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-3.5 py-1.5 text-sm text-zinc-300 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Now available · React Native for iOS & Android
        </div>

        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-[3.25rem]">
          What do you want to build?
        </h1>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Describe your app in plain English. We turn your prompt into
          production-ready React Native code — ready to run on any device.
        </p>

        <div className="mt-10 flex w-full flex-col items-center gap-5">
          <Prompt
            value={promptValue}
            onChange={setPromptValue}
            onSubmit={handleBuild}
          />
          <TemplateButtons onSelectTemplate={setPromptValue} />
        </div>
      </div>
    </section>
  );
}
