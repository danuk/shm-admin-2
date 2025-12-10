import React, { useState } from 'react';
import Modal from '../components/Modal';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import ServerGroupSelect from '../components/ServerGroupSelect';
import TemplateSelect from '../components/TemplateSelect';
import IdentitiesSelect from '../components/IdentitiesSelect';
import JsonEditor from '../components/JsonEditor';

interface ServerCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void | Promise<void>;
}

export default function ServerCreateModal({
  open,
  onClose,
  onSave,
}: ServerCreateModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    enabled: 1,
    host: '',
    server_gid: undefined,
    settings: {
      max_services: 0,
    },
  });
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'template' | 'cmd'>('template');
  const [transport, setTransport] = useState<string>('');

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSettingsChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      settings: { ...prev.settings, [field]: value },
    }));
  };

  const handleSave = async () => {
    // Валидация
    if (!formData.name?.trim()) {
      toast.error('Введите имя сервера');
      return;
    }
    
    if (formData.server_gid === undefined || formData.server_gid === null) {
      toast.error('Выберите группу серверов');
      return;
    }
    
    if (transport !== 'local' && !formData.host?.trim()) {
      toast.error('Введите хост');
      return;
    }
    
    if (mode === 'template' && !formData.settings?.template_id) {
      toast.error('Выберите шаблон');
      return;
    }
    
    if (mode === 'cmd' && !formData.settings?.cmd?.trim()) {
      toast.error('Введите команду');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = { ...formData };
      
      // Очищаем ненужные поля в зависимости от режима
      if (mode !== 'cmd') {
        delete dataToSave.settings?.cmd;
      }
      if (mode !== 'template') {
        delete dataToSave.settings?.template_id;
      }
      
      await onSave(dataToSave);
      
      // Сброс формы
      setFormData({
        name: '',
        enabled: 1,
        host: '',
        server_gid: undefined,
        settings: {
          max_services: 0,
        },
      });
      setMode('template');
      setTransport('');
      
      onClose();
      toast.success('Сервер создан');
    } catch (error) {
      console.error('Ошибка создания сервера:', error);
      toast.error('Ошибка создания сервера');
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
        <Save className="w-4 h-4" />
        {saving ? 'Создание...' : 'Создать'}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Создание сервера"
      footer={renderFooter()}
      size="xl"
    >
      <div className="space-y-4">
        {/* Имя сервера */}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Имя сервера *
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Имя сервера"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        {/* Статус */}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Статус
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled === 1}
              onChange={(e) => handleChange('enabled', e.target.checked ? 1 : 0)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: formData.enabled ? '#22d3ee' : '#f87171' }}>
              {formData.enabled ? 'Включен' : 'Выключен'}
            </span>
          </label>
        </div>

        {/* Ограничение услуг */}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Огр. кол-ва услуг
          </label>
          <input
            type="number"
            value={formData.settings?.max_services || 0}
            onChange={(e) => handleSettingsChange('max_services', Number(e.target.value))}
            min="0"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        {/* Группа серверов */}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Группа *
          </label>
          <ServerGroupSelect
            value={formData.server_gid}
            onChange={(groupId, group) => {
              handleChange('server_gid', groupId);
              if (group) {
                handleChange('server', group);
                const newTransport = (group as any).transport || '';
                setTransport(newTransport);
                handleChange('transport', newTransport);
              }
            }}
            className="flex-1"
            showAddButton={true}
          />
        </div>

        {/* Транспорт */}
        {formData.server_gid ? (
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Транспорт
          </label>
          <input
            type="text"
            value={transport}
            readOnly
            className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
            style={inputStyles}
          />
        </div>
        ) : null }

        {/* Хост (не для local) */}
        {transport !== 'local' && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Хост *
            </label>
            <input
              type="text"
              value={formData.host || ''}
              onChange={(e) => handleChange('host', e.target.value)}
              placeholder=""
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
        )}

        {/* Mail настройки */}
        {transport === 'mail' && (
          <>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Пользователь
              </label>
              <input
                type="text"
                value={formData.settings?.user || ''}
                onChange={(e) => handleSettingsChange('user', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Пароль
              </label>
              <input
                type="password"
                value={formData.settings?.password || ''}
                onChange={(e) => handleSettingsChange('password', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Отправитель (FROM)
              </label>
              <input
                type="email"
                value={formData.settings?.from || ''}
                onChange={(e) => handleSettingsChange('from', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Скрытая Копия (Bcc)
              </label>
              <input
                type="email"
                value={formData.settings?.bcc || ''}
                onChange={(e) => handleSettingsChange('bcc', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
          </>
        )}

        {/* SSH ключ */}
        {transport === 'ssh' && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Ключ
            </label>
            <IdentitiesSelect
              value={formData.settings?.key_id}
              onChange={(keyId) => handleSettingsChange('key_id', keyId)}
              className="flex-1"
              showAddButton={true}
            />
          </div>
        )}

        {/* Использовать */}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Использовать *
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'template' | 'cmd')}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          >
            <option value="template">Шаблон</option>
            {transport === 'ssh' && <option value="cmd">Команду</option>}
          </select>
        </div>

        {/* Шаблон */}
        {mode === 'template' && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Шаблон *
            </label>
            <TemplateSelect
              value={formData.settings?.template_id}
              onChange={(id) => handleSettingsChange('template_id', id)}
              className="flex-1"
            />
          </div>
        )}

        {/* Команда */}
        {mode === 'cmd' && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Команда *
            </label>
            <input
              type="text"
              value={formData.settings?.cmd || ''}
              onChange={(e) => handleSettingsChange('cmd', e.target.value)}
              placeholder="shell command"
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
        )}

        {/* Settings (JSON) */}
        <div className="flex items-start gap-3">
          <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Настройки
          </label>
          <div className="flex-1">
            <JsonEditor
              data={formData.settings || {}}
              onChange={(newSettings) => handleChange('settings', newSettings)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
