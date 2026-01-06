import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  Server,
  CreditCard,
  Activity,
  TrendingUp,
  ArrowRight,
  DollarSign,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { StatCard, StatCardGrid, ChartCard } from '../components/analytics';
import { AreaLineChart, BarChart } from '../components/charts';
import {
  fetchDashboardAnalytics,
  DashboardAnalytics,
} from '../lib/dashboardApi';

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: '#22c55e',
    active: '#22c55e',
    BLOCK: '#ef4444',
    block: '#ef4444',
    NOT_PAID: '#f59e0b',
    not_paid: '#f59e0b',
    PROGRESS: '#3b82f6',
    progress: '#3b82f6',
    WAIT_PAYMENT: '#f59e0b',
  };
  return colors[status] || '#6b7280';
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      const data = await fetchDashboardAnalytics(7);

      // Добавляем метки дат и цвета для графиков
      const enrichedData: DashboardAnalytics = {
        ...data,
        payments: {
          timeline: data.payments.timeline.map(t => ({
            ...t,
            label: new Date(t.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
          })),
        },
        services: {
          byStatus: data.services.byStatus.map(s => ({
            ...s,
            color: getStatusColor(s.name),
          })),
        },
      };

      setAnalytics(enrichedData);

    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatMoney = (value: number) => `${value.toLocaleString()} ₽`;
  const formatDate = (date: string) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date;
    }
  };

  return (
    <div>
      {}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-xl font-bold">Главная</h2>
            <p style={{ color: 'var(--theme-content-text-muted)' }}>
              Обзор системы SHM
            </p>
          </div>
          </div>
        <button
          onClick={() => fetchDashboardData()}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Основные метрики */}
      <StatCardGrid columns={3}>
        <Link
          to="/users">
        <StatCard
          title="Общее количество пользователей"
          value={analytics?.counts.totalUsers ?? '...'}
          icon={Users}
          color="cyan"
          loading={loading}
        />
        </Link>
        <Link
          to="/user-services">
        <StatCard
          title="Общее количество услуг пользователей"
          value={analytics?.counts.userServicesCount ?? '...'}
          icon={Package}
          color="emerald"
          loading={loading}
        />
        </Link>
        <Link
          to="/pays">
        <StatCard
          title="Платежи за последние 7 дней"
          value={analytics?.counts.totalRevenue ?? '...'}
          icon={Package}
          color="emerald"
          loading={loading}
        />
        </Link>
      </StatCardGrid>

      {/* Графики и аналитика */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* График платежей */}
        <ChartCard
          title="Динамика платежей"
          subtitle="За последние 7 дней"
          icon={TrendingUp}
          iconColor="text-cyan-400"
          loading={loading}
        >
          {analytics && analytics.payments.timeline.length > 0 ? (
            <AreaLineChart
              data={analytics.payments.timeline}
              height={220}
              color="#22d3ee"
              valueFormatter={formatMoney}
            />
          ) : (
            <div className="flex items-center justify-center h-[220px]" style={{ color: 'var(--theme-content-text-muted)' }}>
              Нет данных о платежах
            </div>
          )}
        </ChartCard>
        <ChartCard
          title="Услуги по статусу"
          subtitle="Текущее распределение"
          icon={Package}
          iconColor="text-violet-400"
          loading={loading}
          actions={
            <Link
              to="/user-services"
              className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--theme-primary-color)' }}
            >
              Все услуги <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {analytics && analytics.services.byStatus.length > 0 ? (
            <BarChart
              data={analytics.services.byStatus}
              height={220}
              layout="vertical"
            />
          ) : (
            <div className="flex items-center justify-center h-[220px]" style={{ color: 'var(--theme-content-text-muted)' }}>
              Нет данных об услугах
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export default Dashboard;
