import Appbar from "@/components/Appbar";
import Hero from "@/components/Hero";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans antialiased selection:bg-zinc-800 selection:text-white">
      <Appbar />
      <main className="flex flex-col flex-1">
        <Hero />
      </main>
    </div>
  );
}