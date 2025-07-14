export interface EarningsItem {
  date: string;
  ticker: string;
  is_active: boolean;
  quarter: number;
  release_time: string;
  year: number;
  company_name?: string;
  WireActive?: boolean;
  IRActive?: boolean;
}

export type MetricItem = {
  label: string;
  text?: string;
} | string;

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
  link?: string;
  company_name?: string;
  report_data?: {
    link?: string;
  }
}

export interface VerifyKeywords {
  fixed_terms?: string[];
  quarter_as_string?: boolean;
  quarter_with_q?: boolean;
  requires_current_year?: boolean;
  requires_quarter?: boolean;
  requires_year?: boolean;
}

export type BrowserType = 'chromium' | 'firefox';

export interface CompanyConfig {
  ticker: string;
  base_url: string;
  href_ignore_words?: string[];
  selector?: string;
  url_ignore_list?: string[];
  verify_keywords: VerifyKeywords;
  browser_type?: BrowserType;
  page_content_selector?: string;
  key_element_selector?: string;
  key_element_id?: string;
  key_element_class?: string;
  use_proxy?: boolean;
  requires_network_idle?: boolean;
}