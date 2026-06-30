"use client";

import { useState } from "react";
import Prompt from "./Prompt";
import TemplateButtons from "./TemplateButtons";

export default function Hero() {
  const [promptValue, setPromptValue] = useState("");

  const handleBuild = () => {
    if (!promptValue.trim()) return;
    console.log("Triggering application assembly for:", promptValue);
  };

  return (
    <section className="relative flex flex-col items-center justify-center flex-1 px-4 py-20 bg-zinc-950 text-white overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-white/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 text-center flex flex-col items-center w-full max-w-3xl mx-auto space-y-8">
        
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            What do you want to build?
          </h1>
          {/* Increased text size to text-lg and made the color slightly brighter */}
          <p className="text-zinc-300 text-lg font-medium">
            Prompt, click generate and watch your app come to life.
          </p>
        </div>
        
        <div className="w-full flex flex-col items-center gap-6">
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