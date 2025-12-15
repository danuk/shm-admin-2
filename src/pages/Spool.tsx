import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import Help from '../components/Help';
import { SpoolModal, SpoolCreateModal } from '../modals';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { useSelectedUserStore } from '../store/selectedUserStore';
import { Plus } from 'lucide-react';

const spoolColumns = [
  { key: 'created', label: 'Создано', visible: true, sortable: true },
  { key: 'user_id', label: 'Пользователь', visible: true, sortable: true },
  { key: 'event', label: 'event', visible: true, sortable: true },
  { 
    key: 'event', 
    label: 'title', 
    visible: true, 
    sortable: false,
    render: (value: any) => value?.title || '-'
  },
  { 
    key: 'status', 
    label: 'Статус', 
    visible: true, 
    sortable: true,
    filterType: 'select' as const,
    filterOptions: [
      { value: 'DELAYED', label: 'DELAYED' },
      { value: 'SUCCESS', label: 'SUCCESS' },
      { value: 'PAUSED', label: 'PAUSED' },
      { value: 'STUCK', label: 'STUCK' },
      { value: 'FAIL', label: 'FAIL' },
      { value: 'NEW', label: 'NEW' },
    ]
  },
  { key: 'executed', label: 'Выполнено', visible: true, sortable: true },
  { key: 'id', label: 'ID', visible: false, sortable: true },
  { key: 'user_service_id', label: 'Услуга', visible: false, sortable: true },
  { key: 'prio', label: 'Приоритет', visible: false, sortable: true },
  { key: 'spool_id', label: 'spool_id', visible: false, sortable: true },
  { key: 'delayed', label: 'Задержка', visible: false, sortable: true },
  { key: 'settings', label: 'settings', visible: false, sortable: true },
];

function Spool() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
    
  const { selectedUser } = useSelectedUserStore();
    
  const externalFilters = useMemo(() => {
    if (selectedUser?.user_id) {
      return { user_id: String(selectedUser.user_id) };
    }
    return undefined;
  }, [selectedUser]);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/spool?limit=${l}&offset=${o}`;
    
    const combinedFilters = { ...f, ...externalFilters };
    if (Object.keys(combinedFilters).length > 0) {
      url += `&filter=${encodeURIComponent(JSON.stringify(combinedFilters))}`;
    }
    
    if (sf && sd) {
      url += `&sort_field=${sf}&sort_direction=${sd}`;
    }
    shm_request(url)
      .then(res => {
        const { data: items, total: count } = normalizeListResponse(res);
        setData(items);
        setTotal(count);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [externalFilters]);

  useEffect(() => {
    fetchData(limit, offset, filters, sortField, sortDirection);
  }, [limit, offset, filters, sortField, sortDirection, fetchData]);

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
    setSelectedRow(row);
    setViewModalOpen(true);
  };

  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleSaveNew = async (spoolData: any) => {
    await shm_request('/shm/v1/admin/spool', {
      method: 'PUT',
      body: JSON.stringify(spoolData),
    });
    fetchData(limit, offset, filters, sortField, sortDirection);
  };

  const handleRefresh = () => {
    fetchData(limit, offset, filters, sortField, sortDirection);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Текущие задачи</h2>
          <Help content="<b>Текущие задачи</b>: список текущих задач биллинга. Можно перейти к пользователю или услуге." />
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
          Создать
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DataTable
          columns={spoolColumns}
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
        onRefresh={handleRefresh}
        storageKey="spool"
        externalFilters={externalFilters}
      />
      </div>
      
      {}
      <SpoolModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedRow(null);
        }}
        data={viewModalOpen ? selectedRow : null}
        onRefresh={handleRefresh}
      />

      {}
      <SpoolCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleSaveNew}
      />
    </div>
  );
}

export default Spool;
