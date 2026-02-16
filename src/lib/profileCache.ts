// Shared in-memory profile cache for server-side use
const profileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds - balanced with edge caching

export function getCachedProfile(email: string): { data: any; timestamp: number } | undefined {
  return profileCache.get(email);
}

export function setCachedProfile(email: string, data: any): void {
  profileCache.set(email, { data, timestamp: Date.now() });
}

export function invalidateProfileCache(email: string): void {
  profileCache.delete(email);
  console.log(`[ProfileCache] Invalidated cache for ${email}`);
}

export function getCacheTTL(): number {
  return CACHE_TTL;
}
