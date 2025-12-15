import React, { useState } from 'react';
import Modal from '../components/Modal';
import { Plus, X, Key, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { shm_request } from '../lib/shm_request';

interface IdentityCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void | Promise<void>;
}

export default function IdentityCreateModal({
  open,
  onClose,
  onSave,
}: IdentityCreateModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    private_key: '',
    public_key: '',
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateKey = async () => {
    if (!formData.name?.trim()) {
      toast.error('Введите имя ключа перед генерацией');
      return;
    }

    setGenerating(true);
    try {
      const res = await shm_request('/shm/v1/admin/server/identity/generate');
      const keyData = Array.isArray(res.data) ? res.data[0] : res.data;
      
      setFormData(prev => ({
        ...prev,
        private_key: keyData.private_key || '',
        public_key: keyData.public_key || '',
      }));
      
      toast.success('Ключи сгенерированы');
    } catch (error) {
      toast.error('Ошибка генерации ключей');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyPrivateKey = () => {
    if (!formData.private_key) {
      toast.error('Приватный ключ пуст');
      return;
    }

    navigator.clipboard.writeText(formData.private_key)
      .then(() => {
        toast.success('Приватный ключ скопирован');
      })
      .catch((err) => {
        toast.error('Ошибка копирования');
      });
  };

  const handleCopyPublicKey = () => {
    if (!formData.public_key) {
      toast.error('Публичный ключ пуст');
      return;
    }

    navigator.clipboard.writeText(formData.public_key)
      .then(() => {
        toast.success('Публичный ключ скопирован');
      })
      .catch((err) => {
        toast.error('Ошибка копирования');
      });
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Введите имя ключа');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
      setFormData({
        name: '',
        private_key: '',
        public_key: '',
      });
      toast.success('Ключ создан');
    } catch (error) {
      toast.error('Ошибка создания');
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
    <div className="flex justify-between w-full">
      <div>
        <button
          onClick={handleGenerateKey}
          disabled={generating}
          className="px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 btn-primary"
          style={{
            backgroundColor: 'var(--theme-button-secondary-bg)',
            color: 'var(--theme-button-secondary-text)',
            border: '1px solid var(--theme-button-secondary-border)',
          }}
        >
          <Key className="w-4 h-4" />
          {generating ? 'Генерация...' : 'Сгенерировать'}
        </button>
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
          {saving ? 'Создание...' : 'Создать'}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Создание ключа"
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-4">
        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Имя <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Имя ключа"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        {}
        <div className="flex items-start gap-3">
          <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Приватный ключ
          </label>
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              value={formData.private_key || ''}
              onChange={(e) => handleChange('private_key', e.target.value)}
              rows={6}
              placeholder="Приватный ключ"
              className="px-3 py-2 text-sm rounded border resize-none font-mono"
              style={inputStyles}
            />
            {formData.private_key && (
              <button
                onClick={handleCopyPrivateKey}
                className="self-end px-3 py-1.5 rounded flex items-center gap-2 text-sm"
                style={{
                  backgroundColor: 'var(--theme-button-secondary-bg)',
                  color: 'var(--theme-button-secondary-text)',
                  border: '1px solid var(--theme-button-secondary-border)',
                }}
              >
                <Copy className="w-4 h-4" />
                Скопировать
              </button>
            )}
          </div>
        </div>

        {}
        <div className="flex items-start gap-3">
          <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Публичный ключ
          </label>
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              value={formData.public_key || ''}
              onChange={(e) => handleChange('public_key', e.target.value)}
              rows={6}
              placeholder="Публичный ключ"
              className="px-3 py-2 text-sm rounded border resize-none font-mono"
              style={inputStyles}
            />
            {formData.public_key && (
              <button
                onClick={handleCopyPublicKey}
                className="self-end px-3 py-1.5 rounded flex items-center gap-2 text-sm"
                style={{
                  backgroundColor: 'var(--theme-button-secondary-bg)',
                  color: 'var(--theme-button-secondary-text)',
                  border: '1px solid var(--theme-button-secondary-border)',
                }}
              >
                <Copy className="w-4 h-4" />
                Скопировать
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
