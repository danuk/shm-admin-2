import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  user_id: number;
  login: string;
  full_name?: string;
  balance: number;
  bonus: number;
  settings?: JSON;
  block: number;
  phone?: string;
  created: Date;
  last_login?: Date;
  can_overdraft: number;
  comment?: string;
  create_act?: any;
  credit: number;
  discount: number;
  dogovor?: string;
  gid: number;
  partner_id: number;
  password: any;
  perm_credit: number;
  type: number;
  verified?: number;
}

interface AuthState {
  user: User | null;
  setAuth: (user: User, sessionId: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  getSessionId: () => string | null;
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 3; // 3 дня
const UPDATE_INTERVAL = 3 * 60 * 1000; // 3 минуты

const setSessionCookie = (sessionId: string) => {
  document.cookie = `session-id=${sessionId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  localStorage.setItem('session-updated', Date.now().toString());
};

const getSessionCookie = (): string | null => {
  const match = document.cookie.match(/session-id=([^;]+)/);
  return match ? match[1] : null;
};

const removeSessionCookie = () => {
  document.cookie = 'session-id=; path=/; max-age=0';
  localStorage.removeItem('session-updated');
};

const refreshSessionCookie = () => {
  const sessionId = getSessionCookie();
  if (!sessionId) return;

  const lastUpdated = localStorage.getItem('session-updated');
  if (!lastUpdated) {
    setSessionCookie(sessionId);
    return;
  }

  const timeSinceUpdate = Date.now() - parseInt(lastUpdated);
  if (timeSinceUpdate > UPDATE_INTERVAL) {
    setSessionCookie(sessionId);
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setAuth: (user, sessionId) => {
        set({ user });
        setSessionCookie(sessionId);
      },
      logout: () => {
        set({ user: null });
        removeSessionCookie();
      },
      isAuthenticated: () => {
        refreshSessionCookie();
        return !!getSessionCookie();
      },
      isAdmin: () => get().user?.gid === 1,
      getSessionId: () => {
        refreshSessionCookie();
        return getSessionCookie();
      },
    }),
    {
      name: 'shm-auth-storage',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str);
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value.state));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
