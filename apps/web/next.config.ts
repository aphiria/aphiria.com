import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Use standalone output for SSR with optimized Docker deployments
    // This enables server-side rendering while creating minimal production bundles
    output: "standalone",
};

export default nextConfig;
