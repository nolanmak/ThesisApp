import React from 'react';
import { EarningsItem } from '../../../types';
import { Loader, Settings } from 'lucide-react';
import MessageAnalysis from './MessageAnalysis';
import { useGlobalData } from '../../../hooks/useGlobalData';

interface EarningsListProps {
  items: EarningsItem[];
  loading: boolean;
  configExists: (ticker: string) => boolean;
  onToggleActive: (item: EarningsItem) => void;
  onToggleWireActive: (item: EarningsItem) => void;
  onToggleIRActive: (item: EarningsItem) => void;
  onOpenConfigModal: (item: EarningsItem) => void;
  isMobile?: boolean;
}

const EarningsList: React.FC<EarningsListProps> = ({
  items,
  loading,
  configExists,
  onToggleActive,
  onToggleWireActive,
  onToggleIRActive,
  onOpenConfigModal,
  isMobile = false
}) => {
  const { messages } = useGlobalData();

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader size={24} className="animate-spin mx-auto mb-2" />
        <p className="text-neutral-500">Loading companies...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-neutral-500">No companies found for the selected date.</p>
      </div>
    );
  }

  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 overflow-auto scrollbar-hide"
      style={{
        gridTemplateColumns: isMobile ? '1fr' : undefined,
        gap: isMobile ? '12px' : '16px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      {items.map((item) => (
        <div 
          key={`${item.ticker}-${item.date}`} 
          className="bg-white border border-neutral-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col"
          style={{
            aspectRatio: isMobile ? 'auto' : '1/1',
            padding: isMobile ? '12px 10px' : '16px',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflowX: 'hidden'
          }}
        >
          <div 
            className="flex justify-between items-start mb-3"
            style={{
              marginBottom: isMobile ? '8px' : '12px',
              width: '100%',
              maxWidth: '100%',
              overflowX: 'hidden'
            }}
          >
            <div style={{ maxWidth: 'calc(100% - 80px)', overflow: 'hidden' }}>
              <h3 
                className="font-semibold text-neutral-800"
                style={{
                  fontSize: isMobile ? '1rem' : '1.25rem',
                  lineHeight: isMobile ? '1.2' : '1.4',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {item.ticker}
              </h3>
              <p 
                className="text-neutral-500 truncate"
                style={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  maxWidth: isMobile ? '120px' : '200px'
                }}
              >
                {item.company_name}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {item.is_active && (
                <button
                  onClick={() => {
                    try {
                      onOpenConfigModal(item);
                    } catch (error) {
                      console.error('Error calling onOpenConfigModal:', error);
                    }
                  }}
                  className={`p-1.5 rounded-full ${
                    configExists(item.ticker) 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                  }`}
                  title={configExists(item.ticker) ? "Edit Config" : "Add Config"}
                >
                  <Settings size={14} />
                </button>
              )}
              <div 
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                  item.is_active 
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' 
                    : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleActive(item);
                }}
              >
                {item.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
          
          <div 
            className="text-neutral-500 mb-2"
            style={{
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              marginBottom: isMobile ? '8px' : '8px',
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden'
            }}
          >
            <p>Q{item.quarter} {item.year}</p>
            <p>{item.release_time === 'before' ? 'Before Market' : 
                item.release_time === 'after' ? 'After Market' : 'During Market'}</p>
          </div>
          
          {/* Wire and IR toggles - only show when stock is active */}
          {item.is_active && (
            <div 
              className="flex items-center space-x-3 mb-3"
              style={{
                marginBottom: isMobile ? '8px' : '12px',
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden'
              }}
            >
              <div className="flex items-center space-x-1">
                <span 
                  className="text-neutral-600 text-xs font-medium"
                  style={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                >
                  Wire:
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleWireActive(item);
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    item.WireActive 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                  style={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }}
                >
                  {item.WireActive ? 'ON' : 'OFF'}
                </button>
              </div>
              
              <div className="flex items-center space-x-1">
                <span 
                  className="text-neutral-600 text-xs font-medium"
                  style={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                >
                  IR:
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleIRActive(item);
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    item.IRActive 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                  style={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }}
                >
                  {item.IRActive ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}
          
          {/* Message Analysis Section */}
          <div 
            className="flex-grow bg-neutral-50 rounded-md border border-dashed border-neutral-200 flex items-center justify-center"
            style={{
              marginTop: isMobile ? '8px' : '8px',
              minHeight: isMobile ? '60px' : '80px',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}
          >
            {item.is_active ? (
              <MessageAnalysis
                ticker={item.ticker}
                date={item.date}
                messages={messages}
                isMobile={isMobile}
              />
            ) : (
              <div className="flex flex-col items-center">
                <p 
                  className="text-neutral-400" 
                  style={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                >
                  Activate to enable features
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EarningsList;
