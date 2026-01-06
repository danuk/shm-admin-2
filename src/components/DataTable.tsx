import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw,
  X,
  Columns,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  FilterX,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  Timer,
  ListRestart
} from 'lucide-react';

interface Column {
  key: string;
  label: string;
  visible: boolean;
  width?: number;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  filterType?: 'text' | 'select';
  filterOptions?: Array<{ value: string; label: string }>;
  filterKey?: string; // Для вложенных фильтров, например "event.title" -> {"event":{"title":{"-like":"%value%"}}}
}

export type SortDirection = 'asc' | 'desc' | null;

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  total?: number;
  limit: number;
  offset: number;
  onPageChange: (limit: number, offset: number) => void;
  onRowClick?: (row: any) => void;
  onRefresh?: () => void;
  onSort?: (field: string, direction: SortDirection) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
  sortField?: string;
  sortDirection?: SortDirection;
  height?: string;
  storageKey?: string;
  externalFilters?: Record<string, string>;
}

const LIMITS = [50, 100, 500, 1000, 5000];
const MIN_COLUMN_WIDTH = 20;
const DEFAULT_COLUMN_WIDTH = 150;
const AUTO_REFRESH_OPTIONS = [
  { value: 0, label: 'Выкл' },
  { value: 3, label: '3 сек' },
  { value: 5, label: '5 сек' },
  { value: 10, label: '10 сек' },
  { value: 30, label: '30 сек' },
];

interface StoredSettings {
  columns: { key: string; visible: boolean; width: number }[];
  autoRefresh: number;
}

function loadSettings(storageKey: string): StoredSettings | null {
  try {
    const stored = localStorage.getItem(`dataTable_${storageKey}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
  }
  return null;
}

function saveSettings(storageKey: string, settings: StoredSettings) {
  try {
    localStorage.setItem(`dataTable_${storageKey}`, JSON.stringify(settings));
  } catch (e) {
  }
}

function formatCellValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}

function DataTable({
  columns: initialColumns,
  data,
  loading,
  total = 0,
  limit,
  offset,
  onPageChange,
  onRowClick,
  onRefresh,
  onSort,
  onFilterChange,
  sortField,
  sortDirection,
  storageKey,
  externalFilters
}: DataTableProps) {
  const displayData = data;
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [columns, setColumns] = useState<Column[]>(() => {
    const defaultColumns = initialColumns.map(col => ({
      ...col,
      width: col.width || DEFAULT_COLUMN_WIDTH
    }));

    if (!storageKey) return defaultColumns;

    const stored = loadSettings(storageKey);
    if (!stored) return defaultColumns;

    const storedMap = new Map(stored.columns.map(c => [c.key, c]));
    const result: Column[] = [];

    for (const storedCol of stored.columns) {
      const initialCol = defaultColumns.find(c => c.key === storedCol.key);
      if (initialCol) {
        result.push({
          ...initialCol,
          visible: storedCol.visible,
          width: storedCol.width,
        });
      }
    }

    for (const col of defaultColumns) {
      if (!storedMap.has(col.key)) {
        result.push(col);
      }
    }

    return result;
  });

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(() => {
    return externalFilters ? { ...externalFilters } : {};
  });
  const [showColumns, setShowColumns] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);

  const [autoRefresh, setAutoRefresh] = useState(() => {
    if (!storageKey) return 0;
    const stored = loadSettings(storageKey);
    return stored?.autoRefresh ?? 0;
  });

  const [showAutoRefreshMenu, setShowAutoRefreshMenu] = useState(false);

  const tableRef = useRef<HTMLDivElement>(null);
  const columnsDropdownRef = useRef<HTMLDivElement>(null);
  const autoRefreshRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const isFirstLoad = useRef(true);
  const filterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const prevFormattedFiltersRef = useRef<string>((() => {
    if (externalFilters) {
      const formattedFilters: Record<string, string> = {};
      Object.entries(externalFilters).forEach(([key, value]) => {
        if (value) {
          formattedFilters[key] = `%${value}%`;
        }
      });
      return JSON.stringify(formattedFilters);
    }
    return '';
  })());
  const isFilterInitialized = useRef(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (externalFilters) {
      setColumnFilters(prev => {
        const newFilters = { ...prev };
        Object.entries(externalFilters).forEach(([key, value]) => {
          newFilters[key] = value;
        });
        return newFilters;
      });
    }
  }, [externalFilters]);

  useEffect(() => {
    if (!onFilterChange) return;

    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    if (!isFilterInitialized.current) {
      isFilterInitialized.current = true;
      const formattedFilters: Record<string, string> = {};
      Object.entries(columnFilters).forEach(([key, value]) => {
        if (value) {
          formattedFilters[key] = `%${value}%`;
        }
      });
      prevFormattedFiltersRef.current = JSON.stringify(formattedFilters);
      return;
    }

    filterTimeoutRef.current = setTimeout(() => {
      const formattedFilters: Record<string, string> = {};
      Object.entries(columnFilters).forEach(([key, value]) => {
        if (value) {
          formattedFilters[key] = `%${value}%`;
        }
      });

      const filtersString = JSON.stringify(formattedFilters);
      if (filtersString !== prevFormattedFiltersRef.current) {
        prevFormattedFiltersRef.current = filtersString;
        onFilterChange(formattedFilters);
      }
    }, 1000);

    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, [columnFilters, onFilterChange]);

  useEffect(() => {
    if (!loading && isFirstLoad.current) {
      isFirstLoad.current = false;
    }
  }, [loading]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!storageKey) return;

    const settings: StoredSettings = {
      columns: columns.map(col => ({
        key: col.key,
        visible: col.visible,
        width: col.width || DEFAULT_COLUMN_WIDTH,
      })),
      autoRefresh,
    };

    saveSettings(storageKey, settings);
  }, [columns, autoRefresh, storageKey]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(e.target as Node)) {
        setShowColumns(false);
      }
      if (autoRefreshRef.current && !autoRefreshRef.current.contains(e.target as Node)) {
        setShowAutoRefreshMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (autoRefresh > 0) {
      const interval = setInterval(() => {
        if (onRefreshRef.current) {
          onRefreshRef.current();
        }
      }, autoRefresh * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const wasResizingRef = useRef(false);

  const handleResizeStart = useCallback((e: React.MouseEvent, key: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { key, startX: e.clientX, startWidth: currentWidth };
    setResizingColumn(key);
  }, []);

  useEffect(() => {
    if (!resizingColumn || !resizingRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;

      const { key, startX, startWidth } = resizingRef.current;
      const diff = e.clientX - startX;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + diff);

      const cells = document.querySelectorAll(`[data-column-key="${key}"]`);
      cells.forEach(cell => {
        (cell as HTMLElement).style.width = `${newWidth}px`;
        (cell as HTMLElement).style.minWidth = `${newWidth}px`;
        (cell as HTMLElement).style.maxWidth = `${newWidth}px`;
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!resizingRef.current) return;

      const { key, startX, startWidth } = resizingRef.current;
      const diff = e.clientX - startX;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + diff);

      setColumns(cols => cols.map(col =>
        col.key === key ? { ...col, width: newWidth } : col
      ));

      resizingRef.current = null;
      setResizingColumn(null);

      wasResizingRef.current = true;
      setTimeout(() => {
        wasResizingRef.current = false;
      }, 100);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn]);

  const handleSortClick = useCallback((col: Column) => {
    if (wasResizingRef.current) return;
    if (col.sortable === false || !onSort) return;

    const newDirection: SortDirection =
      sortField === col.key
        ? (sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc')
        : 'asc';
    onSort(col.key, newDirection);
  }, [sortField, sortDirection, onSort]);

  const handleDragStart = (e: React.DragEvent, key: string) => {
    setDraggedColumn(key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetKey) return;

    setColumns(cols => {
      const newCols = [...cols];
      const draggedIdx = newCols.findIndex(c => c.key === draggedColumn);
      const targetIdx = newCols.findIndex(c => c.key === targetKey);
      const [removed] = newCols.splice(draggedIdx, 1);
      newCols.splice(targetIdx, 0, removed);
      return newCols;
    });
    setDraggedColumn(null);
  };

  const toggleColumn = (key: string) => {
    setColumns(cols => cols.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  const clearAllFilters = () => {
    setColumnFilters({});
  };

  const resetTableSettings = () => {
    if (storageKey) {
      localStorage.removeItem(`dataTable_${storageKey}`);
    }
    // Сбрасываем колонки к дефолтным
    const defaultColumns = initialColumns.map(col => ({
      ...col,
      width: col.width || DEFAULT_COLUMN_WIDTH
    }));
    setColumns(defaultColumns);
    setAutoRefresh(0);
  };

  const hasActiveFilters = Object.values(columnFilters).some(v => v);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;

  const goToPage = (page: number) => {
    const newOffset = (page - 1) * limit;
    onPageChange(limit, newOffset);
  };

  const changeLimit = (newLimit: number) => {
    onPageChange(newLimit, 0);
  };

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col"
      style={{
        backgroundColor: 'var(--theme-card-bg)',
        border: '1px solid var(--theme-card-border)',
        height: '100%',
      }}
    >
      {}
      <div
        className="px-4 py-3 flex flex-wrap gap-3 items-center justify-between"
        style={{ borderBottom: '1px solid var(--theme-card-border)' }}
      >
        <div className="flex gap-2 items-center">
          {hasActiveFilters && (
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{
                backgroundColor: 'var(--theme-primary-color)',
                color: 'white',
              }}
            >
              Фильтры активны
            </span>
          )}
        </div>

        <div className="flex gap-2 items-center">
          {storageKey && (
            <button
              onClick={resetTableSettings}
              className="btn-icon"
              title="Сбросить настройки таблицы (ширина, порядок колонок)"
            >
              <ListRestart className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={clearAllFilters}
            className="btn-icon"
            title="Очистить фильтры"
            disabled={!hasActiveFilters}
            style={{ opacity: hasActiveFilters ? 1 : 0.5 }}
          >
            <FilterX className="w-4 h-4" />
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="btn-icon"
              title="Обновить"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {}
          {onRefresh && (
            <div className="relative" ref={autoRefreshRef}>
              <button
                onClick={() => setShowAutoRefreshMenu(!showAutoRefreshMenu)}
                className="btn-icon flex items-center gap-1"
                title="Автообновление"
                style={{
                  color: autoRefresh > 0 ? 'var(--accent-primary)' : undefined,
                }}
              >
                <Timer className="w-4 h-4" />
                <span className="text-xs">{autoRefresh > 0 ? `${autoRefresh}с` : ''}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showAutoRefreshMenu ? 'rotate-180' : ''}`} />
              </button>

              {showAutoRefreshMenu && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg shadow-xl overflow-hidden min-w-[100px]"
                  style={{
                    backgroundColor: 'var(--theme-card-bg)',
                    border: '1px solid var(--theme-card-border)',
                  }}
                >
                  {AUTO_REFRESH_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => { setAutoRefresh(option.value); setShowAutoRefreshMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:opacity-80 flex items-center justify-between"
                      style={{
                        backgroundColor: autoRefresh === option.value ? 'var(--accent-primary)' : 'transparent',
                        color: autoRefresh === option.value ? 'var(--accent-text)' : 'var(--theme-content-text)',
                      }}
                    >
                      {option.label}
                      {autoRefresh === option.value && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {}
          <div className="relative" ref={columnsDropdownRef}>
            <button
              onClick={() => setShowColumns(!showColumns)}
              className="btn-icon"
              title="Управление столбцами"
            >
              <Columns className="w-4 h-4" />
            </button>

            {showColumns && (
              <div
                className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg shadow-xl overflow-hidden"
                style={{
                  backgroundColor: 'var(--theme-card-bg)',
                  border: '1px solid var(--theme-card-border)',
                }}
              >
                <div
                  className="px-3 py-2 font-medium text-sm"
                  style={{
                    borderBottom: '1px solid var(--theme-card-border)',
                    color: 'var(--theme-content-text)',
                  }}
                >
                  Столбцы
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {columns.map(col => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors"
                      style={{
                        color: 'var(--theme-content-text)',
                      }}
                      onMouseEnter={e => {
                        (e.target as HTMLElement).style.backgroundColor = 'var(--theme-sidebar-item-hover-bg)';
                      }}
                      onMouseLeave={e => {
                        (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleColumn(col.key)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--theme-primary-color)' }}
                      />
                      <span className="text-sm">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {}
      <div
        ref={tableRef}
        className="overflow-auto flex-1"
        style={{
          backgroundColor: 'var(--theme-table-bg)',
        }}
      >
        <table className="w-full" style={{ minWidth: 'max-content' }}>
          <thead
            className="sticky top-0 z-10"
            style={{ backgroundColor: 'var(--theme-header-bg)' }}
          >
            {}
            <tr>
              {visibleColumns.map(col => {
                const isSorted = sortField === col.key;
                const canSort = col.sortable !== false && onSort;

                return (
                  <th
                    key={col.key}
                    data-column-key={col.key}
                    draggable
                    onDragStart={e => handleDragStart(e, col.key)}
                    onDragOver={handleDragOver}
                    onDrop={e => handleDrop(e, col.key)}
                    className="text-left text-xs font-semibold uppercase tracking-wider select-none relative group"
                    style={{
                      width: col.width,
                      minWidth: col.width,
                      maxWidth: col.width,
                      padding: '0.75rem 1rem',
                      color: 'var(--theme-table-header-text)',
                      borderBottom: '1px solid var(--theme-table-border)',
                      cursor: canSort ? 'pointer' : 'grab',
                      backgroundColor: isSorted ? 'var(--theme-primary-color)' : undefined,
                    }}
                    onClick={() => handleSortClick(col)}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical
                        className="w-3 h-3 opacity-30 group-hover:opacity-70 flex-shrink-0"
                        onMouseDown={e => e.stopPropagation()}
                      />
                      <span className="flex-grow">{col.label}</span>

                      {}
                      {canSort && (
                        <span className="flex-shrink-0 ml-1">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5" style={{ color: isSorted ? 'white' : 'var(--theme-content-text-muted)' }} />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5" style={{ color: isSorted ? 'white' : 'var(--theme-content-text-muted)' }} />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70" />
                          )}
                        </span>
                      )}
                    </div>

                    {}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-cyan-500/50"
                      onMouseDown={e => {
                        e.stopPropagation();
                        handleResizeStart(e, col.key, col.width || DEFAULT_COLUMN_WIDTH);
                      }}
                      style={{
                        backgroundColor: resizingColumn === col.key ? 'var(--theme-primary-color)' : 'transparent',
                      }}
                    />
                  </th>
                );
              })}
            </tr>

            {}
            <tr style={{ backgroundColor: 'var(--theme-card-bg)' }}>
              {visibleColumns.map(col => (
                <th
                  key={`filter-${col.key}`}
                  data-column-key={col.key}
                  className="p-1"
                  style={{
                    width: col.width,
                    minWidth: col.width,
                    maxWidth: col.width,
                    borderBottom: '1px solid var(--theme-table-border)',
                  }}
                >
                  {col.filterType === 'select' && col.filterOptions ? (
                    <div className="relative">
                      <select
                        value={columnFilters[col.filterKey || col.key] || ''}
                        onChange={e => setColumnFilters(prev => ({
                          ...prev,
                          [col.filterKey || col.key]: e.target.value
                        }))}
                        className="w-full text-xs py-1 px-2 pr-6 rounded appearance-none"
                        style={{
                          backgroundColor: 'var(--theme-input-bg)',
                          border: '1px solid var(--theme-input-border)',
                          color: 'var(--theme-input-text)',
                        }}
                      >
                        <option value="">Все</option>
                        {col.filterOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                        style={{ color: 'var(--theme-content-text-muted)' }}
                      />
                      {columnFilters[col.filterKey || col.key] && (
                        <button
                          onClick={() => setColumnFilters(prev => ({ ...prev, [col.filterKey || col.key]: '' }))}
                          className="absolute right-6 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-500/30"
                        >
                          <X className="w-3 h-3" style={{ color: 'var(--theme-content-text-muted)' }} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <Search
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3"
                        style={{ color: 'var(--theme-content-text-muted)' }}
                      />
                      <input
                        type="text"
                        placeholder="Фильтр..."
                        value={columnFilters[col.filterKey || col.key] || ''}
                        onChange={e => setColumnFilters(prev => ({
                          ...prev,
                          [col.filterKey || col.key]: e.target.value
                        }))}
                        className="w-full text-xs py-1 pl-7 pr-2 rounded"
                        style={{
                          backgroundColor: 'var(--theme-input-bg)',
                          border: '1px solid var(--theme-input-border)',
                          color: 'var(--theme-input-text)',
                        }}
                      />
                      {columnFilters[col.filterKey || col.key] && (
                        <button
                          onClick={() => setColumnFilters(prev => ({ ...prev, [col.filterKey || col.key]: '' }))}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-500/30"
                        >
                          <X className="w-3 h-3" style={{ color: 'var(--theme-content-text-muted)' }} />
                        </button>
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading && isFirstLoad.current ? (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="text-center p-8"
                  style={{ color: 'var(--theme-content-text-muted)' }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Загрузка...
                  </div>
                </td>
              </tr>
            ) : displayData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="text-center p-8"
                  style={{ color: 'var(--theme-content-text-muted)' }}
                >
                  <div className="empty-state">
                    <Filter className="w-8 h-8 mb-2 opacity-50" />
                    {loading ? 'Загрузка...' : 'Нет данных'}
                  </div>
                </td>
              </tr>
            ) : (
              displayData.map((row, idx) => (
                <tr
                  key={idx}
                  className={`${onRowClick ? 'cursor-pointer' : ''}`}
                  style={{
                    borderBottom: '1px solid var(--theme-table-border)',
                    backgroundColor: idx % 2 === 1 ? 'var(--theme-table-row-alt-bg)' : 'transparent',
                  }}
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-table-row-hover-bg)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = idx % 2 === 1 ? 'var(--theme-table-row-alt-bg)' : 'transparent';
                  }}
                >
                  {visibleColumns.map(col => (
                    <td
                      key={col.key}
                      data-column-key={col.key}
                      className="px-4 py-2 text-sm"
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        maxWidth: col.width,
                        color: 'var(--theme-table-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col.render ? col.render(row[col.key], row) : formatCellValue(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {}
      <div
        className="px-4 py-3 flex flex-wrap gap-3 items-center justify-between text-sm"
        style={{
          borderTop: '1px solid var(--theme-card-border)',
          backgroundColor: 'var(--theme-card-bg)',
        }}
      >
        <div className="flex gap-4 items-center">
          <div style={{ color: 'var(--theme-content-text-muted)' }}>
            Всего: <strong style={{ color: 'var(--theme-content-text)' }}>{total}</strong>
            {' '} | Показано: <strong style={{ color: 'var(--theme-content-text)' }}>{data.length}</strong>
          </div>

          <div className="flex gap-2 items-center">
            <span style={{ color: 'var(--theme-content-text-muted)' }}>
              Показывать:
            </span>
            <select
              className="input py-1 px-2 w-20 text-sm"
              value={limit}
              onChange={e => changeLimit(Number(e.target.value))}
            >
              {LIMITS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-1 items-center">
          <button
            className="btn-icon"
            disabled={currentPage <= 1}
            onClick={() => goToPage(1)}
            title="Первая страница"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            className="btn-icon"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
            title="Предыдущая страница"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex gap-1 px-2">
            {}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className="w-8 h-8 rounded text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: currentPage === pageNum ? 'var(--theme-primary-color)' : 'transparent',
                    color: currentPage === pageNum ? 'white' : 'var(--theme-content-text-muted)',
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            className="btn-icon"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
            title="Следующая страница"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            className="btn-icon"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(totalPages)}
            title="Последняя страница"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
