import { useEffect, useState, useRef } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Package,
  Server,
  CreditCard,
  Activity,
  Calendar,
  ArrowDownRight,
  BarChart3,
  RefreshCw,
  Target,
  Percent,
  UserCheck,
  Crown,
  Repeat,
  Download,
  ShoppingCart,
  Zap,
  PieChart,
} from 'lucide-react';
import Help from '../components/Help';
import { StatCard, StatCardGrid, ChartCard, MetricRow, EmptyState } from '../components/analytics';
import { AreaLineChart, BarChart, MultiLineChart } from '../components/charts';
import { useCacheStore } from '../store/cacheStore';
import {
  fetchPaymentStats,
  fetchUserServiceStats,
  fetchUserStats,
  fetchRevenueStats,
  fetchTaskStats,
  fetchTopServices,
  fetchServerStats,
  fetchFinancialMetrics,
  fetchTopCustomers,
  fetchMRRStats,
  PaymentStats,
  UserServiceStats,
  UserStats,
  RevenueStats,
  FinancialMetrics,
  TopCustomer,
  MRRStats,
} from '../lib/analyticsApi';

type TimePeriod = 7 | 14 | 30 | 90 | 'month';

function Analytics() {
  const { settings, get: getCached, set: setCache, needsBackgroundRefresh } = useCacheStore();
  const [loading, setLoading] = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);
  const backgroundRefreshRef = useRef(false);
  const [period, setPeriod] = useState<TimePeriod>('month');
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [userServiceStats, setUserServiceStats] = useState<UserServiceStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [taskStats, setTaskStats] = useState<{ pending: number; completed: number; failed: number; byEvent: { name: string; value: number }[] } | null>(null);
  const [topServices, setTopServices] = useState<{ name: string; count: number; revenue: number }[]>([]);
  const [serverStats, setServerStats] = useState<{ total: number; byGroup: { name: string; value: number }[] } | null>(null);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [mrrStats, setMrrStats] = useState<MRRStats | null>(null);

  const periodCacheKey = `analytics_period_${period}`;
  const staticCacheKey = 'analytics_static';

  // Загрузка данных, не зависящих от периода (только при монтировании)
  const fetchStaticData = async (forceRefresh = false) => {
    if (!forceRefresh && settings.enabled) {
      const cached = getCached(staticCacheKey);
      if (cached) {
        setUserServiceStats(cached.userServiceStats);
        setTaskStats(cached.taskStats);
        setTopServices(cached.topServices);
        setServerStats(cached.serverStats);
        setFinancialMetrics(cached.financialMetrics);
        setTopCustomers(cached.topCustomers);
        setMrrStats(cached.mrrStats);
        
        // Проверяем, нужно ли фоновое обновление
        if (needsBackgroundRefresh(staticCacheKey) && !backgroundRefreshRef.current) {
          backgroundRefreshRef.current = true;
          setIsBackgroundRefresh(true);
          setTimeout(() => {
            fetchStaticData(true).finally(() => {
              setIsBackgroundRefresh(false);
              backgroundRefreshRef.current = false;
            });
          }, 100);
        }
        return;
      }
    }
    
    try {
      const [
        userServices,
        tasks,
        services,
        servers,
        financial,
        customers,
        mrr,
      ] = await Promise.all([
        fetchUserServiceStats(),
        fetchTaskStats(),
        fetchTopServices(),
        fetchServerStats(),
        fetchFinancialMetrics(),
        fetchTopCustomers(10),
        fetchMRRStats(),
      ]);

      const data = {
        userServiceStats: userServices,
        taskStats: tasks,
        topServices: services,
        serverStats: servers,
        financialMetrics: financial,
        topCustomers: customers,
        mrrStats: mrr,
      };

      setUserServiceStats(userServices);
      setTaskStats(tasks);
      setTopServices(services);
      setServerStats(servers);
      setFinancialMetrics(financial);
      setTopCustomers(customers);
      setMrrStats(mrr);

      if (settings.enabled) {
        setCache(staticCacheKey, data);
      }
    } catch (error) {
      console.error('Error fetching static data:', error);
    }
  };

  // Загрузка данных, зависящих от периода
  const fetchPeriodData = async (forceRefresh = false) => {
    if (!forceRefresh && settings.enabled) {
      const cached = getCached(periodCacheKey);
      if (cached) {
        setPaymentStats(cached.paymentStats);
        setUserStats(cached.userStats);
        setRevenueStats(cached.revenueStats);
        setPeriodLoading(false);
        
        // Проверяем, нужно ли фоновое обновление
        if (needsBackgroundRefresh(periodCacheKey) && !backgroundRefreshRef.current) {
          backgroundRefreshRef.current = true;
          setIsBackgroundRefresh(true);
          setTimeout(() => {
            fetchPeriodData(true).finally(() => {
              setIsBackgroundRefresh(false);
              backgroundRefreshRef.current = false;
            });
          }, 100);
        }
        return;
      }
    }

    setPeriodLoading(true);
    
    try {
      const [payments, users, revenue] = await Promise.all([
        fetchPaymentStats(period),
        fetchUserStats(period),
        fetchRevenueStats(period),
      ]);

      const data = {
        paymentStats: payments,
        userStats: users,
        revenueStats: revenue,
      };

      setPaymentStats(payments);
      setUserStats(users);
      setRevenueStats(revenue);

      if (settings.enabled) {
        setCache(periodCacheKey, data);
      }
    } catch (error) {
      console.error('Error fetching period data:', error);
    } finally {
      setPeriodLoading(false);
    }
  };

  // Начальная загрузка (при монтировании)
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStaticData(false),
        fetchPeriodData(false),
      ]);
      setLoading(false);
    };
    
    loadInitialData();
  }, []);

  // Обновление при изменении периода
  useEffect(() => {
    backgroundRefreshRef.current = false;
    fetchPeriodData(false);
  }, [period]);

  // Автоматическое обновление при активной вкладке
  useEffect(() => {
    if (!settings.backgroundRefresh || !settings.enabled) return;

    let intervalId: number | null = null;
    let isVisible = true;

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      
      if (isVisible && settings.backgroundRefresh) {
        // Вкладка стала активной - проверяем кеш и запускаем интервал
        if (needsBackgroundRefresh(staticCacheKey)) {
          fetchStaticData(true);
        }
        if (needsBackgroundRefresh(periodCacheKey)) {
          fetchPeriodData(true);
        }
        
        // Запускаем периодическое обновление (проверка каждые 30 секунд)
        if (intervalId) clearInterval(intervalId);
        intervalId = window.setInterval(() => {
          if (document.hidden) return; // Двойная проверка
          
          if (needsBackgroundRefresh(staticCacheKey)) {
            fetchStaticData(true);
          }
          if (needsBackgroundRefresh(periodCacheKey)) {
            fetchPeriodData(true);
          }
        }, 30000); // Проверяем каждые 30 секунд
      } else if (intervalId) {
        // Вкладка стала неактивной - останавливаем обновление
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Проверяем начальное состояние и запускаем интервал если вкладка активна
    if (!document.hidden) {
      intervalId = window.setInterval(() => {
        if (document.hidden) return;
        
        if (needsBackgroundRefresh(staticCacheKey)) {
          fetchStaticData(true);
        }
        if (needsBackgroundRefresh(periodCacheKey)) {
          fetchPeriodData(true);
        }
      }, 30000); // Проверяем каждые 30 секунд
    }

    // Слушаем изменения видимости страницы
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [settings.backgroundRefresh, settings.enabled, period]);

  const periodButtons: { value: TimePeriod; label: string }[] = [
    { value: 7, label: '7 дней' },
    { value: 14, label: '14 дней' },
    { value: 30, label: '30 дней' },
    { value: 90, label: '90 дней' },
    { value: 'month', label: 'Текущий месяц' },
  ];

  const revenueComparisonData = revenueStats ? 
    revenueStats.revenueTimeline.map((item, index) => ({
      ...item,
      revenue: item.value,
      withdraws: revenueStats.withdrawTimeline[index]?.value || 0,
    })) : [];

  return (
    <div>
      {}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Аналитика</h2>
          <Help content="<b>Аналитика</b>: детальная статистика и визуализация данных системы." />
          {settings.enabled && !loading && !periodLoading && getCached(periodCacheKey) && (
            <span 
              className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
              style={{ 
                backgroundColor: 'rgba(34, 211, 238, 0.1)',
                color: 'var(--theme-primary-color)',
                border: '1px solid rgba(34, 211, 238, 0.3)',
              }}
              title="Данные загружены из кеша"
            >
              <Activity className="w-3 h-3" />
              Кеш
            </span>
          )}
          {isBackgroundRefresh && (
            <span 
              className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
              style={{ 
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
              title="Обновление данных в фоне"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              Обновление
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--theme-card-border)' }}>
            {periodButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setPeriod(btn.value)}
                disabled={periodLoading}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  period === btn.value 
                    ? 'text-white' 
                    : ''
                }`}
                style={{
                  backgroundColor: period === btn.value ? 'var(--theme-primary-color)' : 'var(--theme-card-bg)',
                  color: period === btn.value ? 'white' : 'var(--theme-content-text-muted)',
                  opacity: periodLoading ? 0.6 : 1,
                  cursor: periodLoading ? 'wait' : 'pointer',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {}
          <button
            onClick={() => fetchPeriodData(true)}
            disabled={loading || periodLoading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || periodLoading) ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </div>

      {}
      <StatCardGrid columns={4}>
        <StatCard
          title="Выручка"
          value={revenueStats ? `${revenueStats.totalRevenue.toLocaleString()} ₽` : '...'}
          icon={DollarSign}
          color="emerald"
          subtitle={period === 'month' ? 'Текущий месяц' : `За ${period} дней`}
          loading={loading}
        />
        <StatCard
          title="Списания"
          value={revenueStats ? `${revenueStats.totalWithdraws.toLocaleString()} ₽` : '...'}
          icon={ArrowDownRight}
          color="rose"
          subtitle={period === 'month' ? 'Текущий месяц' : `За ${period} дней`}
          loading={loading}
        />
        <StatCard
          title="Новые пользователи"
          value={userStats?.newUsers ?? '...'}
          icon={Users}
          color="cyan"
          subtitle={period === 'month' ? 'Текущий месяц' : `За ${period} дней`}
          loading={loading}
        />
        <StatCard
          title="Платежей"
          value={paymentStats?.count ?? '...'}
          icon={CreditCard}
          color="violet"
          subtitle={`Всего: ${paymentStats?.total.toLocaleString() || 0} ₽`}
          loading={loading}
        />
      </StatCardGrid>

      {}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--theme-content-text)' }}>
          Финансовые метрики
        </h3>
        <StatCardGrid columns={5}>
          <StatCard
            title="MRR"
            value={mrrStats ? `${Math.round(mrrStats.mrr).toLocaleString()} ₽` : '...'}
            icon={Repeat}
            color="emerald"
            subtitle={mrrStats && mrrStats.mrrGrowth !== 0 
              ? `${mrrStats.mrrGrowth > 0 ? '+' : ''}${mrrStats.mrrGrowth.toFixed(1)}% к пред. месяцу` 
              : 'Регулярный доход'}
            loading={loading}
          />
          <StatCard
            title="ARPU"
            value={financialMetrics ? `${Math.round(financialMetrics.arpu).toLocaleString()} ₽` : '...'}
            icon={Target}
            color="blue"
            subtitle="Выручка на пользователя"
            loading={loading}
          />
          <StatCard
            title="ARPPU"
            value={financialMetrics ? `${Math.round(financialMetrics.arppu).toLocaleString()} ₽` : '...'}
            icon={UserCheck}
            color="cyan"
            subtitle="Выручка на платящего"
            loading={loading}
          />
          <StatCard
            title="LTV"
            value={financialMetrics ? `${Math.round(financialMetrics.ltv).toLocaleString()} ₽` : '...'}
            icon={TrendingUp}
            color="violet"
            subtitle="Пожизненная ценность"
            loading={loading}
          />
          <StatCard
            title="Churn Rate"
            value={financialMetrics ? `${financialMetrics.churnRate.toFixed(1)}%` : '...'}
            icon={Percent}
            color={financialMetrics && financialMetrics.churnRate > 10 ? 'rose' : 'amber'}
            subtitle="Отток услуг"
            loading={loading}
          />
        </StatCardGrid>
      </div>

      {}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--theme-content-text)' }}>
          Конверсия и платежи
        </h3>
        <StatCardGrid columns={4}>
          <StatCard
            title="Конверсия"
            value={financialMetrics ? `${financialMetrics.conversionRate.toFixed(1)}%` : '...'}
            icon={PieChart}
            color={financialMetrics && financialMetrics.conversionRate > 20 ? 'emerald' : 'amber'}
            subtitle={`${financialMetrics?.payingUsersCount || 0} из ${financialMetrics?.totalUsers || 0} платили`}
            loading={loading}
          />
          <StatCard
            title="Средний чек"
            value={financialMetrics ? `${Math.round(financialMetrics.avgRevenuePerPayment).toLocaleString()} ₽` : '...'}
            icon={ShoppingCart}
            color="cyan"
            subtitle="Сумма на платёж"
            loading={loading}
          />
          <StatCard
            title="Платежей на клиента"
            value={financialMetrics ? financialMetrics.avgPaymentsPerUser.toFixed(1) : '...'}
            icon={Zap}
            color="violet"
            subtitle="Среднее кол-во"
            loading={loading}
          />
          <StatCard
            title="Платящих клиентов"
            value={financialMetrics?.payingUsersCount ?? '...'}
            icon={UserCheck}
            color="blue"
            subtitle={`${((financialMetrics?.payingUsersCount || 0) / (financialMetrics?.totalUsers || 1) * 100).toFixed(0)}% от всех`}
            loading={loading}
          />
        </StatCardGrid>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {}
        <ChartCard
          title="Выручка и списания"
          subtitle="Сравнение по дням"
          icon={TrendingUp}
          iconColor="text-emerald-400"
          loading={loading}
        >
          {revenueComparisonData.length > 0 ? (
            <MultiLineChart
              data={revenueComparisonData}
              lines={[
                { dataKey: 'revenue', name: 'Выручка', color: '#22c55e', type: 'area' },
                { dataKey: 'withdraws', name: 'Списания', color: '#ef4444', type: 'line' },
              ]}
              height={280}
              valueFormatter={(v) => `${v.toLocaleString()} ₽`}
            />
          ) : (
            <EmptyState icon={TrendingUp} />
          )}
        </ChartCard>

        {}
        <ChartCard
          title="Услуги по статусу"
          subtitle="Распределение активных услуг"
          icon={BarChart3}
          iconColor="text-violet-400"
          loading={loading}
        >
          {userServiceStats && userServiceStats.byStatus.length > 0 ? (
            <BarChart
              data={userServiceStats.byStatus}
              height={280}
              layout="vertical"
            />
          ) : (
            <EmptyState icon={BarChart3} />
          )}
        </ChartCard>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {}
        <ChartCard
          title="Динамика платежей"
          subtitle={period === 'month' ? 'Сумма платежей за текущий месяц' : `Сумма платежей за ${period} дней`}
          icon={CreditCard}
          iconColor="text-cyan-400"
          loading={loading}
        >
          {paymentStats && paymentStats.timeline.length > 0 ? (
            <AreaLineChart
              data={paymentStats.timeline}
              height={250}
              color="#22d3ee"
              valueFormatter={(v) => `${v.toLocaleString()} ₽`}
              averageLine
            />
          ) : (
            <EmptyState icon={CreditCard} />
          )}
        </ChartCard>

        {}
        <ChartCard
          title="Регистрации"
          subtitle={period === 'month' ? 'Новые пользователи за текущий месяц' : `Новые пользователи за ${period} дней`}
          icon={Users}
          iconColor="text-blue-400"
          loading={loading}
        >
          {userStats && userStats.timeline.length > 0 ? (
            <AreaLineChart
              data={userStats.timeline}
              height={250}
              color="#3b82f6"
              averageLine
            />
          ) : (
            <EmptyState icon={Users} />
          )}
        </ChartCard>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {}
        <ChartCard
          title="Популярные услуги"
          subtitle="Топ-10 по количеству"
          icon={Package}
          iconColor="text-amber-400"
          loading={loading}
        >
          {topServices.length > 0 ? (
            <BarChart
              data={topServices.map(s => ({ name: s.name, value: s.count }))}
              layout="vertical"
              height={280}
            />
          ) : (
            <EmptyState icon={Package} />
          )}
        </ChartCard>

        {}
        <ChartCard
          title="Платежные системы"
          subtitle="Распределение по сумме"
          icon={CreditCard}
          iconColor="text-emerald-400"
          loading={loading}
        >
          {paymentStats && paymentStats.byPaySystem.length > 0 ? (
            <BarChart
              data={paymentStats.byPaySystem}
              height={280}
              layout="vertical"
              valueFormatter={(v) => `${v.toLocaleString()} ₽`}
            />
          ) : (
            <EmptyState icon={CreditCard} />
          )}
        </ChartCard>

        {}
        <ChartCard
          title="Задачи"
          subtitle="Статистика выполнения"
          icon={Activity}
          iconColor="text-rose-400"
          loading={loading}
        >
          {taskStats ? (
            <BarChart
              data={[
                { name: 'В очереди', value: taskStats.pending, color: '#f59e0b' },
                { name: 'Выполнено', value: taskStats.completed, color: '#22c55e' },
                { name: 'Ошибки', value: taskStats.failed, color: '#ef4444' },
              ]}
              height={200}
            />
          ) : (
            <EmptyState icon={Activity} />
          )}
        </ChartCard>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {}
        <ChartCard
          title="Детализация услуг"
          subtitle="Статистика по каждой услуге"
          icon={BarChart3}
          iconColor="text-violet-400"
          loading={loading}
        >
          {userServiceStats && userServiceStats.byService.length > 0 ? (
            <div className="max-h-72 overflow-y-auto">
              {userServiceStats.byService.map((service, idx) => {
                const total = userServiceStats.byService.reduce((s, i) => s + i.value, 0);
                return (
                  <MetricRow
                    key={service.name}
                    label={service.name}
                    value={service.value}
                    percentage={(service.value / total) * 100}
                    color={[
                      '#22d3ee', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444',
                      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
                    ][idx % 10]}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState icon={BarChart3} />
          )}
        </ChartCard>

        {}
        <ChartCard
          title="Серверы по группам"
          subtitle="Распределение серверов"
          icon={Server}
          iconColor="text-orange-400"
          loading={loading}
        >
          {serverStats && serverStats.byGroup.length > 0 ? (
            <BarChart
              data={serverStats.byGroup}
              height={250}
            />
          ) : (
            <EmptyState 
              icon={Server} 
              title="Нет данных о серверах"
              description="Серверы не найдены в системе"
            />
          )}
        </ChartCard>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatCard
          title="Всего пользователей"
          value={userStats?.total ?? '...'}
          icon={Users}
          color="blue"
          subtitle={`Активных за 7 дней: ${userStats?.activeUsers ?? 0}`}
          loading={loading}
        />
        <StatCard
          title="Активных услуг"
          value={userServiceStats?.total ?? '...'}
          icon={Package}
          color="amber"
          loading={loading}
        />
        <StatCard
          title="Серверов"
          value={serverStats?.total ?? '...'}
          icon={Server}
          color="orange"
          loading={loading}
        />
        <StatCard
          title="Чистая выручка"
          value={revenueStats ? `${revenueStats.netRevenue.toLocaleString()} ₽` : '...'}
          icon={TrendingUp}
          color="emerald"
          subtitle="Выручка минус списания"
          loading={loading}
        />
      </div>

      {}
      <div className="mt-6">
        <ChartCard
          title="Топ клиентов"
          subtitle="По сумме платежей"
          icon={Crown}
          iconColor="text-amber-400"
          loading={loading}
        >
          {topCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--theme-table-border)' }}>
                    <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--theme-content-text-muted)' }}>#</th>
                    <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--theme-content-text-muted)' }}>Пользователь</th>
                    <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--theme-content-text-muted)' }}>Сумма</th>
                    <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--theme-content-text-muted)' }}>Платежей</th>
                    <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--theme-content-text-muted)' }}>Услуг</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((customer, idx) => (
                    <tr 
                      key={customer.userId} 
                      className="hover:opacity-80 transition-opacity"
                      style={{ borderBottom: '1px solid var(--theme-table-border)' }}
                    >
                      <td className="py-2 px-3">
                        {idx < 3 ? (
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            idx === 0 ? 'bg-amber-500 text-white' :
                            idx === 1 ? 'bg-gray-400 text-white' :
                            'bg-amber-700 text-white'
                          }`}>
                            {idx + 1}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--theme-content-text-muted)' }}>{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-medium" style={{ color: 'var(--theme-content-text)' }}>
                        {customer.login}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold" style={{ color: '#22c55e' }}>
                        {Math.round(customer.totalPayments).toLocaleString()} ₽
                      </td>
                      <td className="py-2 px-3 text-right" style={{ color: 'var(--theme-content-text-muted)' }}>
                        {customer.paymentsCount}
                      </td>
                      <td className="py-2 px-3 text-right" style={{ color: 'var(--theme-content-text-muted)' }}>
                        {customer.servicesCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Crown} title="Нет данных о клиентах" />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export default Analytics;
