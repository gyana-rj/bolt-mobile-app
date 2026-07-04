import Appbar from "@/components/Appbar";
import Hero from "@/components/Hero";
import Sidebar from "@/components/Sidebar";

export default function Home() {
  return (
 
    <div className="flex h-screen w-full bg-zinc-950 font-sans antialiased selection:bg-zinc-800 selection:text-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto">
        <Appbar />
        <main className="flex flex-col flex-1 items-center justify-center p-4">
          <Hero />
        </main>
      </div>
      
    </div>
  );
}