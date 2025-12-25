import { shm_request, normalizeListResponse } from './shm_request';

export interface DashboardAnalytics {
  counts: {
    totalUsers: number;
    activeUserServices: number;
    totalServers: number;
  };
  payments: {
    timeline: { date: string; value: number; label?: string }[];
  };
  revenue: {
    totalRevenue: number;
    totalWithdraws: number;
    netRevenue: number;
  };
  services: {
    byStatus: { name: string; value: number; color?: string }[];
  };
}

export async function fetchDashboardAnalytics(period: number = 7): Promise<DashboardAnalytics> {
  try {
    // Вычисляем даты для периода
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const start = formatDate(startDate);
    const stop = formatDate(endDate);
    
    console.log(`[Dashboard] Fetching data for period: ${start} to ${stop}`);
    
    // Параллельные запросы к API - только данные за период
    const [
      usersCountRes,
      usersNewRes,
      servicesRes,
      userServicesNewRes,
      serversCountRes,
      paymentsRes,
      withdrawsRes,
    ] = await Promise.all([
      shm_request('/shm/v1/admin/user?limit=1'), // items покажет общее количество
      shm_request(`/shm/v1/admin/user?start=${start}&stop=${stop}&field=created&limit=9999`),
      shm_request('/shm/v1/admin/service?limit=9999'),
      shm_request(`/shm/v1/admin/user/service?start=${start}&stop=${stop}&field=created&limit=5000`),
      shm_request('/shm/v1/admin/server?limit=1'),
      shm_request(`/shm/v1/admin/user/pay?start=${start}&stop=${stop}&field=date&limit=9999`),
      shm_request(`/shm/v1/admin/user/service/withdraw?start=${start}&stop=${stop}&field=create_date&limit=9999`),
    ]);
    
    // Нормализация данных
    const totalUsersCount = usersCountRes.items || usersCountRes.total || 0;
    const usersNew = normalizeListResponse(usersNewRes).data;
    const services = normalizeListResponse(servicesRes).data;
    const userServicesNew = normalizeListResponse(userServicesNewRes).data;
    const totalServersCount = serversCountRes.items || serversCountRes.total || 0;
    const payments = normalizeListResponse(paymentsRes).data;
    const withdraws = normalizeListResponse(withdrawsRes).data;
    
    // Фильтрация "реальных" платежей (без manual)
    const realPayments = payments.filter((p: any) => 
      p.pay_system_id && 
      p.pay_system_id !== '' && 
      p.pay_system_id !== '0' && 
      p.pay_system_id.toLowerCase() !== 'manual'
    );
    
    // Подсчеты
    const totalRevenue = realPayments.reduce((sum: number, p: any) => sum + parseFloat(p.money || 0), 0);
    const totalWithdraws = withdraws.reduce((sum: number, w: any) => sum + parseFloat(w.cost || 0), 0);
    const activeUserServices = userServicesNew.filter((us: any) => us.status === 'ACTIVE' || us.status === 'active').length;
    
    // Группировка платежей по датам
    const paymentsByDate: Record<string, number> = {};
    realPayments.forEach((p: any) => {
      const date = p.date.split('T')[0];
      paymentsByDate[date] = (paymentsByDate[date] || 0) + parseFloat(p.money || 0);
    });
    
    // Статистика по статусам сервисов
    const servicesByStatus: Record<string, number> = {};
    userServicesNew.forEach((us: any) => {
      servicesByStatus[us.status] = (servicesByStatus[us.status] || 0) + 1;
    });
    
    const result: DashboardAnalytics = {
      counts: {
        totalUsers: totalUsersCount,
        activeUserServices: activeUserServices,
        totalServers: totalServersCount,
      },
      payments: {
        timeline: Object.entries(paymentsByDate).map(([date, value]) => ({ date, value })),
      },
      revenue: {
        totalRevenue,
        totalWithdraws,
        netRevenue: totalRevenue - totalWithdraws,
      },
      services: {
        byStatus: Object.entries(servicesByStatus).map(([name, value]) => ({ name, value })),
      },
    };
    
    console.log('[Dashboard] Analytics fetched successfully');
    return result;
    
  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    throw error;
  }
}



