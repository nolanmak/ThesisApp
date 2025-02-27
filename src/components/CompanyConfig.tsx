import React, { useState, useEffect } from 'react';
import { getCompanyConfigs, createOrUpdateCompanyConfig, getCompanyConfigByTicker } from '../services/api';
import { CompanyConfig as CompanyConfigType, VerifyKeywords, LLMInstructions, PollingConfig, BrowserType } from '../types';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Plus, Filter, RefreshCw, Save, Trash2 } from 'lucide-react';
import { cache, CACHE_KEYS } from '../services/cache';

// Default prompt for LLM instructions
const DEFAULT_PROMPT = "You will receive a body of text containing a company's financial report and historical financial metrics. Your task is to: 1. **Extract Key Financial Metrics:** - Revenue for most recent quarter - GAAP EPS for most recent quarter - Non-GAAP EPS for most recent quarter - Forward guidance for revenue and margins for most recent quarter 2. **Compare Metrics:** Provide these metrics in the following format: - \"Revenue: $X billion\" - \"GAAP EPS: $X\" - \"Non-GAAP EPS: $X\" - \"Forward Guidance: Revenue: $X - $Y billion; Non-GAAP Gross Margin: X% - Y%\" 3. **Classify Sentiment:** - Identify forward guidance statements that could impact future performance. - Classify them as: - \"Bullish\" if they indicate growth, expansion, or optimistic outlook. - \"Bearish\" if they indicate contraction, risks, or cautious guidance. - \"Neutral\" if guidance is stable or lacks clear directional information. 4. **Output Structure:** Produce the output as a JSON object with the following structure. If there are not ranges for forward guidance, provide the same number twice: { \"metrics\": { \"revenue_billion\": X.XX, \"gaap_eps\": X.XX, \"non_gaap_eps\": X.XX, \"forward_guidance\": { \"revenue_billion_range\": [X.XX, Y.YY], \"non_gaap_gross_margin_range\": [X, Y], \"non_gaap_operating_margin_range\": [X, Y] } }, \"sentiment_snippets\": [ {\"snippet\": \"Text excerpt here\", \"classification\": \"Bullish/Bearish/Neutral\"} ] } 5. **Highlight Context:** Include the exact text excerpts as \"snippets\" from the report that support each sentiment classification. Pass this JSON output to the Python function for comparison.";

// Helper functions for base64 encoding/decoding
const encodeBase64 = (str: string): string => {
  return btoa(str);
};

const decodeBase64 = (str: string): string => {
  try {
    return atob(str);
  } catch (e) {
    // If decoding fails, return the original string
    console.warn("Failed to decode base64 string, returning original");
    return str;
  }
};

const CompanyConfig: React.FC = () => {
  const [configs, setConfigs] = useState<CompanyConfigType[]>([]);
  const [filteredConfigs, setFilteredConfigs] = useState<CompanyConfigType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CompanyConfigType | null>(null);
  const [filterTicker, setFilterTicker] = useState('');
  
  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<CompanyConfigType>({
    defaultValues: {
      ticker: '',
      base_url: '',
      key_phrase: '',
      extraction_method: '',
      href_ignore_words: [],
      llm_instructions: {
        system: encodeBase64(DEFAULT_PROMPT),
        temperature: 0
      },
      polling_config: {
        interval: 2,
        max_attempts: 30
      },
      refine_link_list: false,
      selectors: [],
      url_ignore_list: [],
      verify_keywords: {
        fixed_terms: [],
        quarter_as_string: false,
        quarter_with_q: false,
        requires_current_year: false,
        requires_quarter: false,
        requires_year: false
      },
      browser_type: 'chromium'
    }
  });
  
  const { fields: selectorFields, append: appendSelector, remove: removeSelector } = useFieldArray({
    control,
    name: 'selectors'
  });
  
  const { fields: urlIgnoreFields, append: appendUrlIgnore, remove: removeUrlIgnore } = useFieldArray({
    control,
    name: 'url_ignore_list'
  });
  
  const { fields: hrefIgnoreFields, append: appendHrefIgnore, remove: removeHrefIgnore } = useFieldArray({
    control,
    name: 'href_ignore_words'
  });
  
  const { fields: fixedTermsFields, append: appendFixedTerm, remove: removeFixedTerm } = useFieldArray({
    control,
    name: 'verify_keywords.fixed_terms'
  });
  
  useEffect(() => {
    fetchCompanyConfigs();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [configs, filterTicker]);
  
  const fetchCompanyConfigs = async () => {
    try {
      setLoading(true);
      const items = await getCompanyConfigs();
      setConfigs(items);
      setFilteredConfigs(items);
    } catch (error) {
      console.error('Failed to fetch company configs:', error);
      toast.error('Failed to fetch company configs');
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let filtered = [...configs];
    
    if (filterTicker) {
      filtered = filtered.filter(item => 
        item.ticker.toLowerCase().includes(filterTicker.toLowerCase())
      );
    }
    
    setFilteredConfigs(filtered);
  };
  
  const onSubmit = async (data: CompanyConfigType) => {
    try {
      // Clean up empty arrays
      const cleanedData = {
        ...data,
        href_ignore_words: data.href_ignore_words?.filter(word => word !== ''),
        selectors: data.selectors?.filter(selector => selector !== ''),
        url_ignore_list: data.url_ignore_list?.filter(url => url !== ''),
        verify_keywords: {
          ...data.verify_keywords,
          fixed_terms: data.verify_keywords?.fixed_terms?.filter(term => term !== '')
        }
      };
      
      // Encode the system prompt to base64 before saving
      const encodedData = {
        ...cleanedData,
        llm_instructions: {
          ...cleanedData.llm_instructions,
          system: encodeBase64(cleanedData.llm_instructions.system)
        }
      };
      
      await createOrUpdateCompanyConfig(encodedData);
      
      if (editingConfig) {
        setConfigs(prev => prev.map(config => 
          config.ticker === encodedData.ticker ? encodedData : config
        ));
        toast.success(`Updated configuration for ${encodedData.ticker}`);
      } else {
        setConfigs(prev => [...prev, encodedData]);
        toast.success(`Added configuration for ${encodedData.ticker}`);
      }
      
      setShowAddForm(false);
      setEditingConfig(null);
      reset();
    } catch (error) {
      console.error('Failed to save company config:', error);
      toast.error('Failed to save company config');
    }
  };
  
  const handleEdit = async (ticker: string) => {
    try {
      const config = await getCompanyConfigByTicker(ticker);
      if (config) {
        // Decode the base64 system prompt for editing
        const decodedConfig = {
          ...config,
          llm_instructions: {
            ...config.llm_instructions,
            system: decodeBase64(config.llm_instructions.system)
          }
        };
        
        setEditingConfig(decodedConfig);
        
        // Reset form with the decoded config values
        reset(decodedConfig);
        
        // Open the form
        setShowAddForm(true);
      }
    } catch (error) {
      console.error('Failed to get company config:', error);
      toast.error('Failed to get company config');
    }
  };
  
  const resetFilters = () => {
    setFilterTicker('');
  };
  
  const handleAddNew = () => {
    setEditingConfig(null);
    reset({
      ticker: '',
      base_url: '',
      key_phrase: '',
      extraction_method: '',
      href_ignore_words: [],
      llm_instructions: {
        system: DEFAULT_PROMPT, // Use the default prompt (not encoded)
        temperature: 0
      },
      polling_config: {
        interval: 2,
        max_attempts: 30
      },
      refine_link_list: false,
      selectors: [],
      url_ignore_list: [],
      verify_keywords: {
        fixed_terms: [],
        quarter_as_string: false,
        quarter_with_q: false,
        requires_current_year: false,
        requires_quarter: false,
        requires_year: false
      },
      browser_type: 'chromium'
    });
    setShowAddForm(true);
  };
  
  const handleResetToDefaultPrompt = () => {
    setValue('llm_instructions.system', DEFAULT_PROMPT);
  };

  const handleRefresh = () => {
    // Clear the cache for company configs
    cache.remove(CACHE_KEYS.COMPANY_CONFIGS);
    fetchCompanyConfigs();
    toast.info('Refreshed from server');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Company Configurations</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            <RefreshCw size={16} className="mr-1" />
            Refresh
          </button>
          <button
            onClick={handleAddNew}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus size={16} className="mr-1" />
            Add Configuration
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-md shadow">
        <div className="flex items-center space-x-2 mb-2">
          <Filter size={16} />
          <h2 className="font-semibold">Filters</h2>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="filterTicker" className="block text-sm font-medium text-gray-700">
              Ticker
            </label>
            <input
              id="filterTicker"
              type="text"
              value={filterTicker}
              onChange={(e) => setFilterTicker(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Filter by ticker"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>
      
      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-4 rounded-md shadow">
          <h2 className="font-semibold mb-4">
            {editingConfig ? `Edit Configuration: ${editingConfig.ticker}` : 'Add Company Configuration'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ticker" className="block text-sm font-medium text-gray-700">
                    Ticker
                  </label>
                  <input
                    id="ticker"
                    type="text"
                    {...register('ticker', { required: 'Ticker is required' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    disabled={!!editingConfig}
                  />
                  {errors.ticker && (
                    <p className="mt-1 text-sm text-red-600">{errors.ticker.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="base_url" className="block text-sm font-medium text-gray-700">
                    Base URL
                  </label>
                  <input
                    id="base_url"
                    type="text"
                    {...register('base_url', { required: 'Base URL is required' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  {errors.base_url && (
                    <p className="mt-1 text-sm text-red-600">{errors.base_url.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="key_phrase" className="block text-sm font-medium text-gray-700">
                    Key Phrase
                  </label>
                  <input
                    id="key_phrase"
                    type="text"
                    {...register('key_phrase')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="extraction_method" className="block text-sm font-medium text-gray-700">
                    Extraction Method
                  </label>
                  <input
                    id="extraction_method"
                    type="text"
                    {...register('extraction_method')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., pdf"
                  />
                </div>
                
                <div>
                  <label htmlFor="browser_type" className="block text-sm font-medium text-gray-700">
                    Browser Type
                  </label>
                  <select
                    id="browser_type"
                    {...register('browser_type')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="chromium">Chromium</option>
                    <option value="firefox">Firefox</option>
                  </select>
                </div>
                
                <div className="flex items-center h-full pt-6">
                  <input
                    id="refine_link_list"
                    type="checkbox"
                    {...register('refine_link_list')}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="refine_link_list" className="ml-2 block text-sm text-gray-700">
                    Refine Link List
                  </label>
                </div>
              </div>
            </div>
            
            {/* Polling Configuration */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium mb-4">Polling Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="polling_config.interval" className="block text-sm font-medium text-gray-700">
                    Interval (seconds)
                  </label>
                  <input
                    id="polling_config.interval"
                    type="number"
                    {...register('polling_config.interval', { 
                      required: 'Interval is required',
                      valueAsNumber: true,
                      min: { value: 1, message: 'Interval must be at least 1 second' }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  {errors.polling_config?.interval && (
                    <p className="mt-1 text-sm text-red-600">{errors.polling_config.interval.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="polling_config.max_attempts" className="block text-sm font-medium text-gray-700">
                    Max Attempts
                  </label>
                  <input
                    id="polling_config.max_attempts"
                    type="number"
                    {...register('polling_config.max_attempts', { 
                      required: 'Max attempts is required',
                      valueAsNumber: true,
                      min: { value: 1, message: 'Max attempts must be at least 1' }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  {errors.polling_config?.max_attempts && (
                    <p className="mt-1 text-sm text-red-600">{errors.polling_config.max_attempts.message}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* LLM Instructions */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium mb-4">LLM Instructions</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="llm_instructions.system" className="block text-sm font-medium text-gray-700">
                      System Prompt (Decoded for Editing)
                    </label>
                    <button
                      type="button"
                      onClick={handleResetToDefaultPrompt}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Reset to Default
                    </button>
                  </div>
                  <textarea
                    id="llm_instructions.system"
                    rows={10}
                    {...register('llm_instructions.system', { required: 'System prompt is required' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This prompt will be base64 encoded when saved to the database.
                  </p>
                  {errors.llm_instructions?.system && (
                    <p className="mt-1 text-sm text-red-600">{errors.llm_instructions.system.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="llm_instructions.temperature" className="block text-sm font-medium text-gray-700">
                    Temperature
                  </label>
                  <input
                    id="llm_instructions.temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    {...register('llm_instructions.temperature', { 
                      required: 'Temperature is required',
                      valueAsNumber: true,
                      min: { value: 0, message: 'Temperature must be at least 0' },
                      max: { value: 2, message: 'Temperature must be at most 2' }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  {errors.llm_instructions?.temperature && (
                    <p className="mt-1 text-sm text-red-600">{errors.llm_instructions.temperature.message}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Verify Keywords */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium mb-4">Verify Keywords</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center">
                  <input
                    id="verify_keywords.quarter_as_string"
                    type="checkbox"
                    {...register('verify_keywords.quarter_as_string')}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="verify_keywords.quarter_as_string" className="ml-2 block text-sm text-gray-700">
                    Quarter as String
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="verify_keywords.quarter_with_q"
                    type="checkbox"
                    {...register('verify_keywords.quarter_with_q')}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="verify_keywords.quarter_with_q" className="ml-2 block text-sm text-gray-700">
                    Quarter with Q
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="verify_keywords.requires_current_year"
                    type="checkbox"
                    {...register('verify_keywords.requires_current_year')}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="verify_keywords.requires_current_year" className="ml-2 block text-sm text-gray-700">
                    Requires Current Year
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="verify_keywords.requires_quarter"
                    type="checkbox"
                    {...register('verify_keywords.requires_quarter')}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="verify_keywords.requires_quarter" className="ml-2 block text-sm text-gray-700">
                    Requires Quarter
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="verify_keywords.requires_year"
                    type="checkbox"
                    {...register('verify_keywords.requires_year')}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="verify_keywords.requires_year" className="ml-2 block text-sm text-gray-700">
                    Requires Year
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fixed Terms
                </label>
                <div className="space-y-2">
                  {fixedTermsFields.map((field, index) => (
                    <div key={field.id} className="flex items-center">
                      <input
                        {...register(`verify_keywords.fixed_terms.${index}`)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeFixedTerm(index)}
                        className="ml-2 p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => appendFixedTerm('')}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Fixed Term
                  </button>
                </div>
              </div>
            </div>
            
            {/* Selectors */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium mb-4">Selectors</h3>
              <div className="space-y-2">
                {selectorFields.map((field, index) => (
                  <div key={field.id} className="flex items-center">
                    <input
                      {...register(`selectors.${index}`)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="CSS Selector"
                    />
                    <button
                      type="button"
                      onClick={() => removeSelector(index)}
                      className="ml-2 p-1 text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => appendSelector('')}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus size={16} className="mr-1" />
                  Add Selector
                </button>
              </div>
            </div>
            
            {/* URL Ignore List */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium mb-4">URL Ignore List</h3>
              <div className="space-y-2">
                {urlIgnoreFields.map((field, index) => (
                  <div key={field.id} className="flex items-center">
                    <input
                      {...register(`url_ignore_list.${index}`)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="URL to ignore"
                    />
                    <button
                      type="button"
                      onClick={() => removeUrlIgnore(index)}
                      className="ml-2 p-1 text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => appendUrlIgnore('')}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus size={16} className="mr-1" />
                  Add URL to Ignore
                </button>
              </div>
            </div>
            
            {/* HREF Ignore Words */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium mb-4">HREF Ignore Words</h3>
              <div className="space-y-2">
                {hrefIgnoreFields.map((field, index) => (
                  <div key={field.id} className="flex items-center">
                    <input
                      {...register(`href_ignore_words.${index}`)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Word to ignore in href"
                    />
                    <button
                      type="button"
                      onClick={() => removeHrefIgnore(index)}
                      className="ml-2 p-1 text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => appendHrefIgnore('')}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus size={16} className="mr-1" />
                  Add HREF Ignore Word
                </button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingConfig(null);
                  reset();
                }}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save size={16} className="mr-1" />
                {editingConfig ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Configs Table */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        {loading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : filteredConfigs.length === 0 ? (
          <div className="p-4 text-center">No configurations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticker
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Base URL
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Extraction Method
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Browser
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Selectors
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredConfigs.map((config) => (
                  <tr key={config.ticker}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {config.ticker}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {config.base_url}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {config.extraction_method || 'Default'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {config.browser_type ? 
                        (config.browser_type === 'chromium' ? 'Chromium' : 'Firefox') : 
                        'Chromium (Default)'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {config.selectors && config.selectors.length > 0 ? (
                        <ul className="list-disc pl-5">
                          {config.selectors.map((selector, index) => (
                            <li key={index} className="truncate max-w-xs">
                              {selector}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        'No selectors'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleEdit(config.ticker)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyConfig;