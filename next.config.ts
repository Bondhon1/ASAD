import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

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
  
  // Optimize output for smaller serverless functions
  output: "standalone",
  
  // Externalize these packages to reduce bundle size
  serverExternalPackages: ["sharp"],
  
  // Explicitly set turbopack root to this project folder to prevent scanning parent directories
  turbopack: {
    root: process.cwd(),
  },
  
  // Optimize package imports to reduce bundle size
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude heavy binaries from serverless functions
      config.externals = config.externals || [];
      config.externals.push({
        'sharp': 'commonjs sharp',
      });
    }
    return config;
  },
};

export default nextConfig;
