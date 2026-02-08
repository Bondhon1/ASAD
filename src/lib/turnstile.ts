/**
 * Cloudflare Turnstile verification utilities
 * Turnstile is a free, privacy-first CAPTCHA alternative
 */

interface TurnstileResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
}

/**
 * Verify Turnstile token on the server side
 * @param token - The token from the Turnstile widget
 * @param ip - Optional IP address of the user
 * @returns Promise<boolean> - True if verification passed
 */
export async function verifyTurnstileToken(
  token: string,
  ip?: string
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY is not configured");
    // In development, you might want to skip verification
    if (process.env.NODE_ENV === "development") {
      console.warn("Skipping Turnstile verification in development mode");
      return true;
    }
    return false;
  }

  try {
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (ip) {
      formData.append("remoteip", ip);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      }
    );

    const data: TurnstileResponse = await response.json();

    if (!data.success) {
      console.error("Turnstile verification failed:", data["error-codes"]);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error verifying Turnstile token:", error);
    return false;
  }
}

/**
 * Extract IP address from request headers
 * @param request - Next.js request object
 * @returns IP address string or undefined
 */
export function getClientIp(request: Request): string | undefined {
  const headers = request.headers;
  
  // Check various headers that might contain the IP
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return undefined;
}
