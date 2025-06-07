import { EarningsItem, CompanyConfig, Message } from '../types';
import { cache, CACHE_KEYS } from './cache';

// Base URLs - Use local proxy in development mode

// API Keys
const { VITE_API_BASE_URL, VITE_API_KEY } = import.meta.env;


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
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  try {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    headers.set('x-api-key', VITE_API_KEY);
    
    const updatedOptions: RequestInit = {
      ...options,
      headers
    };
    
    // Make the request
    const response = await fetch(VITE_API_BASE_URL + endpoint, updatedOptions);

    console.log("response:", response);

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
    console.error(`Fetch error for ${endpoint}:`, error);
    throw error;
  }
};

// Waitlist API
export const submitWaitlistEmail = async (email: string): Promise<{ success: boolean; message?: string }> => {
  try {
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }
    
    await fetchWithAuth(
      `/waitlist`, 
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
    const messages = await fetchWithAuth(`/messages`);
    console.log("messages:", messages);
    
    cache.set(cacheKey, messages, CACHE_EXPIRY.SHORT);
    return messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

export const getMessageById = async (message_id: string): Promise<Message | null> => {
  try {
    const endpoint = `/messages/${message_id}`;
    
    const response = await fetchWithAuth(endpoint);
    
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
    const response = await fetchWithAuth(`/earnings`);
    
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
    const response = await fetchWithAuth(`/earnings`, {
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
    const response = await fetchWithAuth(`/earnings`, {
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
    const data = await fetchWithAuth(`/configs`);
    
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
      `/configs/${ticker}`
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
      `/configs`,
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