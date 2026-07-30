import type { NextConfig } from "next";
/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // `credentialless` keeps the page cross-origin isolated (so
            // WebContainers / SharedArrayBuffer work) while still allowing
            // cross-origin scripts like Clerk's CDN to load. `require-corp`
            // would block clerk.browser.js and break ClerkProvider.
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
      {
        // Must come AFTER the catch-all so these override it. The connect
        // handshake needs window.opener; COOP: same-origin nulls it out.
        // This page must not be cross-origin isolated.
        source: "/webcontainer/connect/:path*",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "unsafe-none",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
