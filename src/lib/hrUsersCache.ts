type CacheEntry = { data: any; timestamp: number };

const CACHE_TTL = 15000; // 15 seconds
const cache = new Map<string, CacheEntry>();

export function getCache(key: string): CacheEntry | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  return entry;
}

export function setCache(key: string, value: CacheEntry) {
  cache.set(key, value);
}

export function invalidateKey(key: string) {
  cache.delete(key);
}

export function invalidateAll() {
  cache.clear();
}

export { CACHE_TTL };
