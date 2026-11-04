import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_FORK_REPO,
  DEFAULT_TEMPLATE_REPO,
  DEFAULT_THEME_COLOR,
} from '@/constants/config';
import type { SettingsValues } from '@/types/build';

type SettingsState = SettingsValues & {
  saveSettings: (values: SettingsValues) => void;
  updateSettings: (values: Partial<SettingsValues>) => void;
};

const initialSettings: SettingsValues = {
  githubUsername: '',
  repoName: DEFAULT_FORK_REPO,
  templateRepo: DEFAULT_TEMPLATE_REPO,
  defaultThemeColor: DEFAULT_THEME_COLOR,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialSettings,
      saveSettings: (values) => set(values),
      updateSettings: (values) => set(values),
    }),
    {
      name: 'webtoapp.settings.v1',
      storage: createJSONStorage(() => AsyncStorage),
      skipHydration: true,
      version: 1,
      partialize: (state) => ({
        githubUsername: state.githubUsername,
        repoName: state.repoName,
        templateRepo: state.templateRepo,
        defaultThemeColor: state.defaultThemeColor,
      }),
    },
  ),
);
