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
      href_ignore_words: [],
      selector: 'a',
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
      key_element_class: '',
      use_proxy: true,
      requires_network_idle: false
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
