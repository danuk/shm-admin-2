import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import SelectedUserDropdown from './SelectedUserDropdown';
import { VersionBadge } from './VersionBadge';
import {
  Users,
  Package,
  Server,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  ChevronDown,
  Home,
  Cloud,
  FileText,
  Sun,
  Moon,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Heart,
  BarChart3,
  ListTodo,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBrandingStore } from '../store/brandingStore';
import { useThemeStore, ThemeMode } from '../store/themeStore';
import { useSettingsStore } from '../store/settingsStore';
import toast from 'react-hot-toast';
import TemplateModal from '../modals/TemplateModal';
import { shm_request } from '../lib/shm_request';

interface MenuItem {
  name: string;
  href?: string;
  icon: any;
  children?: { name: string; href: string }[];
}

const navigation: MenuItem[] = [
  {
    name: 'Главная',
    href: '/',
    icon: Home
  },
  { name: 'Аналитика',
    href: '/analytics',
    icon: BarChart3
  },
  {
    name: 'Пользователи',
    icon: Users,
    children: [
      { name: 'Список', href: '/users' },
      { name: 'Персональные данные', href: '/profiles' },
      { name: 'Услуги пользователей', href: '/user-services' },
      { name: 'Списания', href: '/withdraws' },
      { name: 'Платежи', href: '/pays' },
      { name: 'Бонусы', href: '/bonuses' },
      { name: 'Хранилище', href: '/storage' },
      { name: 'Промокоды', href: '/promo' },
    ]
  },
  {
    name: 'Услуги',
    icon: Package,
    children: [
      { name: 'Каталог', href: '/services' },
      { name: 'События', href: '/events' },
    ]
  },
  {
    name: 'Сервера',
    icon: Server,
    children: [
      { name: 'Список', href: '/servers' },
      { name: 'Группы', href: '/server-groups' },
      { name: 'Ключи', href: '/identities' },
    ]
  },
  {
    name: 'Задачи',
    icon: ListTodo,
    children: [
      { name: 'Текущие задачи', href: '/spool' },
      { name: 'Архив', href: '/spool-history' },
    ]
  },
  {
    name: 'Настройки',
    icon: Settings,
    children: [
      { name: 'Шаблоны', href: '/templates' },
      { name: 'Конфигурация', href: '/configuration' },
    ]
  },
  {
    name: 'SHM Cloud',
    href: '/cloud',
    icon: Cloud
  },
];

function ThemeToggle() {
  const { mode, setMode, resolvedTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);

  const themes: { value: ThemeMode; label: string; icon: any }[] = [
    { value: 'system', label: 'Системная', icon: Monitor },
    { value: 'light', label: 'Светлая', icon: Sun },
    { value: 'dark', label: 'Тёмная', icon: Moon },
  ];

  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm transition-all"
        style={{
          color: 'var(--theme-content-text-muted)'
        }}
        title="Сменить тему"
      >
        <CurrentIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 top-full mt-2 z-50 w-40 rounded-lg shadow-lg border"
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-card-border)',
            }}
          >
            {themes.map((theme) => {
              const Icon = theme.icon;
              return (
                <button
                  key={theme.value}
                  onClick={() => {
                    setMode(theme.value);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg"
                  style={{
                    color: mode === theme.value
                      ? 'var(--theme-primary-color)'
                      : 'var(--theme-content-text-muted)',
                    backgroundColor: mode === theme.value
                      ? 'var(--theme-sidebar-item-active-bg)'
                      : 'transparent',
                  }}
                >
                  <Icon className="w-5 h-5" />
                  {theme.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { branding, fetchBranding } = useBrandingStore();
  const { applyTheme } = useThemeStore();
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>(() => {
  const activeMenu = navigation.find(item =>
      item.children?.some(child => child.href === location.pathname)
    );
    return activeMenu ? [activeMenu.name] : [];
  });
  const [manuallyClosed, setManuallyClosed] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number } | null>(null);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  const showSwagger = import.meta.env.VITE_SHOW_SWAGGER === 'true';

  const menuItems = showSwagger
    ? [...navigation, { name: 'Swagger', href: '/swagger', icon: FileText }]
    : navigation;

  useEffect(() => {
    fetchBranding();
    applyTheme();

    const handleOpenTemplate = (event: any) => {
      setSelectedData(event.detail);
      setTemplateModalOpen(true);
    };

    window.addEventListener('openTemplate', handleOpenTemplate);
    return () => {
      window.removeEventListener('openTemplate', handleOpenTemplate);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [fetchBranding, applyTheme]);

  // Автоматическое открытие активного меню при изменении пути
  useEffect(() => {
    const activeMenu = navigation.find(item =>
      item.children?.some(child => child.href === location.pathname)
    );

    if (activeMenu && !manuallyClosed.includes(activeMenu.name)) {
      setOpenMenus(prev => {
        if (!prev.includes(activeMenu.name)) {
          return [...prev, activeMenu.name];
        }
        return prev;
      });
    }
  }, [location.pathname, manuallyClosed]);

  useEffect(() => {
    document.title = branding.name;
  }, [branding]);

  const handleLogout = () => {
    logout();
    toast.success('Вы вышли из системы');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const isMenuActive = (item: MenuItem) => {
    if (item.href) return isActive(item.href);
    return item.children?.some(child => isActive(child.href));
  };

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => {
      const isCurrentlyOpen = prev.includes(name);

      if (isCurrentlyOpen) {
        setManuallyClosed(closed => [...closed, name]);
        return prev.filter(n => n !== name);
      } else {
        setManuallyClosed(closed => closed.filter(n => n !== name));

        const activeMenus = navigation
          .filter(item =>
            item.children?.some(child => isActive(child.href)) &&
            !manuallyClosed.includes(item.name)
          )
          .map(item => item.name);

        return [name, ...activeMenus.filter(m => m !== name)];
      }
    });
  };

  const handleTemplateSave = async (templateData: any) => {
    try {
      const isNewTemplate = templateData?.is_add === 1 || templateData?.is_add === true;
      const data = await shm_request('shm/v1/admin/template', {
        method: isNewTemplate ? 'PUT' : 'POST',
        body: JSON.stringify(templateData)
      });
      return data;
    } catch (error: any) {
      toast.error(error?.message || 'Ошибка при сохранении шаблона');
      throw error;
    }
  };

  const handleTemplateDelete = async (id: string) => {
    try {
      await shm_request(`shm/v1/admin/template?id=${id}`, {
        method: 'DELETE'
      });
      toast.success('Шаблон удален');

      // Закрываем модал и сбрасываем выбранные данные
      setTemplateModalOpen(false);
      setSelectedData(null);

      // Отправляем событие для обновления списка шаблонов
      window.dispatchEvent(new CustomEvent('templateDeleted', { detail: { id } }));
    } catch (error: any) {
      toast.error(error?.message || 'Ошибка при удалении шаблона');
      throw error;
    }
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--theme-content-bg)' }}>
      {}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {}<aside
        className={`fixed inset-y-0 left-0 z-30 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
        } w-64`}
        style={{
          backgroundColor: 'var(--theme-sidebar-bg)',
          borderRight: '1px solid var(--theme-sidebar-border)',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Кнопка сворачивания сайдбара */}
          <div className="hidden lg:flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--theme-sidebar-border)' }}>
            {!sidebarCollapsed && (
              <Link to="/"  className="flex items-center gap-2">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
                ) : (
                  <Settings className="w-6 h-6" style={{ color: 'var(--theme-primary-color)' }} />
                )}
                <span className="font-semibold text-lg" style={{ color: 'var(--theme-header-text)' }}>
                  {branding.name}
                </span>
              </Link>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg transition-colors hover:bg-opacity-80"
              style={{ color: 'var(--theme-sidebar-text)' }}
              title={sidebarCollapsed ? 'Развернуть сайдбар' : 'Свернуть сайдбар'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isMenuActive(item);
              const isOpen = openMenus.includes(item.name);

              if (item.href && !item.children) {
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    target={item.href === '/swagger' ? '_blank' : undefined}
                    rel={item.href === '/swagger' ? 'noopener noreferrer' : undefined}
                    onClick={() => setSidebarOpen(false)}
                    className={`nav-item ${active ? 'active' : ''}`}
                    style={{
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    }}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className="w-5 h-5" />
                    <span className={`flex-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.name}</span>
                  </Link>
                );
              }

              return (
                <div
                  key={item.name}
                  className="mb-1"
                  onMouseEnter={(e) => {
                    if (sidebarCollapsed) {
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                      }
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredItem(item.name);
                      setMenuPosition({ top: rect.top });
                    }
                  }}
                  onMouseLeave={() => {
                    if (sidebarCollapsed) {
                      hoverTimeoutRef.current = window.setTimeout(() => {
                        setHoveredItem(null);
                        setMenuPosition(null);
                      }, 150);
                    }
                  }}
                >
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`nav-item w-full`}
                    style={{
                      color: active ? 'var(--theme-sidebar-text-active)' : undefined,
                      borderLeft: active ? '2px solid var(--theme-primary-color)' : undefined,
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    }}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className="w-5 h-5" />
                    <span className={`flex-1 text-left ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.name}</span>
                    <span className={sidebarCollapsed ? 'lg:hidden' : ''}>
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                  </button>

                  {/* Всплывающее подменю при свернутом сайдбаре */}
                  {sidebarCollapsed && item.children && hoveredItem === item.name && menuPosition && (
                    <div
                      className="fixed z-[100] rounded-lg shadow-xl border py-2 min-w-[200px]"
                      style={{
                        backgroundColor: 'var(--theme-card-bg)',
                        borderColor: 'var(--theme-card-border)',
                        left: '64px',
                        top: `${menuPosition.top}px`,
                      }}
                      onMouseEnter={() => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                        }
                        setHoveredItem(item.name);
                      }}
                      onMouseLeave={() => {
                        hoverTimeoutRef.current = window.setTimeout(() => {
                          setHoveredItem(null);
                          setMenuPosition(null);
                        }, 150);
                      }}
                    >
                      <div className="px-3 py-2 border-b font-semibold text-sm" style={{ borderColor: 'var(--theme-card-border)', color: 'var(--theme-content-text)' }}>
                        {item.name}
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            to={child.href}
                            onClick={() => {
                              setSidebarOpen(false);
                              setHoveredItem(null);
                              setMenuPosition(null);
                            }}
                            className="block px-4 py-2 text-sm transition-colors"
                            style={{
                              color: isActive(child.href)
                                ? 'var(--theme-sidebar-text-active)'
                                : 'var(--theme-content-text)',
                              backgroundColor: isActive(child.href)
                                ? 'var(--theme-sidebar-item-active-bg)'
                                : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--theme-sidebar-item-hover-bg)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = isActive(child.href)
                                ? 'var(--theme-sidebar-item-active-bg)'
                                : 'transparent';
                            }}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {isOpen && item.children && (
                    <div
                      className={`ml-4 mt-1 space-y-1 pl-3 ${sidebarCollapsed ? 'lg:hidden' : ''}`}
                      style={{ borderLeft: '1px solid var(--theme-sidebar-border)' }}
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          to={child.href}
                          onClick={() => setSidebarOpen(false)}
                          className="block px-3 py-2 text-sm rounded-lg transition-colors"
                          style={{
                            color: isActive(child.href)
                              ? 'var(--theme-sidebar-text-active)'
                              : 'var(--theme-sidebar-text)',
                            backgroundColor: isActive(child.href)
                              ? 'var(--theme-sidebar-item-active-bg)'
                              : 'transparent',
                            borderLeft: isActive(child.href) ? '2px solid var(--theme-primary-color)' : undefined,
                          }}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
            <a
              href="https://myshm.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-2"
              style={{
                color: 'var(--theme-primary-color)'
              }}
              title="Telegram"
            >
              MySHM.ru
            </a>
        </div>
      </aside>

      {}
      <div className="flex-1 flex flex-col overflow-hidden">
        {}
        <header
          className="h-16 flex items-center justify-between px-4"
          style={{
            backgroundColor: 'var(--theme-header-bg)',
            borderBottom: '1px solid var(--theme-header-border)',
          }}
        >
          <button
            className="lg:hidden"
            style={{ color: 'var(--theme-sidebar-text)' }}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
            <SelectedUserDropdown />
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://docs.myshm.ru/docs/contribution/donation/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm transition-all"
              style={{
                color: 'var(--theme-content-text-muted)'
              }}
              title="Спонсорство"
            >
              <Heart className="w-5 h-5" />
            </a>
            <a
              href="https://t.me/shm_billing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm transition-all"
              style={{
                color: 'var(--theme-content-text-muted)'
              }}
              title="Telegram"
            >
              <Send className="w-5 h-5" />
            </a>
            <VersionBadge />
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm transition-all"
              style={{
                color: 'var(--theme-content-text-muted)'
              }}
              title="Выйти"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
      {/* Global Template Modal */}
      <TemplateModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        data={selectedData}
        onSave={handleTemplateSave}
        onDelete={handleTemplateDelete}
      />
    </div>
  );
}

export default Layout;
