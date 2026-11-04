import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MAX_HISTORY } from '@/constants/config';
import { deleteRecordFiles } from '@/lib/files';
import type { HistoryRecord } from '@/types/build';

type HistoryState = {
  records: HistoryRecord[];
  addRecord: (record: HistoryRecord) => void;
  updateRecord: (id: string, patch: Partial<Omit<HistoryRecord, 'id'>>) => void;
  removeRecord: (id: string) => void;
  clearRecords: () => void;
};

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      records: [],
      addRecord: (record) =>
        set((state) => {
          const nextRecords = [record, ...state.records].slice(0, MAX_HISTORY);
          const removedRecords = [record, ...state.records].slice(MAX_HISTORY);
          removedRecords.forEach(deleteRecordFiles);
          return { records: nextRecords };
        }),
      updateRecord: (id, patch) =>
        set((state) => ({
          records: state.records.map((record) =>
            record.id === id ? { ...record, ...patch } : record,
          ),
        })),
      removeRecord: (id) =>
        set((state) => ({
          records: state.records.filter((record) => record.id !== id),
        })),
      clearRecords: () => set({ records: [] }),
    }),
    {
      name: 'webtoapp.history.v1',
      storage: createJSONStorage(() => AsyncStorage),
      skipHydration: true,
      version: 1,
      partialize: (state) => ({ records: state.records }),
    },
  ),
);
