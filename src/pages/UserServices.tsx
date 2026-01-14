import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DataTableTree, { SortDirection } from '../components/DataTableTree';
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
  {
    key: 'status_before',
    label: 'Статус до',
    visible: false,
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
  { key: 'service', label: 'service', visible: false, sortable: false, filterable: false },
  { key: 'service_id', label: 'service_id', visible: false, sortable: true },
  { key: 'withdraw_id', label: 'withdraw_id', visible: false, sortable: true },
  { key: 'settings', label: 'settings', visible: false, sortable: false },
];

function UserServices() {
  const { selectedUser } = useSelectedUserStore();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    // Инициализируем с фильтром по user_id если пользователь выбран
    if (selectedUser?.user_id) {
      return { user_id: `%${selectedUser.user_id}%` };
    }
    return {} as Record<string, string>;
  });
  const [filterMode, setFilterMode] = useState<'like' | 'exact'>('like');
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const externalFilters = useMemo(() => {
    if (selectedUser?.user_id) {
      return { user_id: String(selectedUser.user_id) };
    }
    return undefined;
  }, [selectedUser]);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, fm: 'like' | 'exact', sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `shm/v1/admin/user/service?limit=${l}&offset=${o}`;

    const activeFilters: Record<string, any> = {};
    Object.entries(f).forEach(([key, value]) => {
      if (value) {
        let filterValue;
        if ( key === 'settings' ) {
          filterValue = `%${value}%`;
        } else {
          filterValue = fm === 'like' ? { '-like': `%${value}%` } : `%${value}%`;
        }
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
        if (sf === 'status' && sd) {
          const statusOrder = ['ACTIVE', 'BLOCK', 'NOT PAID', 'PROGRESS'];
          const orderMap = new Map(statusOrder.map((status, index) => [status, index]));
          const sorted = [...items].sort((a, b) => {
            const aIdx = orderMap.get(a.status) ?? statusOrder.length;
            const bIdx = orderMap.get(b.status) ?? statusOrder.length;
            if (aIdx === bIdx) return 0;
            return sd === 'asc' ? aIdx - bIdx : bIdx - aIdx;
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
    setFilters(prevFilters => {
      const filtersChanged = JSON.stringify(prevFilters) !== JSON.stringify(newFilters);
      if (filtersChanged) {
        setOffset(0);
        return newFilters;
      }
      return prevFilters;
    });
    setFilterMode(newFilterMode);
  }, []);

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    setEditModalOpen(true);
  };

  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleSaveEdit = async (serviceData: any) => {
    await shm_request('shm/v1/admin/user/service', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  };

  const handleSaveNew = async (serviceData: any) => {
    await shm_request('shm/v1/admin/service/order', {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    });
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  };

  const handleDelete = async () => {
    if (!selectedRow?.user_service_id) return;

    await shm_request(`shm/v1/admin/user/service?user_id=${selectedRow.user_id}&user_service_id=${selectedRow.user_service_id}`, {
      method: 'DELETE',
    });
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  };

  const handleRefresh = () => {
    fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
  };

  const handleLoadChildren = async (parentRow: any): Promise<any[]> => {
    try {
      const parentId = parentRow.user_service_id;
      const url = `shm/v1/admin/user/service?limit=1000&offset=0&parent=${parentId}`;
      const res = await shm_request(url);
      const { data: items } = normalizeListResponse(res);
      return items;
    } catch (error) {
      return [];
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Услуги пользователей</h2>
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
        <DataTableTree
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
          onLoadChildren={handleLoadChildren}
          storageKey="user-services"
          externalFilters={externalFilters}
          parentKeyId="parent"
          itemKeyId="user_service_id"
          maxDeepLevel={5}
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
