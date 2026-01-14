import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { buildApiFilters, appendFilterToUrl } from '../lib/filterUtils';
import { WithdrawModal } from '../modals';
import { useSelectedUserStore } from '../store/selectedUserStore';

const withdrawColumns = [
  { key: 'withdraw_id', label: 'ID', visible: true, sortable: true },
  { key: 'user_id', label: 'Пользователь', visible: true, sortable: true },
  { key: 'user_service_id', label: 'Услуга', visible: true, sortable: true },
  { key: 'service_id', label: 'ID услуги', visible: false, sortable: true },
  { key: 'cost', label: 'Стоимость', visible: true, sortable: true },
  { key: 'total', label: 'Итого', visible: true, sortable: true },
  { key: 'discount', label: 'Скидка', visible: false, sortable: true },
  { key: 'bonus', label: 'Бонусы', visible: false, sortable: true },
  { key: 'months', label: 'Период', visible: false, sortable: true },
  { key: 'qnt', label: 'Кол-во', visible: false, sortable: true },
  { key: 'create_date', label: 'Дата создания', visible: true, sortable: true },
  { key: 'withdraw_date', label: 'Дата списания', visible: false, sortable: true },
  { key: 'end_date', label: 'Дата окончания', visible: false, sortable: true },
];

function Withdraws() {
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
    let url = `shm/v1/admin/user/service/withdraw?limit=${l}&offset=${o}`;

    const activeFilters = buildApiFilters(f, fm, externalFilters);
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
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Списания</h2>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DataTable
          columns={withdrawColumns}
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
        storageKey="withdraws"
        externalFilters={externalFilters}
        />
      </div>

      <WithdrawModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={selectedRow}
        onSave={async (data) => {
          await shm_request(`shm/v1/admin/user/service/withdraw`, {
            method: 'POST',
            body: JSON.stringify(data),
          });
          setModalOpen(false);
          fetchData(limit, offset, filters, filterMode, sortField, sortDirection);
        }}
      />
    </div>
  );
}

export default Withdraws;
