"use client";

import { MessageSquare, Search, LogOut } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { useState } from "react";

export default function Sidebar() {
  const [searchQuery, setSearchQuery] = useState("");

  const [isHovered, setIsHovered] = useState(false);

  const projects = [
    { id: 1, name: "asdasd" },
    { id: 2, name: "asdasd" },
    { id: 3, name: "asdasd" },
    { id: 4, name: "asdasd" },
    { id: 5, name: "asdasd" },
    { id: 6, name: "asdasd" },
  ];

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`h-screen bg-[#0A0A0A] border-r border-zinc-800 flex flex-col py-3 transition-all duration-300 ease-in-out shrink-0 overflow-hidden relative z-50 ${
        isHovered ? "w-[260px] px-3" : "w-[60px] px-2"
      }`}
    >
      
      {/* Start New Project Button */}
      <button className={`flex items-center gap-3 py-2.5 rounded-lg hover:bg-zinc-800/80 transition-colors w-full text-sm font-medium whitespace-nowrap ${isHovered ? "px-3" : "justify-center px-0"}`}>
        <MessageSquare className="w-5 h-5 shrink-0" />
        <span className={`transition-opacity duration-300 ${isHovered ? "opacity-100 block" : "opacity-0 hidden"}`}>
          Start new project
        </span>
      </button>

      {/* Projects Section */}
      <div className="mt-6 flex-1 flex flex-col overflow-hidden">
        <h2 className={`text-xs font-semibold text-zinc-400 mb-3 whitespace-nowrap transition-opacity duration-300 ${isHovered ? "opacity-100 px-3" : "opacity-0 hidden"}`}>
          Your projects
        </h2>
        
        {/* Search Bar */}
        <div className={`mb-4 relative transition-opacity duration-300 ${isHovered ? "opacity-100 block px-3" : "opacity-0 hidden"}`}>
          <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#141414] border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-zinc-700 transition-colors text-zinc-200 placeholder-zinc-500"
          />
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div>
            {/* Date Group Header */}
            <h3 className={`text-[11px] font-medium text-zinc-500 mb-2 whitespace-nowrap transition-opacity duration-300 ${isHovered ? "opacity-100 px-4" : "opacity-0 hidden"}`}>
              February 28, 2025
            </h3>
            
            {/* Project Items */}
            <div className="flex flex-col space-y-0.5">
              {projects.map((project) => (
                <button 
                  key={project.id} 
                  className={`flex items-center gap-3 py-2 rounded-md hover:bg-zinc-800/60 transition-colors w-full text-left group border border-transparent hover:border-zinc-800/50 ${isHovered ? "px-2 mx-1" : "justify-center px-0 mx-0"}`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-zinc-400" />
                  <span className={`text-sm text-zinc-400 group-hover:text-zinc-200 truncate transition-opacity duration-300 ${isHovered ? "opacity-100 block" : "opacity-0 hidden"}`}>
                    {project.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Logout Section */}
      <div className={`mt-auto pt-4 border-t border-zinc-800/50 pb-2 ${isHovered ? "px-2" : "px-0"}`}>
        <SignOutButton>
          <button className={`flex items-center gap-3 py-2 rounded-lg hover:bg-zinc-800/60 transition-colors w-full text-sm font-medium text-zinc-400 hover:text-zinc-200 whitespace-nowrap ${isHovered ? "px-3" : "justify-center px-0"}`}>
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={`transition-opacity duration-300 ${isHovered ? "opacity-100 block" : "opacity-0 hidden"}`}>
              Logout
            </span>
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}