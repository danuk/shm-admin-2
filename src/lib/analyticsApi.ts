import { shm_request, normalizeListResponse } from './shm_request';
import toast from 'react-hot-toast';

// Типы для разной гранулярности данных
export interface TimelineDataDay {
  day: string;
  revenue?: string;
  count?: number;
  total_charged?: string;
  bonuses_used?: string;
  net_charged?: string;
  transactions?: number;
}

export interface TimelineDataWeek {
  week: string;
  week_start: string;
  revenue?: string;
  count?: number;
  total_charged?: string;
  bonuses_used?: string;
  net_charged?: string;
  transactions?: number;
}

export interface TimelineDataMonth {
  month: string;
  revenue?: string;
  count?: number;
  total_charged?: string;
  bonuses_used?: string;
  net_charged?: string;
  transactions?: number;
}

export type TimelineData = TimelineDataDay | TimelineDataWeek | TimelineDataMonth;
export type Granularity = 'day' | 'week' | 'month';

export interface AnalyticsReport {
  generated_at: string;
  period_months: number;
  granularity: Granularity;
  overview: {
    total_users: number;
    active_users: number;
    blocked_users: number;
    active_paying_users: number;
    total_services: number;
    active_services: number;
    total_revenue: string;
    total_balance: string;
    total_bonus: string;
  };
  revenue: {
    total_revenue: string;
    payments_count: number;
    avg_payment: string;
  };
  revenue_by_month: {
    month: string;
    revenue: string;
    count: number;
  }[];
  revenue_timeline: TimelineData[];
  charges_timeline: TimelineData[] | null;
  service_profitability: {
    service_id: number;
    service_name: string;
    category: string;
    base_cost: string;
    sales_count: number;
    unique_buyers: number;
    total_revenue: string;
    bonuses_used: string;
    net_revenue: string;
    avg_sale: string;
    avg_discount: string;
  }[];
  popular_services: {
    service_id: number;
    service_name: string;
    category: string;
    cost: string;
    active_subscriptions: number;
    unique_users: number;
    currently_active: number;
    blocked: number;
  }[];
  top_clients: {
    user_id: number;
    login: string;
    full_name: string;
    registration_date: string;
    balance: string;
    bonus: string;
    total_payments: string;
    payments_count: number;
    total_spent: string;
    services_purchased: number;
    active_services: number;
  }[];
  top_partners: {
    user_id: number;
    login: string;
    full_name: string;
    registration_date: string;
    current_bonus: string;
    referrals_count: number;
    active_referrals: number;
    paying_referrals: number;
    referrals_revenue: string;
    total_earned_bonuses: string;
    earnings_count: number;
  }[];
  churn: {
    new_users: number;
    paying_users: number;
    churned_users: number;
    inactive_users: number;
    period_months: number;
  };
  renewal: {
    total_services: number;
    renewed_services: string;
    renewal_rate: string;
    avg_service_lifetime_days: string;
    period_months: number;
  };
  billing_efficiency: {
    pending_withdraws: number;
    pending_amount: string;
    avg_payment_delay_hours: string;
    services_waiting_for_pay: number;
    services_blocked: number;
  };
  payment_metrics: {
    by_paysystem: {
      pay_system: string;
      count: number;
      total: string;
      avg_amount: string;
    }[];
    by_weekday: {
      weekday: number;
      count: number;
      total: string;
    }[];
    period_months: number;
  };
  ltv: {
    avg_payments_per_user: string;
    avg_payment_amount: string;
    avg_ltv: string;
    avg_customer_lifetime_months: string;
  };
  receivables: {
    total_debt: string;
    debtors_count: number;
    top_debtors: {
      user_id: number;
      login: string;
      full_name: string;
      balance: string;
      created: string;
      last_login: string;
      last_payment_date: string;
    }[];
    debt_aging: {
      age_bucket: string;
      users_count: number;
      total_debt: string;
    }[];
  };
  charges: {
    charges_by_month: {
      month: string;
      total_charged: string;
      bonuses_used: string;
      net_charged: string;
      transactions: number;
    }[];
    revenue_vs_charges: {
      month: string;
      revenue: string;
      total_charged: string;
      bonuses_used: string;
      charges: string;
      difference: string;
    }[];
    period_months: number;
  };
  bonus_metrics: {
    total_bonuses: string;
    partner_bonuses: string;
    partner_percent: string;
    used_bonuses: string;
    total_revenue: string;
    bonus_load_percent: string;
    bonus_debt: string;
    debt_share_percent: string;
  };
}

export async function fetchAnalyticsReport(months: number = 6, noCache: boolean = false): Promise<AnalyticsReport | null> {
  try {
    const params = new URLSearchParams();
    params.set('months', months.toString());
    if (noCache) {
      params.set('no_cache', '1');
    }

    const response = await shm_request(`shm/v1/admin/analytics?${params.toString()}`);
    const normalized = normalizeListResponse(response);

    if (normalized.data && normalized.data.length > 0) {
      return normalized.data[0] as AnalyticsReport;
    }
    return null;
  } catch (error: any) {
    const message = error?.data?.error || error?.message || 'Ошибка загрузки аналитики';

    if (message.includes('подписки')) {
      toast.error(message);
      return null;
    }

    toast.error(message);
    return null;
  }
}

export async function clearAnalyticsCache(): Promise<void> {
  await shm_request('shm/v1/admin/analytics/cache/clear', {
    method: 'POST',
  });
}

// Форматирование денег
export function formatMoney(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 ₽';
  return `${num.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽`;
}

// Форматирование бонусов (с буквой "б" вместо ₽)
export function formatBonus(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 ⓑ';
  return `${num.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ⓑ`;
}

// Форматирование процентов
export function formatPercent(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0%';
  return `${num.toFixed(1)}%`;
}

// Форматирование даты
export function formatDate(date: string): string {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}

// Название дня недели
export function getWeekdayName(weekday: number): string {
  const days: Record<number, string> = {
    1: 'Воскресенье',
    2: 'Понедельник',
    3: 'Вторник',
    4: 'Среда',
    5: 'Четверг',
    6: 'Пятница',
    7: 'Суббота',
  };
  return days[weekday] || `День ${weekday}`;
}

// Короткое название месяца
export function formatMonth(month: string): string {
  if (!month) return '';
  const [year, m] = month.split('-');
  const monthNames: Record<string, string> = {
    '01': 'Янв', '02': 'Фев', '03': 'Мар', '04': 'Апр',
    '05': 'Май', '06': 'Июн', '07': 'Июл', '08': 'Авг',
    '09': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
  };
  return `${monthNames[m] || m} ${year?.slice(2)}`;
}

// Форматирование дня (для графиков по дням)
export function formatDay(day: string): string {
  if (!day) return '';
  const [, m, d] = day.split('-');
  return `${d}.${m}`;
}

// Форматирование недели (для графиков по неделям)
export function formatWeek(weekStart: string): string {
  if (!weekStart) return '';
  const [, m, d] = weekStart.split('-');
  return `${d}.${m}`;
}

// Универсальный форматтер для timeline данных
export function formatTimelineLabel(item: TimelineData, granularity: Granularity): string {
  switch (granularity) {
    case 'day':
      return formatDay((item as TimelineDataDay).day);
    case 'week':
      return formatWeek((item as TimelineDataWeek).week_start);
    case 'month':
      return formatMonth((item as TimelineDataMonth).month);
    default:
      return '';
  }
}

// Получить значение выручки из timeline
export function getTimelineRevenue(item: TimelineData): number {
  if ('revenue' in item && item.revenue) {
    return parseFloat(item.revenue);
  }
  return 0;
}

// Получить значение начислений (нетто) из timeline
export function getTimelineNetCharged(item: TimelineData): number {
  if ('net_charged' in item && item.net_charged) {
    return parseFloat(item.net_charged);
  }
  return 0;
}
