import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type {
  ApiHealthResponse,
  LabStatus,
  Engine,
  Payload,
  EngineId,
  DetectionRule,
  Finding,
  FindingCreate,
  TelemetryEvent,
  AttackRequest,
  AttackResult,
  AttackChainRequest,
  CompareRequest,
  CompareResult,
  Scenario,
  ScenarioRunRequest,
  Report,
  ReportGenerateRequest,
} from '../types';
import { useUiStore } from '../stores/uiStore';

const http: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Interceptors ─────────────────────────────────────────────────────────────

// Read the current apiBaseUrl from the store on every request so Settings changes take effect immediately
http.interceptors.request.use((config) => {
  config.baseURL = useUiStore.getState().apiBaseUrl;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ─── Health ───────────────────────────────────────────────────────────────────

export const checkHealth = async (): Promise<ApiHealthResponse> => {
  const res = await http.get<ApiHealthResponse>('/api/health');
  return res.data;
};

// ─── Labs ─────────────────────────────────────────────────────────────────────

interface LabInfo {
  id: string;
  engine: string;
  mode: 'vulnerable' | 'hardened';
  url: string;
  running: boolean;
  status_code: number | null;
}

export const getLabDetails = async (): Promise<LabInfo[]> => {
  const res = await http.get<{ labs: LabInfo[] }>('/api/labs/status');
  return res.data.labs ?? [];
};

export const getLabStatus = async (): Promise<LabStatus> => {
  const labs = await getLabDetails();
  const statusFor = (engine: string): 'online' | 'offline' =>
    labs.some((l) => l.engine === engine && l.running) ? 'online' : 'offline';
  return {
    jinja2: statusFor('jinja2'),
    handlebars: statusFor('handlebars'),
    nunjucks: statusFor('nunjucks'),
    mako: statusFor('mako'),
  };
};

// ─── Engines ──────────────────────────────────────────────────────────────────

export const getEngines = async (): Promise<Engine[]> => {
  const res = await http.get<{ engines: Engine[] }>('/api/engines');
  return res.data.engines ?? [];
};

// ─── Payloads ─────────────────────────────────────────────────────────────────

export const getPayloads = async (): Promise<Payload[]> => {
  const res = await http.get<{ payloads: Payload[] }>('/api/payloads');
  return res.data.payloads ?? [];
};

export const getPayloadsByEngine = async (engine: EngineId): Promise<Payload[]> => {
  const res = await http.get<{ payloads: Payload[] }>(`/api/payloads/${engine}`);
  return res.data.payloads ?? [];
};

// ─── Detection ────────────────────────────────────────────────────────────────

export const getDetectionRules = async (): Promise<DetectionRule[]> => {
  const res = await http.get<{ rules: DetectionRule[] }>('/api/detection/rules');
  return res.data.rules ?? [];
};

// ─── Findings ────────────────────────────────────────────────────────────────

export const getFindings = async (): Promise<Finding[]> => {
  const res = await http.get<{ findings: Finding[] }>('/api/findings');
  return res.data.findings ?? [];
};

export const createFinding = async (data: FindingCreate): Promise<Finding> => {
  const res = await http.post<Finding>('/api/findings', data);
  return res.data;
};

export const deleteFinding = async (id: string): Promise<void> => {
  await http.delete(`/api/findings/${id}`);
};

// ─── Telemetry ────────────────────────────────────────────────────────────────

export const getTelemetry = async (): Promise<TelemetryEvent[]> => {
  const res = await http.get<{ events: TelemetryEvent[] }>('/api/telemetry');
  return res.data.events ?? [];
};

// ─── Attack ───────────────────────────────────────────────────────────────────

export const runAttack = async (data: AttackRequest): Promise<AttackResult> => {
  const res = await http.post<AttackResult>('/api/attack/run', data);
  return res.data;
};

export const runAttackChain = async (data: AttackChainRequest): Promise<AttackResult[]> => {
  const res = await http.post<AttackResult[]>('/api/attack/chain', data);
  return res.data;
};

// ─── Compare ─────────────────────────────────────────────────────────────────

export const compareAttack = async (data: CompareRequest): Promise<CompareResult> => {
  const res = await http.post<CompareResult>('/api/compare', data);
  return res.data;
};

// ─── Scenarios ───────────────────────────────────────────────────────────────

export const getScenarios = async (): Promise<Scenario[]> => {
  const res = await http.get<{ scenarios: Scenario[] }>('/api/scenarios');
  return res.data.scenarios ?? [];
};

export const runScenario = async (data: ScenarioRunRequest): Promise<AttackResult[]> => {
  const res = await http.post<AttackResult[]>('/api/scenarios/run', data);
  return res.data;
};

// ─── Reports ─────────────────────────────────────────────────────────────────

export const getReports = async (): Promise<Report[]> => {
  const res = await http.get<{ reports: Report[] }>('/api/reports');
  return res.data.reports ?? [];
};

export const generateReport = async (data: ReportGenerateRequest): Promise<Report> => {
  const res = await http.post<Report>('/api/reports/generate', data);
  return res.data;
};
