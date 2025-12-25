import React, { useState, useEffect } from 'react';
import { FileText, Search, Loader2, Plus } from 'lucide-react';
import { shm_request } from '../../lib/shm_request';

interface Template {
  id: string;
  data?: string;
  settings?: any;
  is_add?: number;
  [key: string]: any;
}

interface TemplateSidebarProps {
  activeTemplateId?: string;
  onTemplateSelect: (template: Template) => void;
  onNewTemplate: () => void;
}

export default function TemplateSidebar({
  activeTemplateId,
  onTemplateSelect,
  onNewTemplate,
}: TemplateSidebarProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTemplates();
    
    // Обработчик события удаления шаблона
    const handleTemplateDeleted = (event: any) => {
      const deletedId = event.detail?.id;
      if (deletedId) {
        setTemplates(prev => prev.filter(t => t.id !== deletedId));
      }
    };

    const handleTemplateSaved = (event: any) => {
      const savedTemplate = event.detail?.template;
      if (!savedTemplate?.id) {
        return;
      }

      setTemplates(prev => {
        const existingIndex = prev.findIndex(t => t.id === savedTemplate.id);
        if (existingIndex !== -1) {
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], ...savedTemplate };
          return next;
        }
        return [savedTemplate, ...prev];
      });
    };

    window.addEventListener('templateDeleted', handleTemplateDeleted);
    window.addEventListener('templateSaved', handleTemplateSaved);
    return () => {
      window.removeEventListener('templateDeleted', handleTemplateDeleted);
      window.removeEventListener('templateSaved', handleTemplateSaved);
    };
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await shm_request('/shm/v1/admin/template?limit=0');
      const data = res.data || res;
      const templateList = Array.isArray(data) ? data : [];
      setTemplates(templateList);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter((template) =>
    template.id.toLowerCase().includes(search.toLowerCase())
  );
  const sortedTemplates = [...filteredTemplates].sort((a, b) =>
    String(a.id).localeCompare(String(b.id), undefined, { sensitivity: 'variant' })
  );

  const handleTemplateClick = (template: Template) => {
    onTemplateSelect(template);
  };

  const handleCreateNew = () => {
    onNewTemplate();
  };

  return (
    <div
      className="w-64 h-full border-r flex flex-col"
      style={{
        backgroundColor: 'var(--theme-sidebar-bg)',
        borderColor: 'var(--theme-content-border)',
      }}
    >
      {}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--theme-content-border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--theme-content-text)' }}>
          Шаблоны
        </h3>
        <button
          onClick={handleCreateNew}
          className="p-1 rounded hover:bg-opacity-80 transition-colors"
          style={{
            backgroundColor: 'var(--theme-button-secondary-bg)',
            color: 'var(--theme-button-secondary-text)',
          }}
          title="Создать новый шаблон"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {}
      <div className="px-3 py-2">
        <div className="relative">
          <Search
            className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--theme-content-text-muted)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded border"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-input-border)',
              color: 'var(--theme-input-text)',
            }}
          />
        </div>
      </div>

      {}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--theme-content-text-muted)' }} />
          </div>
        ) : (
          <div className="py-1">
            {sortedTemplates.map((template) => {
              const isActive = activeTemplateId === template.id;

              return (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                    isActive ? 'font-medium' : ''
                  }`}
                  style={{
                    backgroundColor: isActive
                      ? 'var(--theme-hover-bg)'
                      : 'transparent',
                    color: isActive
                      ? 'var(--theme-content-text)'
                      : 'var(--theme-content-text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--theme-hover-bg-light)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{template.id}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
