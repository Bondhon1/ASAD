"use client";

import React, { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void> | void;
}

export default function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const threshold = 80;

  const isCapacitor = typeof window !== "undefined" && Capacitor.isNativePlatform();

  if (!isCapacitor) {
    return <>{children}</>;
  }

  const getScrollTop = () => {
    // Find the nearest scorllable parent or default to window
    const scrollParent = containerRef.current?.closest(".overflow-y-auto") as HTMLElement;
    if (scrollParent) {
      return scrollParent.scrollTop;
    }
    return window.scrollY;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (getScrollTop() <= 0 && !refreshing) {
      setStartY(e.touches[0].clientY);
      setPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pulling || refreshing) return;

    if (getScrollTop() > 0) {
      setPulling(false);
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    if (distance > 0) {
      setPullDistance(Math.min(distance * 0.4, threshold + 20));
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!pulling || refreshing) return;

    if (pullDistance >= threshold) {
      setRefreshing(true);
      if (onRefresh) {
        await onRefresh();
      } else {
        window.location.reload();
      }
      setRefreshing(false);
    }

    setPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col w-full h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute top-0 left-0 right-0 flex justify-center items-center overflow-hidden transition-all duration-200 ease-out z-50 pointer-events-none"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance / threshold
        }}
      >
        <div className="flex flex-col items-center justify-center p-2 rounded-full bg-white shadow-md">
          {refreshing ? (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg
              className={`w-6 h-6 text-primary transition-transform duration-200 ${pullDistance >= threshold ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </div>
      </div>

      <div
        className="transition-transform duration-200 ease-out w-full h-full"
        style={{ transform: `translateY(${refreshing ? threshold : pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
