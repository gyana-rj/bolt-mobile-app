import Appbar from "@/components/Appbar";
import Docs from "@/components/Docs";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Sidebar from "@/components/Sidebar";

export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0A0A0B] font-sans antialiased selection:bg-zinc-800 selection:text-white">
      <Sidebar />

      <div className="relative flex h-full flex-1 flex-col overflow-y-auto">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(39,39,42,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(39,39,42,0.35)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(43,127,255,0.08),transparent_50%)]"
        />

        <Appbar />

        <main className="relative z-10 flex flex-1 flex-col">
          <div className="flex min-h-[calc(100vh-4.5rem)] flex-col items-center justify-center p-4">
            <Hero />
          </div>
          <Docs />
          <Footer />
        </main>
      </div>
    </div>
  );
}
