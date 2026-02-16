/**
 * Client-side utility to clear cached user profile data
 * Call this after operations that modify user data (payments, status changes, etc.)
 */
export function clearUserProfileCache(email?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear sessionStorage
    sessionStorage.removeItem('cachedUserProfile');
    
    // If email is provided, clear the specific localStorage cache
    if (email) {
      const cacheKey = `asad_user_profile_v2_${email}`;
      localStorage.removeItem(cacheKey);
      console.log(`[ClientCache] Cleared profile cache for ${email}`);
    } else {
      // Clear all profile caches if no email specified
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('asad_user_profile_v2_')) {
          localStorage.removeItem(key);
        }
      });
      console.log('[ClientCache] Cleared all profile caches');
    }
  } catch (e) {
    console.error('[ClientCache] Failed to clear cache:', e);
  }
}

/**
 * Force refresh user profile by clearing cache and refetching
 */
export async function forceRefreshProfile(email: string): Promise<any> {
  clearUserProfileCache(email);
  
  try {
    const timestamp = Date.now();
    const res = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}&bustCache=1&_t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch profile');
    }
    
    const data = await res.json();
    return data?.user || null;
  } catch (e) {
    console.error('[ClientCache] Failed to force refresh profile:', e);
    throw e;
  }
}
