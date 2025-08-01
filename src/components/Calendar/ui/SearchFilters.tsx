import React from 'react';
import { Search, CalendarIcon, Plus, Clock } from 'lucide-react';

interface SearchFiltersProps {
  searchTicker: string;
  selectedDate: string;
  filterActive: boolean | null;
  releaseTime: string | null;
  onSearchChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onFilterChange: (value: boolean | null) => void;
  onReleaseTimeChange: (value: string | null) => void;
  onAddClick: () => void;
  isMobile?: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchTicker,
  selectedDate,
  filterActive,
  releaseTime,
  onSearchChange,
  onDateChange,
  onFilterChange,
  onReleaseTimeChange,
  onAddClick,
  isMobile = false
}) => {
  return (
    <div 
      className="flex justify-between items-center"
      style={{
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : undefined,
        marginBottom: isMobile ? '12px' : '16px',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}
    >
      <div 
        className="flex items-end w-full"
        style={{
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '8px' : '12px',
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden'
        }}
      >
        {/* Search box */}
        <div 
          style={{
            flex: isMobile ? '0 0 100%' : 1,
            width: isMobile ? '100%' : undefined,
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Search size={14} className="text-neutral-400" />
            </div>
            <input
              type="text"
              id="ticker-search"
              placeholder="Search ticker..."
              value={searchTicker}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-xs"
              style={{
                height: '32px',
                fontSize: isMobile ? '13px' : '12px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
        
        {/* Date selector */}
        <div 
          style={{
            flex: isMobile ? '0 0 100%' : 1,
            width: isMobile ? '100%' : undefined,
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <CalendarIcon size={14} className="text-neutral-400" />
            </div>
            <input
              type="date"
              id="date-selector"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="pl-8 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-xs"
              style={{
                height: '32px',
                fontSize: isMobile ? '13px' : '12px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
        
        {/* Show filters */}
        <div 
          style={{
            flex: isMobile ? '0 0 100%' : 1,
            width: isMobile ? '100%' : undefined,
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div 
            className="flex space-x-1"
            style={{
              height: '32px',
              width: '100%'
            }}
          >
            <button
              onClick={() => onFilterChange(null)}
              className={`px-2 py-1 text-xs rounded-md ${
                filterActive === null 
                  ? 'bg-neutral-600 text-white' 
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              } transition-colors duration-150 ease-in-out flex-1`}
            >
              All
            </button>
            <button
              onClick={() => onFilterChange(true)}
              className={`px-2 py-1 text-xs rounded-md ${
                filterActive === true 
                  ? 'bg-success-500 text-white' 
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              } transition-colors duration-150 ease-in-out flex-1`}
            >
              Active List
            </button>
          </div>
        </div>
        
        {/* Release Time Filter */}
        <div 
          style={{
            flex: isMobile ? '0 0 100%' : 1,
            width: isMobile ? '100%' : undefined,
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Clock size={14} className="text-neutral-400" />
            </div>
            <select
              id="release-time-filter"
              value={releaseTime || ''}
              onChange={(e) => onReleaseTimeChange(e.target.value === '' ? null : e.target.value)}
              className="pl-8 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-xs"
              style={{
                height: '32px',
                fontSize: isMobile ? '13px' : '12px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All Times</option>
              <option value="before">Before Market</option>
              <option value="after">After Market</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Add Item Button (just a plus icon) */}
      <div 
        className="flex items-center"
        style={{
          alignSelf: isMobile ? 'flex-end' : undefined,
          marginTop: isMobile ? '4px' : '0'
        }}
      >
        <button
          onClick={onAddClick}
          className="p-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-150 ease-in-out shadow-sm flex items-center justify-center"
          aria-label="Add Item"
          style={{
            height: '32px',
            width: '32px'
          }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

export default SearchFilters;
