import React, { useState, useEffect } from 'react';
import { getHistoricalMetrics, createHistoricalMetrics } from '../services/api';
import { HistoricalMetrics as HistoricalMetricsType } from '../types';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Plus, Filter, RefreshCw } from 'lucide-react';
import { cache, CACHE_KEYS } from '../services/cache';

const HistoricalMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<HistoricalMetricsType[]>([]);
  const [filteredMetrics, setFilteredMetrics] = useState<HistoricalMetricsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterTicker, setFilterTicker] = useState('');
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<HistoricalMetricsType>();
  
  useEffect(() => {
    fetchHistoricalMetrics();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [metrics, filterTicker, filterDate]);
  
  const fetchHistoricalMetrics = async () => {
    try {
      setLoading(true);
      const items = await getHistoricalMetrics();
      setMetrics(items);
      setFilteredMetrics(items);
    } catch (error) {
      console.error('Failed to fetch historical metrics:', error);
      toast.error('Failed to fetch historical metrics');
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let filtered = [...metrics];
    
    if (filterTicker) {
      filtered = filtered.filter(item => 
        item.ticker.toLowerCase().includes(filterTicker.toLowerCase())
      );
    }
    
    if (filterDate) {
      const formattedFilterDate = format(filterDate, 'yyyy-MM-dd');
      filtered = filtered.filter(item => item.date === formattedFilterDate);
    }
    
    setFilteredMetrics(filtered);
  };
  
  const onSubmit = async (data: HistoricalMetricsType) => {
    try {
      // Format the date to YYYY-MM-DD if it's a Date object
      const formattedDate = typeof data.date === 'object' 
        ? format(new Date(data.date), 'yyyy-MM-dd')
        : data.date;
        
      const newMetrics = {
        ...data,
        date: formattedDate,
      };
      
      await createHistoricalMetrics(newMetrics);
      setMetrics(prev => [...prev, newMetrics]);
      setShowAddForm(false);
      reset();
      toast.success(`Added metrics for ${newMetrics.ticker} on ${formattedDate}`);
    } catch (error) {
      console.error('Failed to add metrics:', error);
      toast.error('Failed to add metrics');
    }
  };
  
  const resetFilters = () => {
    setFilterTicker('');
    setFilterDate(null);
  };
  
  const handleRefresh = () => {
    // Clear the cache for historical metrics
    cache.remove(CACHE_KEYS.HISTORICAL_METRICS);
    fetchHistoricalMetrics();
    toast.info('Refreshed from server');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Historical Metrics</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            <RefreshCw size={16} className="mr-1" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus size={16} className="mr-1" />
            Add Metrics
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
          <div>
            <label htmlFor="filterDate" className="block text-sm font-medium text-gray-700">
              Earnings Date
            </label>
            <DatePicker
              id="filterDate"
              selected={filterDate}
              onChange={(date) => setFilterDate(date)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              dateFormat="yyyy-MM-dd"
              placeholderText="Filter by date"
              isClearable
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
      
      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white p-4 rounded-md shadow">
          <h2 className="font-semibold mb-4">Add Historical Metrics</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                />
                {errors.ticker && (
                  <p className="mt-1 text-sm text-red-600">{errors.ticker.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <Controller
                  control={control}
                  name="date"
                  rules={{ required: 'Date is required' }}
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value ? new Date(field.value) : null}
                      onChange={(date) => field.onChange(date)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      dateFormat="yyyy-MM-dd"
                    />
                  )}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="current_fiscal_year_eps_mean" className="block text-sm font-medium text-gray-700">
                  Current Fiscal Year EPS Mean
                </label>
                <input
                  id="current_fiscal_year_eps_mean"
                  type="number"
                  step="0.01"
                  {...register('current_fiscal_year_eps_mean', { 
                    required: 'Current Fiscal Year EPS Mean is required',
                    valueAsNumber: true
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.current_fiscal_year_eps_mean && (
                  <p className="mt-1 text-sm text-red-600">{errors.current_fiscal_year_eps_mean.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="current_fiscal_year_sales_mean_millions" className="block text-sm font-medium text-gray-700">
                  Current Fiscal Year Sales Mean (Millions)
                </label>
                <input
                  id="current_fiscal_year_sales_mean_millions"
                  type="number"
                  step="0.01"
                  {...register('current_fiscal_year_sales_mean_millions', { 
                    required: 'Current Fiscal Year Sales Mean is required',
                    valueAsNumber: true
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.current_fiscal_year_sales_mean_millions && (
                  <p className="mt-1 text-sm text-red-600">{errors.current_fiscal_year_sales_mean_millions.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="current_quarter_eps_mean" className="block text-sm font-medium text-gray-700">
                  Current Quarter EPS Mean
                </label>
                <input
                  id="current_quarter_eps_mean"
                  type="number"
                  step="0.01"
                  {...register('current_quarter_eps_mean', { 
                    required: 'Current Quarter EPS Mean is required',
                    valueAsNumber: true
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.current_quarter_eps_mean && (
                  <p className="mt-1 text-sm text-red-600">{errors.current_quarter_eps_mean.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="current_quarter_sales_estimate_millions" className="block text-sm font-medium text-gray-700">
                  Current Quarter Sales Estimate (Millions)
                </label>
                <input
                  id="current_quarter_sales_estimate_millions"
                  type="number"
                  step="0.01"
                  {...register('current_quarter_sales_estimate_millions', { 
                    required: 'Current Quarter Sales Estimate is required',
                    valueAsNumber: true
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.current_quarter_sales_estimate_millions && (
                  <p className="mt-1 text-sm text-red-600">{errors.current_quarter_sales_estimate_millions.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="next_quarter_eps_mean" className="block text-sm font-medium text-gray-700">
                  Next Quarter EPS Mean
                </label>
                <input
                  id="next_quarter_eps_mean"
                  type="number"
                  step="0.01"
                  {...register('next_quarter_eps_mean', { 
                    required: 'Next Quarter EPS Mean is required',
                    valueAsNumber: true
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.next_quarter_eps_mean && (
                  <p className="mt-1 text-sm text-red-600">{errors.next_quarter_eps_mean.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="next_quarter_sales_estimate_millions" className="block text-sm font-medium text-gray-700">
                  Next Quarter Sales Estimate (Millions)
                </label>
                <input
                  id="next_quarter_sales_estimate_millions"
                  type="number"
                  step="0.01"
                  {...register('next_quarter_sales_estimate_millions', { 
                    required: 'Next Quarter Sales Estimate is required',
                    valueAsNumber: true
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.next_quarter_sales_estimate_millions && (
                  <p className="mt-1 text-sm text-red-600">{errors.next_quarter_sales_estimate_millions.message}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  reset();
                }}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Metrics
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Metrics Table */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        {loading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : filteredMetrics.length === 0 ? (
          <div className="p-4 text-center">No metrics found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticker
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current FY EPS
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current FY Sales (M)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Q EPS
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Q Sales (M)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Q EPS
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Q Sales (M)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMetrics.map((item) => (
                  <tr key={`${item.ticker}-${item.date}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.ticker}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.current_fiscal_year_eps_mean.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.current_fiscal_year_sales_mean_millions.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.current_quarter_eps_mean.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.current_quarter_sales_estimate_millions.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.next_quarter_eps_mean.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.next_quarter_sales_estimate_millions.toFixed(2)}
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

export default HistoricalMetrics;