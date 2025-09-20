import React from 'react';
import { ChevronDown, Calendar, Filter, Eye, EyeOff, Settings, Plus, Edit3, Trash2, GripVertical } from 'lucide-react';

interface GridControlsProps {
  // Search props
  searchableColumns: Array<{ key: string; label: string }>;
  searchColumn: string;
  setSearchColumn: (column: string) => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  showSearchDropdown: boolean;
  setShowSearchDropdown: (show: boolean) => void;
  searchDropdownRef: React.RefObject<HTMLDivElement>;

  // Filter props
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  datePickerRef: React.RefObject<HTMLDivElement>;
  handleDatePickerCancel: () => void;

  // Column visibility props
  visibleColumns: Set<string>;
  showColumnToggle: boolean;
  setShowColumnToggle: (show: boolean) => void;
  columnToggleRef: React.RefObject<HTMLDivElement>;
  handleColumnToggle: (columnKey: string) => void;
  allColumns: Array<{ key: string; label: string; sortable?: boolean; width?: number }>;
  handleResetOrder: () => void;
  handleResetWidths: () => void;

  // Views props
  showViewsDropdown: boolean;
  setShowViewsDropdown: (show: boolean) => void;
  viewsDropdownRef: React.RefObject<HTMLDivElement>;
  savedViews: any[];
  currentViewId: string | null;
  loadView: (viewId: string) => void;
  showSaveViewModal: boolean;
  setShowSaveViewModal: (show: boolean) => void;
  showUpdateViewModal: boolean;
  setShowUpdateViewModal: (show: boolean) => void;
  deleteView: (viewId: string) => void;
}

const GridControls: React.FC<GridControlsProps> = ({
  searchableColumns,
  searchColumn,
  setSearchColumn,
  searchValue,
  setSearchValue,
  showSearchDropdown,
  setShowSearchDropdown,
  searchDropdownRef,
  showDatePicker,
  setShowDatePicker,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  datePickerRef,
  handleDatePickerCancel,
  visibleColumns,
  showColumnToggle,
  setShowColumnToggle,
  columnToggleRef,
  handleColumnToggle,
  allColumns,
  handleResetOrder,
  handleResetWidths,
  showViewsDropdown,
  setShowViewsDropdown,
  viewsDropdownRef,
  savedViews,
  currentViewId,
  loadView,
  showSaveViewModal,
  setShowSaveViewModal,
  showUpdateViewModal,
  setShowUpdateViewModal,
  deleteView
}) => {
  return (
    <div className="flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800 px-3 sm:px-4 py-2 bg-white dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative" ref={searchDropdownRef}>
            <button
              onClick={() => setShowSearchDropdown(!showSearchDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-600"
            >
              {searchableColumns.find(col => col.key === searchColumn)?.label || 'Ticker'}
              <ChevronDown size={12} />
            </button>

            {showSearchDropdown && (
              <div className="absolute left-0 top-full mt-1 w-40 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                {searchableColumns.map((column) => (
                  <button
                    key={column.key}
                    onClick={() => {
                      setSearchColumn(column.key);
                      setShowSearchDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 ${
                      searchColumn === column.key
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    {column.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            placeholder={`Search ${searchableColumns.find(col => col.key === searchColumn)?.label?.toLowerCase() || 'ticker'}...`}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="text-xs border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 w-32"
          />
        </div>

        {/* Date Filter */}
        <div className="relative" ref={datePickerRef}>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-600"
          >
            <Calendar size={12} />
            Date Range
          </button>

          {showDatePicker && (
            <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg z-50 p-4">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-sm border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-sm border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex-1"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleDatePickerCancel}
                    className="text-xs px-3 py-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-300 dark:border-neutral-600 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Column Visibility Toggle */}
        <div className="relative" ref={columnToggleRef}>
          <button
            onClick={() => setShowColumnToggle(!showColumnToggle)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-600"
          >
            <Eye size={12} />
            Columns
          </button>

          {showColumnToggle && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
              <div className="p-3">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={handleResetOrder}
                    className="flex-1 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded hover:bg-orange-200 dark:hover:bg-orange-800"
                  >
                    Reset Order
                  </button>
                  <button
                    onClick={handleResetWidths}
                    className="flex-1 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                  >
                    Reset Widths
                  </button>
                </div>
                <div className="space-y-2">
                  {allColumns.map((column) => (
                    <div key={column.key} className="flex items-center gap-2">
                      <GripVertical size={14} className="text-neutral-400 cursor-move" />
                      <div className="flex items-center gap-2 flex-1">
                        {visibleColumns.has(column.key) ? (
                          <Eye size={14} className="text-blue-500" />
                        ) : (
                          <EyeOff size={14} className="text-neutral-400" />
                        )}
                        <button
                          onClick={() => handleColumnToggle(column.key)}
                          className="text-left flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-900 dark:text-neutral-100">
                              {column.label}
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Views Dropdown */}
        <div className="relative" ref={viewsDropdownRef}>
          <button
            onClick={() => setShowViewsDropdown(!showViewsDropdown)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-600"
          >
            <Settings size={12} />
            Views
          </button>

          {showViewsDropdown && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
              <div className="p-3">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => {
                      setShowSaveViewModal(true);
                      setShowViewsDropdown(false);
                    }}
                    className="flex items-center gap-1 flex-1 text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800"
                  >
                    <Plus size={12} />
                    Save Current
                  </button>
                  {currentViewId && (
                    <button
                      onClick={() => {
                        setShowUpdateViewModal(true);
                        setShowViewsDropdown(false);
                      }}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      <Edit3 size={12} />
                      Update
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {savedViews.map((view) => (
                    <div key={view.id} className="flex items-center gap-2 group">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => {
                            loadView(view.id);
                            setShowViewsDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-neutral-50 dark:hover:bg-neutral-700 ${
                            currentViewId === view.id
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                              : 'text-neutral-900 dark:text-neutral-100'
                          }`}
                        >
                          <div className="truncate">{view.name}</div>
                          {view.description && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              {view.description}
                            </div>
                          )}
                        </button>
                      </div>
                      {!view.isDefault && (
                        <button
                          onClick={() => deleteView(view.id)}
                          className="p-1 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GridControls;