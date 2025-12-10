import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import UserSelect from '../components/UserSelect';
import ServiceSelect from '../components/ServiceSelect';

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

  // Синхронизация данных при открытии
  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    } else {
      setFormData({});
    }
  }, [data, open]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
      toast.success('Списание обновлено');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
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
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded flex items-center gap-2 btn-success disabled:opacity-50"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--accent-text)',
        }}
      >
        <Save className="w-4 h-4" />
        {saving ? 'Сохранение...' : 'Сохранить'}
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
        {/* Пользователь */}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Пользователь
          </label>
          <div className="flex-1">
            <UserSelect
              value={formData.user_id}
              onChange={(value) => handleChange('user_id', value)}
              readonly
            />
          </div>
        </div>

        {/* Услуга */}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Услуга
          </label>
          <div className="flex-1">
            <ServiceSelect
              value={formData.service_id} 
              readonly
            />
          </div>
        </div>

        {/* Цена и Количество */}
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Цена
            </label>
            <input
              type="number"
              value={formData.cost || ''}
              onChange={(e) => handleChange('cost', Number(e.target.value))}
              step="0.01"
              min="0"
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Количество
            </label>
            <input
              type="number"
              value={formData.qnt || ''}
              onChange={(e) => handleChange('qnt', Number(e.target.value))}
              step="1"
              min="1"
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
        </div>

        {/* Бонусы и Скидка */}
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Бонусы
            </label>
            <input
              type="number"
              value={formData.bonus || ''}
              onChange={(e) => handleChange('bonus', Number(e.target.value))}
              step="0.01"
              min="0"
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Скидка (%)
            </label>
            <input
              type="number"
              value={formData.discount || ''}
              onChange={(e) => handleChange('discount', Number(e.target.value))}
              step="1"
              min="0"
              max="100"
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
        </div>

        {/* Период */}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Период (мес.) 
          </label>
          <input
            type="number"
            value={formData.months || ''}
            onChange={(e) => handleChange('months', Number(e.target.value))}
            step="0.0001"
            min="0.0001"
            max="120"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
          <span className="text-xs" style={labelStyles}>M.DDHH (M - месяцы, DD - дни, HH - часы)</span>
        </div>

        {/* Итого */}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Итого
          </label>
          <input
            type="text"
            value={formData.total || ''}
            readOnly
            className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
            style={inputStyles}
          />
        </div>

        {/* Даты */}
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Дата списания
            </label>
            <input
              type="text"
              value={formData.withdraw_date || ''}
              readOnly
              className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Дата окончания
            </label>
            <input
              type="text"
              value={formData.end_date || ''}
              readOnly
              className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
