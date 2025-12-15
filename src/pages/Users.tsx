import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import { UserModal, UserCreateModal, UserChangePasswordModal} from '../modals';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { Plus } from 'lucide-react';
import { useSelectedUserStore } from '../store/selectedUserStore';
import { useAutoRefresh } from '../hooks';

const userColumns = [
  { key: 'user_id', label: 'ID', visible: true, sortable: true},
  { key: 'login', label: 'Логин', visible: true, sortable: true },
  { key: 'full_name', label: 'Клиент', visible: true, sortable: true },
  { key: 'balance', label: 'Баланс', visible: true, sortable: true },
  { key: 'bonus', label: 'Бонусы', visible: true, sortable: true },
  { key: 'settings', label: 'Settings', visible: true, sortable: true },
  { key: 'block', label: 'block', visible: false, sortable: false },
  { key: 'phone', label: 'phone', visible: false, sortable: true },
  { key: 'created', label: 'Дата создания', visible: false, sortable: true },
  { key: 'last_login', label: 'Последний вход', visible: false, sortable: true },
  { key: 'can_overdraft', label: 'can_overdraft', visible: false, sortable: true },
  { key: 'comment', label: 'comment', visible: false, sortable: true },
  { key: 'create_act', label: 'create_act', visible: false, sortable: true },
  { key: 'credit', label: 'credit', visible: false, sortable: true },
  { key: 'discount', label: 'discount', visible: false, sortable: true },
  { key: 'dogovor', label: 'dogovor', visible: false, sortable: true },
  { key: 'gid', label: 'gid', visible: false, sortable: true },
  { key: 'last_login', label: 'last_login', visible: false, sortable: true },
  { key: 'partner_id', label: 'partner_id', visible: false, sortable: true },
  { key: 'password', label: 'password', visible: false, sortable: true },
  { key: 'perm_credit', label: 'perm_credit', visible: false, sortable: true },
  { key: 'type', label: 'type', visible: false, sortable: true },
  { key: 'verified', label: 'verified', visible: false, sortable: true },
];

function Users() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  
  const { setSelectedUser } = useSelectedUserStore();
  
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/user?limit=${l}&offset=${o}`;
    
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

  // Автоматическое обновление при активной вкладке
  useAutoRefresh({
    onRefresh: () => fetchData(limit, offset, filters, sortField, sortDirection),
    cacheKey: 'users_list',
    enabled: true,
  });

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
    setEditModalOpen(true);
    setSelectedUser(row);
  };

  const handleCreate = () => {
    setCreateModalOpen(true);
  };
  
  const handleChangePasswordOpen = () => {
    setChangePasswordModalOpen(true);
  };

  const handleSaveNew = async (userData: any) => {
    await shm_request('/shm/v1/admin/user', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    fetchData(limit, offset, filters, sortField, sortDirection);
  };

  const handleSaveEdit = async (userData: any) => {
    await shm_request('/shm/v1/admin/user', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    fetchData(limit, offset, filters, sortField, sortDirection);
  };

  const handleChangePassword = async (userId: number, password: string) => {
    await shm_request('/shm/v1/admin/user/passwd', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, password }),
    });
  };

  const handleDelete = async () => {
    if (!selectedRow?.user_id) return;
    
    await shm_request(`/shm/v1/admin/user/${selectedRow.user_id}`, {
      method: 'DELETE',
    });
    fetchData(limit, offset, filters, sortField, sortDirection);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Пользователи</h2>
          <Help content="<b>Пользователи</b>: здесь отображается список пользователей. Можно фильтровать, скрывать/показывать столбцы, смотреть подробности." />
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
        columns={userColumns}
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
        storageKey="users"
      />
      
      {}
      <UserModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        data={selectedRow}
        onSave={handleSaveEdit}
        onDelete={handleDelete}
        onChangePassword={handleChangePasswordOpen}
        onRefresh={() => fetchData(limit, offset, filters, sortField, sortDirection)}
      />

      {}
      <UserCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleSaveNew}
      />

      {}
      <UserChangePasswordModal
        open={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        userId={selectedRow?.user_id}
        userLogin={selectedRow?.login}
        onSave={handleChangePassword}
      />
    </div>
  );
}

export default Users;
