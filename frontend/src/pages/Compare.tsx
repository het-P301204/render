import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCompare, Play, Lock, Unlock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusBadge, EngineBadge } from '../components/ui/Badge';
import { compareAttack } from '../api/client';
import type { EngineId, StageId, CompareResult, StageStatus } from '../types';

const ENGINES: EngineId[] = ['jinja2', 'handlebars', 'nunjucks', 'mako'];
const STAGES: StageId[] = ['DETECT', 'FINGERPRINT', 'EXTRACT', 'ESCAPE', 'RCE'];

const DEFAULT_PAYLOADS: Record<StageId, string> = {
  DETECT: '{{7*7}}',
  FINGERPRINT: '{{config.__class__.__init__.__globals__}}',
  EXTRACT: '{{"".__class__.__mro__[1].__subclasses__()}}',
  ESCAPE: '{{"".__class__.__mro__[1].__subclasses__()[96].__init__.__globals__["sys"].path}}',
  RCE: '{{"".__class__.__mro__[1].__subclasses__()[396]("id",shell=True,stdout=-1).communicate()[0]}}',
};

// Demo compare result when API offline
const DEMO_RESULT: CompareResult = {
  vulnerable: {
    payload: '{{7*7}}',
    response: '49',
    status: 'SUCCESS',
    code_snippet: `# VULNERABLE — app.py
@app.route('/render')
def render_page():
    name = request.args.get('name', '')
    # DANGER: User input rendered directly
    template = f"Hello {name}"
    return render_template_string(template)`,
  },
  hardened: {
    payload: '{{7*7}}',
    response: 'Hello {{7*7}}',
    status: 'BLOCKED',
    code_snippet: `# HARDENED — app.py
@app.route('/render')
def render_page():
    name = request.args.get('name', '')
    # SAFE: Input passed as variable, not rendered
    return render_template_string(
        "Hello {{ name }}", name=name
    )`,
  },
  diff: `- template = f"Hello {name}"\n- return render_template_string(template)\n+ return render_template_string("Hello {{ name }}", name=name)`,
};

function DiffView({ diff }: { diff: string | undefined }) {
  const lines = (diff ?? '').split('\n');
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7 }}>
      {lines.map((line, i) => {
        const isAdd = line.startsWith('+');
        const isRem = line.startsWith('-');
        return (
          <div key={i} style={{
            padding: '1px 8px',
            background: isAdd ? 'rgba(16,185,129,0.12)' : isRem ? 'rgba(239,68,68,0.12)' : 'transparent',
            color: isAdd ? 'var(--color-success)' : isRem ? 'var(--color-critical)' : 'var(--text-code)',
            borderLeft: `2px solid ${isAdd ? 'var(--color-success)' : isRem ? 'var(--color-critical)' : 'transparent'}`,
          }}>
            {line || ' '}
          </div>
        );
      })}
    </div>
  );
}

export const Compare: React.FC = () => {
  const [engine, setEngine] = useState<EngineId>('jinja2');
  const [stage, setStage] = useState<StageId>('DETECT');
  const [payload, setPayload] = useState(DEFAULT_PAYLOADS.DETECT);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStageChange = (s: StageId) => {
    setStage(s);
    setPayload(DEFAULT_PAYLOADS[s]);
  };

  const handleCompare = async () => {
    setLoading(true);
    try {
      const res = await compareAttack({ engine, payload, stage });
      setResult(res);
    } catch {
      // Demo result when offline
      setResult({ ...DEMO_RESULT, vulnerable: { ...DEMO_RESULT.vulnerable, payload } });
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    background: 'var(--bg-nested)',
    border: '1px solid var(--border-muted)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    padding: '6px 10px',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <GitCompare size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: 22, fontFamily: 'var(--font-heading)' }}>Vulnerable vs Hardened</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Compare attack outcomes side-by-side between vulnerable and hardened configurations.
          </p>
        </div>

        {/* Config row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 24,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Engine</label>
            <select value={engine} onChange={(e) => setEngine(e.target.value as EngineId)} style={selectStyle}>
              {ENGINES.map((eng) => <option key={eng} value={eng}>{eng}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stage</label>
            <select value={stage} onChange={(e) => handleStageChange(e.target.value as StageId)} style={selectStyle}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 }}>
            <label style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payload</label>
            <input
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              style={{
                ...selectStyle,
                width: '100%',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
              }}
            />
          </div>

          <div style={{ paddingTop: 18 }}>
            <Button
              variant="primary"
              icon={<Play size={14} />}
              loading={loading}
              onClick={handleCompare}
            >
              Compare
            </Button>
          </div>
        </div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Split panel */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* Vulnerable */}
                <div style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  borderTop: '3px solid var(--color-critical)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Unlock size={14} color="var(--color-critical)" />
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 600, color: 'var(--color-critical)' }}>VULNERABLE</span>
                    <EngineBadge engine={engine} />
                    <StatusBadge status={result.vulnerable.status as StageStatus} />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Payload</div>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-execution)', background: 'var(--bg-nested)', borderRadius: 6, padding: '6px 10px', display: 'block', wordBreak: 'break-all' }}>
                      {result.vulnerable.payload}
                    </code>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Response</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-critical)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '8px 12px', wordBreak: 'break-all', lineHeight: 1.6 }}>
                      {result.vulnerable.response}
                    </div>
                  </div>
                </div>

                {/* Hardened */}
                <div style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  borderTop: '3px solid var(--color-success)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Lock size={14} color="var(--color-success)" />
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 600, color: 'var(--color-success)' }}>HARDENED</span>
                    <EngineBadge engine={engine} />
                    <StatusBadge status={result.hardened.status as StageStatus} />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Payload</div>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-code)', background: 'var(--bg-nested)', borderRadius: 6, padding: '6px 10px', display: 'block', wordBreak: 'break-all' }}>
                      {result.hardened.payload}
                    </code>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Response</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-success)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '8px 12px', wordBreak: 'break-all', lineHeight: 1.6 }}>
                      {result.hardened.response}
                    </div>
                  </div>
                </div>
              </div>

              {/* What changed */}
              <div style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
                padding: '20px',
                marginBottom: 24,
              }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, marginBottom: 6 }}>What changed?</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                  The hardened version passes user input as a template <em>variable</em> rather than embedding it directly into the template string.
                  This prevents the template engine from interpreting user content as executable expressions.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-critical)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Vulnerable Code</div>
                    <div style={{ background: 'var(--bg-nested)', borderRadius: 'var(--radius-sm)', padding: '12px', overflow: 'auto' }}>
                      <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-code)', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {result.vulnerable.code_snippet}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Hardened Code</div>
                    <div style={{ background: 'var(--bg-nested)', borderRadius: 'var(--radius-sm)', padding: '12px', overflow: 'auto' }}>
                      <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-code)', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {result.hardened.code_snippet}
                      </pre>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Diff</div>
                  <div style={{ background: 'var(--bg-nested)', borderRadius: 'var(--radius-sm)', padding: '12px', overflow: 'auto' }}>
                    <DiffView diff={result.diff} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!result && !loading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}>
            <GitCompare size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              SELECT ENGINE AND STAGE, THEN CLICK COMPARE
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
