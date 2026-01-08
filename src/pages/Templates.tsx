import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { TemplateCreateModal, TemplateUploadModal } from '../modals';
import { Plus, Upload } from 'lucide-react';

const templateColumns = [
  { key: 'id', label: 'Имя шаблона', visible: true, sortable: true },
  { key: 'settings', label: 'Настройки', visible: true, sortable: false, filterable: false },
];

function Templates() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `shm/v1/admin/template?limit=${l}&offset=${o}`;

    const activeFilters: Record<string, any> = {};
    Object.entries(f).forEach(([key, value]) => {
      if (value) {
        // Поддержка вложенных фильтров (например event.title -> {"event":{"title":{"-like":"%value%"}}})
        if (key.includes('.')) {
          const parts = key.split('.');
          let current = activeFilters;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
              current[parts[i]] = {};
            }
            current = current[parts[i]];
          }
          current[parts[parts.length - 1]] = { '-like': value };
        } else {
          activeFilters[key] = { '-like': value };
        }
      }
    });

    if (Object.keys(activeFilters).length > 0) {
      url += `&filter=${encodeURIComponent(JSON.stringify(activeFilters))}`;
    }

    if (sf && sd) {
      url += `&sort_field=${sf}&sort_direction=${sd}`;
    }
    shm_request(url)
      .then(res => {
        const { data: items, total: count } = normalizeListResponse(res);
        if (sf && sd) {
          const direction = sd === 'asc' ? 1 : -1;
          const sorted = [...items].sort((a, b) => {
            const aVal = a?.[sf];
            const bVal = b?.[sf];
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return -1 * direction;
            if (bVal == null) return 1 * direction;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
              return (aVal - bVal) * direction;
            }
            return String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' }) * direction;
          });
          setData(sorted);
        } else {
          setData(items);
        }
        setTotal(count);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData(limit, offset, filters, sortField, sortDirection);
  }, [limit, offset, filters, sortField, sortDirection]);

  const handlePageChange = (newLimit: number, newOffset: number) => {
    setLimit(newLimit);
    setOffset(newOffset);
  };

  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(direction ? field : undefined);
    setSortDirection(direction);
    setOffset(0);
  };

  const handleFilterChange = useCallback((newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setOffset(0);
  }, []);

  const handleRowClick = (row: any) => {
    // Открываем шаблон через глобальный TemplateModal
    window.dispatchEvent(new CustomEvent('openTemplate', { detail: row }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Шаблоны</h2>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium btn-success"
            title="Загрузить из файла"
          >
            <Upload className="w-4 h-4" />

          <span className="hidden sm:inline">Загрузить из файла</span>
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium btn-primary"
            title="Создать шаблон"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-text)',
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Добавить</span>
          </button>
        </div>
      </div>
      <DataTable
        columns={templateColumns}
        data={data}
        loading={loading}
        total={total}
        limit={limit}
        offset={offset}
        onPageChange={handlePageChange}
        onSort={handleSort}
        onFilterChange={handleFilterChange}
        sortField={sortField}
        sortDirection={sortDirection}
        onRowClick={handleRowClick}
        onRefresh={() => fetchData(limit, offset, filters, sortField, sortDirection)}
        storageKey="templates"
      />
      <TemplateCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={async (data) => {
          await shm_request(`shm/v1/admin/template`, {
            method: 'PUT',
            body: JSON.stringify(data),
          });
          fetchData(limit, offset, filters, sortField, sortDirection);
        }}
      />
      <TemplateUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSave={async (data) => {
          await shm_request(`shm/v1/admin/template`, {
            method: 'PUT',
            body: JSON.stringify(data),
          });
          fetchData(limit, offset, filters, sortField, sortDirection);
        }}
      />
    </div>
  );
}

export default Templates;
