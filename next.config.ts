import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable React Compiler during production builds to save memory
  reactCompiler: process.env.NODE_ENV === "development",
  
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  
  experimental: {
    optimizePackageImports: ["@prisma/client", "googleapis", "framer-motion", "lucide-react", "ably"],
    // Reduce memory usage during builds
    workerThreads: false,
    cpus: 1,
  },
  
  // Disable source maps in production builds to save memory
  productionBrowserSourceMaps: false,
  
  // Explicitly set turbopack root to this project folder to prevent scanning parent directories
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
