import { create } from 'zustand';
import type { LabStatus } from '../types';
import { getLabStatus, getLabDetails, checkHealth } from '../api/client';

interface LabInfo {
  id: string;
  engine: string;
  mode: 'vulnerable' | 'hardened';
  url: string;
  running: boolean;
  status_code: number | null;
}

interface LabState {
  status: LabStatus | null;
  labs: LabInfo[];
  apiOnline: boolean;
  lastChecked: string | null;
  loading: boolean;
  fetchStatus: () => Promise<void>;
  startPolling: () => () => void;
}

export const useLabStore = create<LabState>((set, get) => ({
  status: null,
  labs: [],
  apiOnline: false,
  lastChecked: null,
  loading: false,

  fetchStatus: async () => {
    set({ loading: true });
    try {
      await checkHealth();
      set({ apiOnline: true });
      try {
        const [labs, status] = await Promise.all([getLabDetails(), getLabStatus()]);
        set({ status, labs, lastChecked: new Date().toISOString() });
      } catch {
        set({
          status: { jinja2: 'unknown', handlebars: 'unknown', nunjucks: 'unknown', mako: 'unknown' },
          lastChecked: new Date().toISOString(),
        });
      }
    } catch {
      set({ apiOnline: false });
    } finally {
      set({ loading: false });
    }
  },

  startPolling: () => {
    const tick = () => get().fetchStatus().catch(() => {});
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  },
}));
