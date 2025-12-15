import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { PromoModal, PromoCreateModal } from '../modals';
import { Plus } from 'lucide-react';

const promoColumns = [
  { key: 'id', label: 'Промокод', visible: true, sortable: true },
  { key: 'user_id', label: 'Создатель', visible: true, sortable: true },
  { key: 'template_id', label: 'Шаблон', visible: true, sortable: true },
  { key: 'created', label: 'Создан', visible: true, sortable: true },
  { key: 'expire', label: 'Истекает', visible: true, sortable: true },
  { key: 'used', label: 'Использован', visible: false, sortable: true },
  { key: 'used_by', label: 'Кем использован', visible: false, sortable: true },
];

function Promo() {
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
    let url = `/shm/v1/admin/promo?limit=${l}&offset=${o}`;
    
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Промокоды</h2>
          <Help content="<b>Промокоды</b>: список промокодов. Можно создавать, удалять, смотреть кто использовал." />
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium btn-primary"
          title="Создать промокод"
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
        columns={promoColumns}
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
        storageKey="promo"
      />
      <PromoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={selectedRow}
        onSave={async (data) => {
          await shm_request(`/shm/v1/admin/promo`, {
            method: 'POST',
            body: JSON.stringify(data),
          });
          fetchData(limit, offset, filters, sortField, sortDirection);
        }}
        onDelete={async (id) => {
          await shm_request(`/shm/v1/admin/promo/${id}`, {
            method: 'DELETE',
          });
          fetchData(limit, offset, filters, sortField, sortDirection);
        }}
      />
      <PromoCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={async (data) => {
          await shm_request(`/shm/v1/admin/promo`, {
            method: 'PUT',
            body: JSON.stringify(data),
          });
          fetchData(limit, offset, filters, sortField, sortDirection);
        }}
      />
    </div>
  );
}

export default Promo;
