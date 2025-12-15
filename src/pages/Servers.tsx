import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import ServerModal from '../modals/ServerModal';
import ServerCreateModal from '../modals/ServerCreateModal';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const serverColumns = [
  { key: 'server_id', label: 'ID', visible: true, sortable: true },
  { key: 'name', label: 'Имя', visible: true, sortable: true },
  { key: 'host', label: 'Хост', visible: true, sortable: true },
  { key: 'ip', label: 'IP', visible: false, sortable: true },
  { 
    key: 'transport', 
    label: 'Транспорт', 
    visible: true, 
    sortable: true,
    filterType: 'select' as const,
    filterOptions: [
      { value: 'local', label: 'local' },
      { value: 'http', label: 'http' },
      { value: 'ssh', label: 'ssh' },
      { value: 'mail', label: 'mail' },
      { value: 'telegram', label: 'telegram' },
    ]
  },
  { key: 'server_gid', label: 'Группа', visible: true, sortable: true },
  { key: 'enabled', label: 'Включен', visible: true, sortable: true },
  { key: 'weight', label: 'Вес', visible: false, sortable: true },
  { key: 'services_count', label: 'Услуг', visible: false, sortable: true },
];

function Servers() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/server?limit=${l}&offset=${o}`;
    
    if (Object.keys(f).length > 0) {
      url += `&filter=${encodeURIComponent(JSON.stringify(f))}`;
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
    setSelectedRow(row);
    setModalOpen(true);
  };

  const handleCreate = async (serverData: Record<string, any>) => {
    try {
      await shm_request('/shm/v1/admin/server', {
        method: 'POST',
        body: JSON.stringify(serverData),
      });
      fetchData(limit, offset, filters, sortField, sortDirection);
    } catch (error) {
      throw error;
    }
  };

  const handleSave = async (serverData: Record<string, any>) => {
    try {
      await shm_request('/shm/v1/admin/server', {
        method: 'PUT',
        body: JSON.stringify(serverData),
      });
      fetchData(limit, offset, filters, sortField, sortDirection);
    } catch (error) {
      throw error;
    }
  };

  const handleDelete = async (serverId: number) => {
    try {
      await shm_request(`/shm/v1/admin/server/${serverId}`, {
        method: 'DELETE',
      });
      fetchData(limit, offset, filters, sortField, sortDirection);
    } catch (error) {
      throw error;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Сервера</h2>
          <Help content="<b>Сервера</b>: список серверов, на которых размещаются услуги." />
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium btn-primary"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)',
          }}
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>
      <DataTable
        columns={serverColumns}
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
        storageKey="servers"
      />
      <ServerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={selectedRow}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      <ServerCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreate}
      />
    </div>
  );
}

export default Servers;
