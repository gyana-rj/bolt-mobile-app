import { VercelConfig } from "@vercel/config/v1";

// NOTE: COOP/COEP cross-origin-isolation headers are defined ONLY in
// next.config.ts (via headers()). Do not also set them here — two configs
// setting the same headers conflict and leave the page un-isolated, which
// breaks SharedArrayBuffer / WebContainer.
export const config: VercelConfig = {
    framework: 'nextjs',
    bunVersion: '1.x',
    installCommand: 'bun install',
    buildCommand: 'bun run build',
};