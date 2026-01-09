import { create } from 'zustand';
import { shm_request } from '../lib/shm_request';

export interface BrandingSettings {
  name: string;
  logoUrl: string;
}

interface BrandingState {
  branding: BrandingSettings;
  loading: boolean;
  loaded: boolean;
  fetchBranding: () => Promise<void>;
  refetchBranding: () => Promise<void>;
  updateBranding: (settings: Partial<BrandingSettings>) => Promise<void>;
  resetBranding: () => Promise<void>;
}

const DEFAULT_BRANDING: BrandingSettings = {
  name: 'SHM Admin',
  logoUrl: '',
};

export const useBrandingStore = create<BrandingState>((set, get) => ({
  branding: DEFAULT_BRANDING,
  loading: false,
  loaded: false,

  fetchBranding: async () => {
    if (get().loaded) return;

    set({ loading: true });
    try {
      const result = await shm_request('shm/v1/company');
      if (result.status === 200 && result.data?.[0]) {
        const company = result.data[0];
        const branding = {
          name: company.name || DEFAULT_BRANDING.name,
          logoUrl: company.logoUrl || DEFAULT_BRANDING.logoUrl,
        };
        if (result.version) {
          localStorage.setItem('version', result.version);
        }
        set({ branding, loaded: true });
        document.title = branding.name;
      } else {
        set({ branding: DEFAULT_BRANDING, loaded: true });
        document.title = DEFAULT_BRANDING.name;
      }
    } catch (error) {
      // Тихо игнорируем ошибки (например, 401 для неавторизованных)
      set({ branding: DEFAULT_BRANDING, loaded: true });
      document.title = DEFAULT_BRANDING.name;
    } finally {
      set({ loading: false });
    }
  },

  refetchBranding: async () => {
    set({ loaded: false });
    await get().fetchBranding();
  },

  updateBranding: async (settings) => {
    set({ loading: true });
    try {
      const newBranding = { ...get().branding, ...settings };

      // Сохраняем в SHM API через admin/config
      const configData = {
        name: newBranding.name,
        logoUrl: newBranding.logoUrl,
      };

      const result = await shm_request('shm/v1/admin/config', {
        method: 'POST',
        body: JSON.stringify({
          key: 'company',
          value: configData
        }),
      });

      // Проверяем статус ответа
      if (result.status === 200) {
        set({ branding: newBranding });
        document.title = newBranding.name;
      } else {
        throw new Error(`API returned status ${result.status}`);
      }
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  resetBranding: async () => {
    set({ loading: true });
    try {
      const defaultConfig = {
        name: DEFAULT_BRANDING.name,
        logoUrl: DEFAULT_BRANDING.logoUrl,
      };

      const result = await shm_request('shm/v1/admin/config', {
        method: 'POST',
        body: JSON.stringify({
          key: 'company',
          value: defaultConfig
        }),
      });

      // Проверяем статус ответа
      if (result.status === 200) {
        set({ branding: DEFAULT_BRANDING });
        document.title = DEFAULT_BRANDING.name;
      } else {
        throw new Error(`API returned status ${result.status}`);
      }
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
