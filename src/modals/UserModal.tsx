import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Save, Trash2, X, Key, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import JsonEditor from '../components/JsonEditor';
import PayCreateModal from './PayCreateModal';
import BonusCreateModal from './BonusCreateModal';
import { shm_request } from '../lib/shm_request';

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  onSave: (data: Record<string, any>) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onChangePassword?: () => void;
  onRefresh?: () => void | Promise<void>;
}

export default function UserModal({
  open,
  onClose,
  data,
  onSave,
  onDelete,
  onChangePassword,
  onRefresh,
}: UserModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [bonusModalOpen, setBonusModalOpen] = useState(false);

  useEffect(() => {
    if (open && data) {
      setFormData({ ...data });
    } else if (!open) {
      setFormData({});
    }
  }, [data, open]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.login?.trim()) {
      toast.error('Введите логин');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    
    setDeleting(true);
    setConfirmDelete(false);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      toast.error('Ошибка удаления');
    } finally {
      setDeleting(false);
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
    <div className="flex justify-between w-full">
      <div>
        {onDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 rounded flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Удаление...' : 'Удалить'}
          </button>
        )}
      </div>
      <div className="flex gap-2">
        {onChangePassword && (
          <button
            onClick={onChangePassword}
            className="px-4 py-2 rounded flex items-center gap-2"
            style={{
              backgroundColor: 'var(--theme-button-secondary-bg)',
              color: 'var(--theme-button-secondary-text)',
              border: '1px solid var(--theme-button-secondary-border)',
            }}
          >
            <Key className="w-4 h-4" />
            Сменить пароль
          </button>
        )}

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
          className="px-4 py-2 rounded flex items-center gap-2 btn-success"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)',
          }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Редактирование пользователя с UID: ${data?.user_id || ''}`}
      footer={renderFooter()}
      size="xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
              ID
            </label>
            <input
              type="text"
              value={formData.user_id || ''}
              disabled
              className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
              style={inputStyles}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
              Логин <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.login || ''}
              onChange={(e) => handleChange('login', e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
              Telegram Логин
            </label>
            <input
              type="text"
              value={formData.settings?.telegram?.username || formData.settings?.telegram?.login || ''}
              disabled
              className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
              Полное имя
            </label>
            <input
              type="text"
              value={formData.full_name || ''}
              onChange={(e) => handleChange('full_name', e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
              Телефон
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
               Дата создания
            </label>
            <input
              type="text"
              disabled
              value={formData.created || ''}
              className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
              style={inputStyles}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
              Последний вход
            </label>
            <input
              type="text"
              disabled
              value={formData.last_login || ''}
              className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
              style={inputStyles}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
              Баланс
            </label>
            <input
              type="text"
              value={formData.balance ?? ''}
              disabled
              className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
              style={inputStyles}
            />
            <button
              onClick={() => setPayModalOpen(true)}
              className="p-2 rounded hover:opacity-80 transition-opacity shrink-0 btn-success"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-text)',
              }}
              title="Начислить платеж"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
              Бонусы
            </label>
            <input
              type="text"
              value={formData.bonus ?? ''}
              disabled
              className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
              style={inputStyles}
            />
            <button
              onClick={() => setBonusModalOpen(true)}
              className="p-2 rounded hover:opacity-80 transition-opacity shrink-0 btn-success"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-text)',
              }}
              title="Начислить бонус"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
              Кредит
            </label>
            <input
              type="number"
              value={formData.credit ?? ''}
              onChange={(e) => handleChange('credit', e.target.value ? Number(e.target.value) : null)}
              disabled={!!formData.can_overdraft}
              className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
              style={inputStyles}
            />
            <label className="flex items-center gap-2 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.can_overdraft}
                onChange={(e) => handleChange('can_overdraft', e.target.checked ? 1 : 0)}
                className="w-4 h-4 rounded"
              />
              <span className="text-xs whitespace-nowrap" style={labelStyles}>Безлимит</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
              Скидка %
            </label>
            <input
              type="number"
              value={formData.discount ?? ''}
              onChange={(e) => handleChange('discount', e.target.value ? Number(e.target.value) : null)}
              min={0}
              max={100}
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
              Заблокирован
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.block}
                onChange={(e) => handleChange('block', e.target.checked ? 1 : 0)}
                className="w-4 h-4 rounded"
              />
              {formData.block ? (
                <span className="text-red-500 text-sm font-medium">Да</span>
              ) : (
                <span className="text-green-500 text-sm font-medium">Нет</span>
              )}
            </label>
          </div>
        </div>

        <div className="pt-2">
          <label className="text-sm font-medium" style={labelStyles}>
            Settings
          </label>
          <div className="mt-2">
            <JsonEditor
              data={formData.settings ?? {}}
              onChange={(newData) => handleChange('settings', newData)}
              showInput={true}
            />
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление пользователя"
        message={`Вы уверены, что хотите удалить пользователя "${formData.login}"? Это действие необратимо.`}
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
        confirmWord="delete"
        confirmWordHint="Введите «delete» для подтверждения удаления:"
      />

      <PayCreateModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onSave={async (payData) => {
          const dataWithUser = { ...payData, user_id: formData.user_id };
          await shm_request('/shm/v1/admin/user/pay', {
            method: 'PUT',
            body: JSON.stringify(dataWithUser),
          });
          
          setPayModalOpen(false);
          
          // Обновляем данные в родительском компоненте
          if (onRefresh) {
            await onRefresh();
          }
        }}
      />

      <BonusCreateModal
        open={bonusModalOpen}
        onClose={() => setBonusModalOpen(false)}
        onSave={async (bonusData) => {
          const dataWithUser = { ...bonusData, user_id: formData.user_id };
          await shm_request('/shm/v1/admin/user/bonus', {
            method: 'PUT',
            body: JSON.stringify(dataWithUser),
          });
          
          setBonusModalOpen(false);
          
          // Обновляем данные в родительском компоненте
          if (onRefresh) {
            await onRefresh();
          }
        }}
      />
    </Modal>
  );
}
