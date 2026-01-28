import { useCallback, useEffect, useState } from "react";

const CACHE_KEY = "asad_user_profile_v1";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedUserEntry<T = any> {
  email: string;
  user: T;
  timestamp: number;
}

function readCachedUser<T>(email: string, ttlMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
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
    const payload: CachedUserEntry<T> = {
      email,
      user,
      timestamp: Date.now(),
    };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
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

  const refresh = useCallback(async () => {
    if (!email) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load user profile");
      }
      const data = await response.json();
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
      return null;
    } finally {
      setLoading(false);
    }
  }, [email, ttlMs]);

  useEffect(() => {
    if (!email) return;
    const cached = readCachedUser<T>(email, ttlMs);
    if (cached) {
      setUser(cached);
      setLoading(false);
      // Still fetch fresh data in background to update cache
      // This ensures status changes are picked up quickly
      refresh();
      return;
    }
    refresh();
  }, [email, ttlMs, refresh]);

  return { user, loading, error, refresh, setUser } as const;
}
