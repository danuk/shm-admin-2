import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { buildApiFilters, appendFilterToUrl } from '../lib/filterUtils';
import { StorageModal } from '../modals';
import { useSelectedUserStore } from '../store/selectedUserStore';

const storageColumns = [
  { key: 'user_id', label: 'User ID', visible: true, sortable: true },
  { key: 'name', label: 'Название', visible: true, sortable: true },
  { key: 'settings', label: 'Settings', visible: true, sortable: false },
  { key: 'created', label: 'Создано', visible: false, sortable: true },
  { key: 'user_service_id', label: 'ID услуги Пользователя', visible: false, sortable: true },
];

function Storage() {
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

  const externalFilters = useMemo(() => {
    if (selectedUser?.user_id) {
      return { user_id: String(selectedUser.user_id) };
    }
    return undefined;
  }, [selectedUser]);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, fm: 'like' | 'exact', sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `shm/v1/admin/storage/manage?limit=${l}&offset=${o}`;

    const activeFilters = buildApiFilters(f, fm, selectedUser?.user_id);
    url = appendFilterToUrl(url, activeFilters);

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
        <h2 className="text-xl font-bold">Хранилище</h2>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DataTable
          columns={storageColumns}
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
        storageKey="storage"
        externalFilters={externalFilters}
      />
      </div>

      <StorageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={selectedRow}
        onDelete={async (name) => {
          await shm_request(`shm/v1/admin/storage/manage/${name}?user_id=${selectedRow.user_id}`, {
            method: 'DELETE',
          });
          fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
        }}
      />
    </div>
  );
}

export default Storage;
