import React, { useEffect } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import { EarningsItem } from '../../../types';
import 'react-datepicker/dist/react-datepicker.css';

interface EarningsModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: EarningsItem) => Promise<boolean>;
  currentItem: EarningsItem | null;
}

const EarningsModal: React.FC<EarningsModalProps> = ({
  show,
  onClose,
  onSubmit,
  currentItem
}) => {
  const { 
    register, 
    handleSubmit, 
    control, 
    reset, 
    formState: { errors } 
  } = useForm<EarningsItem>({
    defaultValues: currentItem || {
      ticker: '',
      company_name: '',
      date: '',
      is_active: false,
      quarter: 1,
      release_time: 'before',
      year: new Date().getFullYear()
    }
  });

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

  if (!show) return null;

  const handleFormSubmit: SubmitHandler<EarningsItem> = async (data) => {
    const success = await onSubmit(data);
    if (success) {
      reset(); // Reset form after submission
      onClose(); // Close the modal
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white p-6 rounded-md shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative z-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-neutral-800">
              {currentItem ? 'Edit' : 'Add'} Earnings Item
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-700"
            >
              &times;
            </button>
          </div>
          
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
            <div>
              <label htmlFor="ticker" className="block text-sm font-medium text-neutral-600 mb-1">
                Ticker
              </label>
              <input
                id="ticker"
                type="text"
                {...register('ticker', { required: 'Ticker is required' })}
                className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="AAPL"
                style={{ paddingLeft: 10 }}
              />
              {errors.ticker && (
                <p className="mt-1 text-sm text-error-500">{errors.ticker.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-neutral-600 mb-1">
                Company Name
              </label>
              <input
                id="company_name"
                type="text"
                {...register('company_name', { required: 'Company name is required' })}
                className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Apple Inc."
                style={{ paddingLeft: 10 }}
              />
              {errors.company_name && (
                <p className="mt-1 text-sm text-error-500">{errors.company_name.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-neutral-600 mb-1">
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
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    dateFormat="yyyy-MM-dd"
                    withPortal
                    popperPlacement="bottom"
                  />
                )}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-error-500">{errors.date.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-neutral-600 mb-1">
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
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  style={{ paddingLeft: 10 }}
                />
                {errors.year && (
                  <p className="mt-1 text-sm text-error-500">{errors.year.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="quarter" className="block text-sm font-medium text-neutral-600 mb-1">
                  Quarter
                </label>
                <select
                  id="quarter"
                  {...register('quarter', { 
                    required: 'Quarter is required',
                    valueAsNumber: true
                  })}
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  style={{ paddingLeft: 10 }}
                >
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </select>
                {errors.quarter && (
                  <p className="mt-1 text-sm text-error-500">{errors.quarter.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="release_time" className="block text-sm font-medium text-neutral-600 mb-1">
                Release Time
              </label>
              <select
                id="release_time"
                {...register('release_time', { required: 'Release time is required' })}
                className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                style={{ paddingLeft: 10 }}
              >
                <option value="before">Before Market</option>
                <option value="after">After Market</option>
                <option value="during">During Market</option>
              </select>
              {errors.release_time && (
                <p className="mt-1 text-sm text-error-500">{errors.release_time.message}</p>
              )}
            </div>
            
            <div className="flex items-center">
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
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200 transition-colors duration-150 ease-in-out shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-150 ease-in-out shadow-sm"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EarningsModal;
