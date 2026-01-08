import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  CreditCard,
  TrendingUp,
  ArrowRight,
  DollarSign,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  UserCheck,
  UserMinus,
  Wallet,
  Target,
  AlertTriangle,
  Zap,
  Star,
} from 'lucide-react';
import { StatCard, StatCardGrid, ChartCard } from '../components/analytics';
import { AreaLineChart, BarChart } from '../components/charts';
import Help from '../components/Help';
import {
  fetchAnalyticsReport,
  clearAnalyticsCache,
  formatMoney,
  formatPercent,
  formatMonth,
  getWeekdayName,
  AnalyticsReport,
  Granularity,
  TimelineDataDay,
  TimelineDataWeek,
  TimelineDataMonth,
} from '../lib/analyticsApi';
import toast from 'react-hot-toast';

// Форматирование дня (для графиков по дням)
function formatDay(day: string): string {
  if (!day) return '';
  const parts = day.split('-');
  if (parts.length < 3) return day;
  return `${parts[2]}.${parts[1]}`;
}

// Форматирование недели (для графиков по неделям)
function formatWeek(weekStart: string): string {
  if (!weekStart) return '';
  const parts = weekStart.split('-');
  if (parts.length < 3) return weekStart;
  return `${parts[2]}.${parts[1]}`;
}

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null);
  const [period, setPeriod] = useState(6);

  const fetchData = async (noCache: boolean = false) => {
    setLoading(true);
    try {
      const data = await fetchAnalyticsReport(period, noCache);
      setAnalytics(data);
    } catch (error) {
      toast.error('Ошибка загрузки аналитики');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const handleRefresh = async () => {
    await clearAnalyticsCache();
    await fetchData(true);
    toast.success('Данные обновлены');
  };

  // Определяем гранулярность данных из API
  const apiGranularity: Granularity = analytics?.granularity || 'month';

  // Функция для форматирования лейбла в зависимости от гранулярности
  const formatTimelineLabel = (item: TimelineDataDay | TimelineDataWeek | TimelineDataMonth): string => {
    if ('day' in item) return formatDay(item.day);
    if ('week_start' in item) return formatWeek(item.week_start);
    if ('month' in item) return formatMonth(item.month);
    return '';
  };

  // Подготовка данных для графика выручки (с учётом гранулярности)
  const revenueChartData = (() => {
    if (!analytics) return [];

    // Используем revenue_timeline если есть (по дням/неделям)
    if (analytics.revenue_timeline && analytics.revenue_timeline.length > 0) {
      return analytics.revenue_timeline.map((item) => ({
        date: 'day' in item ? item.day : ('week' in item ? item.week : item.month),
        value: parseFloat(item.revenue || '0'),
        label: formatTimelineLabel(item as TimelineDataDay | TimelineDataWeek | TimelineDataMonth),
      }));
    }

    // Fallback на revenue_by_month (с защитой от null)
    if (!analytics.revenue_by_month || !Array.isArray(analytics.revenue_by_month)) return [];

    return analytics.revenue_by_month
      .slice()
      .reverse()
      .map((item) => ({
        date: item?.month || '',
        value: parseFloat(item?.revenue || '0'),
        label: formatMonth(item?.month || ''),
      }));
  })();

  // Определяем реальную гранулярность для графика выручки
  const revenueGranularity: Granularity = (analytics?.revenue_timeline && analytics.revenue_timeline.length > 0)
    ? apiGranularity
    : 'month';

  // Подготовка данных для графика начислений (с учётом гранулярности)
  const chargesChartData = (() => {
    if (!analytics) return [];

    // Используем charges_timeline если есть (по дням/неделям)
    if (analytics.charges_timeline && analytics.charges_timeline.length > 0) {
      return analytics.charges_timeline.map((item) => ({
        date: 'day' in item ? item.day : ('week' in item ? item.week : item.month),
        value: parseFloat(item.net_charged || '0'),
        label: formatTimelineLabel(item as TimelineDataDay | TimelineDataWeek | TimelineDataMonth),
      }));
    }

    // Fallback на charges_by_month (с защитой от null)
    const chargesByMonth = analytics.charges?.charges_by_month;
    if (!chargesByMonth || !Array.isArray(chargesByMonth)) return [];

    return chargesByMonth
      .slice()
      .reverse()
      .map((item) => ({
        date: item?.month || '',
        value: parseFloat(item?.net_charged || '0'),
        label: formatMonth(item?.month || ''),
      }));
  })();

  // Определяем реальную гранулярность для графика начислений
  const chargesGranularity: Granularity = (analytics?.charges_timeline && analytics.charges_timeline.length > 0)
    ? apiGranularity
    : 'month';

  const paymentsBySystemData = analytics?.payment_metrics?.by_paysystem
    ?.filter((p) => p?.pay_system !== 'manual')
    .map((item) => ({
      name: item?.pay_system || 'unknown',
      value: parseFloat(item?.total || '0'),
    })) || [];

  const paymentsByWeekdayData = analytics?.payment_metrics?.by_weekday
    ?.map((item) => ({
      name: getWeekdayName(item?.weekday || 1).slice(0, 3),
      value: parseFloat(item?.total || '0'),
    })) || [];

  const servicesStatusData = analytics?.popular_services
    ?.filter((s) => s?.active_subscriptions > 0)
    .slice(0, 5)
    .map((item) => ({
      name: (item?.service_name || 'Unknown').length > 20
        ? (item?.service_name || 'Unknown').slice(0, 20) + '...'
        : (item?.service_name || 'Unknown'),
      value: item?.active_subscriptions || 0,
    })) || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Аналитика</h2>
          <p style={{ color: 'var(--theme-content-text-muted)' }}>
            {analytics?.generated_at ? `Обновлено: ${analytics.generated_at}` : 'Загрузка...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="input-field px-3 py-2"
            style={{ width: 'auto', backgroundColor: 'var(--theme-input-bg)', color: 'var(--theme-input-text)' }}
          >
            <option value={1} style={{ backgroundColor: 'var(--theme-input-bg)', color: 'var(--theme-input-text)' }}>1 месяц</option>
            <option value={3} style={{ backgroundColor: 'var(--theme-input-bg)', color: 'var(--theme-input-text)' }}>3 месяца</option>
            <option value={6} style={{ backgroundColor: 'var(--theme-input-bg)', color: 'var(--theme-input-text)' }}>6 месяцев</option>
            <option value={12} style={{ backgroundColor: 'var(--theme-input-bg)', color: 'var(--theme-input-text)' }}>12 месяцев</option>
            <option value={0} style={{ backgroundColor: 'var(--theme-input-bg)', color: 'var(--theme-input-text)' }}>За всё время</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Обновить</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <StatCardGrid columns={4}>
        <StatCard
          title={<>Всего пользователей <Help content="<b>Всего пользователей</b><br/><br/>Общее количество зарегистрированных пользователей в системе.<br/><br/><b>Активные</b> — пользователи, у которых есть хотя бы одна активная услуга или положительный баланс." /></>}
          value={analytics?.overview.total_users ?? '...'}
          subtitle={`Активных: ${analytics?.overview.active_users ?? 0}`}
          icon={Users}
          color="cyan"
          loading={loading}
        />
        <StatCard
          title={<>Платящих клиентов <Help content="<b>Платящих клиентов</b><br/><br/>Количество уникальных пользователей, которые совершили хотя бы один платёж за выбранный период.<br/><br/>Показывает активность клиентской базы и конверсию в платящих клиентов." /></>}
          value={analytics?.overview.active_paying_users ?? '...'}
          subtitle={period > 0 ? `За ${period} мес.` : 'За всё время'}
          icon={UserCheck}
          color="emerald"
          loading={loading}
        />
        <StatCard
          title={<>Общая выручка за период<Help content="<b>Общая выручка</b><br/><br/>Сумма всех поступлений (платежей) за выбранный период.<br/><br/>Включает платежи через все платёжные системы, а также ручные зачисления администратором." /></>}
          value={analytics?.revenue ? formatMoney(analytics.revenue.total_revenue) : '...'}
          subtitle={period > 0 ? `Платежей за ${period} мес.: ${analytics?.revenue?.payments_count ?? 0}` : 'Платежей за всё время: ' + (analytics?.revenue ? `${analytics.revenue.payments_count} платежей` : '')}
          icon={DollarSign}
          color="violet"
          loading={loading}
        />
        <StatCard
          title={<>Активных услуг <Help content="<b>Активных услуг</b><br/><br/>Количество подписок со статусом 'ACTIVE' (услуга активна и работает).<br/><br/><b>Всего</b> — общее количество всех подписок в системе, включая отключённые и заблокированные." /></>}
          value={analytics?.overview.active_services ?? '...'}
          subtitle={`Всего: ${analytics?.overview.total_services ?? 0}`}
          icon={Package}
          color="amber"
          loading={loading}
        />
      </StatCardGrid>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ChartCard
          title={<>Динамика выручки <Help content="<b>Динамика выручки</b><br/><br/>График показывает сумму поступлений (платежей).<br/><br/>Детализация: 1 месяц — по дням, остальные периоды — по месяцам.<br/><br/>Пунктирная линия показывает средний уровень выручки за период." /></>}
          subtitle={
            revenueGranularity === 'day' ? 'По дням' :
            period > 0 ? `По месяцам (${period} мес.)` : 'По месяцам (всё время)'
          }
          icon={TrendingUp}
          iconColor="text-emerald-400"
          loading={loading}
        >
          {revenueChartData.length > 0 ? (
            <AreaLineChart
              data={revenueChartData}
              height={250}
              color="#22c55e"
              valueFormatter={formatMoney}
              averageLine
            />
          ) : (
            <div className="flex items-center justify-center h-[250px]" style={{ color: 'var(--theme-content-text-muted)' }}>
              Нет данных
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={<>Списании (нетто) <Help content="<b>Списании (нетто)</b><br/><br/>Сумма фактических списаний с денежного баланса клиентов за услуги (без учёта бонусов).<br/><br/><b>Нетто</b> = Стоимость услуг - Оплачено бонусами<br/><br/>Детализация: 1 месяц — по дням, остальные периоды — по месяцам." /></>}
          subtitle={
            chargesGranularity === 'day' ? 'По дням' :
            period > 0 ? `По месяцам (${period} мес.)` : 'По месяцам (всё время)'
          }
          icon={BarChart3}
          iconColor="text-cyan-400"
          loading={loading}
        >
          {chargesChartData.length > 0 ? (
            <AreaLineChart
              data={chargesChartData}
              height={250}
              color="#22d3ee"
              valueFormatter={formatMoney}
            />
          ) : (
            <div className="flex items-center justify-center h-[250px]" style={{ color: 'var(--theme-content-text-muted)' }}>
              Нет данных
            </div>
          )}
        </ChartCard>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-violet-400" />
            <span className="font-semibold" style={{ color: 'var(--theme-content-text)' }}>LTV</span>
            <Help content="<b>LTV (Lifetime Value)</b><br/><br/>Пожизненная ценность клиента — сколько денег в среднем приносит один клиент за всё время.<br/><br/><b>Средний LTV</b> — средняя сумма всех платежей одного клиента<br/><b>Ср. чек</b> — средняя сумма одного платежа<br/><b>Платежей/клиент</b> — среднее количество платежей на одного клиента" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Средний LTV</span>
              <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                {analytics ? formatMoney(analytics.ltv.avg_ltv) : '...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Ср. чек</span>
              <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                {analytics ? formatMoney(analytics.ltv.avg_payment_amount) : '...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Платежей/клиент</span>
              <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                {analytics?.ltv.avg_payments_per_user ?? '...'}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold" style={{ color: 'var(--theme-content-text)' }}>Продления</span>
            <Help content="<b>Метрики продлений</b><br/><br/><b>Renewal Rate</b> — процент услуг, которые были продлены хотя бы один раз.<br/>Формула: (Продлено / Всего) × 100%<br/><br/><b>Продлено услуг</b> — количество услуг с несколькими списаниями<br/><b>Ср. срок услуги</b> — средняя продолжительность активной подписки в днях" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Renewal Rate</span>
              <span className="font-medium text-emerald-400">
                {analytics ? formatPercent(analytics.renewal.renewal_rate) : '...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Продлено услуг</span>
              <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                {analytics?.renewal.renewed_services ?? '...'} / {analytics?.renewal.total_services ?? '...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Ср. срок услуги</span>
              <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                {analytics?.renewal.avg_service_lifetime_days ?? '...'} дн.
              </span>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserMinus className="w-5 h-5 text-amber-400" />
            <span className="font-semibold" style={{ color: 'var(--theme-content-text)' }}>Клиенты</span>
            <Help content="<b>Динамика клиентов</b><br/><br/><b>Новых</b> — зарегистрировались за выбранный период<br/><b>Платящих</b> — совершили хотя бы один платёж<br/><b>Заблокировано</b> — количество заблокированных пользователей (churn)<br/><br/>Рост новых клиентов при низком churn — признак здорового бизнеса." />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Новых</span>
              <span className="font-medium text-emerald-400">+{analytics?.churn.new_users ?? '...'}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Платящих</span>
              <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                {analytics?.churn.paying_users ?? '...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Заблокировано</span>
              <span className="font-medium text-rose-400">{analytics?.churn.churned_users ?? '...'}</span>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold" style={{ color: 'var(--theme-content-text)' }}>Биллинг</span>
            <Help content="<b>Эффективность биллинга</b><br/><br/><b>Ожидают оплаты</b> — услуги в статусе WAIT_FOR_PAY (требуют пополнения баланса)<br/><b>Ср. время оплаты</b> — сколько часов в среднем проходит от выставления счёта до оплаты<br/><b>Заблокировано</b> — услуги в статусе BLOCK (отключены за неоплату)" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Ожидают оплаты</span>
              <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                {analytics?.billing_efficiency.services_waiting_for_pay ?? '...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Ср. время оплаты</span>
              <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                {analytics?.billing_efficiency.avg_payment_delay_hours ?? '...'} ч.
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Заблокировано</span>
              <span className="font-medium text-rose-400">
                {analytics?.billing_efficiency.services_blocked ?? '...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ChartCard
          title={<>Платежи по системам <Help content="<b>Платежи по системам</b><br/><br/>Распределение суммы платежей по разным платёжным системам.<br/><br/>Показывает популярность способов оплаты у клиентов.<br/><br/>Ручные зачисления (manual) не учитываются в этом графике." /></>}
          subtitle="Без учёта ручных зачислений"
          icon={CreditCard}
          iconColor="text-violet-400"
          loading={loading}
        >
          {paymentsBySystemData.length > 0 ? (
            <BarChart
              data={paymentsBySystemData}
              height={220}
              layout="vertical"
              valueFormatter={formatMoney}
            />
          ) : (
            <div className="flex items-center justify-center h-[220px]" style={{ color: 'var(--theme-content-text-muted)' }}>
              Нет данных
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={<>Активные услуги <Help content="<b>Активные услуги</b><br/><br/>Топ-5 услуг по количеству активных подписок.<br/><br/>Показывает самые востребованные услуги среди клиентов." /></>}
          subtitle="Топ-5 по количеству подписок"
          icon={Package}
          iconColor="text-emerald-400"
          loading={loading}
          actions={
            <Link
              to="/services"
              className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--theme-primary-color)' }}
            >
              Все услуги <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {servicesStatusData.length > 0 ? (
            <BarChart
              data={servicesStatusData}
              height={220}
              layout="vertical"
            />
          ) : (
            <div className="flex items-center justify-center h-[220px]" style={{ color: 'var(--theme-content-text-muted)' }}>
              Нет активных услуг
            </div>
          )}
        </ChartCard>
      </div>



      {/* Payment Weekdays */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-6">

        <ChartCard
          title={<>Платежи по дням недели <Help content="<b>Платежи по дням недели</b><br/><br/>Распределение суммы платежей по дням недели.<br/><br/>Помогает понять, когда клиенты чаще всего совершают платежи.<br/><br/>Полезно для:<br/>• Планирования рассылок с напоминаниями об оплате<br/>• Запуска акций и скидок в 'активные' дни" /></>}
          subtitle="Сумма платежей"
          icon={Clock}
          iconColor="text-amber-400"
          loading={loading}
        >
          {paymentsByWeekdayData.length > 0 ? (
            <BarChart
              data={paymentsByWeekdayData}
              height={220}
              valueFormatter={formatMoney}
            />
          ) : (
            <div className="flex items-center justify-center h-[220px]" style={{ color: 'var(--theme-content-text-muted)' }}>
              Нет данных
            </div>
          )}
        </ChartCard>
      </div>

      {/* Service Profitability & Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ChartCard
          title={<>Прибыльность услуг <Help content="<b>Прибыльность услуг</b><br/><br/>Топ-10 услуг по сумме выручки за период.<br/><br/><b>Общая выручка</b> — полная стоимость проданных услуг<br/><b>Нетто</b> — выручка минус бонусы (реальные деньги)<br/><b>Продажи</b> — количество оплаченных подписок<br/><b>Клиенты</b> — уникальные покупатели" /></>}
          subtitle="Топ услуг по выручке"
          icon={Star}
          iconColor="text-amber-400"
          loading={loading}
        >
          <div className="max-h-[300px] overflow-y-auto">
            {analytics?.service_profitability
              ?.filter((s) => parseFloat(s.total_revenue) > 0)
              .slice(0, 10)
              .map((service, index) => (
                <div
                  key={service.service_id}
                  className="flex items-center justify-between py-3 border-b last:border-b-0"
                  style={{ borderColor: 'var(--theme-card-border)' }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--theme-sidebar-item-active-bg)',
                        color: 'var(--theme-primary-color)',
                      }}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                        {service.service_name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                        {service.sales_count} продаж · {service.unique_buyers} клиентов
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-emerald-400">
                      {formatMoney(service.total_revenue)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                      нетто: {formatMoney(service.net_revenue)}
                    </p>
                  </div>
                </div>
              )) || (
              <div className="flex items-center justify-center py-8" style={{ color: 'var(--theme-content-text-muted)' }}>
                Нет данных
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title={<>Топ клиентов <Help content="<b>Топ клиентов</b><br/><br/>Топ-10 клиентов по общей сумме платежей.<br/><br/>Показывает самых ценных клиентов для бизнеса.<br/><br/><b>Платежей</b> — количество совершённых платежей<br/><b>Активных услуг</b> — текущие активные подписки<br/><b>Баланс</b> — текущий баланс клиента" /></>}
          subtitle="По сумме платежей"
          icon={Users}
          iconColor="text-cyan-400"
          loading={loading}
          actions={
            <Link
              to="/users"
              className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--theme-primary-color)' }}
            >
              Все клиенты <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="max-h-[300px] overflow-y-auto">
            {analytics?.top_clients?.slice(0, 10).map((client, index) => (
              <div
                key={client.user_id}
                className="flex items-center justify-between py-3 border-b last:border-b-0"
                style={{ borderColor: 'var(--theme-card-border)' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{
                      backgroundColor: index < 3 ? 'rgba(251, 191, 36, 0.2)' : 'var(--theme-sidebar-item-active-bg)',
                      color: index < 3 ? '#fbbf24' : 'var(--theme-primary-color)',
                    }}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                      {client.full_name || client.login}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                      {client.payments_count} платежей · {client.active_services} активных услуг
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-emerald-400">
                    {formatMoney(client.total_payments)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                    баланс: {formatMoney(client.balance)}
                  </p>
                </div>
              </div>
            )) || (
              <div className="flex items-center justify-center py-8" style={{ color: 'var(--theme-content-text-muted)' }}>
                Нет данных
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Receivables & Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="font-semibold" style={{ color: 'var(--theme-content-text)' }}>Дебиторская задолженность</span>
            <Help content="<b>Дебиторская задолженность</b><br/><br/>Сумма долгов клиентов с отрицательным балансом.<br/><br/>Это клиенты, которые должны вам деньги (их баланс в минусе).<br/><br/><b>Возрастная структура долга:</b><br/>• < 30 дней — свежие долги<br/>• 30-90 дней — проблемные<br/>• > 90 дней — вероятно безнадёжные<br/><br/>Рекомендуется следить за этим показателем и работать с должниками." />
          </div>
          <div className="text-3xl font-bold text-amber-400 mb-2">
            {analytics ? formatMoney(analytics.receivables.total_debt) : '...'}
          </div>
          <p style={{ color: 'var(--theme-content-text-muted)' }}>
            {analytics?.receivables.debtors_count ?? 0} должников
          </p>
          {analytics?.receivables.debt_aging && analytics.receivables.debt_aging.length > 0 && (
            <div className="mt-4 space-y-2">
              {analytics.receivables.debt_aging.map((bucket) => (
                <div key={bucket.age_bucket} className="flex justify-between text-sm">
                  <span style={{ color: 'var(--theme-content-text-muted)' }}>{bucket.age_bucket}</span>
                  <span style={{ color: 'var(--theme-content-text)' }}>
                    {bucket.users_count} · {formatMoney(bucket.total_debt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold" style={{ color: 'var(--theme-content-text)' }}>Баланс клиентов</span>
            <Help content="<b>Баланс клиентов</b><br/><br/>Общая сумма денег на балансах всех активных клиентов.<br/><br/>Это средства, которые уже получены, но ещё не списаны за услуги.<br/><br/><b>Бонусы</b> — отдельный бонусный баланс клиентов (начисления по партнёрской программе и акциям)." />
          </div>
          <div className="text-3xl font-bold text-emerald-400 mb-2">
            {analytics ? formatMoney(analytics.overview.total_balance) : '...'}
          </div>
          <p style={{ color: 'var(--theme-content-text-muted)' }}>
            Общий баланс активных клиентов
          </p>
          <div className="mt-4">
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Бонусы</span>
              <span className="text-violet-400">
                {analytics ? formatMoney(analytics.overview.total_bonus) : '...'}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold" style={{ color: 'var(--theme-content-text)' }}>Средние показатели</span>
            <Help content="<b>Средние показатели</b><br/><br/><b>Ср. платёж</b> — средняя сумма одного платежа<br/><br/><b>Ср. время жизни клиента</b> — сколько месяцев в среднем клиент остаётся активным (от первого до последнего платежа)<br/><br/><b>Ср. срок услуги</b> — средняя продолжительность активной подписки" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Ср. платёж</span>
              <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                {analytics ? formatMoney(analytics.revenue.avg_payment) : '...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Ср. время жизни клиента</span>
              <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                {analytics?.ltv.avg_customer_lifetime_months ?? '...'} мес.
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--theme-content-text-muted)' }}>Ср. срок услуги</span>
              <span className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                {analytics?.renewal.avg_service_lifetime_days ?? '...'} дн.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue vs Charges Table */}
      <div className="mt-6">
        <ChartCard
          title={<>Пополнение vs Списания <Help content="<b>Пополнение vs Списания</b><br/><br/>Сравнение поступлений и расходов по месяцам.<br/><br/><b>Пополнение</b> — сумма платежей (поступления)<br/><b>Стоимость услуг</b> — полная стоимость оказанных услуг<br/><b>Бонусами</b> — часть, оплаченная бонусами<br/><b>С баланса</b> — реальные деньги, списанные с баланса<br/><b>Разница</b> — Пополнение минус С баланса<br/><br/>Положительная разница означает, что деньги остались на балансах клиентов." /></>}
          subtitle="Пополнение — поступления; С баланса — фактическое списание с денежного баланса (без бонусов); Разница — сколько денег осталось на балансах"
          icon={BarChart3}
          iconColor="text-emerald-400"
          loading={loading}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--theme-table-border)' }}>
                  <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--theme-content-text-muted)' }}>Месяц</th>
                  <th className="text-right py-2 px-3 text-sm font-medium" style={{ color: 'var(--theme-content-text-muted)' }}>Пополнение</th>
                  <th className="text-right py-2 px-3 text-sm font-medium" style={{ color: 'var(--theme-content-text-muted)' }}>Стоимость услуг</th>
                  <th className="text-right py-2 px-3 text-sm font-medium" style={{ color: 'var(--theme-content-text-muted)' }}>Бонусами</th>
                  <th className="text-right py-2 px-3 text-sm font-medium" style={{ color: 'var(--theme-content-text-muted)' }}>С баланса</th>
                  <th className="text-right py-2 px-3 text-sm font-medium" style={{ color: 'var(--theme-content-text-muted)' }}>Разница</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.charges?.revenue_vs_charges?.map((row) => (
                  <tr key={row?.month || Math.random()} style={{ borderBottom: '1px solid var(--theme-table-border)' }}>
                    <td className="py-2 px-3" style={{ color: 'var(--theme-content-text)' }}>
                      {formatMonth(row?.month || '')}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-400">
                      {formatMoney(row?.revenue || '0')}
                    </td>
                    <td className="py-2 px-3 text-right" style={{ color: 'var(--theme-content-text-muted)' }}>
                      {formatMoney(row?.total_charged || '0')}
                    </td>
                    <td className="py-2 px-3 text-right text-violet-400">
                      {formatMoney(row?.bonuses_used || '0')}
                    </td>
                    <td className="py-2 px-3 text-right" style={{ color: 'var(--theme-content-text)' }}>
                      {formatMoney(row?.charges || '0')}
                    </td>
                    <td className={`py-2 px-3 text-right font-medium ${parseFloat(row?.difference || '0') >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {parseFloat(row?.difference || '0') >= 0 ? '+' : ''}{formatMoney(row?.difference || '0')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

export default Analytics;
