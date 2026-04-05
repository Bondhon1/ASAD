"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import NetworkError from "./NetworkError";
import { getNetworkErrorMessage, isNetworkError as isNetworkFailure } from "@/lib/networkUtils";

interface NetworkContextType {
  isOnline: boolean;
  showError: boolean;
  triggerNetworkError: (message?: string) => void;
  clearNetworkError: () => void;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  showError: false,
  triggerNetworkError: () => {},
  clearNetworkError: () => {},
});

export const useNetwork = () => useContext(NetworkContext);

interface NetworkProviderProps {
  children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isNativeApp, setIsNativeApp] = useState(false);

  const isLikelyPageLoadNetworkFailure = (error: unknown): boolean => {
    const raw =
      typeof error === "string"
        ? error
        : (error as any)?.message || (error as any)?.reason || "";

    if (typeof raw !== "string") return false;

    return (
      raw.includes("ERR_NAME_NOT_RESOLVED") ||
      raw.includes("ERR_INTERNET_DISCONNECTED") ||
      raw.includes("ERR_CONNECTION") ||
      raw.includes("Failed to fetch dynamically imported module") ||
      raw.includes("Loading chunk") ||
      raw.includes("ChunkLoadError")
    );
  };

  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    setIsNativeApp(native);

    if (!native) return;

    // Set initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setShowError(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowError(true);
      setErrorMessage("You're offline. Please check your internet connection.");
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (isNetworkFailure(reason) || isLikelyPageLoadNetworkFailure(reason)) {
        setShowError(true);
        setErrorMessage(getNetworkErrorMessage(reason));
      }
    };

    const handleGlobalError = (event: ErrorEvent) => {
      const reason = event.error || event.message;
      if (isLikelyPageLoadNetworkFailure(reason)) {
        setShowError(true);
        setErrorMessage("Network error. Check your connection and try again.");
      }
    };

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      try {
        return await originalFetch(...args);
      } catch (error) {
        if (isNetworkFailure(error) || isLikelyPageLoadNetworkFailure(error)) {
          setShowError(true);
          setErrorMessage(getNetworkErrorMessage(error));
        }
        throw error;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleGlobalError);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleGlobalError);
    };
  }, []);

  const triggerNetworkError = (message?: string) => {
    setShowError(true);
    setErrorMessage(message);
  };

  const clearNetworkError = () => {
    setShowError(false);
    setErrorMessage(undefined);
  };

  const handleRetry = () => {
    // Check if we're back online
    if (navigator.onLine) {
      clearNetworkError();
      window.location.reload();
    } else {
      // Still offline, show message
      setErrorMessage("Network error. Check your connection and try again.");
    }
  };

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        showError,
        triggerNetworkError,
        clearNetworkError,
      }}
    >
      {children}
      {showError && isNativeApp && (
        <NetworkError
          message={errorMessage}
          onRetry={handleRetry}
          fullScreen={true}
        />
      )}
    </NetworkContext.Provider>
  );
}
