import { useAuthStore } from '../store/authStore';

export async function shm_request<T = any>(url: string, options?: RequestInit): Promise<T> {
  const authHeader = useAuthStore.getState().getAuthHeader();
  
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { 'Authorization': authHeader } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });
  
  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }
  
  const contentType = response.headers.get('content-type');
  let data: any;
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  return data;
          
}

// Нормализация ответа API - может вернуть массив или { data: [] }
export interface ApiListResponse<T = any> {
  data: T[];
  total: number;
}

export function normalizeListResponse<T = any>(res: any): ApiListResponse<T> {
  // API может вернуть массив напрямую или объект { data: [], items: N }
  if (Array.isArray(res)) {
    return { data: res, total: res.length };
  }
  const data = res.data || [];
  const total = res.items ?? res.total ?? data.length;
  return { data, total };
}

// Функция для авторизации
export async function shm_login(login: string, password: string): Promise<any> {
  const credentials = btoa(`${login}:${password}`);
  
  const response = await fetch('/shm/v1/user', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ login, password }),
  });
  
  if (!response.ok) {
    throw new Error('Неверный логин или пароль');
  }
  
  const data = await response.json();
  return { user: data.data?.[0] || data, credentials };
}
