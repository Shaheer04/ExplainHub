
// Simple LocalStorage Wrapper for Caching AI Responses
const CACHE_PREFIX = 'gemini_cache_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheItem<T> {
    data: T;
    timestamp: number;
}

export const cacheService = {
    get: <T>(key: string): T | null => {
        try {
            const itemStr = localStorage.getItem(CACHE_PREFIX + key);
            if (!itemStr) return null;

            const item: CacheItem<T> = JSON.parse(itemStr);
            const now = Date.now();

            // Check expiry
            if (now - item.timestamp > CACHE_EXPIRY_MS) {
                localStorage.removeItem(CACHE_PREFIX + key);
                return null;
            }

            return item.data;
        } catch (error) {
            console.error('Cache Retrieval Error:', error);
            return null;
        }
    },

    set: <T>(key: string, data: T): void => {
        try {
            const item: CacheItem<T> = {
                data,
                timestamp: Date.now(),
            };
            localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
        } catch (error) {
            console.error('Cache Save Error (likely quota exceeded):', error);
            // Optional: Clear old cache items if quota exceeded?
            // For now, just ignoring.
        }
    },

    // Helper to generate a stable key for repo requests
    generateKey: (repoName: string, path: string, type: 'explanation' | 'diagram' | 'code_qa'): string => {
        // Sanitize to be safe for keys
        return `${repoName.replace(/[^a-zA-Z0-9]/g, '_')}_${type}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
};
