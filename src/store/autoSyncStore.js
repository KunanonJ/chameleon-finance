import { create } from 'zustand';

const STORAGE_KEY = 'chameleon_auto_sync';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    autoSyncEnabled: state.autoSyncEnabled,
    autoSyncInterval: state.autoSyncInterval,
  }));
}

const initial = loadState();

export const useAutoSyncStore = create((set) => ({
  autoSyncEnabled: initial.autoSyncEnabled ?? true,
  autoSyncInterval: initial.autoSyncInterval || 300000, // 5 minutes

  setAutoSyncEnabled: (enabled) =>
    set((state) => {
      const next = { ...state, autoSyncEnabled: enabled };
      saveState(next);
      return { autoSyncEnabled: enabled };
    }),

  setAutoSyncInterval: (interval) =>
    set((state) => {
      const next = { ...state, autoSyncInterval: interval };
      saveState(next);
      return { autoSyncInterval: interval };
    }),
}));
