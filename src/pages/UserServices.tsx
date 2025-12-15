import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import { UserServiceModal, UserServiceCreateModal } from '../modals';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { Plus } from 'lucide-react';
import { useSelectedUserStore } from '../store/selectedUserStore';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'var(--accent-success)';
    case 'BLOCK':
      return 'var(--accent-danger)';
    case 'NOT PAID':
      return 'var(--accent-warning)';
    case 'PROGRESS':
      return 'var(--accent-info)';
    default:
      return 'var(--theme-content-text-muted)';
  }
};

const userServiceColumns = [
  { key: 'user_service_id', label: 'ID', visible: true, sortable: true },
  { key: 'user_id', label: 'Пользователь', visible: true, sortable: true },
  { key: 'name', label: 'Услуга', visible: true, sortable: true },
  { 
    key: 'status', 
    label: 'Статус', 
    visible: true, 
    sortable: true,
    filterType: 'select' as const,
    filterOptions: [
      { value: 'ACTIVE', label: 'ACTIVE' },
      { value: 'BLOCK', label: 'BLOCK' },
      { value: 'NOT PAID', label: 'NOT PAID' },
      { value: 'PROGRESS', label: 'PROGRESS' },
    ],
    render: (value: string) => (
      <span style={{ color: getStatusColor(value), fontWeight: 500 }}>
        {value}
      </span>
    )
  },
  { key: 'created', label: 'Создано', visible: true, sortable: true },
  { key: 'expire', label: 'Истекает', visible: true, sortable: true },
  { key: 'category', label: 'Категория', visible: false, sortable: true },
  { key: 'auto_bill', label: 'Автобиллинг', visible: false, sortable: false },
  { key: 'next', label: 'След. услуга', visible: false, sortable: true },
  { key: 'parent', label: 'Родитель', visible: false, sortable: true },
];

function UserServices() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
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
    let url = `/shm/v1/admin/user/service?limit=${l}&offset=${o}`;
    
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
    setFilters(prevFilters => {
      const filtersChanged = JSON.stringify(prevFilters) !== JSON.stringify(newFilters);
      if (filtersChanged) {
        setOffset(0);
        return newFilters;
      }
      return prevFilters;
    });
  }, []);

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    setEditModalOpen(true);
  };

  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleSaveEdit = async (serviceData: any) => {
    await shm_request('/shm/v1/admin/user/service', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
    fetchData(limit, offset, filters, sortField, sortDirection);
  };

  const handleSaveNew = async (serviceData: any) => {
    await shm_request('/shm/v1/admin/service/order', {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    });
    fetchData(limit, offset, filters, sortField, sortDirection);
  };

  const handleDelete = async () => {
    if (!selectedRow?.user_service_id) return;
    
    await shm_request(`/shm/v1/admin/user/service?user_service_id=${selectedRow.user_service_id}`, {
      method: 'DELETE',
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
          <h2 className="text-xl font-bold">Услуги пользователей</h2>
          <Help content="<b>Услуги пользователей</b>: список всех услуг, привязанных к пользователям." />
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
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DataTable
          columns={userServiceColumns}
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
        storageKey="user-services"
        externalFilters={externalFilters}
      />
      </div>
      
      {}
      <UserServiceModal
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
      <UserServiceCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleSaveNew}
      />
    </div>
  );
}

export default UserServices;
