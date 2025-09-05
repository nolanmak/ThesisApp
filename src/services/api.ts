import { EarningsItem, CompanyConfig, Message } from "../types";
import { cache, CACHE_KEYS } from "./cache";
import { toast } from "react-toastify";

// Base URLs - Use local proxy in development mode

// API Keys and endpoints
const {
  VITE_API_BASE_URL,
  VITE_API_KEY,
  VITE_AUDIO_WS_ENDPOINT,
  VITE_USER_PROFILE_API_URL,
  VITE_USER_PROFILE_API_KEY,
} = import.meta.env;

// Export WebSocket endpoints for use in services
export const AUDIO_WS_ENDPOINT =
  VITE_AUDIO_WS_ENDPOINT ||
  "wss://1me24ngqv0.execute-api.us-east-1.amazonaws.com/prod";

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
  SHORT: 2 * 60 * 1000, // 2 minutes
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
};

/**
 * Helper function to fetch data with authentication
 */
const fetchWithAuth = async <T = Record<string, unknown>>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  try {
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");
    headers.set("x-api-key", VITE_API_KEY);

    const updatedOptions: RequestInit = {
      ...options,
      headers,
    };

    // Make the request
    const response = await fetch(VITE_API_BASE_URL + endpoint, updatedOptions);

    if (!response.ok) {
      // Handle authentication/authorization failures
      if (response.status === 401 || response.status === 403) {
        console.warn(
          `Authentication failure detected: ${response.status} for ${endpoint}`
        );

        // Show user-friendly message
        toast.warn("Your session has expired. Redirecting to sign in...", {
          autoClose: 4000,
          hideProgressBar: false,
        });

        // Clear all auth tokens and user data
        localStorage.removeItem("access_token");
        localStorage.removeItem("id_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_data");

        // Redirect to landing page
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
        throw new Error(`Session expired. Please sign in again.`);
      }

      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // Handle empty response
    const text = await response.text();
    if (!text) {
      return null as unknown as T;
    }

    // Parse JSON response
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`Fetch error for ${endpoint}:`, error);
    throw error;
  }
};

// Waitlist API
export const submitWaitlistEmail = async (
  email: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    if (!email || !email.includes("@")) {
      throw new Error("Invalid email address");
    }

    await fetchWithAuth(`/waitlist`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    return {
      success: true,
      message: "Successfully added to waitlist",
    };
  } catch (error) {
    console.error("Error submitting waitlist email:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to join waitlist",
    };
  }
};

// Updated response structure to match backend pagination
export interface PaginatedMessageResponse {
  messages: Message[];
  count: number;
  limit: number;
  next_key?: string;
}

export const getMessages = async (
  bypassCache: boolean = true,
  limit: number = 50,
  lastKey?: string,
  searchTicker?: string,
  searchCompany?: string
): Promise<PaginatedMessageResponse> => {
  const cacheKey = CACHE_KEYS.MESSAGES;
  const hasSearchParams = searchTicker || searchCompany;
  
  // Don't use cache when searching or paginating
  const cachedMessages = !bypassCache && !lastKey && !hasSearchParams ? 
    cache.get<PaginatedMessageResponse>(cacheKey) : null;

  if (cachedMessages) {
    return cachedMessages;
  }

  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    
    if (lastKey) {
      queryParams.append('last_key', lastKey);
    }
    
    // Add search parameters
    if (searchTicker) {
      queryParams.append('ticker', searchTicker);
    }
    
    if (searchCompany) {
      queryParams.append('company_name', searchCompany);
    }

    const response = await fetchWithAuth<PaginatedMessageResponse>(`/messages?${queryParams.toString()}`);

    // Only cache the first page when no search/pagination params are used
    if (!lastKey && !hasSearchParams) {
      cache.set(cacheKey, response, CACHE_EXPIRY.SHORT);
    }
    
    return response;
  } catch (error) {
    console.error("Error fetching messages:", error);

    // If the error is about session expiration, the fetchWithAuth function
    // has already handled logout and redirect, so we just return empty response
    if (error instanceof Error && error.message.includes("Session expired")) {
      return { messages: [], count: 0, limit: 50 };
    }
    return { messages: [], count: 0, limit: 50 };
  }
};

// Keep the old function for backward compatibility, but mark as deprecated
export const getMessagesLegacy = async (
  bypassCache: boolean = true
): Promise<Message[]> => {
  const response = await getMessages(bypassCache);
  return response.messages;
};

export const getMessageById = async (
  message_id: string
): Promise<Message | null> => {
  try {
    const endpoint = `/messages/${message_id}`;
    const message = await fetchWithAuth<Message>(endpoint);
    return message;
  } catch (error) {
    console.error(`Error fetching message ${message_id}:`, error);
    return null;
  }
};

// Earnings Items API
export const getEarningsItems = async (
  bypassCache: boolean = false
): Promise<EarningsItem[]> => {
  const cacheKey = CACHE_KEYS.EARNINGS_ITEMS;
  const cachedItems = !bypassCache ? cache.get<EarningsItem[]>(cacheKey) : null;

  if (cachedItems) {
    return cachedItems;
  }

  try {
    const items = await fetchWithAuth<EarningsItem[]>(`/earnings`);

    // Cache the items
    cache.set(cacheKey, items, CACHE_EXPIRY.SHORT);

    return items;
  } catch (error) {
    console.error("Error fetching earnings items:", error);
    return [];
  }
};

export const updateEarningsItem = async (
  updates: Partial<EarningsItem>
): Promise<EarningsItem> => {
  try {
    // Use our CORS-safe function for POST requests
    const updatedItem = await fetchWithAuth<EarningsItem>(`/earnings`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });

    if (!updatedItem) {
      throw new Error(`API request failed`);
    }

    // Invalidate cache
    cache.remove(CACHE_KEYS.EARNINGS_ITEMS);

    return updatedItem;
  } catch (error) {
    console.error(`Error updating earnings item ${updates.ticker}:`, error);
    throw error;
  }
};

export const createEarningsItem = async (
  item: Omit<EarningsItem, "id">
): Promise<EarningsItem> => {
  try {
    // Use our CORS-safe function for POST requests
    const newItem = await fetchWithAuth<EarningsItem>(`/earnings`, {
      method: "POST",
      body: JSON.stringify(item),
    });

    if (!newItem) {
      throw new Error(`API request failed`);
    }

    // Invalidate cache
    cache.remove(CACHE_KEYS.EARNINGS_ITEMS);

    return newItem;
  } catch (error) {
    console.error("Error creating earnings item:", error);
    throw error;
  }
};

// Company Config API
export const getCompanyConfigs = async (): Promise<CompanyConfig[]> => {
  try {
    // Check cache first
    const cachedData = cache.get<CompanyConfig[]>(CACHE_KEYS.COMPANY_CONFIGS);
    if (cachedData) {
      return cachedData;
    }

    // If not in cache, fetch from API
    const data = await fetchWithAuth<CompanyConfig[]>(`/configs`);

    // Store in cache
    cache.set(CACHE_KEYS.COMPANY_CONFIGS, data, CACHE_EXPIRY.MEDIUM);

    return data;
  } catch (error) {
    console.error("Error fetching company configs:", error);
    throw error;
  }
};

export const getCompanyConfigByTicker = async (
  ticker: string
): Promise<CompanyConfig | null> => {
  try {
    const cacheKey = CACHE_KEYS.COMPANY_CONFIG(ticker);

    // Check cache first
    const cachedData = cache.get<CompanyConfig>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // If not in cache, fetch from API
    const data = await fetchWithAuth<CompanyConfig | null>(
      `/configs/${ticker}`
    );

    // Store in cache
    if (data) {
      cache.set(cacheKey, data, CACHE_EXPIRY.LONG);
    }

    return data;
  } catch (error) {
    console.error("Error fetching company config by ticker:", error);
    throw error;
  }
};

export const createOrUpdateCompanyConfig = async (
  config: CompanyConfig
): Promise<CompanyConfig> => {
  try {
    const data = await fetchWithAuth<CompanyConfig>(`/configs`, {
      method: "POST",
      body: JSON.stringify(config),
    });

    // Invalidate caches
    cache.remove(CACHE_KEYS.COMPANY_CONFIGS);
    cache.remove(CACHE_KEYS.COMPANY_CONFIG(config.ticker));

    return data;
  } catch (error) {
    console.error("Error creating/updating company config:", error);
    throw error;
  }
};

// UserProfile API
interface UserProfile {
  email: string;
  watchlist?: string[];
  settings?: Record<string, unknown>;
}

export const getUserProfile = async (
  email: string
): Promise<UserProfile | null> => {
  try {
    const headers = new Headers();
    headers.set("x-api-key", VITE_USER_PROFILE_API_KEY);

    const response = await fetch(
      `${VITE_USER_PROFILE_API_URL}?email=${encodeURIComponent(email)}`,
      {
        headers,
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorText = await response.text();
      throw new Error(
        `UserProfile API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    return JSON.parse(text) as UserProfile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

export const updateUserProfile = async (
  profileData: UserProfile
): Promise<UserProfile> => {
  try {
    const headers = new Headers();
    headers.set("x-api-key", VITE_USER_PROFILE_API_KEY);
    headers.set("Content-Type", "application/json");

    const response = await fetch(VITE_USER_PROFILE_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `UserProfile API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const text = await response.text();
    if (!text) {
      throw new Error("Empty response from UserProfile API");
    }

    return JSON.parse(text) as UserProfile;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Company Names API
export interface CompanyNameData {
  ticker: string;
  company_names: string[];
}

export const getCompanyNames = async (
  ticker: string
): Promise<CompanyNameData | null> => {
  try {
    const cacheKey = `company_names_${ticker}`;
    const cachedData = cache.get<CompanyNameData>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Use direct API call to the specific endpoint
    const response = await fetch(
      `https://47mvxdbu6f.execute-api.us-east-1.amazonaws.com/stock-names/${ticker}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch company names for ${ticker}: ${response.status}`
      );
    }

    const rawData = await response.json();

    // Parse the response format: array of objects with "S" keys
    let company_names: string[] = [];

    if (Array.isArray(rawData)) {
      // Handle array format: [{ "S": "name1" }, { "S": "name2" }]
      company_names = rawData
        .filter((item) => item && typeof item === "object" && item.S)
        .map((item) => item.S)
        .filter((name) => typeof name === "string" && name.trim().length > 0);
    } else if (rawData && typeof rawData === "object") {
      // Handle object format: { "ticker": [...], "company_names": [...] }
      if (rawData.company_names && Array.isArray(rawData.company_names)) {
        company_names = rawData.company_names;
      } else {
        // Look for any array property in the response
        const arrayValue = Object.values(rawData).find((value) =>
          Array.isArray(value)
        );
        if (arrayValue) {
          company_names = arrayValue
            .filter((item) => item && typeof item === "object" && item.S)
            .map((item) => item.S)
            .filter(
              (name) => typeof name === "string" && name.trim().length > 0
            );
        }
      }
    }

    const data: CompanyNameData = {
      ticker,
      company_names,
    };


    // Cache the result for 30 minutes
    cache.set(cacheKey, data, 30 * 60 * 1000);
    return data;
  } catch (error) {
    console.error(`Error fetching company names for ${ticker}:`, error);
    return null;
  }
};

export const getBatchCompanyNames = async (
  tickers: string[]
): Promise<CompanyNameData[]> => {
  try {
    // Fetch all company names in parallel
    const promises = tickers.map((ticker) => getCompanyNames(ticker));
    const results = await Promise.allSettled(promises);

    // Filter out failed requests and null results
    return results
      .filter(
        (result): result is PromiseFulfilledResult<CompanyNameData> =>
          result.status === "fulfilled" && result.value !== null
      )
      .map((result) => result.value);
  } catch (error) {
    console.error("Error fetching batch company names:", error);
    return [];
  }
};

// Stock Logo API
export interface StockLogoResponse {
  ticker: string;
  image: string;
  contentType: string;
}

export const getStockLogo = async (ticker: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://47mvxdbu6f.execute-api.us-east-1.amazonaws.com/prod/logos/${ticker}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch logo for ${ticker}: ${response.status}`);
    }

    const data: StockLogoResponse = await response.json();
    return `data:image/png;base64,${data.image}`;
  } catch (error) {
    console.error(`Error fetching logo for ${ticker}:`, error);
    return null;
  }
};
