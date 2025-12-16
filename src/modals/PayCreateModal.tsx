import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import UserSelect from '../components/UserSelect';
import { useSelectedUserStore } from '../store/selectedUserStore';

interface PayCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void | Promise<void>;
}

export default function PayCreateModal({
  open,
  onClose,
  onSave,
}: PayCreateModalProps) {
  const { selectedUser } = useSelectedUserStore();
  const [formData, setFormData] = useState<Record<string, any>>({
    user_id: null,
    pay_system_id: '',
    money: null,
    comment: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        user_id: selectedUser?.user_id || null,
        pay_system_id: '',
        money: null,
        comment: '',
      });
    }
  }, [open, selectedUser]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.user_id) {
      toast.error('Выберите пользователя');
      return;
    }
    if (!formData.pay_system_id) {
      toast.error('Выберите платёжную систему');
      return;
    }
    if (!formData.money || Number(formData.money) <= 0) {
      toast.error('Введите сумму платежа');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        ...formData,
        money: Number(formData.money),
      };
      if (!formData.comment?.text?.trim()) {
        delete payload.comment;
      }
      
      await onSave(payload);
      onClose();
      toast.success('Платёж создан');
    } catch (error) {
      toast.error('Ошибка создания платежа');
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
        className="px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 btn-success"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--accent-text)',
        }}
      >
        <Plus className="w-4 h-4" />
        {saving ? 'Начисление...' : 'Начислить'}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Начисление платежа"
      footer={renderFooter()}
      size="md"
    >
      <div className="space-y-4">
        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Пользователь *
          </label>
          <div className="flex-1">
            <UserSelect
              value={formData.user_id}
              onChange={(value) => handleChange('user_id', value)}
            />
          </div>
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Платёжная система *
          </label>
          <select
            value={formData.pay_system_id}
            onChange={(e) => handleChange('pay_system_id', e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          >
            <option value="">Выберите систему</option>
            <option value="manual">manual</option>
          </select>
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Сумма *
          </label>
          <input
            type="number"
            value={formData.money}
            onChange={(e) => handleChange('money', e.target.value)}
            step="0.01"
            min="0"
            placeholder="0.00"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        {}
        <div className="flex items-start gap-3">
          <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Комментарий
          </label>
          <textarea
            value={formData.comment?.text || ''}
            onChange={(e) => handleChange('comment', { text: e.target.value })}
            rows={4}
            placeholder="Комментарий к платежу"
            className="flex-1 px-3 py-2 text-sm rounded border resize-none"
            style={inputStyles}
          />
        </div>
      </div>
    </Modal>
  );
}
