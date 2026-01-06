import { shm_request, normalizeListResponse } from './shm_request';

export interface DashboardAnalytics {
  counts: {
    totalUsers: number;
    userServicesCount: number;
    totalRevenue: number;
  };
  payments: {
    timeline: { date: string; value: number; label?: string }[];
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

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const start = formatDate(startDate);
    const stop = formatDate(endDate);

    // Параллельные запросы к API - только данные за период
    const results = await Promise.allSettled([
      shm_request('shm/v1/admin/user?limit=1'),
      shm_request(`shm/v1/admin/user/service?limit=0`),
      shm_request(`shm/v1/admin/user/pay?start=${start}&stop=${stop}&field=date&limit=0`),
    ]);

    const [
      usersCountRes,
      userServicesNewRes,
      paymentsRes,
    ] = results.map((result) => (result.status === 'fulfilled' ? result.value : null));

    // Нормализация данных
    const totalUsersCount = usersCountRes?.items || 0;
    const userServicesNew = userServicesNewRes ? normalizeListResponse(userServicesNewRes).data : [];
    const payments = paymentsRes ? normalizeListResponse(paymentsRes).data : [];

    // Фильтрация "реальных" платежей (без manual)
    const realPayments = payments.filter((p: any) =>
      p.pay_system_id &&
      p.pay_system_id !== '' &&
      p.pay_system_id !== '0' &&
      p.pay_system_id.toLowerCase() !== 'manual'
    );

    // Подсчеты
    const totalRevenue = realPayments.reduce((sum: number, p: any) => sum + parseFloat(p.money || 0), 0);

    // Группировка платежей по датам
    const paymentsByDate: Record<string, number> = {};
    realPayments.forEach((p: any) => {
      // Поддержка разных форматов даты
      let dateStr = '';
      if (p.date) {
        if (p.date.includes('T')) {
          dateStr = p.date.split('T')[0];
        } else if (p.date.includes(' ')) {
          dateStr = p.date.split(' ')[0];
        } else {
          dateStr = p.date;
        }
      }
      if (dateStr) {
        paymentsByDate[dateStr] = (paymentsByDate[dateStr] || 0) + parseFloat(p.money || 0);
      }
    });

    // Генерируем все дни периода (чтобы были все 7 точек на графике)
    const allDays: { date: string; value: number }[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      allDays.push({
        date: dateStr,
        value: paymentsByDate[dateStr] || 0,
      });
    }

    // Статистика по статусам сервисов
    const servicesByStatus: Record<string, number> = {};
    userServicesNew.forEach((us: any) => {
      servicesByStatus[us.status] = (servicesByStatus[us.status] || 0) + 1;
    });

    const result: DashboardAnalytics = {
      counts: {
        totalUsers: totalUsersCount,
        userServicesCount: userServicesNewRes?.items || 0,
        totalRevenue: totalRevenue,
      },
      payments: {
        timeline: allDays,
      },
      services: {
        byStatus: Object.entries(servicesByStatus).map(([name, value]) => ({ name, value })),
      },
    };
    return result;

  } catch (error) {
    throw error;
  }
}
