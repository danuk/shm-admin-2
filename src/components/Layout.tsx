import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import SelectedUserDropdown from './SelectedUserDropdown';
import {
  Users,
  Package,
  Server,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Home,
  Cloud,
  ListOrdered,
  CreditCard,
  Gift,
  HardDrive,
  Tag,
  Calendar,
  Layers,
  Key,
  Clock,
  Archive,
  FileText,
  Cog,
  Activity,
  Palette,
  Sun,
  Moon,
  Monitor,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBrandingStore } from '../store/brandingStore';
import { useThemeStore, ThemeMode } from '../store/themeStore';
import toast from 'react-hot-toast';

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
  { 
    name: 'Аналитика', 
    href: '/analytics', 
    icon: Home 
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
    icon: Activity,
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
      { name: 'Конфигурация', href: '/config' },
      { name: 'Брендинг', href: '/branding' },
      { name: 'Внешний вид', href: '/appearance' },
      { name: 'Кеширование', href: '/cache' },
    ]
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
  
  const currentTheme = themes.find(t => t.value === mode)!;
  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-icon"
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
                  <Icon className="w-4 h-4" />
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
  const { user, logout } = useAuthStore();
  const { branding, fetchBranding } = useBrandingStore();
  const { colors, applyTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>(['Пользователи']);
  const [manuallyClosed, setManuallyClosed] = useState<string[]>([]);

  useEffect(() => {
    fetchBranding();
    applyTheme();
  }, [fetchBranding, applyTheme]);

  useEffect(() => {
    document.title = branding.appTitle || branding.appName;
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

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--theme-content-bg)' }}>
      {}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: 'var(--theme-sidebar-bg)',
          borderRight: '1px solid var(--theme-sidebar-border)',
        }}
      >
        <div className="flex flex-col h-full">
          {}
          <div 
            className="flex items-center justify-between h-16 px-4"
            style={{ borderBottom: '1px solid var(--theme-sidebar-border)' }}
          >
            <Link to="/" className="flex items-center gap-3">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
              ) : (
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${colors.primaryColor}, ${colors.primaryColorHover})` }}
                >
                  <Home className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="text-lg font-bold" style={{ color: 'var(--theme-header-text)' }}>
                {branding.appName}
              </span>
            </Link>
            <button
              className="lg:hidden"
              style={{ color: 'var(--theme-sidebar-text)' }}
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {}
          <nav className="flex-1 overflow-y-auto py-4 px-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isMenuActive(item);
              const isOpen = openMenus.includes(item.name);
              
              if (item.href && !item.children) {
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`nav-item ${active ? 'active' : ''}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1">{item.name}</span>
                  </Link>
                );
              }
              
              return (
                <div key={item.name} className="mb-1">
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`nav-item w-full`}
                    style={{ 
                      color: active ? 'var(--theme-sidebar-text-active)' : undefined,
                      borderLeft: active ? '2px solid var(--theme-primary-color)' : undefined,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1 text-left">{item.name}</span>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {isOpen && item.children && (
                    <div 
                      className="ml-4 mt-1 space-y-1 pl-3"
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

          {}
          <div className="p-4" style={{ borderTop: '1px solid var(--theme-sidebar-border)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: `linear-gradient(135deg, ${colors.primaryColor}, ${colors.primaryColorHover})` }}
              >
                {user?.login?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-header-text)' }}>
                  {user?.login || '-'}
                </p>
                <p className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                  ID: {user?.user_id || '-'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
              style={{ color: 'var(--theme-sidebar-text)' }}
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
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
            <ThemeToggle />
          </div>
        </header>

        {}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
