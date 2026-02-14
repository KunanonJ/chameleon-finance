import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSubscriptionStore = create(
  persist(
    (set, get) => ({
      subs: [],
      step: 1,
      currentView: 'bar',
      income: 0,

      addSub: (sub) => set((state) => ({
        subs: [...state.subs, {
          ...sub,
          id: sub.id || Date.now().toString(),
          lastModified: new Date().toISOString()
        }]
      })),

      editSub: (id, data) => set((state) => ({
        subs: state.subs.map(s =>
          s.id === id ? { ...s, ...data, lastModified: new Date().toISOString() } : s
        )
      })),

      removeSub: (id) => set((state) => ({
        subs: state.subs.filter(s => s.id !== id)
      })),

      setSubs: (subs) => set({ subs }),

      clearAll: () => set({ subs: [] }),

      setStep: (step) => set({ step }),

      setView: (currentView) => set({ currentView }),

      setIncome: (income) => set({ income }),
    }),
    {
      name: 'vexly_flow_data',
      // Custom storage to handle legacy format (raw array) and new format (object with income)
      storage: {
        getItem: (name) => {
          const raw = localStorage.getItem(name);
          if (!raw) return null;
          try {
            const parsed = JSON.parse(raw);
            // Legacy format: raw array of subs
            if (Array.isArray(parsed)) {
              return { state: { subs: parsed, step: 1, currentView: 'bar', income: 0 } };
            }
            // New format: { subs, income }
            if (parsed && Array.isArray(parsed.subs)) {
              return { state: { subs: parsed.subs, step: 1, currentView: 'bar', income: parsed.income || 0 } };
            }
            return null;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          const { subs, income } = value.state;
          localStorage.setItem(name, JSON.stringify({ subs, income }));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => ({
        subs: state.subs,
        step: state.step,
        currentView: state.currentView,
        income: state.income,
      }),
    }
  )
);
