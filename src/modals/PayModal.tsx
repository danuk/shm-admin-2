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
        className="p-2 rounded flex items-center gap-2"
        style={{
          backgroundColor: 'var(--theme-button-secondary-bg)',
          color: 'var(--theme-button-secondary-text)',
          border: '1px solid var(--theme-button-secondary-border)',
        }}
        title="Закрыть"
      >
        <X className="w-4 h-4" />
        <span className="hidden sm:inline">Закрыть</span>
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
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyles}>
            Пользователь
          </label>
          <UserSelect
            value={viewData.user_id}
            onChange={() => {}}
            readonly
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyles}>
            Дата
          </label>
          <input
            type="text"
            value={viewData.date || ''}
            readOnly
            className="w-full px-3 py-2 text-sm rounded border opacity-60"
            style={inputStyles}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyles}>
              Сумма
            </label>
            <input
              type="text"
              value={viewData.money || ''}
              readOnly
              className="w-full px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyles}>
              Плат. система
            </label>
            <input
              type="text"
              value={viewData.pay_system_id || ''}
              readOnly
              className="w-full px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyles}>
            Комментарий
          </label>
          <JsonEditor
            data={viewData.comment || {}}
            onChange={() => {}}
            readonly
          />
        </div>
      </div>
    </Modal>
  );
}
