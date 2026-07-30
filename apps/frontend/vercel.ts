import { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
    framework: 'nextjs',
    bunVersion: '1.x',
    installCommand: 'bun install',
    buildCommand: 'bun run build',
    headers: [
        {
            source: '/((?!webcontainer/connect).*)',
            headers: [
                { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
                { key: 'Cross-Origin-Opener-Policy', value: 'same-origin'}
            ]
        },
        {
            source: '/((?!webcontainer/connect).*)',
            headers: [
                { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none'}
            ]
        }
    ]
};