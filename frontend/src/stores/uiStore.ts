import { create } from 'zustand';

interface UiState {
  theme: 'dark' | 'light';
  navCollapsed: boolean;
  commandPaletteOpen: boolean;
  apiBaseUrl: string;
  initialized: boolean;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setNavCollapsed: (collapsed: boolean) => void;
  toggleNav: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setApiBaseUrl: (url: string) => void;
  setInitialized: (value: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'dark',
  navCollapsed: false,
  commandPaletteOpen: false,
  apiBaseUrl: 'http://localhost:8000',
  initialized: false,

  setTheme: (theme) => {
    set({ theme });
    document.documentElement.classList.toggle('light', theme === 'light');
  },

  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('light', next === 'light');
      return { theme: next };
    }),

  setNavCollapsed: (navCollapsed) => set({ navCollapsed }),
  toggleNav: () => set((s) => ({ navCollapsed: !s.navCollapsed })),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setApiBaseUrl: (apiBaseUrl) => set({ apiBaseUrl }),
  setInitialized: (initialized) => set({ initialized }),
}));
