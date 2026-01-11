import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Disable React Compiler during production builds to save memory
  reactCompiler: process.env.NODE_ENV === "development",
  
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  
  experimental: {
    optimizePackageImports: ["@prisma/client", "googleapis", "framer-motion", "lucide-react"],
    // Reduce memory usage during builds
    workerThreads: false,
    cpus: 1,
  },
  
  // Disable source maps in production builds to save memory
  productionBrowserSourceMaps: false,
  
  // Explicitly pin the Turbopack root to this project to avoid mis-detection
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
