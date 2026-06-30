import {ClerkProvider} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";

// Load the Inter font
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "bolt.new clone",
  description: "Next-gen developmental workspace interface application.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      {/* Apply the font globally */}
      <body className={`${inter.className} bg-zinc-950 text-zinc-50 antialiased`}>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}