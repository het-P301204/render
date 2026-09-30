import { create } from 'zustand';
import type { TelemetryEvent, StageId, EngineId, StageStatus, AttackMode } from '../types';
import { getTelemetry } from '../api/client';

interface TelemetryState {
  events: TelemetryEvent[];
  loading: boolean;
  filterStage: StageId | 'ALL';
  filterEngine: EngineId | 'ALL';
  filterStatus: StageStatus | 'ALL';
  polling: boolean;

  fetchEvents: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  setFilterStage: (stage: StageId | 'ALL') => void;
  setFilterEngine: (engine: EngineId | 'ALL') => void;
  setFilterStatus: (status: StageStatus | 'ALL') => void;
  addEvent: (event: TelemetryEvent) => void;
}

let pollInterval: ReturnType<typeof setInterval> | null = null;

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  events: [],
  loading: false,
  filterStage: 'ALL',
  filterEngine: 'ALL',
  filterStatus: 'ALL',
  polling: false,

  fetchEvents: async () => {
    set({ loading: true });
    try {
      const events = await getTelemetry();
      set({ events });
    } catch {
      // API offline — keep existing events
    } finally {
      set({ loading: false });
    }
  },

  startPolling: () => {
    if (pollInterval) return;
    set({ polling: true });
    pollInterval = setInterval(() => {
      get().fetchEvents();
    }, 2000);
  },

  stopPolling: () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    set({ polling: false });
  },

  setFilterStage: (filterStage) => set({ filterStage }),
  setFilterEngine: (filterEngine) => set({ filterEngine }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),

  addEvent: (event) =>
    set((s) => ({
      events: [event, ...s.events].slice(0, 500),
    })),
}));

// Simulate demo events when API is offline
export const DEMO_EVENTS: TelemetryEvent[] = [
  {
    id: 'ev-001',
    timestamp: new Date(Date.now() - 5000).toISOString(),
    stage: 'DETECT',
    engine: 'jinja2',
    payload: '{{7*7}}',
    status: 'SUCCESS',
    response_preview: '49',
    duration_ms: 124,
    mode: 'vulnerable' as AttackMode,
  },
  {
    id: 'ev-002',
    timestamp: new Date(Date.now() - 10000).toISOString(),
    stage: 'FINGERPRINT',
    engine: 'jinja2',
    payload: '{{config.__class__}}',
    status: 'SUCCESS',
    response_preview: '<class jinja2.environment.Environment>',
    duration_ms: 98,
    mode: 'vulnerable' as AttackMode,
  },
  {
    id: 'ev-003',
    timestamp: new Date(Date.now() - 15000).toISOString(),
    stage: 'RCE',
    engine: 'handlebars',
    payload: '{{#with "s"}}...{{/with}}',
    status: 'BLOCKED',
    response_preview: 'SecurityError: prototype chain access denied',
    duration_ms: 45,
    mode: 'hardened' as AttackMode,
  },
];
