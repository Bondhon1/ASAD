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
    
    // Exclude heavy files from being traced into serverless functions
    outputFileTracingExcludes: {
      '*': [
        // Exclude sharp binaries from all routes except image upload routes
        'node_modules/@img/sharp-libvips-linux-x64/**/*',
        'node_modules/@img/sharp-libvips-linuxmusl-x64/**/*',
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
        '.git/**/*',
        // Exclude institutes data from all routes except suggestions
        'src/lib/institutes-data/**/*.json',
      ],
    },
    // Include institutes data ONLY for the suggestions route
    outputFileTracingIncludes: {
      '/api/institutes/suggestions': [
        'src/lib/institutes-data/**/*.json',
      ],
      // Include sharp ONLY for image upload routes
      '/api/user/upload': [
        'node_modules/@img/sharp-libvips-linux-x64/**/*',
      ],
      '/api/community/upload': [
        'node_modules/@img/sharp-libvips-linux-x64/**/*',
      ],
      '/api/community/stories/upload': [
        'node_modules/@img/sharp-libvips-linux-x64/**/*',
      ],
    },
  },
  
  // Disable source maps in production builds to save memory
  productionBrowserSourceMaps: false,
  
  // Optimize output for smaller serverless functions
  output: "standalone",
  
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
};

export default nextConfig;
