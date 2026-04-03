"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export default function NativeAppLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Check if we're in a native app
    const native = Capacitor.isNativePlatform();
    setIsNative(native);

    if (native) {
      // Keep loading screen visible briefly to ensure smooth transition
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800); // Match splash fade duration

      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Only show loader for native apps during initial load
  if (!isNative || !isLoading) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #0A1929 0%, #1E3A5F 50%, #2D5F7E 100%)",
      }}
    >
      <div className="flex flex-col items-center gap-4 px-6">
        {/* Animated spinner */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-white/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>

        {/* Loading text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-white font-semibold text-lg">Loading ASAD</p>
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
          </div>
        </div>

        {/* Optional: App name */}
        <div className="mt-4 text-center">
          <p className="text-white/80 text-sm font-medium">Amar Somoy Amar Desh</p>
        </div>
      </div>
    </div>
  );
}
