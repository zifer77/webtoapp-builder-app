import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { AppError } from '@/lib/errors';

const TOKEN_KEY = 'webtoapp.github.token';

type TokenState = {
  token: string | null;
  isHydrated: boolean;
  hydrateToken: () => Promise<void>;
  saveToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
};

export const useTokenStore = create<TokenState>((set) => ({
  token: null,
  isHydrated: false,
  hydrateToken: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      set({ token, isHydrated: true });
    } catch {
      set({ token: null, isHydrated: true });
    }
  },
  saveToken: async (token) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      set({ token });
    } catch {
      throw new AppError('storage', 'Token gagal disimpan dengan aman di perangkat.');
    }
  },
  clearToken: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } finally {
      set({ token: null });
    }
  },
}));
