import React, { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { EarningsItem, HistoricalMetrics } from '../../../types';
import { getHistoricalMetricsByTickerAndDate } from '../../../services/api';
import { toast } from 'react-toastify';

interface MetricsModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: HistoricalMetrics) => Promise<boolean>;
  currentItem: EarningsItem | null;
}

const MetricsModal: React.FC<MetricsModalProps> = ({
  show,
  onClose,
  onSubmit,
  currentItem
}) => {
  const { 
    register, 
    handleSubmit, 
    reset, 
    formState: { errors } 
  } = useForm<HistoricalMetrics>();

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

  // Fetch existing metrics data if available
  useEffect(() => {
    if (show && currentItem) {
      const fetchMetrics = async () => {
        try {
          const existingMetrics = await getHistoricalMetricsByTickerAndDate(
            currentItem.ticker, 
            currentItem.date
          );
          
          // If metrics exist, pre-populate the form
          if (existingMetrics && Object.keys(existingMetrics).length > 0) {
            reset(existingMetrics);
          } else {
            // Reset form if no metrics exist
            reset();
          }
        } catch (error) {
          console.error('Error fetching metrics for item:', error);
          // In case of error, just show an empty form
          reset();
          toast.error('Could not fetch existing metrics. Starting with an empty form.');
        }
      };
      
      fetchMetrics();
    }
  }, [show, currentItem, reset]);

  if (!show || !currentItem) return null;

  const handleFormSubmit: SubmitHandler<HistoricalMetrics> = async (data) => {
    const success = await onSubmit(data);
    if (success) {
      onClose(); // Close the modal on success
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto relative z-50">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-neutral-800">
                {currentItem.ticker} Metrics
              </h2>
              <button
                onClick={onClose}
                className="text-neutral-500 hover:text-neutral-700"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Current Fiscal Year EPS Mean
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("current_fiscal_year_eps_mean", { required: true })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {errors.current_fiscal_year_eps_mean && (
                  <p className="text-error-500 text-xs mt-1">This field is required</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Current Fiscal Year Sales Mean (Millions)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("current_fiscal_year_sales_mean_millions", { required: true })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {errors.current_fiscal_year_sales_mean_millions && (
                  <p className="text-error-500 text-xs mt-1">This field is required</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Current Quarter EPS Mean
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("current_quarter_eps_mean", { required: true })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {errors.current_quarter_eps_mean && (
                  <p className="text-error-500 text-xs mt-1">This field is required</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Current Quarter Sales Estimate (Millions)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("current_quarter_sales_estimate_millions", { required: true })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {errors.current_quarter_sales_estimate_millions && (
                  <p className="text-error-500 text-xs mt-1">This field is required</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Next Quarter EPS Mean
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("next_quarter_eps_mean", { required: true })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {errors.next_quarter_eps_mean && (
                  <p className="text-error-500 text-xs mt-1">This field is required</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Next Quarter Sales Estimate (Millions)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("next_quarter_sales_estimate_millions", { required: true })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {errors.next_quarter_sales_estimate_millions && (
                  <p className="text-error-500 text-xs mt-1">This field is required</p>
                )}
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
                  Save Metrics
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsModal;
