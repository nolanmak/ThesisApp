export interface EarningsItem {
  date: string;
  ticker: string;
  is_active: boolean;
  quarter: number;
  release_time: string;
  year: number;
}

export interface HistoricalMetrics {
  ticker: string;
  date: string;
  current_fiscal_year_eps_mean: number;
  current_fiscal_year_sales_mean_millions: number;
  current_quarter_eps_mean: number;
  current_quarter_sales_estimate_millions: number;
  next_quarter_eps_mean: number;
  next_quarter_sales_estimate_millions: number;
}

export interface Message {
  message_id: string;
  discord_message: string;
  timestamp: string;
  ticker: string;
  year: string;
  quarter: string;
  is_read?: boolean;
  subject?: string;
  source?: string;
}

export interface VerifyKeywords {
  fixed_terms?: string[];
  quarter_as_string?: boolean;
  quarter_with_q?: boolean;
  requires_current_year?: boolean;
  requires_quarter?: boolean;
  requires_year?: boolean;
}

export interface LLMInstructions {
  system: string;
  temperature: number;
}

export type BrowserType = 'chromium' | 'firefox';

export interface CompanyConfig {
  ticker: string;
  base_url: string;
  extraction_method?: string;
  href_ignore_words?: string[];
  llm_instructions: LLMInstructions;
  selector?: string;
  url_ignore_list?: string[];
  verify_keywords: VerifyKeywords;
  browser_type?: BrowserType;
  page_content_selector?: string;
  key_element_selector?: string;
  key_element_id?: string;
  key_element_class?: string;
}