import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { X } from 'lucide-react';
import UserSelect from '../components/UserSelect';
import JsonEditor from '../components/JsonEditor';

interface PayModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
}

export default function PayModal({
  open,
  onClose,
  data,
}: PayModalProps) {
  const [viewData, setViewData] = useState<Record<string, any>>({});

  // Синхронизация данных при открытии
  useEffect(() => {
    if (data) {
      setViewData({ ...data });
    } else {
      setViewData({});
    }
  }, [data, open]);

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
        Закрыть
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Просмотр платежа"
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
              value={viewData.user_id}
              onChange={() => {}}
              readonly
            />
          </div>
        </div>

        {/* Дата */}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Дата
          </label>
          <input
            type="text"
            value={viewData.date || ''}
            readOnly
            className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
            style={inputStyles}
          />
        </div>

        {/* Сумма и Платёжная система */}
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Сумма
            </label>
            <input
              type="text"
              value={viewData.money || ''}
              readOnly
              className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Плат. система
            </label>
            <input
              type="text"
              value={viewData.pay_system_id || ''}
              readOnly
              className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>
        </div>

        {/* Комментарий (JSON Editor readonly) */}
        <div className="flex items-start gap-3">
          <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Комментарий
          </label>
          <div className="flex-1">
            <JsonEditor
              data={viewData.comment || {}}
              onChange={() => {}}
              readonly
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
