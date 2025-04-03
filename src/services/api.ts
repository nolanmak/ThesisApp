import { EarningsItem, CompanyConfig, Message } from '../types';
import { cache, CACHE_KEYS } from './cache';

// Base URLs - Use local proxy in development mode
const isDev = import.meta.env.DEV;

// Handle both environment variable formats (with or without BASE_URL in the name)
const getEnvUrl = (baseUrl: string, urlEnv: string, baseUrlEnv: string, defaultUrl: string) => {
  return import.meta.env[urlEnv] || import.meta.env[baseUrlEnv] || defaultUrl;
};

// Get the API URLs from environment variables with fallbacks
const HISTORICAL_API_URL = getEnvUrl(
  'HISTORICAL_API_BASE_URL',
  'VITE_HISTORICAL_API_URL',
  'VITE_HISTORICAL_API_BASE_URL',
  'https://rjuc6cu3d0.execute-api.us-east-1.amazonaws.com/prod'
);

const EARNINGS_API_URL = getEnvUrl(
  'EARNINGS_API_BASE_URL', 
  'VITE_EARNINGS_API_URL',
  'VITE_EARNINGS_API_BASE_URL',
  'https://iyeq9eqgnb.execute-api.us-east-1.amazonaws.com/prod'
);

const CONFIG_API_URL = getEnvUrl(
  'CONFIG_API_BASE_URL',
  'VITE_CONFIG_API_URL',
  'VITE_CONFIG_API_BASE_URL',
  'https://kk0z1vq9tf.execute-api.us-east-1.amazonaws.com/prod'
);

const MESSAGES_API_URL = getEnvUrl(
  'MESSAGES_API_BASE_URL',
  'VITE_MESSAGES_API_URL',
  'VITE_MESSAGES_API_BASE_URL',
  'https://kk0z1vq9tf.execute-api.us-east-1.amazonaws.com/prod'
);

const WAITLIST_API_URL = getEnvUrl(
  'WAITLIST_API_BASE_URL',
  'VITE_WAITLIST_API_URL',
  'VITE_WAITLIST_API_BASE_URL',
  ''
);

// Use proxies for APIs that have CORS issues during development
const HISTORICAL_API_BASE_URL = isDev ? '/api/historical' : HISTORICAL_API_URL;
const EARNINGS_API_BASE_URL = isDev ? '/api/earnings' : EARNINGS_API_URL;
const WAITLIST_API_BASE_URL = isDev ? '/api/waitlist' : WAITLIST_API_URL;

// For other APIs, use direct URLs
const CONFIG_API_BASE_URL = CONFIG_API_URL;
const MESSAGES_API_BASE_URL = MESSAGES_API_URL;

// API Keys
const HISTORICAL_API_KEY = import.meta.env.VITE_HISTORICAL_API_KEY || 'MqlOKVZsao1KGFiznoT6o5x1asqQZXx91qtL4KwI';
const EARNINGS_API_KEY = import.meta.env.VITE_EARNINGS_API_KEY || 'MqlOKVZsao1KGFiznoT6o5x1asqQZXx91qtL4KwI';
const CONFIG_API_KEY = import.meta.env.VITE_CONFIG_API_KEY || 'MqlOKVZsao1KGFiznoT6o5x1asqQZXx91qtL4KwI';
const MESSAGES_API_KEY = import.meta.env.VITE_MESSAGES_API_KEY || 'MqlOKVZsao1KGFiznoT6o5x1asqQZXx91qtL4KwI';
const WAITLIST_API_KEY = import.meta.env.VITE_WAITLIST_API_KEY || '';

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
  SHORT: 2 * 60 * 1000, // 2 minutes
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
};

/**
 * Helper function to fetch data with authentication
 */
const fetchWithAuth = async (
  url: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<any> => {
  try {
    // Determine if we're using a proxy URL
    const isProxiedUrl = url.startsWith('/api/');
    
    // Create headers with API key
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    
    // Always include the API key, even for proxied URLs
    headers.set('x-api-key', apiKey);
    
    // Log request details for debugging
    console.log(`Making request to: ${url}`);
    console.log(`Using API key: ${apiKey ? 'Yes (provided)' : 'No (missing)'}`);
    
    // Merge options with updated headers
    const updatedOptions: RequestInit = {
      ...options,
      headers
    };
    
    // Make the request
    const response = await fetch(url, updatedOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Handle empty response
    const text = await response.text();
    if (!text) {
      return null;
    }
    
    // Parse JSON response
    return JSON.parse(text);
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
};

// Waitlist API
export const submitWaitlistEmail = async (email: string): Promise<{ success: boolean; message?: string }> => {
  try {
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }
    
    if (!WAITLIST_API_BASE_URL) {
      throw new Error('Waitlist API URL not configured');
    }
    
    await fetchWithAuth(
      `${WAITLIST_API_BASE_URL}`, 
      WAITLIST_API_KEY, 
      {
        method: 'POST',
        body: JSON.stringify({ email })
      }
    );
    
    return { 
      success: true, 
      message: 'Successfully added to waitlist' 
    };
  } catch (error) {
    console.error('Error submitting waitlist email:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to join waitlist' 
    };
  }
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

// Earnings Items API
export const getEarningsItems = async (bypassCache: boolean = false): Promise<EarningsItem[]> => {
  const cacheKey = CACHE_KEYS.EARNINGS_ITEMS;
  const cachedItems = !bypassCache ? cache.get<EarningsItem[]>(cacheKey) : null;
  
  if (cachedItems) {
    return cachedItems;
  }
  
  try {
    const response = await fetchWithAuth(`${EARNINGS_API_BASE_URL}/earnings`, EARNINGS_API_KEY);
    
    if (!response) {
      throw new Error(`API request failed`);
    }
    
    const items = response;
    
    // Cache the items
    cache.set(cacheKey, items, CACHE_EXPIRY.SHORT);
    
    return items;
  } catch (error) {
    console.error('Error fetching earnings items:', error);
    return [];
  }
};

export const updateEarningsItem = async (updates: Partial<EarningsItem>): Promise<EarningsItem> => {
  try {
    // Use our CORS-safe function for POST requests
    const response = await fetchWithAuth(`${EARNINGS_API_BASE_URL}/earnings`, EARNINGS_API_KEY, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    
    if (!response) {
      throw new Error(`API request failed`);
    }
    
    const updatedItem = response;
    
    // Invalidate cache
    cache.remove(CACHE_KEYS.EARNINGS_ITEMS);
    
    return updatedItem;
  } catch (error) {
    console.error(`Error updating earnings item ${updates.ticker}:`, error);
    throw error;
  }
};

export const createEarningsItem = async (item: Omit<EarningsItem, 'id'>): Promise<EarningsItem> => {
  try {
    // Use our CORS-safe function for POST requests
    const response = await fetchWithAuth(`${EARNINGS_API_BASE_URL}/earnings`, EARNINGS_API_KEY, {
      method: 'POST',
      body: JSON.stringify(item)
    });
    
    if (!response) {
      throw new Error(`API request failed`);
    }
    
    const newItem = response;
    
    // Invalidate cache
    cache.remove(CACHE_KEYS.EARNINGS_ITEMS);
    
    return newItem;
  } catch (error) {
    console.error('Error creating earnings item:', error);
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