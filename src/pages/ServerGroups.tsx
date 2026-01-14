import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import { ServerGroupModal, ServerGroupCreateModal } from '../modals';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { Plus } from 'lucide-react';

const serverGroupColumns = [
  { key: 'group_id', label: 'ID', visible: true, sortable: true },
  { key: 'name', label: 'Название', visible: true, sortable: true },
  { key: 'type', label: 'Тип', visible: true, sortable: true },
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
  { key: 'settings', label: 'Settings', visible: false, sortable: false },
];

function ServerGroups() {
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, fm: 'like' | 'exact', sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `shm/v1/admin/server/group?limit=${l}&offset=${o}`;

    const activeFilters: Record<string, any> = {};
    Object.entries(f).forEach(([key, value]) => {
      if (value) {
        const filterValue = fm === 'like' ? { '-like': `%${value}%` } : value;
        if (key.includes('.')) {
          const parts = key.split('.');
          let current = activeFilters;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
              current[parts[i]] = {};
            }
            current = current[parts[i]];
          }
          current[parts[parts.length - 1]] = filterValue;
        } else {
          activeFilters[key] = filterValue;
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
        setData(items);
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
    setEditModalOpen(true);
  };

  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleSaveEdit = async (groupData: any) => {
    await shm_request('shm/v1/admin/server/group', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  };

  const handleSaveNew = async (groupData: any) => {
    await shm_request('shm/v1/admin/server/group', {
      method: 'PUT',
      body: JSON.stringify(groupData),
    });
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  };

  const handleDelete = async () => {
    if (!selectedRow?.group_id) return;

    await shm_request(`shm/v1/admin/server/group?group_id=${selectedRow.group_id}`, {
      method: 'DELETE',
    });
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  };

  const handleRefresh = () => {
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Группы серверов</h2>
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
        columns={serverGroupColumns}
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
        storageKey="server-groups"
      />

      {}
      <ServerGroupModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedRow(null);
        }}
        data={editModalOpen ? selectedRow : null}
        onSave={handleSaveEdit}
        onDelete={handleDelete}
        onRefresh={handleRefresh}
      />

      {}
      <ServerGroupCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleSaveNew}
      />
    </div>
  );
}

export default ServerGroups;
