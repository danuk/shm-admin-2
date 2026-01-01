import { useState } from 'react';
import Modal from '../components/Modal';
import { X, Upload, FileText } from 'lucide-react';
import JsonEditor from '../components/JsonEditor';
import toast from 'react-hot-toast';

interface TemplateUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export function TemplateUploadModal({ open, onClose, onSave }: TemplateUploadModalProps) {
  const [id, setId] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [fileType, setFileType] = useState('');
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);
    setFileSize(file.size);
    setFileType(file.type || 'неизвестен');

    // Автоматически генерируем ID из имени файла
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    const generatedId = fileNameWithoutExt.replace(/[^A-Za-z0-9-_]/g, '_');
    setId(generatedId);

    // Читаем содержимое файла
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!id || !fileContent) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        id,
        is_add: 1,
        data: fileContent,
        settings: settings,
      });

      toast.success('Шаблон загружен');
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка при сохранении шаблона');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setId('');
    setFileContent('');
    setFileName('');
    setFileSize(0);
    setFileType('');
    setSettings({});
    onClose();
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
      <button
        onClick={handleClose}
        className="p-2 rounded flex items-center gap-2"
        style={{
          backgroundColor: 'var(--theme-button-secondary-bg)',
          color: 'var(--theme-button-secondary-text)',
          border: '1px solid var(--theme-button-secondary-border)',
        }}
        disabled={loading}
        title="Отмена"
      >
        <X className="w-4 h-4" />
        <span className="hidden sm:inline">Отмена</span>
      </button>
      <button
        onClick={handleSave}
        disabled={!id || !fileContent || loading}
        className="p-2 rounded flex items-center gap-2 btn-success"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--accent-text)',
        }}
        title="Загрузить"
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">{loading ? 'Загрузка...' : 'Загрузить'}</span>
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Загрузка шаблона из файла"
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-4">
        {/* ID шаблона */}
        <div className="flex items-center gap-4">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            ID шаблона <span className="text-red-500">*</span>
          </label>
          <div className="flex-1">
            <input
              type="text"
              className="w-full px-3 py-2 text-sm rounded border"
              style={inputStyles}
              value={id}
              onChange={(e) => setId(e.target.value.replace(/[^A-Za-z0-9_/-]/g, ''))}
              placeholder=""
              pattern="[A-Za-z0-9_/-]+"
              maxLength={32}
              required
            />
            <small className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
              Только буквы, цифры, дефис, подчеркивание и слэш
            </small>
          </div>
        </div>

        {/* Выбор файла */}
        <div className="flex items-center gap-4">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Выберите файл <span className="text-red-500">*</span>
          </label>
          <div className="flex-1">
            <input
              type="file"
              className="block w-full text-sm rounded-lg cursor-pointer border"
              style={inputStyles}
              accept=".txt,.json,.html,.js,.css,.sh,.pl,.py,.tpl,.tt"
              onChange={handleFileSelect}
            />
            <small className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
              Поддерживаемые форматы: .txt, .json, .html, .js, .css, .sh, .pl, .py, .tpl, .tt
            </small>
          </div>
        </div>

        {/* Информация о файле */}
        {fileName && (
          <div className="flex items-start gap-4">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Информация о файле
            </label>
            <div
              className="flex-1 p-3 rounded"
              style={{
                backgroundColor: 'var(--theme-card-header-bg)',
                border: '1px solid var(--theme-card-border)'
              }}
            >
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5" style={{ color: 'var(--theme-primary-color)' }} />
                <div className="space-y-1">
                  <div className="text-sm" style={{ color: 'var(--theme-content-text)' }}>
                    <strong>Имя файла:</strong> {fileName}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--theme-content-text)' }}>
                    <strong>Размер:</strong> {(fileSize / 1024).toFixed(2)} KB
                  </div>
                  <div className="text-sm" style={{ color: 'var(--theme-content-text)' }}>
                    <strong>Тип:</strong> {fileType}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="flex items-start gap-4">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Settings (JSON)
          </label>
          <div className="flex-1">
            <JsonEditor
              data={settings}
              onChange={(newData) => setSettings(newData)}
            />
            <small className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
              Дополнительные настройки в формате JSON
            </small>
          </div>
        </div>
      </div>
    </Modal>
  );
}

