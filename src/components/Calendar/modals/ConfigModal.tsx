import React, { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { EarningsItem, CompanyConfig, VerifyKeywords } from '../../../types';
import { getCompanyConfigByTicker } from '../../../services/api';
import { toast } from 'react-toastify';

// Form-specific interface to handle string inputs for arrays
interface ConfigFormData extends Omit<CompanyConfig, 'href_ignore_words' | 'url_ignore_list' | 'verify_keywords'> {
  href_ignore_words?: string | string[];
  url_ignore_list?: string | string[];
  verify_keywords: Omit<VerifyKeywords, 'fixed_terms'> & {
    fixed_terms?: string | string[];
  };
}

interface ConfigModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: CompanyConfig) => Promise<boolean>;
  currentItem: EarningsItem | null;
  getDefaultConfig: (ticker: string) => CompanyConfig;
}

const ConfigModal: React.FC<ConfigModalProps> = ({
  show,
  onClose,
  onSubmit,
  currentItem,
  getDefaultConfig
}) => {
  
  // Don't render anything if not showing
  if (!show) {
    return null;
  }
  
  // Handle case when currentItem is missing
  if (!currentItem) {
    console.log('Warning: ConfigModal rendered without currentItem!');
    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70" onClick={onClose}></div>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto relative z-50">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">Error</h2>
                <button onClick={onClose} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">&times;</button>
              </div>
              <p className="text-red-500 dark:text-red-400">No company selected. Please try again.</p>
              <div className="flex justify-end pt-4">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const { 
    register, 
    handleSubmit, 
    reset, 
    formState: { errors } 
  } = useForm<ConfigFormData>({
    shouldUnregister: false
  });

  // Fetch existing config data if available
  useEffect(() => {
    if (show && currentItem) {
      const fetchConfig = async () => {
        try {
          const defaultConfig = getDefaultConfig(currentItem.ticker);
          const existingConfig = await getCompanyConfigByTicker(currentItem.ticker);
          
          console.log('Config data format:', {
            defaultConfig,
            existingConfig
          });
          
          // If config exists, pre-populate the form
          if (existingConfig) {
            
            // Convert array fields to strings for textarea and normalize case for extraction_method
            const formData: ConfigFormData = {
              ...existingConfig,
              use_proxy: existingConfig.use_proxy ?? false,
              // Normalize extraction_method case (convert 'Web' to 'web')
              href_ignore_words: Array.isArray(existingConfig.href_ignore_words) 
                ? existingConfig.href_ignore_words.join('\n') 
                : existingConfig.href_ignore_words,
              url_ignore_list: Array.isArray(existingConfig.url_ignore_list) 
                ? existingConfig.url_ignore_list.join('\n') 
                : existingConfig.url_ignore_list,
              verify_keywords: {
                ...existingConfig.verify_keywords,
                fixed_terms: Array.isArray(existingConfig.verify_keywords?.fixed_terms) 
                  ? existingConfig.verify_keywords.fixed_terms.join('\n') 
                  : existingConfig.verify_keywords?.fixed_terms
              }
            };
            
            console.log('Processed form data:', formData);
            reset(formData);
          } else {
            // Reset form with default values
            console.log('Using default config:', defaultConfig);
            reset({
              ...defaultConfig,
              use_proxy: defaultConfig.use_proxy ?? false
            });
          }
        } catch (error) {
          console.error('Error fetching config for item:', error);
          // In case of error, just show default form
          const defaultConfig = getDefaultConfig(currentItem.ticker);
          reset({
            ...defaultConfig,
            use_proxy: defaultConfig.use_proxy ?? false
          });
          toast.error('Could not fetch existing configuration. Starting with a new form.');
        }
      };
      
      fetchConfig();
    }
  }, [show, currentItem, reset, getDefaultConfig]);

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [show, onClose]);

  if (!show || !currentItem) {
    console.log('Not showing ConfigModal because:', { show, currentItem });
    return null;
  }

  const handleFormSubmit: SubmitHandler<ConfigFormData> = async (formData) => {
    // Process textarea inputs that should be arrays
    const processedData: CompanyConfig = {
      ...formData as unknown as CompanyConfig,
      use_proxy: !!formData.use_proxy,
      href_ignore_words: typeof formData.href_ignore_words === 'string' 
        ? formData.href_ignore_words.split('\n').filter(line => line.trim() !== '')
        : Array.isArray(formData.href_ignore_words) 
          ? formData.href_ignore_words 
          : [],
      url_ignore_list: typeof formData.url_ignore_list === 'string'
        ? formData.url_ignore_list.split('\n').filter(line => line.trim() !== '')
        : Array.isArray(formData.url_ignore_list) 
          ? formData.url_ignore_list 
          : [],
      verify_keywords: {
        ...formData.verify_keywords,
        fixed_terms: typeof formData.verify_keywords?.fixed_terms === 'string'
          ? formData.verify_keywords.fixed_terms.split('\n').filter(line => line.trim() !== '')
          : Array.isArray(formData.verify_keywords?.fixed_terms) 
            ? formData.verify_keywords.fixed_terms 
            : []
      }
    };
    
    const success = await onSubmit(processedData);
    if (success) {
      onClose(); // Close the modal on success
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70" onClick={onClose}></div>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative z-50">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
                Configure {currentItem.ticker}
              </h2>
              <button
                onClick={onClose}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                &times;
              </button>
            </div>
          
            {/* Configuration form */}
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Base URL
                </label>
                <input
                  type="text"
                  {...register("base_url", { 
                    required: true,
                    pattern: {
                      value: /^((https?:\/\/)?(www\.)?)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([\/?#].*)?$/,
                      message: "Please enter a valid URL (e.g., example.com)"
                    }
                  })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                  placeholder="https://example.com/investor-relations"
                />
                {errors.base_url && (
                  <p className="text-error-500 dark:text-error-400 text-xs mt-1">
                    {errors.base_url.type === "required" ? "Base URL is required" : errors.base_url.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Browser Type
                </label>
                <select
                  {...register("browser_type")}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="chromium">Chromium</option>
                  <option value="firefox">Firefox</option>
                </select>
              </div>

              {/* Use Proxy Checkbox */}
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="use_proxy"
                  {...register("use_proxy")}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="use_proxy" className="ml-2 block text-sm text-gray-700">
                  Use Proxy
                </label>
              </div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="requires_network_idle"
                  {...register("requires_network_idle")}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="requires_network_idle" className="ml-2 block text-sm text-gray-700">
                  Requires Network Idle
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Selector
                </label>
                <input
                  type="text"
                  {...register("selector", { required: true })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                  placeholder=".earnings-press-release"
                />
                {errors.selector && (
                  <p className="text-error-500 dark:text-error-400 text-xs mt-1">Selector is required</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Page Content Selector
                </label>
                <input
                  type="text"
                  {...register("page_content_selector")}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                  placeholder="body"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  URL Ignore List (one per line)
                </label>
                <textarea
                  {...register("url_ignore_list")}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 h-20"
                  placeholder="https://example.com/archive&#10;https://example.com/old-releases"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Href Ignore Words (one per line)
                </label>
                <textarea
                  {...register("href_ignore_words")}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 h-30"
                  placeholder="archive&#10;old&#10;history"
                />
              </div>
              
              <div className="border p-3 rounded-md bg-gray-50">
                <h3 className="font-medium text-neutral-800 mb-2">Verify Keywords</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Fixed Terms (one per line)
                    </label>
                    <textarea
                      {...register("verify_keywords.fixed_terms")}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 h-20"
                      placeholder="financial results&#10;earnings&#10;quarterly"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="quarter_as_string"
                        {...register("verify_keywords.quarter_as_string")}
                        className="h-4 w-4 rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-neutral-900"
                      />
                      <label htmlFor="quarter_as_string" className="ml-2 block text-sm text-gray-700">
                        Quarter as String
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="quarter_with_q"
                        {...register("verify_keywords.quarter_with_q")}
                        className="h-4 w-4 rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-neutral-900"
                      />
                      <label htmlFor="quarter_with_q" className="ml-2 block text-sm text-gray-700 dark:text-neutral-300">
                        Quarter with Q
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requires_current_year"
                        {...register("verify_keywords.requires_current_year")}
                        className="h-4 w-4 rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-neutral-900"
                      />
                      <label htmlFor="requires_current_year" className="ml-2 block text-sm text-gray-700 dark:text-neutral-300">
                        Requires Current Year
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requires_quarter"
                        {...register("verify_keywords.requires_quarter")}
                        className="h-4 w-4 rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-neutral-900"
                      />
                      <label htmlFor="requires_quarter" className="ml-2 block text-sm text-gray-700 dark:text-neutral-300">
                        Requires Quarter
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requires_year"
                        {...register("verify_keywords.requires_year")}
                        className="h-4 w-4 rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-neutral-900"
                      />
                      <label htmlFor="requires_year" className="ml-2 block text-sm text-gray-700 dark:text-neutral-300">
                        Requires Year
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Key Element Selectors Section */}
              <div className="p-4 bg-white dark:bg-neutral-700 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-4">Key Element Selectors</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="key_element_selector" className="block text-sm font-medium text-gray-700 dark:text-neutral-300">
                        Key Element Selector
                      </label>
                      <input
                        type="text"
                        id="key_element_selector"
                        {...register("key_element_selector")}
                        defaultValue="body"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">CSS selector for the key element (default: body)</p>
                    </div>
                    
                    <div>
                      <label htmlFor="key_element_id" className="block text-sm font-medium text-gray-700 dark:text-neutral-300">
                        Key Element ID
                      </label>
                      <input
                        type="text"
                        id="key_element_id"
                        {...register("key_element_id")}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">ID of the key element (leave empty if not applicable)</p>
                    </div>
                    
                    <div>
                      <label htmlFor="key_element_class" className="block text-sm font-medium text-gray-700 dark:text-neutral-300">
                        Key Element Class
                      </label>
                      <input
                        type="text"
                        id="key_element_class"
                        {...register("key_element_class")}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">Class of the key element (leave empty if not applicable)</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 mr-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-primary-500 dark:bg-primary-600 hover:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-md"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
