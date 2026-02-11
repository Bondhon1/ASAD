/**
 * Shared cache for HR interview slots
 * Used across multiple API routes to maintain consistency
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

const slotsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 10000; // 10 seconds

export function getSlotsCacheEntry(userEmail: string): any | null {
  const cached = slotsCache.get(userEmail);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

export function setSlotsCacheEntry(userEmail: string, data: any): void {
  slotsCache.set(userEmail, { data, timestamp: Date.now() });
}

export function invalidateSlotsCacheForAll(): void {
  slotsCache.clear();
}

export function invalidateSlotsCache(userEmail?: string): void {
  if (userEmail) {
    slotsCache.delete(userEmail);
  } else {
    // If no specific user, invalidate all (mutations affect all HR users)
    slotsCache.clear();
  }
}
