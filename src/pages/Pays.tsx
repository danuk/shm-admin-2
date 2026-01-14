import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { PayModal, PayCreateModal } from '../modals';
import { Plus } from 'lucide-react';
import { useSelectedUserStore } from '../store/selectedUserStore';

const payColumns = [
  { key: 'id', label: 'ID', visible: true, sortable: true },
  { key: 'user_id', label: 'Пользователь', visible: true, sortable: true },
  { key: 'money', label: 'Сумма', visible: true, sortable: true },
  { key: 'date', label: 'Дата', visible: true, sortable: true },
  { key: 'pay_system_id', label: 'Плат. система', visible: false, sortable: true },
  { key: 'comment', label: 'Комментарий', visible: false, sortable: false },
  { key: 'uniq_key', label: 'Уникальный ключ', visible: false, sortable: false, filterable: false },
];

function Pays() {
  const { selectedUser } = useSelectedUserStore();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    if (selectedUser?.user_id) {
      return { user_id: `%${selectedUser.user_id}%` };
    }
    return {} as Record<string, string>;
  });
  const [filterMode, setFilterMode] = useState<'like' | 'exact'>('like');
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const externalFilters = useMemo(() => {
    if (selectedUser?.user_id) {
      return { user_id: String(selectedUser.user_id) };
    }
    return undefined;
  }, [selectedUser]);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, fm: 'like' | 'exact', sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `shm/v1/admin/user/pay?limit=${l}&offset=${o}`;

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
    setModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Платежи</h2>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium btn-primary"
          title="Создать платёж"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)',
          }}
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DataTable
          columns={payColumns}
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
        storageKey="pays"
        externalFilters={externalFilters}
      />
      </div>

      <PayModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={selectedRow}
      />
      <PayCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={async (data) => {
          await shm_request(`shm/v1/admin/user/payment`, {
            method: 'PUT',
            body: JSON.stringify(data),
          });
          setCreateModalOpen(false);
          fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
        }}
      />
    </div>
  );
}

export default Pays;
