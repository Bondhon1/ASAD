/**
 * Utility functions for safe API response handling with audit logging
 * Logs errors to the ErrorLog table in the audit database
 */

/**
 * Log error to audit database
 * @param endpoint - API endpoint where error occurred
 * @param method - HTTP method
 * @param error - The error or message
 * @param userId - Optional user ID
 * @param metadata - Optional additional metadata
 */
export async function logErrorToAudit(
  endpoint: string,
  method: string,
  error: Error | string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint,
        method,
        errorType: error instanceof Error ? error.name : "ClientError",
        errorMessage: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
        metadata,
      }),
    });
  } catch (logErr) {
    // Fallback to console if audit logging fails
    console.error("[logErrorToAudit] Failed to log error:", logErr);
  }
}

/**
 * Safely parse JSON from a response, with fallback to plain text
 * @param res - The Response object
 * @returns Parsed JSON object or null if response is not JSON
 */
export async function safeJsonParse(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return await res.json();
    }
    return null;
  } catch (err) {
    console.error("[safeJsonParse] Failed to parse JSON:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Extract error message from response
 * @param res - The Response object
 * @param fallback - Default error message if parsing fails
 * @returns Error message string
 */
export async function extractErrorMessage(
  res: Response,
  fallback: string = "An error occurred"
): Promise<string> {
  try {
    const data = await safeJsonParse(res);
    if (data?.error && typeof data.error === "string") {
      return data.error;
    }
  } catch (err) {
    console.error("[extractErrorMessage] Error:", err);
  }
  return fallback;
}

/**
 * Handle API response with proper error logging to audit database
 * @param res - The Response object
 * @param functionName - Name of calling function (for logging)
 * @param endpoint - API endpoint being called (for audit log)
 * @param userId - Optional user ID for audit log
 * @param successCallback - Function to call if response is OK
 * @param errorCallback - Optional function to call on error
 */
export async function handleApiResponse<T>(
  res: Response,
  functionName: string,
  endpoint: string,
  userId?: string,
  successCallback?: (data: unknown) => Promise<T> | T,
  errorCallback?: (error: string) => void
): Promise<T | null> {
  if (res.ok) {
    if (successCallback) {
      const data = await safeJsonParse(res);
      return successCallback(data);
    }
    return null;
  }

  // Extract error message
  const errorMsg = await extractErrorMessage(res, `HTTP ${res.status}: ${res.statusText}`);
  console.error(`[${functionName}] Failed: ${res.status}`, errorMsg);

  // Log to audit database
  await logErrorToAudit(
    endpoint,
    "GET",
    errorMsg,
    userId,
    { status: res.status, statusText: res.statusText, function: functionName }
  );

  if (errorCallback) {
    errorCallback(errorMsg);
  }

  return null;
}

/**
 * Example usage in a component:
 * 
 * const submitComment = async () => {
 *   const userId = getCurrentUserId(); // Get from context/state
 *   try {
 *     const res = await fetch(`/api/community/posts/${postId}/comments`, {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify({ content: newComment }),
 *     });
 *
 *     const result = await handleApiResponse(
 *       res,
 *       "submitComment",
 *       `/api/community/posts/${postId}/comments`,
 *       userId,
 *       async (data: any) => {
 *         setComments(prev => [...prev, data.comment]);
 *         return true;
 *       },
 *       (error) => {
 *         alert(`Failed to post comment: ${error}`);
 *       }
 *     );
 *   } catch (err) {
 *     console.error("[submitComment] Error:", err instanceof Error ? err.message : err);
 *     await logErrorToAudit(
 *       `/api/community/posts/${postId}/comments`,
 *       "POST",
 *       err instanceof Error ? err : String(err),
 *       userId
 *     );
 *   }
 * };
 */

