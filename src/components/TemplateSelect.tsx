import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Edit, Search, List, Plus } from 'lucide-react';
import { shm_request } from '../lib/shm_request';
import TemplateModal from '../modals/TemplateModal';
import TemplateCreateModal from '../modals/TemplateCreateModal';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  settings?: any;
  data?: string;
  [key: string]: any;
}

interface TemplateSelectProps {
  value?: string | null;
  onChange?: (templateId: string | null, template: Template | null) => void;
  onLoadingChange?: (loading: boolean) => void;
  onTemplateUpdated?: () => void;
  readonly?: boolean;
  placeholder?: string;
  className?: string;
}

export default function TemplateSelect({
  value,
  onChange,
  onLoadingChange,
  onTemplateUpdated,
  readonly = false,
  className = '',
}: TemplateSelectProps) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Template[]>([]);
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'search' | 'list'>('list');
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoadedTemplateIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const formatTemplate = (template: Template) => {
    return template.id;
  };

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (value && lastLoadedTemplateIdRef.current !== value) {
      lastLoadedTemplateIdRef.current = value;
      abortControllerRef.current = new AbortController();
      setLoadingTemplate(true);

      shm_request(`shm/v1/admin/template?id=${value}`)
        .then(res => {
          const data = res.data || res;
          const templates = Array.isArray(data) ? data : [];
          if (templates.length > 0) {
            setSelectedTemplate(templates[0]);
            setSearch(formatTemplate(templates[0]));
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
          }
        })
        .finally(() => setLoadingTemplate(false));
    } else if (!value) {
      lastLoadedTemplateIdRef.current = null;
      setSelectedTemplate(null);
      setSearch('');
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [value]);

  useEffect(() => {
    if (viewMode === 'list' && allTemplates.length === 0) {
      setLoading(true);
      shm_request('shm/v1/admin/template?limit=0')
        .then(res => {
          const data = res.data || res;
          const templates = Array.isArray(data) ? data : [];
          const sortedTemplates = templates.sort((a, b) =>
            String(a.id || '').localeCompare(String(b.id || ''), undefined, { sensitivity: 'base' })
          );
          setAllTemplates(sortedTemplates);
          setItems(sortedTemplates);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [viewMode, allTemplates.length]);

  const searchTemplates = useCallback((query: string) => {
    if (!query.trim()) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    onLoadingChange?.(true);

    const filter = { 'id': { '-like': `%${query}%` } };

    shm_request(`shm/v1/admin/template?filter=${encodeURIComponent(JSON.stringify(filter))}`)
      .then(res => {
        const data = res.data || res;
        const templates = Array.isArray(data) ? data : [];
        const sortedTemplates = templates.sort((a, b) =>
          String(a.id || '').localeCompare(String(b.id || ''), undefined, { sensitivity: 'base' })
        );
        setItems(sortedTemplates);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        onLoadingChange?.(false);
      });
  }, [onLoadingChange]);

  useEffect(() => {
    if (viewMode === 'search') {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (search.trim().length > 0) {
        searchTimeoutRef.current = setTimeout(() => {
          searchTemplates(search);
        }, 300);
      } else {
        setItems([]);
      }

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }
  }, [search, searchTemplates, viewMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (inputRef.current && dropdownVisible) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    if (dropdownVisible) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [dropdownVisible]);

  const selectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setSearch(formatTemplate(template));
    setDropdownVisible(false);
    onChange?.(template.id, template);
  };

  const clearSelection = () => {
    setSelectedTemplate(null);
    setSearch('');
    onChange?.(null, null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!dropdownVisible || items.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          selectTemplate(items[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setDropdownVisible(false);
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    if (!dropdownVisible) {
      setDropdownVisible(true);
    }
    setSelectedIndex(-1);

    if (!newValue.trim()) {
      clearSelection();
    }
  };

  const handleInputFocus = () => {
    setDropdownVisible(true);
  };

  const handleEdit = () => {
    if (selectedTemplate) {
      setTemplateModalOpen(true);
    }
  };

  const handleSave = async (templateData: Record<string, any>) => {
    try {
      const method = templateData.is_add ? 'PUT' : 'POST';
      await shm_request('shm/v1/admin/template', {
        method,
        body: JSON.stringify(templateData),
      });

      if (templateData.id === selectedTemplate?.id && selectedTemplate) {
        setSelectedTemplate({
          ...selectedTemplate,
          ...templateData,
          id: templateData.id || selectedTemplate.id,
        });
      }

      onTemplateUpdated?.();
    } catch (error) {
      throw error;
    }
  };

  const handleCreate = async (templateData: Record<string, any>) => {
    try {
      await shm_request('shm/v1/admin/template', {
        method: 'PUT',
        body: JSON.stringify(templateData),
      });

      toast.success('Шаблон создан');

      // Обновляем список шаблонов если в режиме списка
      if (viewMode === 'list') {
        const res = await shm_request('shm/v1/admin/template?limit=0');
        const data = res.data || res;
        const templates = Array.isArray(data) ? data : [];
        const sortedTemplates = templates.sort((a, b) =>
          String(a.id || '').localeCompare(String(b.id || ''), undefined, { sensitivity: 'base' })
        );
        setAllTemplates(sortedTemplates);
        setItems(sortedTemplates);
      }

      // Устанавливаем созданный шаблон как выбранный
      const newTemplate: Template = {
        id: templateData.id,
        settings: templateData.settings,
        data: templateData.data,
      };
      setSelectedTemplate(newTemplate);
      setSearch(formatTemplate(newTemplate));
      onChange?.(templateData.id, newTemplate);

      setCreateModalOpen(false);
      onTemplateUpdated?.();
    } catch (error: any) {
      toast.error(error.data?.error || 'Ошибка создания шаблона');
      throw error;
    }
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  const dropdownStyles = {
    backgroundColor: 'var(--theme-card-bg)',
    border: '1px solid var(--theme-card-border)',
    color: 'var(--theme-content-text)',
  };

  if (readonly && selectedTemplate) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded border" style={inputStyles}>
          <FileText className="w-4 h-4" style={{ color: 'var(--theme-content-text-muted)' }} />
          <span>{formatTemplate(selectedTemplate)}</span>
        </div>
        <button
          onClick={handleEdit}
          className="p-2 rounded hover:bg-opacity-80 transition-colors shrink-0"
          style={{
            backgroundColor: 'var(--theme-button-secondary-bg)',
            color: 'var(--theme-button-secondary-text)',
            border: '1px solid var(--theme-button-secondary-border)',
          }}
          title="Редактировать шаблон"
        >
          <Edit className="w-4 h-4" />
        </button>

        <TemplateModal
          open={templateModalOpen}
          onClose={() => setTemplateModalOpen(false)}
          data={selectedTemplate}
          onSave={handleSave}
        />
      </div>
    );
  }

  if (readonly) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-2 px-3 py-2 rounded border" style={inputStyles}>
          <FileText className="w-4 h-4" style={{ color: 'var(--theme-content-text-muted)' }} />
          <span>{value || '—'}</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const newMode = viewMode === 'search' ? 'list' : 'search';
            setViewMode(newMode);
            if (newMode === 'list') {
              setItems(allTemplates);
              setDropdownVisible(true);
            } else {
              setDropdownVisible(false);
              setItems([]);
            }
          }}
          className="p-2 rounded transition-colors"
          style={{
            backgroundColor: 'var(--theme-button-secondary-bg)',
            color: 'var(--theme-button-secondary-text)',
            border: '1px solid var(--theme-button-secondary-border)',
          }}
          title={viewMode === 'search' ? 'Переключить на список' : 'Переключить на поиск'}
        >
          {viewMode === 'search' ? (
            <Search className="w-4 h-4" />
          ) : (
            <List className="w-4 h-4" />
          )}
        </button>

        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <FileText className="w-4 h-4" style={{ color: 'var(--theme-content-text-muted)' }} />
          </div>

          {loadingTemplate ? (
            <div
              className="w-full pl-10 pr-3 py-2 text-sm rounded border"
              style={inputStyles}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-4 rounded animate-pulse flex-1"
                  style={{
                    maxWidth: '100px',
                    backgroundColor: 'var(--theme-input-border)',
                  }}
                />
              </div>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder={viewMode === 'search' ? '... начните вводить ID шаблона' : 'Выберите шаблон'}
              className="w-full pl-10 pr-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          )}

          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>
          )}

          {dropdownVisible && items.length > 0 && dropdownPosition && (
            <div
              className="fixed z-[9999] rounded shadow-lg max-h-60 overflow-y-auto"
              style={{
                ...dropdownStyles,
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
              }}
            >
              {items.map((template, index) => (
                <div
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className={`px-4 py-2 cursor-pointer transition-colors ${
                    index === selectedIndex ? 'bg-opacity-80' : ''
                  }`}
                  style={{
                    backgroundColor: index === selectedIndex ? 'var(--theme-hover-bg)' : 'transparent',
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-content-text-muted)' }} />
                    <span className="text-sm font-medium">{template.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedTemplate && (
          <button
            onClick={handleEdit}
            className="p-2 rounded hover:bg-opacity-80 transition-colors shrink-0"
            style={{
              backgroundColor: 'var(--theme-button-secondary-bg)',
              color: 'var(--theme-button-secondary-text)',
              border: '1px solid var(--theme-button-secondary-border)',
            }}
            title="Редактировать шаблон"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setCreateModalOpen(true)}
          className="p-2 rounded transition-colors"
          style={{
            backgroundColor: 'var(--theme-button-secondary-bg)',
            color: 'var(--theme-button-secondary-text)',
            border: '1px solid var(--theme-button-secondary-border)',
          }}
          title="Создать новый шаблон"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <TemplateModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        data={selectedTemplate}
        onSave={handleSave}
      />
      <TemplateCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreate}
      />
    </div>
  );
}
