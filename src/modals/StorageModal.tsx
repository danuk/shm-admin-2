import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { Download, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import UserSelect from '../components/UserSelect';
import ConfirmModal from '../components/ConfirmModal';
import JsonEditor from '../components/JsonEditor';
import { shm_request } from '../lib/shm_request';

interface StorageModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  onDelete?: (name: string) => void | Promise<void>;
}

export default function StorageModal({
  open,
  onClose,
  data,
  onDelete,
}: StorageModalProps) {
  const [viewData, setViewData] = useState<Record<string, any>>({});
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Загрузка данных при открытии
  useEffect(() => {
    if (open && data) {
      setLoading(true);
      setViewData({ ...data });

      // Определяем режим отображения по settings.json из списка
      const isJson = data.settings?.json === 1;
      setIsJsonMode(isJson);

      // Загружаем полные данные через API
      shm_request(`/shm/v1/storage/manage/${data.name}?user_id=${data.user_id}`)
      .then(res => {
          let actualData = res;

          if (typeof res === 'string' && res.startsWith('{')) {
            try {
              actualData = JSON.parse(res);
            } catch (e) {
              actualData = res;
            }
          }

          const fullData = { ...data, data: actualData };
          setViewData(fullData);
      })
        .catch((error) => {
          console.error('Ошибка загрузки данных:', error);
          toast.error('Ошибка загрузки данных');
          setViewData({ ...data, data: null });
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!open) {
      setViewData({});
      setIsJsonMode(false);
    }
  }, [data, open]);

  const handleDownload = () => {
    if (!viewData.data) return;

    try {
      const content = isJsonMode
        ? JSON.stringify(viewData.data, null, 2)
        : String(viewData.data);

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${viewData.name || 'storage'}.${isJsonMode ? 'json' : 'conf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Файл скачан');
    } catch (error) {
      console.error('Ошибка скачивания:', error);
      toast.error('Ошибка скачивания');
    }
  };

  const handleSave = async () => {
    if (!viewData.name || !viewData.user_id) return;

    setSaving(true);
    try {
      await shm_request('/shm/v1/admin/storage/manage', {
        method: 'POST',
        body: JSON.stringify({
          name: viewData.name,
          user_id: viewData.user_id,
          data: viewData.data,
        }),
      });
      toast.success('Данные сохранены');
      onClose();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !viewData.name) return;

    setDeleting(true);
    try {
      await onDelete(viewData.name);
      setConfirmDeleteOpen(false);
      onClose();
      toast.success('Запись удалена');
    } catch (error) {
      console.error('Ошибка удаления:', error);
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
    <div className="flex justify-between items-center w-full">
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          className="px-4 py-2 rounded flex items-center gap-2 btn-primary"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)',
          }}
        >
          <Download className="w-4 h-4" />
          Скачать
        </button>
        {onDelete && (
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
          Закрыть
        </button>
        {isJsonMode && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 btn-success"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-text)',
            }}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Просмотр хранилища: ${viewData.name || ''}`}
        footer={renderFooter()}
        size="xl"
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
              Загрузка данных...
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          {/* Пользователь */}
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Пользователь
            </label>
            <div className="flex-1">
              <UserSelect
                value={viewData.user_id}
                onChange={() => {}}
                readonly
              />
            </div>
          </div>

          {/* Название */}
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Название
            </label>
            <input
              type="text"
              value={viewData.name || ''}
              readOnly
              className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>

          {/* Данные */}
          <div className="flex items-start gap-3">
            <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
              Данные
            </label>
            <div className="flex-1">
              {isJsonMode ? (
                <JsonEditor
                data={viewData.data || {}}
                onChange={(newData) => setViewData(prev => ({ ...prev, data: newData }))}
                inline
                />
              ) : (
                <textarea
                  value={
                    viewData.data
                      ? (typeof viewData.data === 'string'
                          ? viewData.data
                          : JSON.stringify(viewData.data, null, 2))
                      : ''
                  }
                  readOnly
                  rows={10}
                  className="w-full px-3 py-2 text-sm rounded border resize-none opacity-60"
                  style={inputStyles}
                />
              )}
            </div>
          </div>
        </div>
        )}
      </Modal>

      {/* Модалка подтверждения удаления */}
      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Удалить запись?"
        message={`Вы уверены, что хотите удалить запись "${viewData.name}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
        confirmWord="delete"
        confirmWordHint='Введите "delete" для подтверждения'
      />
    </>
  );
}
