"use client";

import { useCallback } from "react";
import { useNetwork } from "@/components/ui/NetworkProvider";
import { fetchWithNetworkError, isNetworkError, getNetworkErrorMessage } from "@/lib/networkUtils";

/**
 * Hook to wrap fetch calls with automatic network error detection and display
 */
export function useNetworkFetch() {
  const { triggerNetworkError } = useNetwork();

  const networkFetch = useCallback(
    async (url: string, options?: RequestInit) => {
      try {
        const response = await fetchWithNetworkError(url, {
          ...options,
          onNetworkError: (error) => {
            // Show network error in UI
            triggerNetworkError(getNetworkErrorMessage(error));
          },
        });

        return response;
      } catch (error) {
        // If it's a network error, it's already been shown via onNetworkError
        // Re-throw so calling code can handle it
        throw error;
      }
    },
    [triggerNetworkError]
  );

  return { networkFetch, isNetworkError, getNetworkErrorMessage };
}
