import React, { useState, useEffect, useRef } from 'react';
import Modal from '../components/Modal';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import JsonEditor from '../components/JsonEditor';
import { registerTTCompletion } from '../lib/ttMonaco';

interface TemplateCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void | Promise<void>;
}

export default function TemplateCreateModal({
  open,
  onClose,
  onSave,
}: TemplateCreateModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({
    id: '',
    data: '',
    settings: {},
    is_add: 1,
  });
  const [saving, setSaving] = useState(false);
  const [editorLanguage, setEditorLanguage] = useState('plaintext');
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      setFormData({
        id: '',
        data: '',
        settings: {},
        is_add: 1,
      });
      setEditorLanguage('plaintext');
    }
  }, [open]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditorChange = (value: string | undefined) => {
    handleChange('data', value || '');
  };

  const handleSave = async () => {
    if (!formData.id) {
      toast.error('Введите ID шаблона');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
      toast.success('Шаблон создан');
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
        disabled={saving || !formData.id}
        className="px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 btn-primary"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--accent-text)',
        }}
      >
        <Plus className="w-4 h-4" />
        {saving ? 'Создание...' : 'Создать'}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Создание шаблона"
      footer={renderFooter()}
      size="xl"
    >
      <div className="space-y-4">
        {}
        <div className="flex items-center gap-3">
          <label className="w-24 text-sm font-medium shrink-0" style={labelStyles}>
            ID *
          </label>
          <input
            type="text"
            value={formData.id}
            onChange={(e) => handleChange('id', e.target.value)}
            pattern="[A-Za-z0-9-_/]+"
            placeholder="template-id"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        {}
        <div className="flex items-center gap-2">
          <label className="w-24 text-sm font-medium shrink-0" style={labelStyles}>
            Язык
          </label>
          <div className="flex gap-1 flex-wrap">
            {['plaintext', 'json', 'html', 'shell', 'perl', 'javascript'].map(lang => (
              <button
                key={lang}
                onClick={() => setEditorLanguage(lang)}
                className={`px-3 py-1 text-xs rounded ${
                  editorLanguage === lang ? 'font-semibold' : ''
                }`}
                style={{
                  backgroundColor: editorLanguage === lang ? 'var(--accent-primary)' : 'var(--theme-button-secondary-bg)',
                  color: editorLanguage === lang ? 'var(--accent-text)' : 'var(--theme-button-secondary-text)',
                  border: `1px solid ${editorLanguage === lang ? 'var(--accent-primary)' : 'var(--theme-button-secondary-border)'}`,
                }}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="flex items-start gap-3">
          <label className="w-24 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Данные
          </label>
          <div className="flex-1 border rounded overflow-hidden" style={{ borderColor: inputStyles.borderColor }}>
            <Editor
              height="400px"
              language={editorLanguage}
              value={formData.data}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                fontSize: 14,
                tabSize: 2,
                insertSpaces: true,
                wordWrap: 'on',
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                lineNumbers: 'on',
                folding: true,
              }}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                registerTTCompletion(monaco);
              }}
            />
          </div>
        </div>

        {}
        <div className="flex items-start gap-3">
          <label className="w-24 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Settings
          </label>
          <div className="flex-1 border rounded" style={{ borderColor: inputStyles.borderColor }}>
            <JsonEditor
              data={formData.settings}
              onChange={(value) => handleChange('settings', value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
