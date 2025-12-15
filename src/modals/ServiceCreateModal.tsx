import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import JsonEditor from '../components/JsonEditor';
import { shm_request, normalizeListResponse } from '../lib/shm_request';

interface ServiceCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: Record<string, any>) => void | Promise<void>;
  initialData?: Record<string, any> | null;
}

export default function ServiceCreateModal({
  open,
  onClose,
  onCreate,
  initialData,
}: ServiceCreateModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    cost: '',
    period: '1',
    next: null,
    category: '',
    allow_to_order: false,
    is_composite: false,
    pay_in_credit: false,
    no_discount: false,
    pay_always: false,
    once_service: false,
    deleted: false,
    descr: '',
    config: {},
  });
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        const onceService = initialData.period === 0 && initialData.next === -1;
        setFormData({
          name: initialData.name || '',
          cost: initialData.cost || '',
          period: initialData.period || '1',
          next: initialData.next ?? null,
          category: initialData.category || '',
          allow_to_order: initialData.allow_to_order || false,
          is_composite: initialData.is_composite || false,
          pay_in_credit: initialData.pay_in_credit || false,
          no_discount: initialData.no_discount || false,
          pay_always: initialData.pay_always || false,
          once_service: onceService,
          deleted: initialData.deleted || false,
          descr: initialData.descr || '',
          config: initialData.config || {},
        });
      } else {
        setFormData({
          name: '',
          cost: '',
          period: '1',
          next: null,
          category: '',
          allow_to_order: false,
          is_composite: false,
          pay_in_credit: false,
          no_discount: false,
          pay_always: false,
          once_service: false,
          deleted: false,
          descr: '',
          config: {},
        });
      }
      
      shm_request('/shm/v1/admin/service?limit=0')
        .then(res => {
          const { data: items } = normalizeListResponse(res);
          setServices(items);
        })
        .catch(() => setServices([]));
    }
  }, [open, initialData]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Введите название услуги');
      return;
    }

    const dataToSave = { ...formData };
    if (dataToSave.once_service) {
      dataToSave.period = 0;
      dataToSave.next = -1;
    }
    delete dataToSave.once_service; 

    setSaving(true);
    try {
      await onCreate(dataToSave);
      toast.success('Услуга создана');
      onClose();
    } catch (error) {
      toast.error('Ошибка создания');
    } finally {
      setSaving(false);
    }
  };

  const toggleBonusPercent = () => {
    const config = formData.config || {};
    if (config.hasOwnProperty('limit_bonus_percent')) {
      const { limit_bonus_percent, ...restConfig } = config;
      handleChange('config', restConfig);
    } else {
      handleChange('config', { ...config, limit_bonus_percent: 50 });
    }
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  const labelStyles = {
    color: 'var(--theme-content-text-muted)',
  };

  const renderFooter = () => (
    <div className="flex justify-end gap-2">
      <button
        onClick={onClose}
        className="px-4 py-2 rounded flex items-center gap-2"
        style={{
          backgroundColor: 'var(--theme-button-secondary-bg)',
          color: 'var(--theme-button-secondary-text)',
          border: '1px solid var(--theme-button-secondary-border)',
        }}
      >
        <X className="w-4 h-4" />
        Отмена
      </button>
      <button
        onClick={handleCreate}
        disabled={saving}
        className="px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 btn-success"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--accent-text)',
        }}
      >
        <Save className="w-4 h-4" />
        {saving ? 'Создание...' : 'Создать'}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? `Дублирование: ${initialData.name}` : "Новая услуга"}
      footer={renderFooter()}
      size="xl"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <div className="col-span-2 flex items-center gap-3">
          <label className="w-40 text-sm font-medium" style={labelStyles}>Название *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
            placeholder="Название услуги"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="w-40 text-sm font-medium" style={labelStyles}>Категория</label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
            placeholder="Категория услуги"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="w-40 text-sm font-medium" style={labelStyles}>Стоимость</label>
          <input
            type="number"
            value={formData.cost}
            onChange={(e) => handleChange('cost', e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
            min="0"
            step="0.01"
          />
        </div>

        <div className="col-span-2 flex items-center gap-3">
          <label className="w-40 text-sm font-medium" style={labelStyles}>Период услуги</label>
          <input
            type="number"
            value={formData.period}
            onChange={(e) => handleChange('period', e.target.value)}
            disabled={formData.once_service}
            className="w-32 px-3 py-2 text-sm rounded border disabled:opacity-60"
            style={inputStyles}
            min="0"
            max="120"
            step="0.0001"
          />
          <span className="text-xs" style={labelStyles}>M.DDHH (M - месяцы, DD - дни, HH - часы)</span>
        </div>

        <div className="col-span-2 flex items-center gap-3">
          <label className="w-40 text-sm font-medium" style={labelStyles}>Следующая услуга</label>
          <select
            value={formData.next === null ? 'null' : formData.next === undefined ? 'null' : formData.next}
            onChange={(e) => {
              const val = e.target.value;
              handleChange('next', val === 'null' ? null : val === '-1' ? -1 : Number(val));
            }}
            disabled={formData.once_service}
            className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-60"
            style={inputStyles}
          >
            <option value="null">Не изменять (продлить текущую)</option>
            <option value="-1">Не продлевать (удалить текущую)</option>
            {services.map(service => (
              <option key={service.service_id} value={service.service_id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2 border-t pt-4 mt-2" style={{ borderColor: 'var(--theme-card-border)' }}>
          <label className="block text-sm font-medium mb-3" style={labelStyles}>Биллинг</label>
          
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 ml-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allow_to_order || false}
                onChange={(e) => handleChange('allow_to_order', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Доступно к заказу</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.config?.order_only_once || false}
                onChange={(e) => {
                  const config = formData.config || {};
                  handleChange('config', { ...config, order_only_once: e.target.checked });
                }}
                disabled={!formData.allow_to_order}
                className="w-4 h-4 disabled:opacity-50"
              />
              <span className="text-sm">Можно заказать только один раз</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_composite || false}
                onChange={(e) => handleChange('is_composite', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Составная услуга</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.pay_in_credit || false}
                onChange={(e) => handleChange('pay_in_credit', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Списывать всегда (даже в минус)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.no_discount || false}
                onChange={(e) => handleChange('no_discount', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Не применять скидки</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.config?.no_money_back || false}
                onChange={(e) => {
                  const config = formData.config || {};
                  handleChange('config', { ...config, no_money_back: e.target.checked });
                }}
                className="w-4 h-4"
              />
              <span className="text-sm">Не возвращать средства</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.pay_always || false}
                onChange={(e) => handleChange('pay_always', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Всегда платная услуга</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.once_service || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  handleChange('once_service', checked);
                  if (checked) {
                    handleChange('period', 0);
                    handleChange('next', -1);
                  } else {
                    handleChange('period', formData.period === 0 ? 1 : formData.period);
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm">Мгновенная услуга</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.config?.no_auto_renew || false}
                onChange={(e) => {
                  const config = formData.config || {};
                  handleChange('config', { ...config, no_auto_renew: e.target.checked });
                }}
                className="w-4 h-4"
              />
              <span className="text-sm">Не продлять автоматически</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.config?.hasOwnProperty('limit_bonus_percent') || false}
                onChange={toggleBonusPercent}
                className="w-4 h-4"
              />
              <span className="text-sm">Ограничение оплаты бонусами</span>
            </label>

            {formData.config?.hasOwnProperty('limit_bonus_percent') && (
              <div className="col-span-2 flex items-center gap-3 ml-6 mt-2">
                <label className="text-sm" style={labelStyles}>Процент оплаты бонусами:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={formData.config.limit_bonus_percent || 50}
                    onChange={(e) => {
                      const config = formData.config || {};
                      handleChange('config', { ...config, limit_bonus_percent: Number(e.target.value) });
                    }}
                    className="w-24 px-3 py-2 text-sm rounded border"
                    style={inputStyles}
                    min="0"
                    max="100"
                    step="1"
                    placeholder="50"
                  />
                  <span className="text-sm">%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 flex items-start gap-3">
          <label className="w-40 text-sm font-medium pt-2" style={labelStyles}>Описание</label>
          <textarea
            value={formData.descr}
            onChange={(e) => handleChange('descr', e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
            rows={3}
          />
        </div>

        <div className="col-span-2 flex items-start gap-3">
          <label className="w-40 text-sm font-medium pt-2" style={labelStyles}>Конфигурация</label>
          <div className="flex-1">
            <JsonEditor
              data={formData.config}
              onChange={(value) => handleChange('config', value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
