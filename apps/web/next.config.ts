import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Use standalone output for SSR with optimized Docker deployments
    // This enables server-side rendering while creating minimal production bundles
    output: "standalone",

    // Security: Remove X-Powered-By header to avoid leaking Next.js version
    poweredByHeader: false,

    // Headers for caching and security
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN",
                    },
                    {
                        key: "X-XSS-Protection",
                        value: "1; mode=block",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
