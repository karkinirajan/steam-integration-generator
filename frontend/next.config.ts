import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The browser calls /api on this origin; Next.js forwards it to FastAPI. API_URL is read when the server starts
  // in development, and baked in by `next build` for production (the Docker image passes it as a build argument).
  async rewrites() {
    const api = process.env.API_URL ?? "http://localhost:8000";
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
