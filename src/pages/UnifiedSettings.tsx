import { useState } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  HelpCircle
} from 'lucide-react';
import { useThemeStore, ThemeMode } from '../store/themeStore';
import { useSettingsStore } from '../store/settingsStore';

type TabType = 'appearance';

function UnifiedSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('appearance');

  // Appearance state
  const { mode, setMode, resolvedTheme } = useThemeStore();
  const { showHelp, setShowHelp } = useSettingsStore();

  const tabs = [
    { id: 'appearance' as TabType, label: 'Внешний вид', icon: Sun },
  ];

  // Appearance handlers
  const themes: { value: ThemeMode; label: string; icon: any; description: string }[] = [
    { value: 'system', label: 'Системная', icon: Monitor, description: 'Использовать настройки системы' },
    { value: 'light', label: 'Светлая', icon: Sun, description: 'Яркая тема для дневного использования' },
    { value: 'dark', label: 'Тёмная', icon: Moon, description: 'Тёмная тема для комфортной работы' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold flex items-center gap-3"
          style={{ color: 'var(--theme-content-text)' }}
        >
          <Settings className="w-7 h-7" style={{ color: 'var(--theme-primary-color)' }} />
          Настройки
        </h1>
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
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default UnifiedSettings;