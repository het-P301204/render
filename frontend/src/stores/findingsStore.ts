import { create } from 'zustand';
import type { Finding, FindingCreate } from '../types';
import { getFindings, createFinding, deleteFinding } from '../api/client';

interface FindingsState {
  findings: Finding[];
  loading: boolean;
  selectedFinding: Finding | null;
  drawerOpen: boolean;

  fetchFindings: () => Promise<void>;
  addFinding: (data: FindingCreate) => Promise<void>;
  removeFinding: (id: string) => Promise<void>;
  setSelectedFinding: (finding: Finding | null) => void;
  setDrawerOpen: (open: boolean) => void;
}

export const useFindingsStore = create<FindingsState>((set, get) => ({
  findings: [],
  loading: false,
  selectedFinding: null,
  drawerOpen: false,

  fetchFindings: async () => {
    set({ loading: true });
    try {
      const findings = await getFindings();
      set({ findings });
    } catch {
      // API offline — keep existing
    } finally {
      set({ loading: false });
    }
  },

  addFinding: async (data) => {
    try {
      const finding = await createFinding(data);
      set((s) => ({ findings: [finding, ...s.findings] }));
    } catch {
      // Simulate adding
      const simFinding: Finding = {
        ...data,
        id: `REND-${String(get().findings.length + 1).padStart(3, '0')}`,
        timestamp: new Date().toISOString(),
        description: data.evidence,
      };
      set((s) => ({ findings: [simFinding, ...s.findings] }));
    }
  },

  removeFinding: async (id) => {
    try {
      await deleteFinding(id);
    } catch {
      // Remove locally anyway
    }
    set((s) => ({ findings: s.findings.filter((f) => f.id !== id) }));
  },

  setSelectedFinding: (selectedFinding) => set({ selectedFinding }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
}));
