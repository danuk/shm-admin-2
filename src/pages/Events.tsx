import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import EventModal from '../modals/EventModal';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { buildApiFilters, appendFilterToUrl } from '../lib/filterUtils';
import { Plus } from 'lucide-react';

const eventColumns = [
  { key: 'title', label: 'Название', visible: true, sortable: true },
  { key: 'name', label: 'Событие', visible: true, sortable: true },
  { key: 'category', label: 'Категория', visible: true, sortable: true, filterKey: 'settings.category', },
  { key: 'id', label: 'ID', visible: false, sortable: true },
  { key: 'kind', label: 'Тип', visible: false, sortable: true },
  { key: 'server_gid', label: 'Группа серверов', visible: false, sortable: true },
  { key: 'settings', label: 'Settings', visible: false, sortable: false },
];

function Events() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterMode, setFilterMode] = useState<'like' | 'exact'>('like');
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, fm: 'like' | 'exact', sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `shm/v1/admin/service/event?limit=${l}&offset=${o}`;

    const activeFilters = buildApiFilters(f, fm);
    url = appendFilterToUrl(url, activeFilters);

    if (sf && sd) {
      url += `&sort_field=${sf}&sort_direction=${sd}`;
    }
    shm_request(url)
      .then(res => {
        const { data: items, total: count } = normalizeListResponse(res);
        const processedItems = items.map((item: any) => ({
          ...item,
          category: item.settings?.category || '',
        }));
        setData(processedItems);
        setTotal(count);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  }, [limit, offset, filters, filterMode, sortField, sortDirection]);

  const handlePageChange = (newLimit: number, newOffset: number) => {
    setLimit(newLimit);
    setOffset(newOffset);
  };

  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(direction ? field : undefined);
    setSortDirection(direction);
    setOffset(0);
  };

  const handleFilterChange = useCallback((newFilters: Record<string, string>, newFilterMode: 'like' | 'exact') => {
    setFilters(newFilters);
    setFilterMode(newFilterMode);
    setOffset(0);
  }, []);

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleSaveEdit = async (eventData: any) => {
    await shm_request('shm/v1/admin/service/event', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  };

  const handleSaveNew = async (eventData: any) => {
    await shm_request('shm/v1/admin/service/event', {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  };

  const handleDelete = async () => {
    if (!selectedRow?.id) return;

    await shm_request(`shm/v1/admin/service/event?id=${selectedRow.id}`, {
      method: 'DELETE',
    });
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">События услуг</h2>
        </div>
        <button
          onClick={handleCreate}
          className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium btn-primary"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)'
          }}
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>
      <DataTable
        columns={eventColumns}
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
        onRefresh={() => fetchData(limit, offset, filters, filterMode, sortField, sortDirection)}
        storageKey="events"
      />

      {}
      <EventModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedRow(null);
        }}
        data={selectedRow}
        onSave={handleSaveEdit}
        onDelete={handleDelete}
      />

      {}
      <EventModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        data={null}
        onSave={handleSaveNew}
      />
    </div>
  );
}

export default Events;
