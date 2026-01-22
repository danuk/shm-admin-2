import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '../components/Modal';
import { Save, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import UserSelect from '../components/UserSelect';
import ServiceSelect from '../components/ServiceSelect';
import { shm_request } from '../lib/shm_request';

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  onSave: (data: Record<string, any>) => void | Promise<void>;
}

export default function WithdrawModal({
  open,
  onClose,
  data,
  onSave,
}: WithdrawModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    } else {
      setFormData({});
    }
  }, [data, open]);

  // Функция для отправки dry_run запроса
  const calculateWithDryRun = useCallback(async (newFormData: Record<string, any>) => {
    if (!newFormData.withdraw_id) return;

    setCalculating(true);
    try {
      const response = await shm_request('shm/v1/admin/user/service/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          ...newFormData,
          dry_run: 1,
        }),
      });

      if (response.data && response.data[0]) {
        const calculated = response.data[0];
        setFormData(prev => ({
          ...prev,
          total: calculated.total,
          end_date: calculated.end_date,
        }));
      }
    } finally {
      setCalculating(false);
    }
  }, []);

  const handleChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      calculateWithDryRun(newFormData);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
      toast.success('Списание обновлено');
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
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
    <div className="flex justify-end gap-2 w-full">
      <button
        onClick={onClose}
        className="p-2 rounded flex items-center gap-2"
        style={{
          backgroundColor: 'var(--theme-button-secondary-bg)',
          color: 'var(--theme-button-secondary-text)',
          border: '1px solid var(--theme-button-secondary-border)',
        }}
        title="Отмена"
      >
        <X className="w-4 h-4" />
        <span className="hidden sm:inline">Отмена</span>
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="p-2 rounded flex items-center gap-2 btn-success disabled:opacity-50"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--accent-text)',
        }}
        title="Сохранить"
      >
        <Save className="w-4 h-4" />
        <span className="hidden sm:inline">{saving ? 'Сохранение...' : 'Сохранить'}</span>
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Редактирование списания #${data?.withdraw_id || ''}`}
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyles}>
            Пользователь
          </label>
          <UserSelect
            value={formData.user_id}
            onChange={(value) => handleChange('user_id', value)}
            readonly
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyles}>
            Услуга
          </label>
          <ServiceSelect
            value={formData.service_id}
            readonly
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyles}>
              Цена
            </label>
            <input
              type="number"
              value={formData.cost || ''}
              onChange={(e) => handleChange('cost', Number(e.target.value))}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyles}>
              Количество
            </label>
            <input
              type="number"
              value={formData.qnt || ''}
              onChange={(e) => handleChange('qnt', Number(e.target.value))}
              step="1"
              min="1"
              className="w-full px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyles}>
              Бонусы
            </label>
            <input
              type="number"
              value={formData.bonus || ''}
              onChange={(e) => handleChange('bonus', Number(e.target.value))}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyles}>
              Скидка (%)
            </label>
            <input
              type="number"
              value={formData.discount || ''}
              onChange={(e) => handleChange('discount', Number(e.target.value))}
              step="1"
              min="0"
              max="100"
              className="w-full px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyles}>
            Период (мес.)
          </label>
          <input
            type="number"
            value={formData.months || ''}
            onChange={(e) => handleChange('months', Number(e.target.value))}
            step="0.0001"
            min="0.0001"
            max="120"
            className="w-full px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
          <span className="block text-xs mt-1" style={labelStyles}>M.DDHH (M - месяцы, DD - дни, HH - часы)</span>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 flex items-center gap-2" style={labelStyles}>
            Итого
            {calculating && <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--accent-primary)' }} />}
          </label>
          <input
            type="text"
            value={formData.total || ''}
            readOnly
            className="w-full px-3 py-2 text-sm rounded border opacity-60"
            style={inputStyles}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyles}>
              Дата списания
            </label>
            <input
              type="text"
              value={formData.withdraw_date || ''}
              readOnly
              className="w-full px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>
          <div>
          <label className="text-sm font-medium mb-1 flex items-center gap-2" style={labelStyles}>
              Дата окончания
            {calculating && <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--accent-primary)' }} />}
          </label>
            <input
              type="text"
              value={formData.end_date || ''}
              readOnly
              className="w-full px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
