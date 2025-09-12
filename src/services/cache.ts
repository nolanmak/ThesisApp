// Cache service for managing local data storage

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class LocalCache {
  private storage: Storage;
  private defaultExpiry: number = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  get<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(key);
      if (!item) return null;

      const cacheItem: CacheItem<T> = JSON.parse(item);
      const now = Date.now();

      if (now > cacheItem.expiry) {
        this.storage.removeItem(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Error retrieving from cache:', error);
      return null;
    }
  }

  set<T>(key: string, data: T, expiry: number = this.defaultExpiry): void {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + expiry
      };

      const serializedItem = JSON.stringify(cacheItem);
      
      // Check if the data is too large (>1MB for a single item)
      const sizeInBytes = new Blob([serializedItem]).size;
      if (sizeInBytes > 1024 * 1024) { // 1MB
        console.warn(`Cache item ${key} is too large (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB), skipping cache`);
        return;
      }

      this.storage.setItem(key, serializedItem);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, clearing old cache entries');
        this.clearExpiredItems();
        
        // Try one more time after clearing expired items
        try {
          const cacheItem: CacheItem<T> = {
            data,
            timestamp: Date.now(),
            expiry: Date.now() + expiry
          };
          this.storage.setItem(key, JSON.stringify(cacheItem));
        } catch (secondError) {
          console.warn('Still unable to cache after cleanup, operating without cache for this item');
        }
      } else {
        console.error('Error setting cache:', error);
      }
    }
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }

  // Clear only cache items that match a specific prefix
  clearByPrefix(prefix: string): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => this.storage.removeItem(key));
  }

  // Clear expired cache items
  clearExpiredItems(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key) {
        try {
          const item = this.storage.getItem(key);
          if (item) {
            const cacheItem: CacheItem<any> = JSON.parse(item);
            if (cacheItem.expiry && now > cacheItem.expiry) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          // If we can't parse the item, it's probably corrupted, remove it
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => this.storage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} expired cache items`);
  }

  // Get cache size information
  getCacheInfo(): { totalItems: number; totalSizeKB: number } {
    let totalItems = 0;
    let totalSize = 0;
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key) {
        const item = this.storage.getItem(key);
        if (item) {
          totalItems++;
          totalSize += new Blob([item]).size;
        }
      }
    }
    
    return {
      totalItems,
      totalSizeKB: Math.round(totalSize / 1024)
    };
  }
}

// Create singleton instance
export const cache = new LocalCache();

// Cache keys
export const CACHE_KEYS = {
  EARNINGS_ITEMS: 'earnings_items',
  COMPANY_CONFIGS: 'company_configs',
  MESSAGES: 'messages',
  COMPANY_CONFIG: (ticker: string) => `company_config_${ticker}`,
};