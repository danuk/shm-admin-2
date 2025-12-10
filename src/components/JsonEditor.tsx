import React, { useState, useEffect, useRef } from 'react';
import { Settings, Copy, Check } from 'lucide-react';
import Modal from './Modal';
import JSONEditor from 'jsoneditor';
import 'jsoneditor/dist/jsoneditor.css';
import './jsoneditor-custom.css';

interface JsonEditorProps {
  data: any;
  onChange?: (data: any) => void;
  readonly?: boolean;
  label?: string;
  className?: string;
  showInput?: boolean;
  inline?: boolean;
}

export default function JsonEditor({ 
  data, 
  onChange, 
  readonly = false, 
  label, 
  className = '',
  showInput = true,
  inline = false,
}: JsonEditorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<JSONEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<any>(data);

  // Обновляем ref при изменении data
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Инициализация редактора при открытии модалки или inline режиме
  useEffect(() => {
    const shouldInitialize = inline || modalOpen;
    
    if (shouldInitialize && containerRef.current && !editorRef.current) {
      try {
        const options: any = {
          mode: readonly ? 'view' : 'tree',
          modes: readonly ? ['view'] : ['tree'],
          onChangeText: (jsonString: string) => {
            if (!readonly) {
              try {
                const parsedData = JSON.parse(jsonString);
                dataRef.current = parsedData;
                // Для inline режима вызываем onChange сразу
                if (inline && onChange) {
                  onChange(parsedData);
                }
              } catch (e) {
                // Игнорируем ошибки парсинга во время редактирования
              }
            }
          },
          navigationBar: false,
          statusBar: !readonly,
        };

        editorRef.current = new JSONEditor(containerRef.current, options);
        editorRef.current.set(dataRef.current || {});
        
        // Добавляем класс для скрытия ненужных кнопок
        if (containerRef.current) {
          containerRef.current.classList.add('jsoneditor-hide-sort-transform');
        }
      } catch (e) {
        console.error('Failed to initialize JSON editor:', e);
      }
    }

    // Cleanup при закрытии модалки (но не для inline режима)
    return () => {
      if (!inline && !modalOpen && editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [modalOpen, readonly, inline]);

  const handleOpen = () => {
    dataRef.current = data;
    setModalOpen(true);
  };

  const handleSave = () => {
    if (onChange && editorRef.current) {
      try {
        const jsonData = editorRef.current.get();
        onChange(jsonData);
      } catch (e) {
        console.error('Failed to get JSON data:', e);
        return;
      }
    }
    setModalOpen(false);
  };

  const handleCopy = async () => {
    try {
      if (editorRef.current) {
        const jsonData = editorRef.current.get();
        const text = JSON.stringify(jsonData, null, 2);
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const getPreview = () => {
    if (data === null || data === undefined) return '';
    try {
      const str = JSON.stringify(data);
      return str.length > 50 ? str.slice(0, 50) + '...' : str;
    } catch {
      return '[Object]';
    }
  };

  // Если inline режим, показываем только редактор
  if (inline) {
    return (
      <div className={className} style={{ width: '100%' }}>
        <div 
          ref={containerRef} 
          className="jsoneditor-react-container"
          style={{ height: '400px', width: '100%' }}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      {showInput && (
        <input
          type="text"
          value={getPreview()}
          readOnly
          className="flex-1 px-3 py-2 text-sm rounded border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-muted)',
          }}
        />
      )}
      <button
        type="button"
        onClick={handleOpen}
        className="p-2 rounded border hover:opacity-80 transition-opacity"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
        title={readonly ? 'Просмотр JSON' : 'Редактировать JSON'}
      >
        <Settings className="w-5 h-5" />
      </button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={readonly ? 'Просмотр JSON' : 'JSON редактор'}
        size="xl"
        footer={
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 rounded border flex items-center gap-2 btn-primary"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                {readonly ? 'Закрыть' : 'Отмена'}
              </button>
              {!readonly && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded text-white btn-success"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  Сохранить
                </button>
              )}
            </div>
          </div>
        }
      >
        {readonly && (
          <div 
            className="mb-3 px-3 py-1.5 text-xs rounded inline-block"
            style={{ 
              backgroundColor: 'var(--warning-bg, #fef3c7)', 
              color: 'var(--warning-text, #92400e)' 
            }}
          >
            Только чтение
          </div>
        )}
        
        <div 
          ref={containerRef} 
          className="jsoneditor-react-container"
          style={{ height: '500px', width: '100%' }}
        />
      </Modal>
    </div>
  );
}
