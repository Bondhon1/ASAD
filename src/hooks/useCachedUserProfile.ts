import { useCallback, useEffect, useState, useRef } from "react";

const CACHE_KEY_PREFIX = "asad_user_profile_v2_";
const DEFAULT_TTL_MS = 30 * 1000; // 30 seconds — keep credit/coin/user info fresh
const POLL_INTERVAL_MS = 0; // DISABLED: no automatic polling

interface UseCachedUserProfileOptions {
  pollIntervalMs?: number;
  refreshOnVisibility?: boolean;
  refreshOnNotification?: boolean;
}

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

export function useCachedUserProfile<T = any>(
  email?: string | null,
  ttlMs: number = DEFAULT_TTL_MS,
  options: UseCachedUserProfileOptions = {}
) {
  const {
    pollIntervalMs = POLL_INTERVAL_MS,
    refreshOnVisibility = true,
    refreshOnNotification = false,
  } = options;
  const [user, setUser] = useState<T | null>(() => {
    if (!email) return null;
    return readCachedUser<T>(email, ttlMs);
  });
  const [loading, setLoading] = useState<boolean>(!!email && !user);
  const [error, setError] = useState<string | null>(null);
  const fetchedEmailRef = useRef<string | null>(null);

  const refresh = useCallback(async (forceFresh: boolean = false) => {
    if (!email) return null;
    
    const requestKey = forceFresh
      ? `/api/user/profile?email=${encodeURIComponent(email)}&bustCache=1`
      : `/api/user/profile?email=${encodeURIComponent(email)}`;
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
    if (!email) {
      fetchedEmailRef.current = null;
      setUser(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (fetchedEmailRef.current === email) return; // already initialized for this account
    fetchedEmailRef.current = email;

    const cached = readCachedUser<T>(email, ttlMs);
    setUser(cached);
    setLoading(!cached);
    setError(null);

    // Always refresh once per email switch to avoid stale cross-account UI
    refresh();
  }, [email, ttlMs, refresh]);

  // Periodic background polling — keeps credit/coin/user info up-to-date
  useEffect(() => {
    if (!email) return;
    if (pollIntervalMs <= 0) return;
    const interval = setInterval(() => {
      refresh();
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [email, pollIntervalMs, refresh]);

  // Refresh when the user navigates back to this tab
  useEffect(() => {
    if (!email) return;
    if (!refreshOnVisibility) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [email, refresh, refreshOnVisibility]);

  // Listen for rank update notifications and refresh cached profile
  useEffect(() => {
    if (!email) return;
    if (!refreshOnNotification) return;
    const handler = (e: any) => {
      try {
        const d = e?.detail;
        if (!d) return;
        const t = String(d.type || '').toUpperCase();
        // Refresh on rank updates or points updates
        if (t === 'RANK_UPDATE' || t === 'POINTS_UPDATE') {
          refresh(true);
        }
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('asad:notification', handler as EventListener);
    return () => window.removeEventListener('asad:notification', handler as EventListener);
  }, [email, refresh, refreshOnNotification]);

  return { user, loading, error, refresh, setUser } as const;
}
