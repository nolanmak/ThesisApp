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
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto relative z-50">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-neutral-800">Error</h2>
                <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700">&times;</button>
              </div>
              <p className="text-red-500">No company selected. Please try again.</p>
              <div className="flex justify-end pt-4">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200"
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
          
          // If config exists, pre-populate the form
          if (existingConfig) {
            // If the system prompt is base64 encoded, decode it
            if (existingConfig.llm_instructions?.system) {
              try {
                existingConfig.llm_instructions.system = atob(existingConfig.llm_instructions.system);
              } catch (error) {
                console.error('Error decoding system prompt:', error);
                // If decoding fails, use as is
              }
            }
            
            // Convert array fields to strings for textarea
            const formData: ConfigFormData = {
              ...existingConfig,
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
            
            reset(formData);
          } else {
            // Reset form with default values
            reset(defaultConfig);
          }
        } catch (error) {
          console.error('Error fetching config for item:', error);
          // In case of error, just show default form
          reset(getDefaultConfig(currentItem.ticker));
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
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative z-50">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-neutral-800">
                Configure {currentItem.ticker}
              </h2>
              <button
                onClick={onClose}
                className="text-neutral-500 hover:text-neutral-700"
              >
                &times;
              </button>
            </div>
          
            {/* Configuration form */}
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Base URL
                </label>
                <input
                  type="text"
                  {...register("base_url", { required: true })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="https://example.com/investor-relations"
                />
                {errors.base_url && (
                  <p className="text-error-500 text-xs mt-1">Base URL is required</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Extraction Method
                </label>
                <select
                  {...register("extraction_method")}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="pdf">PDF</option>
                  <option value="web">Web</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Browser Type
                </label>
                <select
                  {...register("browser_type")}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="chromium">Chromium</option>
                  <option value="firefox">Firefox</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Selector
                </label>
                <input
                  type="text"
                  {...register("selector")}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder=".earnings-press-release"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Page Content Selector
                </label>
                <input
                  type="text"
                  {...register("page_content_selector")}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="body"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  URL Ignore List (one per line)
                </label>
                <textarea
                  {...register("url_ignore_list")}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 h-20"
                  placeholder="https://example.com/archive&#10;https://example.com/old-releases"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Href Ignore Words (one per line)
                </label>
                <textarea
                  {...register("href_ignore_words")}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 h-30"
                  placeholder="archive&#10;old&#10;history"
                />
              </div>

              <div className="hidden">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  LLM System Prompt
                </label>
                <textarea
                  {...register("llm_instructions.system")}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 h-32"
                  placeholder="You are an AI assistant that helps extract earnings release dates..."
                />
              </div>

              <div className="hidden">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  LLM Temperature
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  {...register("llm_instructions.temperature", { min: 0, max: 2 })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              
              <div className="border p-3 rounded-md bg-gray-50">
                <h3 className="font-medium text-neutral-800 mb-2">Verify Keywords</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
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
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="quarter_with_q" className="ml-2 block text-sm text-gray-700">
                        Quarter with Q
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requires_current_year"
                        {...register("verify_keywords.requires_current_year")}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="requires_current_year" className="ml-2 block text-sm text-gray-700">
                        Requires Current Year
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requires_quarter"
                        {...register("verify_keywords.requires_quarter")}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="requires_quarter" className="ml-2 block text-sm text-gray-700">
                        Requires Quarter
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requires_year"
                        {...register("verify_keywords.requires_year")}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="requires_year" className="ml-2 block text-sm text-gray-700">
                        Requires Year
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Key Element Selectors Section */}
              <div className="p-4 bg-white rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Key Element Selectors</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="key_element_selector" className="block text-sm font-medium text-gray-700">
                        Key Element Selector
                      </label>
                      <input
                        type="text"
                        id="key_element_selector"
                        {...register("key_element_selector")}
                        defaultValue="body"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">CSS selector for the key element (default: body)</p>
                    </div>
                    
                    <div>
                      <label htmlFor="key_element_id" className="block text-sm font-medium text-gray-700">
                        Key Element ID
                      </label>
                      <input
                        type="text"
                        id="key_element_id"
                        {...register("key_element_id")}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">ID of the key element (leave empty if not applicable)</p>
                    </div>
                    
                    <div>
                      <label htmlFor="key_element_class" className="block text-sm font-medium text-gray-700">
                        Key Element Class
                      </label>
                      <input
                        type="text"
                        id="key_element_class"
                        {...register("key_element_class")}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">Class of the key element (leave empty if not applicable)</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200 mr-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-md"
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
