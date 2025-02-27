import { EarningsItem, HistoricalMetrics, CompanyConfig } from '../types';

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

      this.storage.setItem(key, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('Error setting cache:', error);
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
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(prefix)) {
        this.storage.removeItem(key);
      }
    }
  }
}

// Create singleton instance
export const cache = new LocalCache();

// Cache keys
export const CACHE_KEYS = {
  EARNINGS_ITEMS: 'earnings_items',
  HISTORICAL_METRICS: 'historical_metrics',
  COMPANY_CONFIGS: 'company_configs',
  MESSAGES: 'messages',
  COMPANY_CONFIG: (ticker: string) => `company_config_${ticker}`,
  HISTORICAL_METRICS_BY_TICKER_DATE: (ticker: string, date: string) => `historical_metrics_${ticker}_${date}`
};