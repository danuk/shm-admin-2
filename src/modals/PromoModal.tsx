import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Save, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import UserSelect from '../components/UserSelect';
import TemplateSelect from '../components/TemplateSelect';
import JsonEditor from '../components/JsonEditor';

interface PromoModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  onSave: (data: Record<string, any>) => void | Promise<void>;
  onDelete?: (id: number) => void | Promise<void>;
}

export default function PromoModal({
  open,
  onClose,
  data,
  onSave,
  onDelete,
}: PromoModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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

  const handleSettingsChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
      toast.success('Промокод обновлён');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !formData.id) return;

    try {
      await onDelete(formData.id);
      setConfirmDeleteOpen(false);
      onClose();
      toast.success('Промокод удалён');
    } catch (error) {
      console.error('Ошибка удаления:', error);
      toast.error('Ошибка удаления');
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

  const isReusable = formData.settings?.reusable === 1;
  const isUsed = !!formData.used_by;
  const canEdit = !isUsed;
  const canEditQuantity = isReusable && !isUsed;

  const renderFooter = () => (
    <div className="flex justify-between items-center w-full">
      <div>
        {onDelete && !isUsed && (
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            className="px-4 py-2 rounded flex items-center gap-2 btn-danger"
            style={{
              backgroundColor: 'var(--theme-button-danger-bg)',
              color: 'var(--theme-button-danger-text)',
              border: '1px solid var(--theme-button-danger-border)',
            }}
          >
            <Trash2 className="w-4 h-4" />
            Удалить
          </button>
        )}
      </div>
      <div className="flex gap-2">
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
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 btn-success"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-text)',
            }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Промокод #${data?.id || ''}`}
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-4">
        {/* ID */}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Промокод
          </label>
          <input
            type="text"
            value={formData.id || ''}
            readOnly
            className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
            style={inputStyles}
          />
        </div>

        {/* Тип */}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Тип
          </label>
          <select
            value={formData.settings?.reusable}
            onChange={(e) => handleSettingsChange('reusable', Number(e.target.value))}
            disabled
            className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
            style={inputStyles}
          >
            <option value={0}>Одноразовый</option>
            <option value={1}>Многоразовый</option>
          </select>
        </div>

        {/* Статус */}
        {canEdit && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Статус
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.settings?.status === 1}
                onChange={(e) => handleSettingsChange('status', e.target.checked ? 1 : 0)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm" style={{ color: 'var(--theme-content-text)' }}>
                Активен
              </span>
            </label>
          </div>
        )}

        {/* Количество использований (для многоразовых) */}
        {isReusable && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Кол-во исп.
            </label>
            <input
              type="number"
              value={formData.settings?.quantity || ''}
              onChange={(e) => handleSettingsChange('quantity', Number(e.target.value))}
              min="1"
              max="1000"
              readOnly={!canEditQuantity}
              className={`flex-1 px-3 py-2 text-sm rounded border ${!canEditQuantity ? 'opacity-60' : ''}`}
              style={inputStyles}
            />
          </div>
        )}

        {/* Дата истечения */}
        {canEdit && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Срок действия
            </label>
            <input
              type="datetime-local"
              value={formData.expire || ''}
              onChange={(e) => handleChange('expire', e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
        )}

        {/* Использован пользователем */}
        {isUsed && (
          <>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Использован
              </label>
              <div className="flex-1">
                <UserSelect
                  value={formData.used_by}
                  onChange={() => {}}
                  readonly
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Дата использования
              </label>
              <input
                type="text"
                value={formData.used || ''}
                readOnly
                className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
                style={inputStyles}
              />
            </div>
          </>
        )}

        {/* Шаблон */}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Шаблон
          </label>
          <TemplateSelect
            value={formData.template_id}
            readonly={true}
            className="flex-1"
          />
        </div>

        {/* Настройки (JSON) */}
        <div className="flex items-start gap-3">
          <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Настройки
          </label>
          <div className="flex-1">
            <div className="border rounded" style={{ borderColor: inputStyles.borderColor }}>
              <JsonEditor
                data={formData.settings || {}}
                onChange={(value) => handleChange('settings', value)}
                showInput={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Модалка подтверждения удаления */}
      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Удаление промокода"
        message={`Вы уверены, что хотите удалить промокод ${formData.id || ''}?`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
    </Modal>
  );
}
