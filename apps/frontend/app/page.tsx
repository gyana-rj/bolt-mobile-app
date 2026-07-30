import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { TrustedBy } from "@/components/landing/TrustedBy";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { EverythingIncluded } from "@/components/landing/EverythingIncluded";
import { Contact } from "@/components/landing/Contact";

export default function Home() {
  return (
    <div className="landing-theme min-h-screen w-full bg-background text-foreground">
      <LandingNavbar />
      <main>
        <LandingHero />
        <TrustedBy />
        <Features />
        <HowItWorks />
        <EverythingIncluded />
        <Contact />
      </main>
    </div>
  );
}
