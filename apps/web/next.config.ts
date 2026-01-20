import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Use static export for production builds, standard mode for development
    // This allows middleware/proxy to work in dev, while generating static files for deployment
    ...(process.env.NODE_ENV === "production" && { output: "export" }),
};

export default nextConfig;
