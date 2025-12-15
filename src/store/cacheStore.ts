import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface CacheSettings {
  enabled: boolean;
  ttl: number;
  backgroundRefresh: boolean;
  backgroundRefreshThreshold: number;
}

interface CacheState {
  settings: CacheSettings;
  cache: Record<string, CacheEntry>;
  
  setSettings: (settings: Partial<CacheSettings>) => void;
  
  get: (key: string) => any | null;
  set: (key: string, data: any) => void;
  remove: (key: string) => void;
  clear: () => void;
  
  isExpired: (key: string) => boolean;
  needsBackgroundRefresh: (key: string) => boolean;
  
  getStats: () => {
    totalKeys: number;
    totalSize: string;
    entries: Array<{
      key: string;
      size: string;
      age: string;
      expiresIn: string;
    }>;
  };
}

const DEFAULT_SETTINGS: CacheSettings = {
  enabled: true,
  ttl: 300,
  backgroundRefresh: true,
  backgroundRefreshThreshold: 0.8,
};

export const useCacheStore = create<CacheState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      cache: {},
      
      setSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },
      
      get: (key) => {
        const { settings, cache } = get();
        
        if (!settings.enabled) {
          return null;
        }
        
        const entry = cache[key];
        
        if (!entry) {
          return null;
        }
        
        if (Date.now() > entry.expiresAt) {
          set((state) => {
            const newCache = { ...state.cache };
            delete newCache[key];
            return { cache: newCache };
          });
          return null;
        }
        
        return entry.data;
      },
      
      set: (key, data) => {
        const { settings } = get();
        
        if (!settings.enabled) {
          return;
        }
        
        const now = Date.now();
        const entry: CacheEntry = {
          data,
          timestamp: now,
          expiresAt: now + settings.ttl * 1000,
        };
        
        set((state) => {
          const newCache = { ...state.cache };
          newCache[key] = entry;
          return { cache: newCache };
        });
      },
      
      remove: (key) => {
        set((state) => {
          const newCache = { ...state.cache };
          delete newCache[key];
          return { cache: newCache };
        });
      },
      
      clear: () => {
        set({ cache: {} });
      },
      
      isExpired: (key) => {
        const entry = get().cache[key];
        if (!entry) return true;
        return Date.now() > entry.expiresAt;
      },
      
      needsBackgroundRefresh: (key) => {
        const { settings, cache } = get();
        
        if (!settings.backgroundRefresh) {
          return false;
        }
        
        const entry = cache[key];
        if (!entry) return false;
        
        const age = Date.now() - entry.timestamp;
        const lifetime = entry.expiresAt - entry.timestamp;
        const ageRatio = age / lifetime;
        
        return ageRatio >= settings.backgroundRefreshThreshold;
      },
      
      getStats: () => {
        const { cache } = get();
        
        const entries = Object.entries(cache).map(([key, entry]) => {
          const now = Date.now();
          const age = now - entry.timestamp;
          const expiresIn = entry.expiresAt - now;
          
          const dataStr = JSON.stringify(entry.data);
          const size = new Blob([dataStr]).size;
          
          return {
            key,
            size: formatBytes(size),
            age: formatDuration(age),
            expiresIn: expiresIn > 0 ? formatDuration(expiresIn) : 'expired',
          };
        });
        
        const totalSize = entries.reduce((sum, e) => {
          const match = e.size.match(/^([\d.]+)\s*(\w+)$/);
          if (!match) return sum;
          const [, num, unit] = match;
          const value = parseFloat(num);
          const multiplier = unit === 'KB' ? 1024 : unit === 'MB' ? 1024 * 1024 : unit === 'GB' ? 1024 * 1024 * 1024 : 1;
          return sum + (value * multiplier);
        }, 0);
        
        return {
          totalKeys: Object.keys(cache).length,
          totalSize: formatBytes(totalSize),
          entries,
        };
      },
    }),
    {
      name: 'shm-cache-storage',
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}ч ${minutes % 60}м`;
  if (minutes > 0) return `${minutes}м ${seconds % 60}с`;
  return `${seconds}с`;
}
