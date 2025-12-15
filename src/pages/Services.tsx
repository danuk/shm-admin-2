import React, { useEffect, useState, useCallback } from 'react';
import DataTable, { SortDirection } from '../components/DataTable';
import ServiceModal from '../modals/ServiceModal';
import ServiceCreateModal from '../modals/ServiceCreateModal';
import Help from '../components/Help';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { Plus } from 'lucide-react';

const serviceColumns = [
  { key: 'service_id', label: 'ID', visible: true, sortable: true },
  { key: 'name', label: 'Название', visible: true, sortable: true },
  { key: 'cost', label: 'Стоимость', visible: true, sortable: true },
  { key: 'period', label: 'Период', visible: true, sortable: true },
  { key: 'category', label: 'Категория', visible: true, sortable: true },
  { key: 'allow_to_order', label: 'Доступна', visible: false, sortable: false },
  { key: 'deleted', label: 'Удалена', visible: false, sortable: false },
  { key: 'descr', label: 'Описание', visible: false, sortable: false },
];

function Services() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchData = useCallback((l: number, o: number, f: Record<string, string>, sf?: string, sd?: SortDirection) => {
    setLoading(true);
    let url = `/shm/v1/admin/service?limit=${l}&offset=${o}`;
    
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
    setViewModalOpen(true);
  };

  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleSaveView = async (updatedData: any) => {
    try {
      await shm_request(`/shm/v1/admin/service/${updatedData.service_id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData),
      });
      setViewModalOpen(false);
      fetchData(limit, offset, filters, sortField, sortDirection);
    } catch (error) {
      throw error;
    }
  };

  const handleCreateNew = async (newData: any) => {
    try {
      await shm_request('/shm/v1/admin/service', {
        method: 'PUT',
        body: JSON.stringify(newData),
      });
      setCreateModalOpen(false);
      fetchData(limit, offset, filters, sortField, sortDirection);
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    try {
      await shm_request(`/shm/v1/admin/service?service_id=${serviceId}`, {
        method: 'DELETE',
      });
      setViewModalOpen(false);
      fetchData(limit, offset, filters, sortField, sortDirection);
    } catch (error) {
      throw error;
    }
  };

  const handleDuplicate = (data: Record<string, any>) => {
    setSelectedRow(data);
    setViewModalOpen(false);
    setCreateModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">Услуги</h2>
          <Help content="<b>Услуги</b>: список тарифов и услуг биллинга. Можно редактировать стоимость, период, настройки." />
        </div>
        <button
          onClick={handleCreate}
          className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium btn-primary"
          title="Создать услугу"
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
        columns={serviceColumns}
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
        storageKey="services"
      />
      <ServiceModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        data={selectedRow}
        onSave={handleSaveView}
        onDelete={handleDeleteService}
        onDuplicate={handleDuplicate}
      />

      <ServiceCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateNew}
        initialData={selectedRow}
      />
    </div>
  );
}

export default Services;
