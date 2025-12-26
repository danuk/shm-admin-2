import { useState, useEffect } from 'react';
import { 
  Settings, 
  Palette, 
  Database,
  Save, 
  RotateCcw, 
  Sun, 
  Moon, 
  Monitor, 
  Eye, 
  EyeOff, 
  HelpCircle,
  Timer,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useBrandingStore } from '../store/brandingStore';
import { useThemeStore, ThemeMode, ThemeColors, darkTheme, lightTheme } from '../store/themeStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCacheStore } from '../store/cacheStore';

type TabType = 'branding' | 'appearance' | 'cache';

interface ColorGroup {
  title: string;
  description: string;
  colors: {
    key: keyof ThemeColors;
    label: string;
    description?: string;
  }[];
}

const colorGroups: ColorGroup[] = [
  {
    title: 'Основные цвета',
    description: 'Акцентный цвет приложения',
    colors: [
      { key: 'primaryColor', label: 'Основной цвет', description: 'Используется для кнопок, ссылок и акцентов' },
      { key: 'primaryColorHover', label: 'Основной при наведении', description: 'Цвет при наведении на элементы' },
    ],
  },
  {
    title: 'Боковая панель',
    description: 'Цвета меню навигации',
    colors: [
      { key: 'sidebarBg', label: 'Фон панели' },
      { key: 'sidebarBorder', label: 'Границы' },
      { key: 'sidebarText', label: 'Текст' },
      { key: 'sidebarTextHover', label: 'Текст при наведении' },
      { key: 'sidebarTextActive', label: 'Активный текст' },
      { key: 'sidebarItemHoverBg', label: 'Фон при наведении' },
      { key: 'sidebarItemActiveBg', label: 'Фон активного пункта' },
    ],
  },
  {
    title: 'Шапка',
    description: 'Верхняя панель',
    colors: [
      { key: 'headerBg', label: 'Фон шапки' },
      { key: 'headerBorder', label: 'Граница' },
      { key: 'headerText', label: 'Текст' },
    ],
  },
  {
    title: 'Контент',
    description: 'Основная область страницы',
    colors: [
      { key: 'contentBg', label: 'Фон страницы' },
      { key: 'contentText', label: 'Основной текст' },
      { key: 'contentTextMuted', label: 'Приглушённый текст' },
    ],
  },
  {
    title: 'Карточки',
    description: 'Блоки с контентом',
    colors: [
      { key: 'cardBg', label: 'Фон карточки' },
      { key: 'cardBorder', label: 'Граница' },
      { key: 'cardHeaderBg', label: 'Фон заголовка' },
    ],
  },
  {
    title: 'Поля ввода',
    description: 'Input, select и другие элементы форм',
    colors: [
      { key: 'inputBg', label: 'Фон поля' },
      { key: 'inputBorder', label: 'Граница' },
      { key: 'inputText', label: 'Текст' },
      { key: 'inputPlaceholder', label: 'Placeholder' },
      { key: 'inputFocusBorder', label: 'Граница при фокусе' },
    ],
  },
  {
    title: 'Таблицы',
    description: 'DataTable и списки',
    colors: [
      { key: 'tableBg', label: 'Фон таблицы' },
      { key: 'tableHeaderBg', label: 'Фон заголовка' },
      { key: 'tableHeaderText', label: 'Текст заголовка' },
      { key: 'tableBorder', label: 'Границы' },
      { key: 'tableRowHoverBg', label: 'Фон строки при наведении' },
      { key: 'tableText', label: 'Текст ячеек' },
    ],
  },
  {
    title: 'Кнопки',
    description: 'Вторичные кнопки',
    colors: [
      { key: 'buttonSecondaryBg', label: 'Фон' },
      { key: 'buttonSecondaryText', label: 'Текст' },
      { key: 'buttonSecondaryBorder', label: 'Граница' },
      { key: 'buttonSecondaryHoverBg', label: 'Фон при наведении' },
    ],
  },
];

function ColorPicker({ 
  colorKey, 
  label, 
  description,
  value, 
  onChange,
  defaultValue,
}: { 
  colorKey: keyof ThemeColors;
  label: string;
  description?: string;
  value: string;
  onChange: (key: keyof ThemeColors, value: string) => void;
  defaultValue: string;
}) {
  const isModified = value !== defaultValue;
  
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith('rgba') ? '#888888' : value}
          onChange={(e) => onChange(colorKey, e.target.value)}
          className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
          style={{ 
            borderColor: 'var(--theme-input-border)',
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--theme-content-text)' }}>
            {label}
          </span>
          {isModified && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ 
              backgroundColor: 'var(--theme-primary-color)', 
              color: 'white',
              opacity: 0.8,
            }}>
              изменён
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(colorKey, e.target.value)}
        className="input w-32 text-xs font-mono"
      />
    </div>
  );
}

function formatTTL(seconds: number): string {
  if (seconds < 60) return `${seconds}с`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}м`;
  return `${Math.floor(seconds / 3600)}ч ${Math.floor((seconds % 3600) / 60)}м`;
}

function UnifiedSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('branding');
  
  // Branding state
  const { branding, loading: brandingLoading, updateBranding, resetBranding } = useBrandingStore();
  const [formData, setFormData] = useState(branding);
  const [confirmResetBranding, setConfirmResetBranding] = useState(false);
  
  // Appearance state
  const { mode, setMode, colors, customColors, setCustomColor, resetCustomColors, resolvedTheme } = useThemeStore();
  const { showHelp, setShowHelp } = useSettingsStore();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Основные цвета']);
  const [confirmResetColors, setConfirmResetColors] = useState(false);
  
  // Cache state
  const { settings: cacheSettings, setSettings: setCacheSettings, clear: clearCache, getStats } = useCacheStore();
  const [stats, setStats] = useState(getStats());

  const tabs = [
    { id: 'branding' as TabType, label: 'Брендинг', icon: Palette },
    { id: 'appearance' as TabType, label: 'Внешний вид', icon: Sun },
    { id: 'cache' as TabType, label: 'Кеширование', icon: Database },
  ];

  useEffect(() => {
    setFormData(branding);
  }, [branding]);

  useEffect(() => {
    if (activeTab === 'cache') {
      const interval = setInterval(() => {
        setStats(getStats());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeTab, getStats]);

  // Branding handlers
  const handleBrandingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBrandingSave = async () => {
    try {
      await updateBranding(formData);
      toast.success('Настройки брендинга сохранены');
    } catch {
      toast.error('Ошибка сохранения');
    }
  };

  const handleBrandingReset = () => {
    setConfirmResetBranding(true);
  };

  const handleConfirmBrandingReset = async () => {
    setConfirmResetBranding(false);
    try {
      await resetBranding();
      toast.success('Настройки сброшены');
    } catch {
      toast.error('Ошибка сброса');
    }
  };

  // Appearance handlers
  const baseColors = resolvedTheme === 'dark' ? darkTheme : lightTheme;
  
  const themes: { value: ThemeMode; label: string; icon: any; description: string }[] = [
    { value: 'system', label: 'Системная', icon: Monitor, description: 'Использовать настройки системы' },
    { value: 'light', label: 'Светлая', icon: Sun, description: 'Яркая тема для дневного использования' },
    { value: 'dark', label: 'Тёмная', icon: Moon, description: 'Тёмная тема для комфортной работы' },
  ];

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const handleColorsReset = () => {
    setConfirmResetColors(true);
  };

  const handleConfirmColorsReset = () => {
    resetCustomColors();
    setConfirmResetColors(false);
    toast.success('Цвета сброшены');
  };

  // Cache handlers
  const handleClearCache = () => {
    if (confirm('Очистить весь кеш?')) {
      clearCache();
      setStats(getStats());
    }
  };

  const hasCustomColors = Object.keys(customColors).length > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 
            className="text-2xl font-bold flex items-center gap-3"
            style={{ color: 'var(--theme-content-text)' }}
          >
            <Settings className="w-7 h-7" style={{ color: 'var(--theme-primary-color)' }} />
            Настройки системы
          </h1>
          <p style={{ color: 'var(--theme-content-text-muted)' }} className="mt-1">
            Брендинг, внешний вид и кеширование
          </p>
        </div>
        
        {/* Action buttons based on active tab */}
        <div className="flex gap-3">
          {activeTab === 'branding' && (
            <>
              <button onClick={handleBrandingReset} className="btn-secondary" disabled={brandingLoading}>
                <RotateCcw className="w-4 h-4" />
                Сбросить
              </button>
              <button onClick={handleBrandingSave} className="btn-primary" disabled={brandingLoading}>
                <Save className="w-4 h-4" />
                Сохранить
              </button>
            </>
          )}
          {activeTab === 'appearance' && hasCustomColors && (
            <button onClick={handleColorsReset} className="btn-secondary">
              <RotateCcw className="w-4 h-4" />
              Сбросить цвета
            </button>
          )}
          {activeTab === 'cache' && (
            <button onClick={handleClearCache} className="btn-secondary">
              <Trash2 className="w-4 h-4" />
              Очистить кеш
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="card mb-6">
        <div className="flex border-b" style={{ borderColor: 'var(--theme-card-border)' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-6 py-4 font-medium transition-colors"
                style={{
                  color: isActive ? 'var(--theme-primary-color)' : 'var(--theme-content-text-muted)',
                  borderBottom: `2px solid ${isActive ? 'var(--theme-primary-color)' : 'transparent'}`,
                }}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Settings */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-content-text)' }}>
                    Основные настройки
                  </h2>
                </div>
                <div className="card-body space-y-4">
                  <div>
                    <label 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-content-text)' }}
                    >
                      Название приложения
                    </label>
                    <input
                      type="text"
                      name="appName"
                      value={formData.appName}
                      onChange={handleBrandingChange}
                      className="input"
                      placeholder="SHM Admin"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Отображается в боковой панели
                    </p>
                  </div>

                  <div>
                    <label 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-content-text)' }}
                    >
                      Заголовок страницы
                    </label>
                    <input
                      type="text"
                      name="appTitle"
                      value={formData.appTitle}
                      onChange={handleBrandingChange}
                      className="input"
                      placeholder="SHM Admin Panel"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Отображается в заголовке вкладки браузера
                    </p>
                  </div>

                  <div>
                    <label 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-content-text)' }}
                    >
                      Заголовок страницы входа
                    </label>
                    <input
                      type="text"
                      name="loginTitle"
                      value={formData.loginTitle}
                      onChange={handleBrandingChange}
                      className="input"
                      placeholder="SHM Admin"
                    />
                  </div>

                  <div>
                    <label 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-content-text)' }}
                    >
                      Подзаголовок страницы входа
                    </label>
                    <input
                      type="text"
                      name="loginSubtitle"
                      value={formData.loginSubtitle}
                      onChange={handleBrandingChange}
                      className="input"
                      placeholder="Войдите в систему управления"
                    />
                  </div>

                  <div>
                    <label 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-content-text)' }}
                    >
                      URL логотипа
                    </label>
                    <input
                      type="text"
                      name="logoUrl"
                      value={formData.logoUrl}
                      onChange={handleBrandingChange}
                      className="input"
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Оставьте пустым для использования иконки по умолчанию
                    </p>
                  </div>

                  <div>
                    <label 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-content-text)' }}
                    >
                      Основной цвет
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        name="primaryColor"
                        value={formData.primaryColor}
                        onChange={handleBrandingChange}
                        className="w-12 h-10 rounded cursor-pointer bg-transparent"
                        style={{ border: '1px solid var(--theme-input-border)' }}
                      />
                      <input
                        type="text"
                        name="primaryColor"
                        value={formData.primaryColor}
                        onChange={handleBrandingChange}
                        className="input flex-1"
                        placeholder="#22d3ee"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-content-text)' }}>
                    Предпросмотр
                  </h2>
                </div>
                <div className="card-body">
                  {/* Login preview */}
                  <div 
                    className="rounded-lg p-6 mb-4"
                    style={{ backgroundColor: 'var(--theme-content-bg)' }}
                  >
                    <div className="text-center">
                      <div 
                        className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                        style={{ backgroundColor: formData.primaryColor + '30' }}
                      >
                        {formData.logoUrl ? (
                          <img src={formData.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
                        ) : (
                          <div 
                            className="w-8 h-8 rounded-lg" 
                            style={{ background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.primaryColor}dd)` }}
                          />
                        )}
                      </div>
                      <h3 
                        className="text-lg font-bold"
                        style={{ color: 'var(--theme-content-text)' }}
                      >
                        {formData.loginTitle}
                      </h3>
                      <p 
                        className="text-sm"
                        style={{ color: 'var(--theme-content-text-muted)' }}
                      >
                        {formData.loginSubtitle}
                      </p>
                    </div>
                  </div>

                  {/* Sidebar preview */}
                  <div 
                    className="rounded-lg p-4"
                    style={{ backgroundColor: 'var(--theme-sidebar-bg)' }}
                  >
                    <div 
                      className="flex items-center gap-3 mb-4 pb-4"
                      style={{ borderBottom: '1px solid var(--theme-sidebar-border)' }}
                    >
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-lg" 
                          style={{ background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.primaryColor}dd)` }}
                        />
                      )}
                      <span 
                        className="font-bold"
                        style={{ color: 'var(--theme-header-text)' }}
                      >
                        {formData.appName}
                      </span>
                    </div>
                    <div 
                      className="text-sm py-2 px-3 rounded-lg"
                      style={{ 
                        backgroundColor: formData.primaryColor + '20',
                        color: formData.primaryColor,
                        borderLeft: `2px solid ${formData.primaryColor}`
                      }}
                    >
                      Активный пункт меню
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Theme Selection */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-content-text)' }}>
                    Тема оформления
                  </h2>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {themes.map((theme) => {
                      const Icon = theme.icon;
                      const isActive = mode === theme.value;
                      
                      return (
                        <button
                          key={theme.value}
                          onClick={() => setMode(theme.value)}
                          className="p-4 rounded-lg border-2 transition-all text-left"
                          style={{
                            backgroundColor: isActive ? 'var(--theme-sidebar-item-active-bg)' : 'transparent',
                            borderColor: isActive ? 'var(--theme-primary-color)' : 'var(--theme-card-border)',
                          }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <Icon 
                              className="w-5 h-5" 
                              style={{ color: isActive ? 'var(--theme-primary-color)' : 'var(--theme-content-text-muted)' }}
                            />
                            <span 
                              className="font-medium"
                              style={{ color: isActive ? 'var(--theme-primary-color)' : 'var(--theme-content-text)' }}
                            >
                              {theme.label}
                            </span>
                          </div>
                          <p className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                            {theme.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  
                  {mode === 'system' && (
                    <p className="mt-4 text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Текущая системная тема: <strong>{resolvedTheme === 'dark' ? 'Тёмная' : 'Светлая'}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Interface Settings */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-content-text)' }}>
                    Настройки интерфейса
                  </h2>
                </div>
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HelpCircle 
                        className="w-5 h-5" 
                        style={{ color: 'var(--theme-primary-color)' }}
                      />
                      <div>
                        <span 
                          className="font-medium"
                          style={{ color: 'var(--theme-content-text)' }}
                        >
                          Показывать справку
                        </span>
                        <p className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                          Кнопки справки рядом с заголовками страниц
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowHelp(!showHelp)}
                      className="relative w-12 h-6 rounded-full transition-colors"
                      style={{
                        backgroundColor: showHelp ? 'var(--theme-primary-color)' : 'var(--theme-button-secondary-bg)',
                      }}
                    >
                      <span
                        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow"
                        style={{
                          left: showHelp ? '28px' : '4px',
                        }}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Color Customization */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-content-text)' }}>
                    Настройка цветов
                  </h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                    Изменённые цвета применяются к обеим темам
                  </p>
                </div>
                <div className="card-body p-0">
                  {colorGroups.map((group) => {
                    const isExpanded = expandedGroups.includes(group.title);
                    const modifiedCount = group.colors.filter(c => customColors[c.key]).length;
                    
                    return (
                      <div key={group.title} style={{ borderBottom: '1px solid var(--theme-card-border)' }}>
                        <button
                          onClick={() => toggleGroup(group.title)}
                          className="w-full flex items-center justify-between px-6 py-4 hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-1">
                              {group.colors.slice(0, 4).map((c, i) => (
                                <div
                                  key={c.key}
                                  className="w-5 h-5 rounded-full border-2"
                                  style={{ 
                                    backgroundColor: colors[c.key],
                                    borderColor: 'var(--theme-card-bg)',
                                    zIndex: 4 - i,
                                  }}
                                />
                              ))}
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                                  {group.title}
                                </span>
                                {modifiedCount > 0 && (
                                  <span 
                                    className="text-xs px-1.5 py-0.5 rounded"
                                    style={{ 
                                      backgroundColor: 'var(--theme-primary-color)',
                                      color: 'white',
                                    }}
                                  >
                                    {modifiedCount}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                                {group.description}
                              </p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <EyeOff className="w-5 h-5" style={{ color: 'var(--theme-content-text-muted)' }} />
                          ) : (
                            <Eye className="w-5 h-5" style={{ color: 'var(--theme-content-text-muted)' }} />
                          )}
                        </button>
                        
                        {isExpanded && (
                          <div className="px-6 pb-4 space-y-1">
                            {group.colors.map((color) => (
                              <ColorPicker
                                key={color.key}
                                colorKey={color.key}
                                label={color.label}
                                description={color.description}
                                value={colors[color.key]}
                                onChange={setCustomColor}
                                defaultValue={baseColors[color.key]}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Cache Tab */}
          {activeTab === 'cache' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Settings */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--theme-content-text)' }}>
                    <Timer className="w-5 h-5" />
                    Основные настройки
                  </h2>
                </div>
                <div className="card-body space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                        Кеширование
                      </label>
                      <p className="text-sm mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                        Включить кеширование данных таблиц
                      </p>
                    </div>
                    <button
                      onClick={() => setCacheSettings({ enabled: !cacheSettings.enabled })}
                      className="flex items-center gap-2"
                      style={{ color: cacheSettings.enabled ? 'var(--theme-primary-color)' : 'var(--theme-content-text-muted)' }}
                    >
                      {cacheSettings.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                  </div>

                  <div>
                    <label className="block font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                      Время жизни кеша (TTL)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="30"
                        max="3600"
                        step="30"
                        value={cacheSettings.ttl}
                        onChange={(e) => setCacheSettings({ ttl: parseInt(e.target.value) })}
                        className="flex-1"
                        style={{ accentColor: 'var(--theme-primary-color)' }}
                      />
                      <span className="font-mono text-sm w-24" style={{ color: 'var(--theme-content-text)' }}>
                        {formatTTL(cacheSettings.ttl)}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Время хранения данных в кеше
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                        Фоновое обновление
                      </label>
                      <p className="text-sm mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                        Обновлять данные в фоне до истечения кеша
                      </p>
                    </div>
                    <button
                      onClick={() => setCacheSettings({ backgroundRefresh: !cacheSettings.backgroundRefresh })}
                      className="flex items-center gap-2"
                      style={{ color: cacheSettings.backgroundRefresh ? 'var(--theme-primary-color)' : 'var(--theme-content-text-muted)' }}
                    >
                      {cacheSettings.backgroundRefresh ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                  </div>

                  {cacheSettings.backgroundRefresh && (
                    <div>
                      <label className="block font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                        Порог обновления
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0.5"
                          max="0.95"
                          step="0.05"
                          value={cacheSettings.backgroundRefreshThreshold}
                          onChange={(e) => setCacheSettings({ backgroundRefreshThreshold: parseFloat(e.target.value) })}
                          className="flex-1"
                          style={{ accentColor: 'var(--theme-primary-color)' }}
                        />
                        <span className="font-mono text-sm w-24" style={{ color: 'var(--theme-content-text)' }}>
                          {Math.round(cacheSettings.backgroundRefreshThreshold * 100)}%
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                        При достижении {Math.round(cacheSettings.backgroundRefreshThreshold * 100)}% времени жизни начнется фоновое обновление
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--theme-content-text)' }}>
                    <Database className="w-5 h-5" />
                    Статистика кеша
                  </h2>
                </div>
                <div className="card-body space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-content-bg)' }}>
                      <div className="text-2xl font-bold" style={{ color: 'var(--theme-primary-color)' }}>
                        {stats.totalKeys}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                        Записей в кеше
                      </div>
                    </div>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-content-bg)' }}>
                      <div className="text-2xl font-bold" style={{ color: 'var(--theme-primary-color)' }}>
                        {stats.totalSize}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                        Размер кеша
                      </div>
                    </div>
                  </div>

                  {stats.entries.length > 0 && (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {stats.entries.map((entry) => (
                        <div
                          key={entry.key}
                          className="p-3 rounded-lg"
                          style={{
                            backgroundColor: 'var(--theme-content-bg)',
                            border: `1px solid var(--theme-card-border)`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-mono truncate" style={{ color: 'var(--theme-content-text)' }}>
                                {entry.key}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                                <span>Размер: {entry.size}</span>
                                <span>Возраст: {entry.age}</span>
                                <span>Истекает: {entry.expiresIn}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {stats.entries.length === 0 && (
                    <div className="text-center py-8" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Кеш пуст
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Section for Cache */}
      {activeTab === 'cache' && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 mt-1" style={{ color: 'var(--theme-primary-color)', flexShrink: 0 }} />
              <div>
                <h3 className="font-medium mb-1" style={{ color: 'var(--theme-content-text)' }}>
                  Как работает кеширование?
                </h3>
                <ul className="text-sm space-y-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                  <li>• Данные таблиц сохраняются в локальном кеше браузера</li>
                  <li>• При повторном открытии таблицы данные загружаются из кеша мгновенно</li>
                  <li>• Фоновое обновление обновляет данные незаметно для пользователя</li>
                  <li>• Кеш автоматически очищается при выходе или истечении TTL</li>
                  <li>• Принудительное обновление (F5 или кнопка обновить) игнорирует кеш</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        open={confirmResetBranding}
        onClose={() => setConfirmResetBranding(false)}
        onConfirm={handleConfirmBrandingReset}
        title="Сброс настроек брендинга"
        message="Сбросить настройки брендинга к значениям по умолчанию?"
        confirmText="Сбросить"
        variant="warning"
      />

      <ConfirmModal
        open={confirmResetColors}
        onClose={() => setConfirmResetColors(false)}
        onConfirm={handleConfirmColorsReset}
        title="Сброс цветов"
        message="Сбросить все пользовательские цвета к значениям по умолчанию?"
        confirmText="Сбросить"
        variant="warning"
      />
    </div>
  );
}

export default UnifiedSettings;