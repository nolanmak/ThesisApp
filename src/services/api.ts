import { EarningsItem, HistoricalMetrics, CompanyConfig, Message } from '../types';
import { cache, CACHE_KEYS } from './cache';

// API Configuration from environment variables
const HISTORICAL_API_BASE_URL = import.meta.env.VITE_HISTORICAL_API_BASE_URL;
const HISTORICAL_API_KEY = import.meta.env.VITE_HISTORICAL_API_KEY;

const EARNINGS_API_BASE_URL = import.meta.env.VITE_EARNINGS_API_BASE_URL;
const EARNINGS_API_KEY = import.meta.env.VITE_EARNINGS_API_KEY;

const CONFIG_API_BASE_URL = import.meta.env.VITE_CONFIG_API_BASE_URL;
const CONFIG_API_KEY = import.meta.env.VITE_CONFIG_API_KEY;

const MESSAGES_API_BASE_URL = import.meta.env.VITE_MESSAGES_API_BASE_URL;
const MESSAGES_API_KEY = import.meta.env.VITE_MESSAGES_API_KEY;

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
  SHORT: 2 * 60 * 1000, // 2 minutes
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
};

// Helper function for API requests
const fetchWithAuth = async (url: string, apiKey: string, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
};

export const getMessages = async (bypassCache: boolean = true): Promise<Message[]> => {
  const cacheKey = CACHE_KEYS.MESSAGES;
  const cachedMessages = !bypassCache ? cache.get<Message[]>(cacheKey) : null;
  
  if (cachedMessages) {
    return cachedMessages;
  }
  
  try {
    const url = `${MESSAGES_API_BASE_URL}/messages`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': MESSAGES_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const messages = await response.json();
    
    cache.set(cacheKey, messages, CACHE_EXPIRY.SHORT);
    return messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

export const getMessageById = async (message_id: string): Promise<Message | null> => {
  try {
    const url = `${MESSAGES_API_BASE_URL}/messages/${message_id}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': MESSAGES_API_KEY
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching message ${message_id}:`, error);
    return null;
  }
};

export const markMessageAsRead = async (message_id: string): Promise<boolean> => {
  try {
    const url = `${MESSAGES_API_BASE_URL}/messages/${message_id}/read`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': MESSAGES_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    // Clear the messages cache since we've updated a message
    cache.remove(CACHE_KEYS.MESSAGES);
    
    return true;
  } catch (error) {
    console.error(`Error marking message ${message_id} as read:`, error);
    return false;
  }
};

export const deleteMessage = async (message_id: string): Promise<boolean> => {
  try {
    const url = `${MESSAGES_API_BASE_URL}/messages/${message_id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': MESSAGES_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    // Clear the messages cache since we've deleted a message
    cache.remove(CACHE_KEYS.MESSAGES);
    
    return true;
  } catch (error) {
    console.error(`Error deleting message ${message_id}:`, error);
    return false;
  }
};

// Earnings Items API
export const getEarningsItems = async (): Promise<EarningsItem[]> => {
  try {
    // Check cache first
    const cachedData = cache.get<EarningsItem[]>(CACHE_KEYS.EARNINGS_ITEMS);
    if (cachedData) {
      console.log('Using cached earnings items');
      return cachedData;
    }

    // If not in cache, fetch from API
    const data = await fetchWithAuth(
      `${EARNINGS_API_BASE_URL}/earnings`,
      EARNINGS_API_KEY
    );
    
    // Store in cache
    cache.set(CACHE_KEYS.EARNINGS_ITEMS, data, CACHE_EXPIRY.MEDIUM);
    
    return data;
  } catch (error) {
    console.error('Error fetching earnings items:', error);
    throw error;
  }
};

export const updateEarningsItem = async (item: EarningsItem): Promise<EarningsItem> => {
  try {
    const data = await fetchWithAuth(
      `${EARNINGS_API_BASE_URL}/earnings`,
      EARNINGS_API_KEY,
      {
        method: 'PUT',
        body: JSON.stringify(item)
      }
    );
    
    // Invalidate cache
    cache.remove(CACHE_KEYS.EARNINGS_ITEMS);
    
    return data;
  } catch (error) {
    console.error('Error updating earnings item:', error);
    throw error;
  }
};

export const createEarningsItem = async (item: EarningsItem): Promise<EarningsItem> => {
  try {
    const data = await fetchWithAuth(
      `${EARNINGS_API_BASE_URL}/earnings`,
      EARNINGS_API_KEY,
      {
        method: 'POST',
        body: JSON.stringify(item)
      }
    );
    
    // Invalidate cache
    cache.remove(CACHE_KEYS.EARNINGS_ITEMS);
    
    return data;
  } catch (error) {
    console.error('Error creating earnings item:', error);
    throw error;
  }
};

// Historical Metrics API
export const getHistoricalMetrics = async (): Promise<HistoricalMetrics[]> => {
  try {
    // Check cache first
    const cachedData = cache.get<HistoricalMetrics[]>(CACHE_KEYS.HISTORICAL_METRICS);
    if (cachedData) {
      console.log('Using cached historical metrics');
      return cachedData;
    }

    // If not in cache, fetch from API
    const data = await fetchWithAuth(
      `${HISTORICAL_API_BASE_URL}/historical`,
      HISTORICAL_API_KEY
    );
    
    // Store in cache
    cache.set(CACHE_KEYS.HISTORICAL_METRICS, data, CACHE_EXPIRY.MEDIUM);
    
    return data;
  } catch (error) {
    console.error('Error fetching historical metrics:', error);
    throw error;
  }
};

export const getHistoricalMetricsByTickerAndDate = async (ticker: string, date: string): Promise<HistoricalMetrics | null> => {
  try {
    const cacheKey = CACHE_KEYS.HISTORICAL_METRICS_BY_TICKER_DATE(ticker, date);
    
    // Check cache first
    const cachedData = cache.get<HistoricalMetrics>(cacheKey);
    if (cachedData) {
      console.log(`Using cached historical metrics for ${ticker} on ${date}`);
      return cachedData;
    }

    // If not in cache, fetch from API
    const data = await fetchWithAuth(
      `${HISTORICAL_API_BASE_URL}/historical/${ticker}/${date}`,
      HISTORICAL_API_KEY
    );
    
    // Store in cache
    if (data) {
      cache.set(cacheKey, data, CACHE_EXPIRY.LONG);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching historical metrics by ticker and date:', error);
    throw error;
  }
};

export const createHistoricalMetrics = async (metrics: HistoricalMetrics): Promise<HistoricalMetrics> => {
  try {
    const data = await fetchWithAuth(
      `${HISTORICAL_API_BASE_URL}/historical`,
      HISTORICAL_API_KEY,
      {
        method: 'POST',
        body: JSON.stringify(metrics)
      }
    );
    
    // Invalidate caches
    cache.remove(CACHE_KEYS.HISTORICAL_METRICS);
    cache.remove(CACHE_KEYS.HISTORICAL_METRICS_BY_TICKER_DATE(metrics.ticker, metrics.date));
    
    return data;
  } catch (error) {
    console.error('Error creating historical metrics:', error);
    throw error;
  }
};

// Company Config API
export const getCompanyConfigs = async (): Promise<CompanyConfig[]> => {
  try {
    // Check cache first
    const cachedData = cache.get<CompanyConfig[]>(CACHE_KEYS.COMPANY_CONFIGS);
    if (cachedData) {
      console.log('Using cached company configs');
      return cachedData;
    }

    // If not in cache, fetch from API
    const data = await fetchWithAuth(
      `${CONFIG_API_BASE_URL}/configs`,
      CONFIG_API_KEY
    );
    
    // Store in cache
    cache.set(CACHE_KEYS.COMPANY_CONFIGS, data, CACHE_EXPIRY.MEDIUM);
    
    return data;
  } catch (error) {
    console.error('Error fetching company configs:', error);
    throw error;
  }
};

export const getCompanyConfigByTicker = async (ticker: string): Promise<CompanyConfig | null> => {
  try {
    const cacheKey = CACHE_KEYS.COMPANY_CONFIG(ticker);
    
    // Check cache first
    const cachedData = cache.get<CompanyConfig>(cacheKey);
    if (cachedData) {
      console.log(`Using cached company config for ${ticker}`);
      return cachedData;
    }

    // If not in cache, fetch from API
    const data = await fetchWithAuth(
      `${CONFIG_API_BASE_URL}/configs/${ticker}`,
      CONFIG_API_KEY
    );
    
    // Store in cache
    if (data) {
      cache.set(cacheKey, data, CACHE_EXPIRY.LONG);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching company config by ticker:', error);
    throw error;
  }
};

export const createOrUpdateCompanyConfig = async (config: CompanyConfig): Promise<CompanyConfig> => {
  try {
    const data = await fetchWithAuth(
      `${CONFIG_API_BASE_URL}/configs`,
      CONFIG_API_KEY,
      {
        method: 'POST',
        body: JSON.stringify(config)
      }
    );
    
    // Invalidate caches
    cache.remove(CACHE_KEYS.COMPANY_CONFIGS);
    cache.remove(CACHE_KEYS.COMPANY_CONFIG(config.ticker));
    
    return data;
  } catch (error) {
    console.error('Error creating/updating company config:', error);
    throw error;
  }
};