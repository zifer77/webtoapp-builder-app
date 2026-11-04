import { useEffect, useState } from 'react';
import { useHistoryStore } from '@/store/historyStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTokenStore } from '@/store/tokenStore';

export function useAppHydration(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      await Promise.allSettled([
        useSettingsStore.persist.rehydrate(),
        useHistoryStore.persist.rehydrate(),
        useTokenStore.getState().hydrateToken(),
      ]);

      if (active) {
        setHydrated(true);
      }
    };

    void hydrate();

    return () => {
      active = false;
    };
  }, []);

  return hydrated;
}
