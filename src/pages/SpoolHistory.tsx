import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import Help from '../components/Help';
import { SpoolHistoryModal } from '../modals';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { useSelectedUserStore } from '../store/selectedUserStore';

const spoolHistoryColumns = [
  { key: 'executed', label: 'Выполнено', visible: true, sortable: true },
  { key: 'user_id', label: 'USER ID', visible: true, sortable: true },
  { key: 'event', label: 'event', visible: true, sortable: true },
  { 
    key: 'title', 
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
  { key: 'response', label: 'response', visible: true, sortable: true },
  { key: 'id', label: 'ID', visible: false, sortable: true },
  { key: 'user_service_id', label: 'US ID', visible: false, sortable: true },
  { key: 'prio', label: 'Приоритет', visible: false, sortable: true },
  { key: 'created', label: 'Создано', visible: false, sortable: true },
  { key: 'spool_id', label: 'spool_id', visible: false, sortable: true },
  { key: 'delayed', label: 'Задержка', visible: false, sortable: true },
  { key: 'settings', label: 'settings', visible: false, sortable: true },
];

function SpoolHistory() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
      
    const { selectedUser } = useSelectedUserStore();
      
    const externalFilters = useMemo(() => {
      if (selectedUser?.user_id) {
        return { user_id: String(selectedUser.user_id) };
      }
      return undefined;
    }, [selectedUser]);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/spool/history?limit=${l}&offset=${o}`;
    
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

  const handleRefresh = () => {
    fetchData(limit, offset, filters, sortField, sortDirection);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-bold">Список завершенных задач</h2>
        <Help content="<b>Список завершенных задач</b>: история выполненных задач биллинга." />
      </div>
      <DataTable
        columns={spoolHistoryColumns}
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
        storageKey="spool-history"
        externalFilters={externalFilters}
      />
      
      <SpoolHistoryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedRow(null);
        }}
        data={modalOpen ? selectedRow : null}
      />
    </div>
  );
}

export default SpoolHistory;
