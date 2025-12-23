import React, { useState, useEffect, useRef } from 'react';
import Modal from '../components/Modal';
import { Save, X, Trash2, Play, Maximize2, Minimize2, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import JsonEditor from '../components/JsonEditor';
import ConfirmModal from '../components/ConfirmModal';
import TemplateTestModal from './TemplateTestModal';
import { shm_request } from '../lib/shm_request';
import { useThemeStore } from '../store/themeStore';
import TemplateSidebar from '../components/TemplateEditor/TemplateSidebar';

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  onSave: (data: Record<string, any>) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
}

export default function TemplateModal({
  open,
  onClose,
  data,
  onSave,
  onDelete,
}: TemplateModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editorLanguage, setEditorLanguage] = useState('plaintext');
  const editorRef = useRef<any>(null);
  const { resolvedTheme } = useThemeStore();
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [tabs, setTabs] = useState<Array<{id: string, template: any, hasUnsavedChanges: boolean}>>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [confirmCloseTabOpen, setConfirmCloseTabOpen] = useState(false);
  const [tabToClose, setTabToClose] = useState<string | null>(null);

  useEffect(() => {
    const savedTabs = localStorage.getItem('templateEditorTabs');
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs);
        if (parsed.tabs && parsed.tabs.length > 0) {
          setTabs(parsed.tabs);
          setActiveTabId(parsed.activeTabId);
          setIsMinimized(true);
        }
      } catch (e) {
      }
    }
  }, []);

  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem('templateEditorTabs', JSON.stringify({ tabs, activeTabId }));
    } else {
      localStorage.removeItem('templateEditorTabs');
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    // Обработчик события удаления шаблона
    const handleTemplateDeleted = (event: any) => {
      const deletedId = event.detail?.id;
      if (deletedId) {
        // Удаляем вкладку с удаленным шаблоном
        setTabs(prev => {
          const newTabs = prev.filter(t => t.template.id !== deletedId);
          
          // Если удаленный шаблон был активным, переключаемся на другую вкладку
          if (activeTabId === deletedId) {
            if (newTabs.length > 0) {
              const newActiveTab = newTabs[newTabs.length - 1];
              setActiveTabId(newActiveTab.id);
              
              if (newActiveTab.id.startsWith('new-')) {
                setFormData({ ...newActiveTab.template, is_add: 1 });
                detectLanguage(newActiveTab.template.data || '');
              } else {
                setLoading(true);
                shm_request(`/shm/v1/admin/template?id=${newActiveTab.template.id}`)
                  .then(res => {
                    const templateData = res.data?.[0] || res.data;
                    setFormData({ ...templateData, is_add: 0 });
                    detectLanguage(templateData.data || '');
                  })
                  .catch(err => {
                    toast.error('Ошибка загрузки шаблона');
                  })
                  .finally(() => setLoading(false));
              }
            } else {
              setActiveTabId(null);
              setIsMinimized(true);
              setIsFullscreen(false);
            }
          }
          
          return newTabs;
        });
      }
    };

    window.addEventListener('templateDeleted', handleTemplateDeleted);
    return () => window.removeEventListener('templateDeleted', handleTemplateDeleted);
  }, [activeTabId, tabs]);

  useEffect(() => {
    if (open && data?.id) {
      if (isMinimized) {
        setIsMinimized(false);
        setIsFullscreen(true);
      }
      
      const existingTab = tabs.find(t => t.template.id === data.id);
      if (existingTab) {
        setIsFullscreen(true);
        setActiveTabId(existingTab.id);
        setFormData({ ...existingTab.template, is_add: 0 });
        detectLanguage(existingTab.template.data || '');
        return;
      }
      
      if (tabs.length > 0) {
        setIsFullscreen(true);
      } else {
        setIsFullscreen(false); 
      }
      
      setLoading(true);
      shm_request(`/shm/v1/admin/template?id=${data.id}`)
        .then(res => {
          const templateData = res.data?.[0] || res.data;
          setFormData({ ...templateData, is_add: 0 });
          detectLanguage(templateData.data || '');
          
          const newTab = {
            id: templateData.id,
            template: templateData,
            hasUnsavedChanges: false
          };
          setTabs(prev => [...prev, newTab]);
          setActiveTabId(templateData.id);
        })
        .catch(err => {
          toast.error('Ошибка загрузки шаблона');
          setFormData({ ...data, is_add: 0 });
        })
        .finally(() => setLoading(false));
    } else if (open && !data?.id) {
      if (isMinimized) {
        setIsMinimized(false);
        setIsFullscreen(true);
      } else if (tabs.length > 0) {
        setIsFullscreen(true);
      } else {
        setIsFullscreen(false); 
      }
      
      setFormData({ is_add: 1, data: '', settings: {} });
      setEditorLanguage('plaintext');
      const newTab = {
        id: 'new-' + Date.now(),
        template: { is_add: 1, data: '', settings: {} },
        hasUnsavedChanges: false
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
  }, [open, data?.id]);

  const detectLanguage = (content: string) => {
    if (!content) {
      setEditorLanguage('plaintext');
      return;
    }

    const trimmed = content.trim();
    
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      setEditorLanguage('json');
    } else if (
      content.includes('#!/bin/bash') ||
      content.includes('#!/bin/sh') ||
      content.includes('set -e') ||
      content.includes('echo ') ||
      (content.includes('if [') && content.includes('then'))
    ) {
      setEditorLanguage('shell');
    } else if (
      content.includes('#!/usr/bin/perl') ||
      content.includes('use strict;') ||
      content.includes('my $')
    ) {
      setEditorLanguage('perl');
    } else if (
      content.includes('[%') || content.includes('%]') ||
      content.includes('<%') || content.includes('%>') ||
      content.includes('{{') || content.includes('}}')
    ) {
      setEditorLanguage('html'); 
    } else if (
      content.includes('<html') || content.includes('<!DOCTYPE') ||
      content.includes('<head>') || content.includes('<body>')
    ) {
      setEditorLanguage('html');
    } else {
      setEditorLanguage('plaintext');
    }
  };

  const handleChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Обновляем данные в текущей вкладке
    if (activeTabId) {
      setTabs(prev => prev.map(t => 
        t.id === activeTabId ? { 
          ...t, 
          hasUnsavedChanges: true,
          template: { ...t.template, [field]: value }
        } : t
      ));
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    handleChange('data', value || '');
  };
  
  const handleTemplateSelect = (template: any) => {
    const existingTab = tabs.find(t => t.template.id === template.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      // Загружаем данные из вкладки (может содержать несохраненные изменения)
      setFormData({ ...existingTab.template, is_add: 0 });
      detectLanguage(existingTab.template.data || '');
      return;
    }
    
    setLoading(true);
    shm_request(`/shm/v1/admin/template?id=${template.id}`)
      .then(res => {
        const templateData = res.data?.[0] || res.data;
        const newTab = {
          id: templateData.id,
          template: templateData,
          hasUnsavedChanges: false
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(templateData.id);
        setFormData({ ...templateData, is_add: 0 });
        detectLanguage(templateData.data || '');
      })
      .catch(err => {
        toast.error('Ошибка загрузки шаблона');
      })
      .finally(() => setLoading(false));
  };
  
  const handleTabClose = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.hasUnsavedChanges) {
      setTabToClose(tabId);
      setConfirmCloseTabOpen(true);
      return;
    }
    
    closeTabById(tabId);
  };
  
  const closeTabById = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        const newActiveTab = newTabs[newTabs.length - 1];
        setActiveTabId(newActiveTab.id);
        
        if (newActiveTab.id.startsWith('new-')) {
          setFormData({ ...newActiveTab.template, is_add: 1 });
          detectLanguage(newActiveTab.template.data || '');
        } else {
          setLoading(true);
          shm_request(`/shm/v1/admin/template?id=${newActiveTab.template.id}`)
            .then(res => {
              const templateData = res.data?.[0] || res.data;
              setFormData({ ...templateData, is_add: 0 });
              detectLanguage(templateData.data || '');
            })
            .catch(err => {
              toast.error('Ошибка загрузки шаблона');
            })
            .finally(() => setLoading(false));
        }
      } else {
        setActiveTabId(null);
        setIsMinimized(true);
        setIsFullscreen(false);
      }
    }
  };
  const handleSave = async () => {
    if (!formData.id) {
      toast.error('Введите ID шаблона');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      toast.success('Шаблон сохранён');
      
      if (activeTabId) {
        setTabs(prev => prev.map(t => 
          t.id === activeTabId ? { 
            ...t, 
            hasUnsavedChanges: false,
            template: formData
          } : t
        ));
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndTest = async () => {
    if (!formData.id) {
      toast.error('Введите ID шаблона');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      toast.success('Шаблон сохранён');
      setTestModalOpen(true);
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!formData.id) return;

    setLoading(true);
    try {
      const response = await shm_request(`/shm/v1/admin/template?id=${formData.id}`, {
        method: 'GET',
      });
      const templateData = response.data?.[0] || response.data;
      const content = templateData.data || '';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.id}.tpl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Ошибка загрузки шаблона');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !formData.id) return;

    setDeleting(true);
    try {
      await onDelete(formData.id);
      setConfirmDeleteOpen(false);
      onClose();
    } catch (error) {
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

  const isAdd = formData.is_add === 1;

  const [confirmCloseAllOpen, setConfirmCloseAllOpen] = useState(false);

  const handleClose = () => {
    const hasUnsaved = tabs.some(t => t.hasUnsavedChanges);
    if (hasUnsaved) {
      setConfirmCloseAllOpen(true);
      return;
    }
    
    closeAllTabs();
  };
  
  const closeAllTabs = () => {
    setTabs([]);
    setActiveTabId(null);
    localStorage.removeItem('templateEditorTabs');
    onClose();
  };
  
  const handleModalClose = () => {
    if (tabs.length === 1 && !isFullscreen) {
      const hasUnsaved = tabs.some(t => t.hasUnsavedChanges);
      if (hasUnsaved) {
        setConfirmCloseAllOpen(true);
        return;
      }
      closeAllTabs();
    } 
    else if (tabs.length > 1 && !isFullscreen) {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab?.hasUnsavedChanges) {
        setTabToClose(activeTabId!);
        setConfirmCloseTabOpen(true);
        return;
      }
      closeTabById(activeTabId!);
      setIsMinimized(true);
      setIsFullscreen(false);
    }
    else {
      onClose();
    }
  };

  const handleCloseTab = () => {
    if (tabs.length === 1) {
      const hasUnsaved = tabs.some(t => t.hasUnsavedChanges);
      if (hasUnsaved) {
        setTabToClose(tabs[0].id);
        setConfirmCloseTabOpen(true);
        return;
      }
      setTabs([]);
      setActiveTabId(null);
      localStorage.removeItem('templateEditorTabs');
      setIsMinimized(false); 
      setIsFullscreen(false);
      onClose(); 
      return;
    }
    
    if (activeTabId) {
      handleTabClose(activeTabId);
    }
  };

  const renderFooter = () => (
    <div className="flex justify-between items-center w-full">
      <div className="flex gap-2">
        {isFullscreen && (
          <>
            {!isAdd && onDelete && (
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
            <button
              onClick={() => {
                setIsMinimized(true);
              }}
              className="px-4 py-2 rounded flex items-center gap-2"
              title="Свернуть"
              style={{
                backgroundColor: 'var(--theme-button-secondary-bg)',
                color: 'var(--theme-button-secondary-text)',
                border: '1px solid var(--theme-button-secondary-border)',
              }}
            >
              <Minimize2 className="w-4 h-4" />
              Свернуть
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-4 py-2 rounded flex items-center gap-2"
              title="Обычный режим"
              style={{
                backgroundColor: 'var(--theme-button-secondary-bg)',
                color: 'var(--theme-button-secondary-text)',
                border: '1px solid var(--theme-button-secondary-border)',
              }}
            >
              <Maximize2 className="w-4 h-4" style={{ transform: 'rotate(180deg)' }} />
              Обычный режим
            </button>
          </>
        )}
        {!isFullscreen && !isAdd && onDelete && (
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
        {!isFullscreen && (
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-4 py-2 rounded flex items-center gap-2"
            title={isFullscreen ? 'Обычный режим' : 'На весь экран'}
            style={{
              backgroundColor: 'var(--theme-button-secondary-bg)',
              color: 'var(--theme-button-secondary-text)',
              border: '1px solid var(--theme-button-secondary-border)',
            }}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isFullscreen ? 'Обычный' : 'На весь экран'}
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          disabled={saving || !formData.id || isAdd}
          className="px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 btn-success"
          style={{
            backgroundColor: 'var(--theme-button-info-bg)',
            color: 'var(--theme-button-info-text)',
            border: '1px solid var(--theme-button-info-border)',
          }}
        >
          <Download className="w-4 h-4" />
          Скачать
        </button>
        <button
          onClick={handleSaveAndTest}
          disabled={saving || !formData.id || isAdd}
          className="px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 btn-primary"
          style={{
            backgroundColor: 'var(--theme-button-info-bg)',
            color: 'var(--theme-button-info-text)',
            border: '1px solid var(--theme-button-info-border)',
          }}
        >
          <Play className="w-4 h-4" />
          Save & Render
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !formData.id}
          className="px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 btn-success"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)',
          }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );

  // Keyboard shortcut for saving (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        
        // Проверяем, есть ли активная вкладка
        if (!activeTabId) {
          toast.error('Выберите шаблон для сохранения');
          return;
        }
        
        // Получаем данные текущей активной вкладки
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab) {
          toast.error('Шаблон не найден');
          return;
        }
        
        // Для существующих шаблонов проверяем наличие ID
        const currentTemplate = activeTab.template;
        if (currentTemplate.is_add !== 1 && !currentTemplate.id && !formData.id) {
          toast.error('Введите ID шаблона');
          return;
        }
        
        handleSave();
      }
    };

    // Only add listener when modal is open in any state
    if (open || isFullscreen || isMinimized) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, isFullscreen, isMinimized, activeTabId, formData.id, tabs]);

  if (isMinimized && tabs.length > 0) {
    const hasUnsaved = tabs.some(t => t.hasUnsavedChanges);
    return (
      <button
        onClick={() => {
          setIsMinimized(false);
          setIsFullscreen(true);
        }}
        className="fixed bottom-6 right-6 rounded-full shadow-lg px-4 py-3 flex items-center gap-2 hover:scale-105 transition-transform btn-primary"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--accent-text)',
          zIndex: 40,
        }}
        title="Открыть редактор шаблонов"
      >
        {hasUnsaved && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
        )}
        <FileText className="w-5 h-5" />
        <span className="font-medium">Открытые шаблоны ({tabs.length})</span>
      </button>
    );
  }
  
  if (isMinimized && tabs.length === 0) {
    return null;
  }

  return (
    <>
      {isFullscreen ? (
        <div
          className="fixed inset-0 flex flex-col"
          style={{
            backgroundColor: 'var(--theme-bg)',
            zIndex: 9999,
          }}
        >
          {}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{
              backgroundColor: 'var(--theme-header-bg)',
              borderColor: 'var(--theme-border)',
            }}
          >
            <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-content-text)' }}>
              {isAdd ? 'Создание шаблона' : `Редактирование: ${formData.id || ''}`}
            </h2>
          {}
          {tabs.length > 1 && (
            <div
              className="flex gap-1 px-1 overflow-x-auto"
              style={{
                backgroundColor: 'var(--theme-header-bg)',
                borderColor: 'var(--theme-border)',
              }}
            >
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (activeTabId !== tab.id) {
                      setActiveTabId(tab.id);
                      
                      if (tab.id.startsWith('new-')) {
                        setFormData({ ...tab.template, is_add: 1 });
                        detectLanguage(tab.template.data || '');
                      } else {
                        // Загружаем данные из вкладки (может содержать несохраненные изменения)
                        setFormData({ ...tab.template, is_add: 0 });
                        detectLanguage(tab.template.data || '');
                      }
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-sm whitespace-nowrap"
                  style={{
                    backgroundColor: activeTabId === tab.id ? 'var(--theme-content-bg)' : 'var(--theme-header-bg)',
                    color: activeTabId === tab.id ? 'var(--theme-content-text)' : 'var(--theme-content-text-muted)',
                    border: `1px solid ${activeTabId === tab.id ? 'var(--theme-border)' : 'var(--theme-border)'}`,
                  }}
                >
                  {tab.hasUnsavedChanges && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                  {tab.template.id || 'Новый'}
                  <X
                    className="w-3.5 h-3.5 opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTabClose(tab.id);
                    }}
                  />
                </button>
              ))}
            </div>
          )}

            <div className="flex gap-2">
              <button
                onClick={() => setIsMinimized(true)}
                className="px-3 py-1.5 rounded flex items-center gap-2"
                title="Свернуть"
                style={{
                  backgroundColor: 'var(--theme-button-secondary-bg)',
                  color: 'var(--theme-button-secondary-text)',
                  border: '1px solid var(--theme-button-secondary-border)',
                }}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleCloseTab}
                className="px-3 py-1.5 rounded flex items-center gap-2"
                title="Закрыть"
                style={{
                  backgroundColor: 'var(--theme-button-secondary-bg)',
                  color: 'var(--theme-button-secondary-text)',
                  border: '1px solid var(--theme-button-secondary-border)',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {}
          <div className="flex flex-1 overflow-hidden">
            {}
            <div
              className="w-64 border-r overflow-y-auto"
              style={{
                backgroundColor: 'var(--theme-sidebar-bg)',
                borderColor: 'var(--theme-border)',
              }}
            >
              <TemplateSidebar
                activeTemplateId={formData.id}
                onTemplateSelect={handleTemplateSelect}
                onNewTemplate={() => {
                  const newTab = {
                    id: 'new-' + Date.now(),
                    template: { is_add: 1, data: '', settings: {} },
                    hasUnsavedChanges: false
                  };
                  setTabs(prev => [...prev, newTab]);
                  setActiveTabId(newTab.id);
                  setFormData({ is_add: 1, data: '', settings: {} });
                  setEditorLanguage('plaintext');
                }}
              />
            </div>
            
            {}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--theme-content-bg)' }}>
              {loading ? (
                <div className="flex items-center justify-center flex-1">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col p-4 min-h-0">
                  {}
                  <div className="flex items-center gap-3 mb-3">
                    <label className="text-sm font-medium shrink-0" style={{ color: 'var(--theme-content-text-muted)' }}>
                      ID *
                    </label>
                    <input
                      type="text"
                      value={formData.id || ''}
                      onChange={(e) => handleChange('id', e.target.value)}
                      readOnly={!isAdd}
                      pattern="[A-Za-z0-9_\-\/]+"
                      placeholder="template-id"
                      className={`w-64 px-3 py-2 text-sm rounded border ${!isAdd ? 'opacity-60' : ''}`}
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: 'var(--theme-input-border)',
                        color: 'var(--theme-input-text)',
                      }}
                    />
                    
                    <label className="text-sm font-medium shrink-0 ml-4" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Язык
                    </label>
                    <div className="flex gap-1 flex-wrap">
                      {['plaintext', 'json', 'html', 'shell', 'perl', 'javascript', 'tt'].map(lang => (
                        <button
                          key={lang}
                          onClick={() => setEditorLanguage(lang)}
                          className={`px-3 py-1 text-xs rounded ${editorLanguage === lang ? 'font-semibold' : ''}`}
                          style={{
                            backgroundColor: editorLanguage === lang ? 'var(--accent-primary)' : 'var(--theme-button-secondary-bg)',
                            color: editorLanguage === lang ? 'var(--accent-text)' : 'var(--theme-button-secondary-text)',
                            border: `1px solid ${editorLanguage === lang ? 'var(--accent-primary)' : 'var(--theme-button-secondary-border)'}`,
                          }}
                        >
                          {lang.toUpperCase()}
                        </button>
                      ))}
                      <button
                        onClick={() => detectLanguage(formData.data || '')}
                        className="px-3 py-1 text-xs rounded"
                        title="Автоопределение языка"
                        style={{
                          backgroundColor: 'var(--theme-button-secondary-bg)',
                          color: 'var(--theme-button-secondary-text)',
                          border: '1px solid var(--theme-button-secondary-border)',
                        }}
                      >
                        AUTO
                      </button>
                    </div>
                  </div>

                  {}
                  <div className="flex-1 flex items-start gap-3 mb-3 min-h-0">
                    <div className="flex-1 border rounded overflow-hidden h-full" style={{ borderColor: 'var(--theme-input-border)', backgroundColor: 'var(--theme-input-bg)' }}>
                      <Editor
                        height="100%"
                        language={editorLanguage}
                        value={formData.data || ''}
                        onChange={handleEditorChange}
                        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
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
                        onMount={(editor) => {
                          editorRef.current = editor;
                        }}
                      />
                    </div>
                  </div>

                  {}
                  <div className="flex items-start gap-3">
                    <label className="w-24 text-sm font-medium shrink-0 pt-2" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Settings
                    </label>
                    <div className="flex-1 border rounded" style={{ borderColor: 'var(--theme-input-border)', backgroundColor: 'var(--theme-input-bg)' }}>
                      <JsonEditor
                        data={formData.settings || {}}
                        onChange={(value) => handleChange('settings', value)}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {}
              <div
                className="border-t p-4"
                style={{
                  backgroundColor: 'var(--theme-modal-footer-bg)',
                  borderColor: 'var(--theme-border)',
                }}
              >
                {renderFooter()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Modal
          open={open}
          onClose={handleModalClose}
          title={isAdd ? 'Создание шаблона' : `Редактирование шаблона: ${formData.id || ''}`}
          footer={renderFooter()}
          size="xl"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
            {}
            <div className="flex items-center gap-3">
              <label className="w-24 text-sm font-medium shrink-0" style={labelStyles}>
                ID *
              </label>
              <input
                type="text"
                value={formData.id || ''}
                onChange={(e) => handleChange('id', e.target.value)}
                readOnly={!isAdd}
                pattern="[A-Za-z0-9_\-\/]+"
                placeholder="template-id"
                className={`flex-1 px-3 py-2 text-sm rounded border ${!isAdd ? 'opacity-60' : ''}`}
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
              <button
                onClick={() => detectLanguage(formData.data || '')}
                className="px-3 py-1 text-xs rounded"
                title="Автоопределение языка"
                style={{
                  backgroundColor: 'var(--theme-button-secondary-bg)',
                  color: 'var(--theme-button-secondary-text)',
                  border: '1px solid var(--theme-button-secondary-border)',
                }}
              >
                AUTO
              </button>
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
                value={formData.data || ''}
                onChange={handleEditorChange}
                theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
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
                onMount={(editor) => {
                  editorRef.current = editor;
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
                data={formData.settings || {}}
                onChange={(value) => handleChange('settings', value)}
              />
            </div>
          </div>
            </div>
          )}
        </Modal>
      )}

      {}
      <div style={{ position: 'relative', zIndex: 10001 }}>
        <ConfirmModal
          open={confirmDeleteOpen}
          onClose={() => setConfirmDeleteOpen(false)}
          onConfirm={handleDelete}
          title="Удалить шаблон?"
          message={`Вы уверены, что хотите удалить шаблон "${formData.id}"? Это действие нельзя отменить.`}
          confirmText="Удалить"
          variant="danger"
          loading={deleting}
          confirmWord="delete"
          confirmWordHint='Введите "delete" для подтверждения'
        />
      </div>

      {}
      <div style={{ position: 'relative', zIndex: 10001 }}>
        <ConfirmModal
          open={confirmCloseTabOpen}
          onClose={() => {
            setConfirmCloseTabOpen(false);
            setTabToClose(null);
          }}
          onConfirm={() => {
            if (tabToClose) {
              closeTabById(tabToClose);
              setConfirmCloseTabOpen(false);
              setTabToClose(null);
            }
          }}
          title="Несохранённые изменения"
          message="Есть несохранённые изменения. Закрыть вкладку без сохранения?"
          confirmText="Закрыть без сохранения"
          cancelText="Отмена"
          variant="warning"
        />
      </div>

      {}
      <div style={{ position: 'relative', zIndex: 10001 }}>
        <ConfirmModal
          open={confirmCloseAllOpen}
          onClose={() => setConfirmCloseAllOpen(false)}
          onConfirm={() => {
            closeAllTabs();
            setConfirmCloseAllOpen(false);
          }}
          title="Несохранённые изменения"
          message="Есть несохранённые изменения в открытых вкладках. Закрыть редактор без сохранения?"
          confirmText="Закрыть без сохранения"
          cancelText="Отмена"
          variant="warning"
        />
      </div>

      {}
      <div style={{ position: 'relative', zIndex: 10001 }}>
        <TemplateTestModal
          open={testModalOpen}
          onClose={() => setTestModalOpen(false)}
          templateId={formData.id || ''}
        />
      </div>
    </>
  );
}
