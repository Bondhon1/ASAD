/**
 * Network utility for handling fetch requests with network error detection
 */

interface FetchWithNetworkErrorOptions extends RequestInit {
  onNetworkError?: (error: Error) => void;
  timeout?: number;
}

/**
 * Enhanced fetch that detects network errors and differentiates them from API errors
 */
export async function fetchWithNetworkError(
  url: string,
  options: FetchWithNetworkErrorOptions = {}
): Promise<Response> {
  const { onNetworkError, timeout = 30000, ...fetchOptions } = options;

  // Check if we're offline before making the request
  if (!navigator.onLine) {
    const error = new Error("No internet connection");
    error.name = "NetworkError";
    if (onNetworkError) onNetworkError(error);
    throw error;
  }

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    // Check if it's a network error
    const isNetworkError =
      error.name === "TypeError" || // Network errors
      error.name === "NetworkError" ||
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("Network request failed") ||
      error.message?.includes("NetworkError") ||
      !navigator.onLine;

    if (isNetworkError) {
      const networkError = new Error(
        navigator.onLine
          ? "Unable to connect to the server. Please check your connection."
          : "No internet connection. Please check your network settings."
      );
      networkError.name = "NetworkError";
      if (onNetworkError) onNetworkError(networkError);
      throw networkError;
    }

    // For timeout errors
    if (error.name === "AbortError") {
      const timeoutError = new Error("Request timed out. Please try again.");
      timeoutError.name = "TimeoutError";
      if (onNetworkError) onNetworkError(timeoutError);
      throw timeoutError;
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.name === "NetworkError" ||
    error?.name === "TimeoutError" ||
    error?.name === "TypeError" ||
    error?.message?.includes("Failed to fetch") ||
    error?.message?.includes("Network request failed") ||
    error?.message?.includes("NetworkError") ||
    !navigator.onLine
  );
}

/**
 * Get a user-friendly error message for network errors
 */
export function getNetworkErrorMessage(error: any): string {
  if (!navigator.onLine) {
    return "You're offline. Please check your internet connection.";
  }

  if (error?.name === "TimeoutError") {
    return "Request timed out. The server took too long to respond.";
  }

  if (isNetworkError(error)) {
    return "Unable to connect to the server. Please check your connection and try again.";
  }

  return "An unexpected error occurred. Please try again.";
}
