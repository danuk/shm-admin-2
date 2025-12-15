import { shm_request, normalizeListResponse } from './shm_request';
import { format, subDays, startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export interface AnalyticsStats {
  totalUsers: number;
  totalServices: number;
  totalServers: number;
  activeUserServices: number;
  totalRevenue: number;
  recentPayments: number;
  totalWithdraws: number;
  pendingTasks: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface PaymentStats {
  total: number;
  count: number;
  byPaySystem: { name: string; value: number }[];
  timeline: TimeSeriesData[];
}

export interface UserServiceStats {
  total: number;
  byStatus: { name: string; value: number; color: string }[];
  byService: { name: string; value: number }[];
  timeline: TimeSeriesData[];
}

export interface UserStats {
  total: number;
  newUsers: number;
  activeUsers: number;
  timeline: TimeSeriesData[];
}

export interface RevenueStats {
  totalRevenue: number;
  totalWithdraws: number;
  netRevenue: number;
  revenueTimeline: TimeSeriesData[];
  withdrawTimeline: TimeSeriesData[];
}

export async function fetchMainStats(): Promise<AnalyticsStats> {
  const [
    usersRes,
    servicesRes,
    serversRes,
    userServicesRes,
    paysRes,
    withdrawsRes,
    spoolRes,
  ] = await Promise.all([
    shm_request('/shm/v1/admin/user?limit=1').catch(() => ({ total: 0, items: 0 })),
    shm_request('/shm/v1/admin/service?limit=1').catch(() => ({ total: 0, items: 0 })),
    shm_request('/shm/v1/admin/server?limit=1').catch(() => ({ total: 0, items: 0 })),
    shm_request('/shm/v1/admin/user/service?limit=1').catch(() => ({ total: 0, items: 0 })),
    shm_request('/shm/v1/admin/user/pay?limit=1').catch(() => ({ total: 0, items: 0 })),
    shm_request('/shm/v1/admin/user/service/withdraw?limit=1').catch(() => ({ total: 0, items: 0 })),
    shm_request('/shm/v1/admin/spool?limit=1').catch(() => ({ total: 0, items: 0 })),
  ]);

  return {
    totalUsers: usersRes.items ?? usersRes.total ?? 0,
    totalServices: servicesRes.items ?? servicesRes.total ?? 0,
    totalServers: serversRes.items ?? serversRes.total ?? 0,
    activeUserServices: userServicesRes.items ?? userServicesRes.total ?? 0,
    totalRevenue: 0,
    recentPayments: paysRes.items ?? paysRes.total ?? 0,
    totalWithdraws: withdrawsRes.items ?? withdrawsRes.total ?? 0,
    pendingTasks: spoolRes.items ?? spoolRes.total ?? 0,
  };
}

function getDateRange(period: number | 'month'): { startDate: Date; days: number } {
  if (period === 'month') {
    const now = new Date();
    const startDate = startOfMonth(now);
    const days = now.getDate();
    return { startDate, days };
  }
  return { startDate: subDays(new Date(), period), days: period };
}

function filterRealPayments(payments: any[]): any[] {
  return payments.filter((p: any) => {
    const paySystem = String(p.pay_system_id || '').toLowerCase();
    return paySystem !== 'manual' && paySystem !== '0' && paySystem !== '';
  });
}

export async function fetchPaymentStats(period: number | 'month' = 30): Promise<PaymentStats> {
  try {
    const res = await shm_request(`/shm/v1/admin/user/pay?limit=1000`);
    const { data: allPayments } = normalizeListResponse(res);
    
    const payments = filterRealPayments(allPayments);

    const { startDate, days } = getDateRange(period);
    const recentPayments = payments.filter((p: any) => {
      if (!p.date) return false;
      const payDate = new Date(p.date);
      return payDate >= startDate;
    });

    const total = recentPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.money) || 0), 0);

    const byPaySystemMap = new Map<string, number>();
    recentPayments.forEach((p: any) => {
      const system = p.pay_system_id || 'unknown';
      byPaySystemMap.set(system, (byPaySystemMap.get(system) || 0) + (parseFloat(p.money) || 0));
    });
    const byPaySystem = Array.from(byPaySystemMap.entries())
      .map(([name, value]) => ({ name: String(name), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const timelineMap = new Map<string, number>();
    if (period === 'month') {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const daysInPeriod = eachDayOfInterval({ start: monthStart, end: now });
      daysInPeriod.forEach(day => {
        timelineMap.set(format(day, 'yyyy-MM-dd'), 0);
      });
    } else {
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        timelineMap.set(date, 0);
      }
    }
    
    recentPayments.forEach((p: any) => {
      if (!p.date) return;
      const date = format(new Date(p.date), 'yyyy-MM-dd');
      if (timelineMap.has(date)) {
        timelineMap.set(date, (timelineMap.get(date) || 0) + (parseFloat(p.money) || 0));
      }
    });

    const timeline = Array.from(timelineMap.entries()).map(([date, value]) => ({
      date,
      value,
      label: format(new Date(date), 'dd.MM'),
    }));

    return {
      total,
      count: recentPayments.length,
      byPaySystem,
      timeline,
    };
  } catch (error) {
    return { total: 0, count: 0, byPaySystem: [], timeline: [] };
  }
}

export async function fetchUserServiceStats(): Promise<UserServiceStats> {
  try {
    const res = await shm_request('/shm/v1/admin/user/service?limit=1000');
    const { data: services } = normalizeListResponse(res);

    const statusColors: Record<string, string> = {
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

    const byStatusMap = new Map<string, number>();
    services.forEach((s: any) => {
      const status = s.status || 'unknown';
      byStatusMap.set(status, (byStatusMap.get(status) || 0) + 1);
    });
    const byStatus = Array.from(byStatusMap.entries()).map(([name, value]) => ({
      name,
      value,
      color: statusColors[name] || '#6b7280',
    }));

    const byServiceMap = new Map<string, number>();
    services.forEach((s: any) => {
      const name = s.name || 'unknown';
      byServiceMap.set(name, (byServiceMap.get(name) || 0) + 1);
    });
    const byService = Array.from(byServiceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const days = 30;
    const timelineMap = new Map<string, number>();
    for (let i = days; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      timelineMap.set(date, 0);
    }

    services.forEach((s: any) => {
      if (!s.created) return;
      const date = format(new Date(s.created), 'yyyy-MM-dd');
      if (timelineMap.has(date)) {
        timelineMap.set(date, (timelineMap.get(date) || 0) + 1);
      }
    });

    const timeline = Array.from(timelineMap.entries()).map(([date, value]) => ({
      date,
      value,
      label: format(new Date(date), 'dd.MM'),
    }));

    return {
      total: services.length,
      byStatus,
      byService,
      timeline,
    };
  } catch (error) {
    return { total: 0, byStatus: [], byService: [], timeline: [] };
  }
}

export async function fetchUserStats(period: number | 'month' = 30): Promise<UserStats> {
  try {
    const res = await shm_request('/shm/v1/admin/user?limit=1000');
    const { data: users, total } = normalizeListResponse(res);

    const { startDate, days } = getDateRange(period);
    const newUsers = users.filter((u: any) => {
      if (!u.created) return false;
      const createdDate = new Date(u.created);
      return createdDate >= startDate;
    });

    const timelineMap = new Map<string, number>();
    if (period === 'month') {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const daysInPeriod = eachDayOfInterval({ start: monthStart, end: now });
      daysInPeriod.forEach(day => {
        timelineMap.set(format(day, 'yyyy-MM-dd'), 0);
      });
    } else {
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        timelineMap.set(date, 0);
      }
    }

    users.forEach((u: any) => {
      if (!u.created) return;
      const date = format(new Date(u.created), 'yyyy-MM-dd');
      if (timelineMap.has(date)) {
        timelineMap.set(date, (timelineMap.get(date) || 0) + 1);
      }
    });

    const timeline = Array.from(timelineMap.entries()).map(([date, value]) => ({
      date,
      value,
      label: format(new Date(date), 'dd.MM'),
    }));

    const activeUsers = users.filter((u: any) => {
      if (!u.last_login) return false;
      const lastLogin = new Date(u.last_login);
      return lastLogin >= subDays(new Date(), 7);
    }).length;

    return {
      total,
      newUsers: newUsers.length,
      activeUsers,
      timeline,
    };
  } catch (error) {
    return { total: 0, newUsers: 0, activeUsers: 0, timeline: [] };
  }
}

export async function fetchRevenueStats(period: number | 'month' = 30): Promise<RevenueStats> {
  try {
    const [paysRes, withdrawsRes] = await Promise.all([
      shm_request('/shm/v1/admin/user/pay?limit=1000').catch(() => ({ data: [] })),
      shm_request('/shm/v1/admin/user/service/withdraw?limit=1000').catch(() => ({ data: [] })),
    ]);

    const { data: allPayments } = normalizeListResponse(paysRes);
    const { data: withdraws } = normalizeListResponse(withdrawsRes);
    
    const payments = filterRealPayments(allPayments);

    const { startDate, days } = getDateRange(period);

    const recentPayments = payments.filter((p: any) => {
      if (!p.date) return false;
      return new Date(p.date) >= startDate;
    });

    const recentWithdraws = withdraws.filter((w: any) => {
      if (!w.date) return false;
      return new Date(w.date) >= startDate;
    });

    const totalRevenue = recentPayments.reduce((sum: number, p: any) => 
      sum + (parseFloat(p.money) || 0), 0);
    const totalWithdraws = recentWithdraws.reduce((sum: number, w: any) => 
      sum + (parseFloat(w.cost) || parseFloat(w.money) || 0), 0);

    const revenueTimelineMap = new Map<string, number>();
    const withdrawTimelineMap = new Map<string, number>();
    
    if (period === 'month') {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const daysInPeriod = eachDayOfInterval({ start: monthStart, end: now });
      daysInPeriod.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        revenueTimelineMap.set(dateStr, 0);
        withdrawTimelineMap.set(dateStr, 0);
      });
    } else {
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        revenueTimelineMap.set(date, 0);
        withdrawTimelineMap.set(date, 0);
      }
    }

    recentPayments.forEach((p: any) => {
      if (!p.date) return;
      const date = format(new Date(p.date), 'yyyy-MM-dd');
      if (revenueTimelineMap.has(date)) {
        revenueTimelineMap.set(date, (revenueTimelineMap.get(date) || 0) + (parseFloat(p.money) || 0));
      }
    });

    recentWithdraws.forEach((w: any) => {
      if (!w.date) return;
      const date = format(new Date(w.date), 'yyyy-MM-dd');
      if (withdrawTimelineMap.has(date)) {
        withdrawTimelineMap.set(date, (withdrawTimelineMap.get(date) || 0) + 
          (parseFloat(w.cost) || parseFloat(w.money) || 0));
      }
    });

    const revenueTimeline = Array.from(revenueTimelineMap.entries()).map(([date, value]) => ({
      date,
      value,
      label: format(new Date(date), 'dd.MM'),
    }));

    const withdrawTimeline = Array.from(withdrawTimelineMap.entries()).map(([date, value]) => ({
      date,
      value,
      label: format(new Date(date), 'dd.MM'),
    }));

    return {
      totalRevenue,
      totalWithdraws,
      netRevenue: totalRevenue - totalWithdraws,
      revenueTimeline,
      withdrawTimeline,
    };
  } catch (error) {
    return {
      totalRevenue: 0,
      totalWithdraws: 0,
      netRevenue: 0,
      revenueTimeline: [],
      withdrawTimeline: [],
    };
  }
}

export async function fetchTaskStats(): Promise<{
  pending: number;
  completed: number;
  failed: number;
  byEvent: { name: string; value: number }[];
}> {
  try {
    const [spoolRes, historyRes] = await Promise.all([
      shm_request('/shm/v1/admin/spool?limit=1000'),
      shm_request('/shm/v1/admin/spool/history?limit=1000'),
    ]);

    const { data: pending } = normalizeListResponse(spoolRes);
    const { data: history } = normalizeListResponse(historyRes);

    const completed = history.filter((t: any) => t.status === 'DONE' || t.status === 'done').length;
    const failed = history.filter((t: any) => t.status === 'ERROR' || t.status === 'error').length;

    const byEventMap = new Map<string, number>();
    [...pending, ...history].forEach((t: any) => {
      const event = t.event || t.name || 'unknown';
      byEventMap.set(event, (byEventMap.get(event) || 0) + 1);
    });

    const byEvent = Array.from(byEventMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      pending: pending.length,
      completed,
      failed,
      byEvent,
    };
  } catch (error) {
    return { pending: 0, completed: 0, failed: 0, byEvent: [] };
  }
}

export async function fetchTopServices(): Promise<{ name: string; count: number; revenue: number }[]> {
  try {
    const res = await shm_request('/shm/v1/admin/user/service?limit=1000');
    const { data: userServices } = normalizeListResponse(res);

    const serviceMap = new Map<string, { count: number; revenue: number }>();
    
    userServices.forEach((us: any) => {
      const name = us.name || 'unknown';
      const current = serviceMap.get(name) || { count: 0, revenue: 0 };
      serviceMap.set(name, {
        count: current.count + 1,
        revenue: current.revenue + (parseFloat(us.cost) || 0),
      });
    });

    return Array.from(serviceMap.entries())
      .map(([name, { count, revenue }]) => ({ name, count, revenue }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  } catch (error) {
    return [];
  }
}

export async function fetchServerStats(): Promise<{
  total: number;
  byGroup: { name: string; value: number }[];
}> {
  try {
    const res = await shm_request('/shm/v1/admin/server?limit=1000');
    const { data: servers, total } = normalizeListResponse(res);

    const byGroupMap = new Map<string, number>();
    servers.forEach((s: any) => {
      const group = s.group_id || s.server_gid || 'ungrouped';
      byGroupMap.set(String(group), (byGroupMap.get(String(group)) || 0) + 1);
    });

    const byGroup = Array.from(byGroupMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { total, byGroup };
  } catch (error) {
    return { total: 0, byGroup: [] };
  }
}

export interface MonthlyData {
  date: Date;
  value: number;
  label: string;
}

export async function fetchMonthlyPaymentData(): Promise<MonthlyData[]> {
  try {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const res = await shm_request('/shm/v1/admin/user/pay?limit=2000');
    const { data: allPayments } = normalizeListResponse(res);
    
    const payments = filterRealPayments(allPayments);

    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const dataMap = new Map<string, number>();
    days.forEach(day => {
      dataMap.set(format(day, 'yyyy-MM-dd'), 0);
    });

    payments.forEach((p: any) => {
      if (!p.date) return;
      const date = format(new Date(p.date), 'yyyy-MM-dd');
      if (dataMap.has(date)) {
        dataMap.set(date, (dataMap.get(date) || 0) + (parseFloat(p.money) || 0));
      }
    });

    return Array.from(dataMap.entries()).map(([dateStr, value]) => ({
      date: new Date(dateStr),
      value,
      label: format(new Date(dateStr), 'dd.MM'),
    }));
  } catch (error) {
    return [];
  }
}

export async function fetchMonthlyUserData(): Promise<MonthlyData[]> {
  try {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const res = await shm_request('/shm/v1/admin/user?limit=2000');
    const { data: users } = normalizeListResponse(res);

    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const dataMap = new Map<string, number>();
    days.forEach(day => {
      dataMap.set(format(day, 'yyyy-MM-dd'), 0);
    });

    users.forEach((u: any) => {
      if (!u.created) return;
      const date = format(new Date(u.created), 'yyyy-MM-dd');
      if (dataMap.has(date)) {
        dataMap.set(date, (dataMap.get(date) || 0) + 1);
      }
    });

    return Array.from(dataMap.entries()).map(([dateStr, value]) => ({
      date: new Date(dateStr),
      value,
      label: format(new Date(dateStr), 'dd.MM'),
    }));
  } catch (error) {
    return [];
  }
}

export async function fetchMonthlyServiceData(): Promise<MonthlyData[]> {
  try {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const res = await shm_request('/shm/v1/admin/user/service?limit=2000');
    const { data: services } = normalizeListResponse(res);

    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const dataMap = new Map<string, number>();
    days.forEach(day => {
      dataMap.set(format(day, 'yyyy-MM-dd'), 0);
    });

    services.forEach((s: any) => {
      if (!s.created) return;
      const date = format(new Date(s.created), 'yyyy-MM-dd');
      if (dataMap.has(date)) {
        dataMap.set(date, (dataMap.get(date) || 0) + 1);
      }
    });

    return Array.from(dataMap.entries()).map(([dateStr, value]) => ({
      date: new Date(dateStr),
      value,
      label: format(new Date(dateStr), 'dd.MM'),
    }));
  } catch (error) {
    return [];
  }
}

export interface FinancialMetrics {
  arpu: number;           
  arppu: number;          
  ltv: number;            
  churnRate: number;      
  payingUsersCount: number;
  totalUsers: number;
  avgRevenuePerPayment: number;
  avgPaymentsPerUser: number;
  conversionRate: number; 
}

export async function fetchFinancialMetrics(): Promise<FinancialMetrics> {
  try {
    const [usersRes, paysRes, userServicesRes] = await Promise.all([
      shm_request('/shm/v1/admin/user?limit=5000').catch(() => ({ data: [] })),
      shm_request('/shm/v1/admin/user/pay?limit=5000').catch(() => ({ data: [] })),
      shm_request('/shm/v1/admin/user/service?limit=5000').catch(() => ({ data: [] })),
    ]);

    const { data: users, total: totalUsers } = normalizeListResponse(usersRes);
    const { data: allPayments } = normalizeListResponse(paysRes);
    const { data: userServices } = normalizeListResponse(userServicesRes);
    
    const payments = filterRealPayments(allPayments);

    const totalRevenue = payments.reduce((sum: number, p: any) => 
      sum + (parseFloat(p.money) || 0), 0);

    const payingUserIds = new Set<number>();
    payments.forEach((p: any) => {
      if (p.user_id) payingUserIds.add(p.user_id);
    });
    const payingUsersCount = payingUserIds.size;

    const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;

    const arppu = payingUsersCount > 0 ? totalRevenue / payingUsersCount : 0;

    const avgPaymentsPerUser = payingUsersCount > 0 ? payments.length / payingUsersCount : 0;

    const avgRevenuePerPayment = payments.length > 0 ? totalRevenue / payments.length : 0;

    const ltv = arpu * 12;

    const blockedServices = userServices.filter((s: any) => 
      s.status === 'BLOCK' || s.status === 'block'
    ).length;
    const activeServices = userServices.filter((s: any) => 
      s.status === 'ACTIVE' || s.status === 'active'
    ).length;
    
    const totalServicesForChurn = blockedServices + activeServices;
    const churnRate = totalServicesForChurn > 0 
      ? (blockedServices / totalServicesForChurn) * 100 
      : 0;

    const conversionRate = totalUsers > 0 
      ? (payingUsersCount / totalUsers) * 100 
      : 0;

    return {
      arpu,
      arppu,
      ltv,
      churnRate,
      payingUsersCount,
      totalUsers,
      avgRevenuePerPayment,
      avgPaymentsPerUser,
      conversionRate,
    };
  } catch (error) {
    return {
      arpu: 0,
      arppu: 0,
      ltv: 0,
      churnRate: 0,
      payingUsersCount: 0,
      totalUsers: 0,
      avgRevenuePerPayment: 0,
      avgPaymentsPerUser: 0,
      conversionRate: 0,
    };
  }
}

export interface TopCustomer {
  userId: number;
  login: string;
  totalPayments: number;
  paymentsCount: number;
  servicesCount: number;
}

export async function fetchTopCustomers(limit: number = 10): Promise<TopCustomer[]> {
  try {
    const [usersRes, paysRes, userServicesRes] = await Promise.all([
      shm_request('/shm/v1/admin/user?limit=5000').catch(() => ({ data: [] })),
      shm_request('/shm/v1/admin/user/pay?limit=5000').catch(() => ({ data: [] })),
      shm_request('/shm/v1/admin/user/service?limit=5000').catch(() => ({ data: [] })),
    ]);

    const { data: users } = normalizeListResponse(usersRes);
    const { data: allPayments } = normalizeListResponse(paysRes);
    const { data: userServices } = normalizeListResponse(userServicesRes);
    
    const payments = filterRealPayments(allPayments);

    const usersMap = new Map<number, string>();
    users.forEach((u: any) => {
      usersMap.set(u.user_id || u.id, u.login || u.email || `User ${u.user_id || u.id}`);
    });

    const customerStats = new Map<number, { total: number; count: number; services: number }>();
    
    payments.forEach((p: any) => {
      const userId = p.user_id;
      if (!userId) return;
      
      const current = customerStats.get(userId) || { total: 0, count: 0, services: 0 };
      customerStats.set(userId, {
        ...current,
        total: current.total + (parseFloat(p.money) || 0),
        count: current.count + 1,
      });
    });

    userServices.forEach((s: any) => {
      const userId = s.user_id;
      if (!userId) return;
      
      const current = customerStats.get(userId) || { total: 0, count: 0, services: 0 };
      customerStats.set(userId, {
        ...current,
        services: current.services + 1,
      });
    });

    return Array.from(customerStats.entries())
      .map(([userId, stats]) => ({
        userId,
        login: usersMap.get(userId) || `User ${userId}`,
        totalPayments: stats.total,
        paymentsCount: stats.count,
        servicesCount: stats.services,
      }))
      .sort((a, b) => b.totalPayments - a.totalPayments)
      .slice(0, limit);
  } catch (error) {
    return [];
  }
}

export interface MRRStats {
  mrr: number;
  activeSubscriptions: number;
  avgSubscriptionValue: number;
  mrrGrowth: number; 
}

export async function fetchMRRStats(): Promise<MRRStats> {
  try {
    const [userServicesRes, paysRes] = await Promise.all([
      shm_request('/shm/v1/admin/user/service?limit=5000').catch(() => ({ data: [] })),
      shm_request('/shm/v1/admin/user/pay?limit=5000').catch(() => ({ data: [] })),
    ]);

    const { data: userServices } = normalizeListResponse(userServicesRes);
    const { data: allPayments } = normalizeListResponse(paysRes);
    
    const payments = filterRealPayments(allPayments);

    const activeServices = userServices.filter((s: any) => 
      s.status === 'ACTIVE' || s.status === 'active'
    );

    let mrr = 0;
    activeServices.forEach((s: any) => {
      const cost = parseFloat(s.cost) || 0;
      mrr += cost;
    });

    const avgSubscriptionValue = activeServices.length > 0 
      ? mrr / activeServices.length 
      : 0;

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const prevMonthStart = startOfMonth(subDays(currentMonthStart, 1));
    const prevMonthEnd = endOfMonth(prevMonthStart);

    const currentMonthPayments = payments.filter((p: any) => {
      if (!p.date) return false;
      return new Date(p.date) >= currentMonthStart;
    }).reduce((sum: number, p: any) => sum + (parseFloat(p.money) || 0), 0);

    const prevMonthPayments = payments.filter((p: any) => {
      if (!p.date) return false;
      const date = new Date(p.date);
      return date >= prevMonthStart && date <= prevMonthEnd;
    }).reduce((sum: number, p: any) => sum + (parseFloat(p.money) || 0), 0);

    const mrrGrowth = prevMonthPayments > 0 
      ? ((currentMonthPayments - prevMonthPayments) / prevMonthPayments) * 100 
      : 0;

    return {
      mrr,
      activeSubscriptions: activeServices.length,
      avgSubscriptionValue,
      mrrGrowth,
    };
  } catch (error) {
    return {
      mrr: 0,
      activeSubscriptions: 0,
      avgSubscriptionValue: 0,
      mrrGrowth: 0,
    };
  }
}
