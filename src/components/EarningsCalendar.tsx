import React, { useState, useEffect } from 'react';
import { getEarningsItems, updateEarningsItem, createEarningsItem } from '../services/api';
import { EarningsItem } from '../types';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Plus, Filter, RefreshCw } from 'lucide-react';
import { cache, CACHE_KEYS } from '../services/cache';

const EarningsCalendar: React.FC = () => {
  const [earningsItems, setEarningsItems] = useState<EarningsItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<EarningsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterTicker, setFilterTicker] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<EarningsItem>();
  
  useEffect(() => {
    fetchEarningsItems();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [earningsItems, filterTicker, filterActive]);
  
  const fetchEarningsItems = async () => {
    try {
      setLoading(true);
      const items = await getEarningsItems();
      setEarningsItems(items);
      setFilteredItems(items);
    } catch (error) {
      console.error('Failed to fetch earnings items:', error);
      toast.error('Failed to fetch earnings items');
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let filtered = [...earningsItems];
    
    if (filterTicker) {
      filtered = filtered.filter(item => 
        item.ticker.toLowerCase().includes(filterTicker.toLowerCase())
      );
    }
    
    if (filterActive !== null) {
      filtered = filtered.filter(item => item.is_active === filterActive);
    }
    
    setFilteredItems(filtered);
  };
  
  const handleToggleActive = async (item: EarningsItem) => {
    try {
      const updatedItem = { ...item, is_active: !item.is_active };
      await updateEarningsItem(updatedItem);
      
      setEarningsItems(prev => 
        prev.map(i => 
          i.ticker === item.ticker && i.date === item.date ? updatedItem : i
        )
      );
      
      toast.success(`${item.ticker} is now ${!item.is_active ? 'active' : 'inactive'}`);
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item');
    }
  };
  
  const onSubmit = async (data: EarningsItem) => {
    try {
      // Format the date to YYYY-MM-DD
      const formattedDate = format(new Date(data.date), 'yyyy-MM-dd');
      const newItem = {
        ...data,
        date: formattedDate,
        is_active: data.is_active || false,
      };
      
      await createEarningsItem(newItem);
      setEarningsItems(prev => [...prev, newItem]);
      setShowAddForm(false);
      reset();
      toast.success(`Added ${newItem.ticker} for ${formattedDate}`);
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Failed to add item');
    }
  };
  
  const resetFilters = () => {
    setFilterTicker('');
    setFilterActive(null);
  };

  const handleRefresh = () => {
    // Clear the cache for earnings items
    cache.remove(CACHE_KEYS.EARNINGS_ITEMS);
    fetchEarningsItems();
    toast.info('Refreshed from server');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Earnings Calendar</h1>
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
            Add Item
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
            <label htmlFor="filterActive" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="filterActive"
              value={filterActive === null ? '' : filterActive.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setFilterActive(value === '' ? null : value === 'true');
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
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
          <h2 className="font-semibold mb-4">Add Earnings Item</h2>
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
                <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                  Year
                </label>
                <input
                  id="year"
                  type="number"
                  {...register('year', { 
                    required: 'Year is required',
                    valueAsNumber: true,
                    min: { value: 2000, message: 'Year must be 2000 or later' },
                    max: { value: 2100, message: 'Year must be 2100 or earlier' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.year && (
                  <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="quarter" className="block text-sm font-medium text-gray-700">
                  Quarter
                </label>
                <select
                  id="quarter"
                  {...register('quarter', { 
                    required: 'Quarter is required',
                    valueAsNumber: true
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </select>
                {errors.quarter && (
                  <p className="mt-1 text-sm text-red-600">{errors.quarter.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="release_time" className="block text-sm font-medium text-gray-700">
                  Release Time
                </label>
                <select
                  id="release_time"
                  {...register('release_time', { required: 'Release time is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="before">Before Market</option>
                  <option value="after">After Market</option>
                  <option value="during">During Market</option>
                </select>
                {errors.release_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.release_time.message}</p>
                )}
              </div>
              
              <div className="flex items-center h-full pt-6">
                <input
                  id="is_active"
                  type="checkbox"
                  {...register('is_active')}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
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
                Add Item
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Items Table */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        {loading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-4 text-center">No items found</div>
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
                    Quarter
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Release Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={`${item.ticker}-${item.date}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.ticker}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Q{item.quarter}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.release_time === 'before' ? 'Before Market' : 
                       item.release_time === 'after' ? 'After Market' : 'During Market'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`px-3 py-1 rounded-md ${
                          item.is_active 
                            ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {item.is_active ? 'Deactivate' : 'Activate'}
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

export default EarningsCalendar;