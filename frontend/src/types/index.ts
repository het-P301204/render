// ─── Engine Types ────────────────────────────────────────────────────────────

export type EngineId = 'jinja2' | 'handlebars' | 'nunjucks' | 'mako';

export interface Engine {
  id: EngineId;
  name: string;
  language: string;
  framework: string;
  status: 'online' | 'offline' | 'unknown';
  description: string;
  detection_syntax: string;
  fingerprint_example: string;
  escape_example: string;
  rce_example: string;
}

// ─── Stage Types ─────────────────────────────────────────────────────────────

export type StageId = 'DETECT' | 'FINGERPRINT' | 'EXTRACT' | 'ESCAPE' | 'RCE';
export type StageStatus = 'LOCKED' | 'READY' | 'RUNNING' | 'SUCCESS' | 'BLOCKED' | 'FAILED';
export type AttackMode = 'vulnerable' | 'hardened';

export interface Stage {
  id: StageId;
  number: number;
  name: string;
  status: StageStatus;
  payload?: string;
  result?: string;
  response?: string;
  evidence?: string;
  duration_ms?: number;
}

// ─── Attack Types ─────────────────────────────────────────────────────────────

export interface AttackRequest {
  engine: EngineId;
  target_url: string;
  stage: StageId;
  payload: string;
  mode: AttackMode;
}

export interface AttackChainRequest {
  engine: EngineId;
  target_url: string;
  mode: AttackMode;
}

export interface AttackResult {
  stage: StageId;
  status: StageStatus;
  payload: string;
  response: string;
  evidence: string;
  duration_ms: number;
  timestamp: string;
}

// ─── Payload Types ────────────────────────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Payload {
  id: string;
  name: string;
  engine: EngineId;
  stage: StageId;
  payload: string;
  expected_result: string;
  explanation: string;
  severity: Severity;
}

// ─── Detection Types ──────────────────────────────────────────────────────────

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  trigger_condition?: string;
  trigger?: string;
  evidence_example?: string;
  stages?: string[];
  cvss_score?: number;
  remediation?: string;
}

export interface DetectionEvent {
  id: string;
  rule_id: string;
  timestamp: string;
  engine: EngineId;
  stage: StageId;
  payload: string;
  matched: boolean;
}

// ─── Telemetry Types ──────────────────────────────────────────────────────────

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  stage: StageId;
  engine: EngineId;
  payload: string;
  status: StageStatus;
  response_preview: string;
  duration_ms: number;
  mode: AttackMode;
}

// ─── Finding Types ────────────────────────────────────────────────────────────

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  engine: EngineId;
  stage: StageId;
  timestamp: string;
  payload: string;
  evidence: string;
  impact: string;
  remediation: string;
  description?: string;
}

export interface FindingCreate {
  title: string;
  severity: Severity;
  engine: EngineId;
  stage: StageId;
  payload: string;
  evidence: string;
  impact: string;
  remediation: string;
}

// ─── Lab Status Types ─────────────────────────────────────────────────────────

export interface LabStatus {
  jinja2: 'online' | 'offline' | 'unknown';
  handlebars: 'online' | 'offline' | 'unknown';
  nunjucks: 'online' | 'offline' | 'unknown';
  mako: 'online' | 'offline' | 'unknown';
}

// ─── Compare Types ────────────────────────────────────────────────────────────

export interface CompareRequest {
  engine: EngineId;
  payload: string;
  stage: StageId;
}

export interface CompareResult {
  vulnerable: {
    payload: string;
    response: string;
    status: StageStatus;
    code_snippet: string;
  };
  hardened: {
    payload: string;
    response: string;
    status: StageStatus;
    code_snippet: string;
  };
  diff: string;
}

// ─── Scenario Types ───────────────────────────────────────────────────────────

export interface Scenario {
  id: string;
  name: string;
  description: string;
  engine: EngineId;
  stages: StageId[];
  mode: AttackMode;
}

export interface ScenarioRunRequest {
  scenario_id: string;
}

// ─── Report Types ─────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  title: string;
  generated_at: string;
  engine: EngineId;
  stage_count: number;
  finding_count: number;
  content: string;
}

export interface ReportGenerateRequest {
  engine?: EngineId;
  include_findings?: boolean;
  include_telemetry?: boolean;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiHealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

export interface ApiError {
  message: string;
  code?: string;
}
