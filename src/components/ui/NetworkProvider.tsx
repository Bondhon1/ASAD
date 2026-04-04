"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import NetworkError from "./NetworkError";

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

  useEffect(() => {
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

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
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
    } else {
      // Still offline, show message
      setErrorMessage("Still offline. Please check your connection.");
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
      {showError && (
        <NetworkError
          message={errorMessage}
          onRetry={handleRetry}
          fullScreen={true}
        />
      )}
    </NetworkContext.Provider>
  );
}
