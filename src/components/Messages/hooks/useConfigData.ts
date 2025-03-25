import { useState, useCallback, useRef } from 'react';
import { 
  getCompanyConfigs,
  getCompanyConfigByTicker,
  createOrUpdateCompanyConfig
} from '../../../services/api';
import { EarningsItem, CompanyConfig } from '../../../types';
import { toast } from 'react-toastify';

const useConfigData = () => {
  const [configMap, setConfigMap] = useState<Record<string, boolean>>({});
  const [currentConfigItem, setCurrentConfigItem] = useState<EarningsItem | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Cache storage
  const configCache = useRef({
    lastFetch: 0,
    data: {} as Record<string, boolean>
  });

  // Fetch configuration status for each ticker
  const fetchConfigStatus = useCallback(async () => {
    const now = Date.now();
    
    // Only refetch if it's been at least 30 seconds since the last fetch
    // and we already have some cached data
    if (now - configCache.current.lastFetch < 30000 && 
        Object.keys(configCache.current.data).length > 0) {
      setConfigMap(configCache.current.data);
      return;
    }
    
    try {
      // Get all configs at once instead of individually
      const allConfigs = await getCompanyConfigs();
      const configsMap = allConfigs.reduce((map: Record<string, boolean>, config) => {
        map[config.ticker] = true;
        return map;
      }, {});
      
      // Update cache
      configCache.current = {
        lastFetch: now,
        data: configsMap
      };
      
      // Set config map
      setConfigMap(configsMap);
    } catch (error) {
      console.error('Error fetching configs:', error);
    }
  }, []);

  // Handle opening config modal
  const handleOpenConfigModal = useCallback((item: EarningsItem) => {
    console.log('Opening config modal for item:', item);
    
    // Set the current item first, then show the modal
    setCurrentConfigItem(item);
    console.log('Current config item set to:', item);
    
    // Then show the modal
    setShowConfigModal(true);
    console.log('Show config modal set to true');
    
    return item;
  }, []);

  // Handle configuration form submission
  const submitConfig = useCallback(async (data: CompanyConfig) => {
    if (!currentConfigItem) return false;

    try {
      // Encode the system prompt to base64 if it exists
      let configData = {
        ...data,
        ticker: currentConfigItem.ticker
      };
      
      // Base64 encode the system prompt if it exists
      if (configData.llm_instructions?.system) {
        configData = {
          ...configData,
          llm_instructions: {
            ...configData.llm_instructions,
            system: btoa(configData.llm_instructions.system)
          }
        };
      }
      
      // Clean up arrays to remove empty values
      configData = {
        ...configData,
        href_ignore_words: Array.isArray(configData.href_ignore_words) 
          ? configData.href_ignore_words.filter(word => word !== '') 
          : [],
        url_ignore_list: Array.isArray(configData.url_ignore_list) 
          ? configData.url_ignore_list.filter(url => url !== '') 
          : [],
        verify_keywords: {
          ...configData.verify_keywords,
          fixed_terms: Array.isArray(configData.verify_keywords?.fixed_terms) 
            ? configData.verify_keywords.fixed_terms.filter(term => term !== '') 
            : []
        }
      };
      
      // Create or update company config
      await createOrUpdateCompanyConfig(configData);
      
      // Update config map directly
      const newConfigMap = {
        ...configMap,
        [currentConfigItem.ticker]: true
      };
      
      // Update both state and cache
      setConfigMap(newConfigMap);
      configCache.current = {
        lastFetch: Date.now(),
        data: newConfigMap
      };
      
      toast.success(`Configuration for ${currentConfigItem.ticker} saved successfully`);
      
      // Close modal
      setShowConfigModal(false);
      return true;
    } catch (error) {
      console.error('Error submitting configuration:', error);
      toast.error('Failed to save configuration');
      return false;
    }
  }, [currentConfigItem, configMap]);

  // Get default config for a company
  const getDefaultConfig = useCallback((ticker: string): CompanyConfig => {
    return {
      ticker: ticker,
      base_url: '',
      extraction_method: 'pdf',
      href_ignore_words: [],
      llm_instructions: {
        system: `
        # Metric Mapping Definition:
        #   Revenue -> revenue_billion
        #   Transaction Revenue -> transaction_revenue_billion
        #   Subscription Revenue -> subscription_revenue_billion
        #   Gross Profit -> gross_profit_billion
        #   Net Income -> net_income_billion
        #   Adjusted Ebitda -> adj_ebitda_billion
        #   Non Gaap Net Income -> non_gaap_net_income_billion
        #   Free Cash Flow -> free_cash_flow_billion
        #   quarter_eps_mean -> quarter_eps_mean
        #
        # All numerical values provided in millions should be converted to billions by dividing by 1000 and formatted to two decimal places.

        You will receive a body of text containing a company's financial report and historical financial metrics. Your task is to:

        1. **Extract Financial Metrics:**
        - If a metric is not mentioned in the document, it should be null. DO NOT MAKE UP METRICS IF THEY ARE NOT THERE.
        - Identify and extract every financial metric mentioned in the body of text using the example naming convention above, even if they are not listed above or the ones above are not present in the document.
        - Explicitly differentiate between **current quarter metrics** and **full year metrics** if both are present. For each metric, capture its value under either "current_quarter" or "full_year" in the output.
        - Additionally, extract any forward guidance metrics and differentiate them into:
                - **Next Quarter Forward Guidance**
                - **Fiscal Year Forward Guidance**
        For each forward guidance metric, if only a single value is provided, output a dictionary with the keys "low" and "high" both set to that value.
        - **Important:** When outputting any range values (such as forward guidance ranges), output a valid JSON object with two keys: "low" and "high", each mapped to the respective numeric value.
        - Convert large metric values (provided in millions) to billions format.

        2. **Classify Sentiment:**
        - Identify any forward guidance statements or excerpts that may impact future performance.
        - Classify these excerpts as:
            - "Bullish" if they suggest growth, expansion, or an optimistic outlook.
            - "Bearish" if they imply contraction, risk, or a cautious tone.
            - "Neutral" if they are ambiguous or lack clear directional sentiment.
        - Include the exact text excerpts (snippets) that support each sentiment classification.

        3. **Output Structure:**
        - Produce the output as a JSON object with the following structure. For any metrics representing ranges (e.g., forward guidance), if only a single value is provided, output that value twice in a dictionary with keys "low" and "high".
        {
            "metrics": {
                "current_quarter": {
                    "<metric_key>": <value>,
                    ...
                },
                "full_year": {
                    "<metric_key>": <value>,
                    ...
                },
                "forward_guidance": {
                    "next_quarter": {
                        "<metric_key>_range": {"low": <lower>, "high": <upper>},
                        ...
                    },
                    "fiscal_year": {
                        "<metric_key>_range": {"low": <lower>, "high": <upper>},
                        ...
                    }
                }
            },
            "comparisons": {
                "current_quarter": {
                    "<metric_key>": "Current: $X vs Historical: $Y",
                    ...
                },
                "full_year": {
                    "<metric_key>": "Full Year: $X vs Historical: $Y",
                    ...
                }
            },
            "sentiment_snippets": [
                {"snippet": "Text excerpt here", "classification": "Bullish/Bearish/Neutral"}
            ]
        }

        4. **Highlight Context:**
        - Include the exact text excerpts as "snippets" from the report that support each sentiment classification.
        - Ignore standard legal language.

        **Output Requirement:**
        - The entire output must be valid JSON. Output the JSON in a code block (using triple backticks) to ensure proper formatting.
        `,
        temperature: 0
      },
      selector: '',
      url_ignore_list: [],
      verify_keywords: {
        fixed_terms: [],
        quarter_as_string: false,
        quarter_with_q: false,
        requires_current_year: false,
        requires_quarter: false,
        requires_year: false
      },
      browser_type: 'chromium',
      page_content_selector: 'body',
      key_element_selector: 'body',
      key_element_id: '',
      key_element_class: ''
    };
  }, []);

  // Get existing config for a ticker
  const getExistingConfig = useCallback(async (ticker: string): Promise<CompanyConfig | null> => {
    try {
      return await getCompanyConfigByTicker(ticker);
    } catch (error) {
      console.error('Error fetching config for ticker:', error);
      return null;
    }
  }, []);

  return {
    configMap,
    currentConfigItem,
    showConfigModal,
    setShowConfigModal,
    fetchConfigStatus,
    handleOpenConfigModal,
    handleCloseConfigModal: () => {
      console.log('Closing config modal from hook');
      setShowConfigModal(false)
    },
    submitConfig,
    getDefaultConfig,
    getExistingConfig,
    configExists: (ticker: string) => Boolean(configMap[ticker])
  };
};

export default useConfigData;
