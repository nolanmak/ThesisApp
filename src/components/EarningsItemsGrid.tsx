import React from 'react';
import { EarningsItem } from '../types';
import { PieChart, BarChart, Settings } from 'lucide-react';
import { toast } from 'react-toastify';
import { updateEarningsItem } from '../services/api';

interface EarningsItemsGridProps {
  loading: boolean;
  filteredEarningsItems: EarningsItem[];
  metricsMap: Record<string, boolean>;
  configMap: Record<string, boolean>;
  handleOpenMetricsModal: (item: EarningsItem) => void;
  handleOpenConfigModal: (item: EarningsItem) => void;
  onItemToggled?: (updatedItem: EarningsItem) => void;
}

const EarningsItemsGrid: React.FC<EarningsItemsGridProps> = ({
  loading,
  filteredEarningsItems,
  metricsMap,
  configMap,
  handleOpenMetricsModal,
  handleOpenConfigModal,
  onItemToggled,
}) => {
  // Handle toggling active status for an earnings item
  const handleToggleActive = async (item: EarningsItem) => {
    try {
      const updatedItem = { ...item, is_active: !item.is_active };
      await updateEarningsItem(updatedItem);
      
      // Notify parent component about the update
      if (onItemToggled) {
        onItemToggled(updatedItem);
      }
      
      toast.success(`${item.ticker} is now ${!item.is_active ? 'active' : 'inactive'}`);
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin mx-auto mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
        <p className="text-neutral-500">Loading companies...</p>
      </div>
    );
  }

  if (filteredEarningsItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-neutral-500">No companies found for the selected date.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
      {filteredEarningsItems.map((item) => (
        <div 
          key={`${item.ticker}-${item.date}`} 
          className="bg-white border border-neutral-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 aspect-square p-4 flex flex-col"
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-semibold text-neutral-800">{item.ticker}</h3>
            <div className="flex items-center space-x-2">
              {item.is_active && (
                <button
                  onClick={() => handleOpenMetricsModal(item)}
                  className={`p-1.5 rounded-full ${
                    metricsMap[`${item.ticker}-${item.date}`] 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                  }`}
                  title={metricsMap[`${item.ticker}-${item.date}`] ? "Edit Metrics" : "Add Metrics"}
                >
                  <BarChart size={14} />
                </button>
              )}
              <button
                onClick={() => handleOpenConfigModal(item)}
                className={`p-1.5 rounded-full ${
                  configMap[item.ticker] 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                }`}
                title={configMap[item.ticker] ? "Edit Config" : "Add Config"}
              >
                <Settings size={14} />
              </button>
              <div 
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                  item.is_active 
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' 
                    : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleActive(item);
                }}
              >
                {item.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-neutral-500 mb-2">
            <p>Q{item.quarter} {item.year}</p>
            <p>{item.release_time === 'before' ? 'Before Market' : 
               item.release_time === 'after' ? 'After Market' : 'During Market'}</p>
          </div>
          
          {/* Placeholder for future chart */}
          <div className="flex-grow bg-neutral-50 rounded-md border border-dashed border-neutral-200 flex items-center justify-center mt-2">
            {metricsMap[`${item.ticker}-${item.date}`] ? (
              <div className="flex flex-col items-center">
                <PieChart size={24} className="text-primary-400 mb-1" />
                <p className="text-neutral-600 text-xs font-medium">Metrics Available</p>
                <p className="text-neutral-500 text-xs">Click chart button to view</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <p className="text-neutral-400 text-xs">No metrics added</p>
                <p className="text-neutral-400 text-xs">Click chart button to add</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EarningsItemsGrid;
