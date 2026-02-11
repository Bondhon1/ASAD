import { useCallback, useEffect, useState, useRef } from "react";

const CACHE_KEY_PREFIX = "asad_user_profile_v2_";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Global pending requests map for deduplication
const pendingRequests = new Map<string, Promise<any>>();

interface CachedUserEntry<T = any> {
  email: string;
  user: T;
  timestamp: number;
}

function getCacheKey(email: string): string {
  // Create a unique cache key per email to prevent cross-user contamination
  return `${CACHE_KEY_PREFIX}${email}`;
}

function readCachedUser<T>(email: string, ttlMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const cacheKey = getCacheKey(email);
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedUserEntry<T> | null;
    if (!parsed || parsed.email !== email) return null;
    if (Date.now() - parsed.timestamp > ttlMs) return null;
    return parsed.user;
  } catch (error) {
    console.error("Failed to read cached user:", error);
    return null;
  }
}

function writeCachedUser<T>(email: string, user: T) {
  if (typeof window === "undefined") return;
  try {
    const cacheKey = getCacheKey(email);
    const payload: CachedUserEntry<T> = {
      email,
      user,
      timestamp: Date.now(),
    };
    window.localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch (error) {
    console.error("Failed to write cached user:", error);
  }
}

export function useCachedUserProfile<T = any>(email?: string | null, ttlMs: number = DEFAULT_TTL_MS) {
  const [user, setUser] = useState<T | null>(() => {
    if (!email) return null;
    return readCachedUser<T>(email, ttlMs);
  });
  const [loading, setLoading] = useState<boolean>(!!email && !user);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!email) return null;
    
    // Always bust cache when explicitly refreshing
    const requestKey = `/api/user/profile?email=${encodeURIComponent(email)}&bustCache=1`;
    const pending = pendingRequests.get(requestKey);
    if (pending) {
      try {
        const result = await pending;
        if (result?.user) {
          setUser(result.user);
          writeCachedUser(email, result.user);
        }
        return result?.user as T;
      } catch (err) {
        // Request failed, continue to retry below
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchPromise = fetch(requestKey).then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load user profile");
        }
        return response.json();
      });
      
      // Store pending request for deduplication
      pendingRequests.set(requestKey, fetchPromise);
      
      const data = await fetchPromise;
      
      // Clean up pending request
      pendingRequests.delete(requestKey);
      
      if (data?.user) {
        setUser(data.user);
        writeCachedUser(email, data.user);
        return data.user as T;
      }
      throw new Error("User not found");
    } catch (err: any) {
      console.error("Error fetching user profile:", err);
      setError(err?.message || "Failed to load user profile");
      setUser(null);
      pendingRequests.delete(requestKey);
      return null;
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (!email) return;
    if (hasFetchedRef.current) return; // Prevent duplicate fetches
    
    hasFetchedRef.current = true;
    const cached = readCachedUser<T>(email, ttlMs);
    
    if (cached) {
      setUser(cached);
      setLoading(false);
      // Don't fetch in background - rely on explicit refresh() calls when needed
      return;
    }
    
    refresh();
  }, [email, ttlMs]); // Removed 'refresh' from dependencies to prevent infinite loop

  return { user, loading, error, refresh, setUser } as const;
}
