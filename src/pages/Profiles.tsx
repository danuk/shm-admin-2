import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import { ProfileModal, ProfileCreateModal } from '../modals';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { Plus } from 'lucide-react';
import { useSelectedUserStore } from '../store/selectedUserStore';

const profileColumns = [
  { key: 'id', label: 'ID', visible: true, sortable: true },
  { key: 'user_id', label: 'User ID', visible: true, sortable: true },
  { key: 'data', label: 'Данные', visible: true, sortable: false },
  { key: 'created', label: 'Дата создания', visible: false, sortable: true },
];

function Profiles() {
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
  
    const { selectedUser } = useSelectedUserStore();
  
    const externalFilters = useMemo(() => {
      if (selectedUser?.user_id) {
        return { user_id: String(selectedUser.user_id) };
      }
      return undefined;
    }, [selectedUser]);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/user/profile?limit=${l}&offset=${o}`;
    
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
    setModalOpen(true);
  };

  const handleSave = async (profileData: any) => {
    await shm_request('/shm/v1/admin/user/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
    fetchData(limit, offset, filters, sortField, sortDirection);
  };

  const handleCreate = async (profileData: any) => {
    await shm_request('/shm/v1/admin/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    fetchData(limit, offset, filters, sortField, sortDirection);
  };

  const handleDelete = async () => {
    if (!selectedRow?.id) return;
    
    await shm_request(`/shm/v1/admin/user/profile?id=${selectedRow.id}`, {
      method: 'DELETE',
    });
    fetchData(limit, offset, filters, sortField, sortDirection);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Персональные данные</h2>
          <Help content="<b>Персональные данные</b>: профили пользователей с дополнительной информацией." />
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
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
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DataTable
          columns={profileColumns}
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
        storageKey="profiles"
        externalFilters={externalFilters}
      />
      </div>
      
      <ProfileModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={selectedRow}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      <ProfileCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreate}
      />
    </div>
  );
}

export default Profiles;
