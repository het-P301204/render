import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { Badge, StageBadge, EngineBadge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import type { DetectionRule, DetectionEvent, EngineId, StageId } from '../types';
import { getDetectionRules } from '../api/client';
// Demo detection rules when API is offline
const DEMO_RULES: DetectionRule[] = [
  {
    id: 'RENDER-001',
    name: 'Template Expression Injection',
    description: 'Detects user-controlled input being rendered inside template expression delimiters, indicating potential SSTI vulnerability.',
    severity: 'high',
    trigger_condition: 'input.match(/\\{\\{.*\\}\\}|\\$\\{.*\\}|<%.*%>/)',
    evidence_example: '{{7*7}} → 49',
  },
  {
    id: 'RENDER-002',
    name: 'Class Introspection Attempt',
    description: 'Detects attempts to access Python/JS class internals via template syntax, commonly used to escalate from SSTI to RCE.',
    severity: 'high',
    trigger_condition: 'payload.includes("__class__") || payload.includes("__mro__") || payload.includes("constructor")',
    evidence_example: '{{"".__class__.__mro__[1].__subclasses__()}}',
  },
  {
    id: 'RENDER-003',
    name: 'Remote Code Execution via Template',
    description: 'Detects confirmed template-based RCE through subprocess, os.system, or equivalent calls embedded in template payloads.',
    severity: 'critical',
    trigger_condition: 'payload.match(/subprocess|os\\.system|execSync|child_process|popen/i)',
    evidence_example: '{{"".__class__.__mro__[1].__subclasses__()[396]("id",shell=True).communicate()}}',
  },
];

// Demo detection events
const DEMO_EVENTS: DetectionEvent[] = [
  { id: 'de-001', rule_id: 'RENDER-001', timestamp: new Date(Date.now() - 5000).toISOString(), engine: 'jinja2', stage: 'DETECT', payload: '{{7*7}}', matched: true },
  { id: 'de-002', rule_id: 'RENDER-002', timestamp: new Date(Date.now() - 12000).toISOString(), engine: 'jinja2', stage: 'FINGERPRINT', payload: '{{config.__class__}}', matched: true },
  { id: 'de-003', rule_id: 'RENDER-003', timestamp: new Date(Date.now() - 30000).toISOString(), engine: 'handlebars', stage: 'RCE', payload: '{{#with "s"}}...constructor...{{/with}}', matched: false },
  { id: 'de-004', rule_id: 'RENDER-001', timestamp: new Date(Date.now() - 60000).toISOString(), engine: 'nunjucks', stage: 'DETECT', payload: '${7*7}', matched: true },
  { id: 'de-005', rule_id: 'RENDER-003', timestamp: new Date(Date.now() - 90000).toISOString(), engine: 'mako', stage: 'RCE', payload: '<% import subprocess %>', matched: true },
];

const RULE_SEVERITY_COLOR: Record<string, string> = {
  'RENDER-001': 'var(--color-execution)',
  'RENDER-002': 'var(--color-execution)',
  'RENDER-003': 'var(--color-critical)',
};

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const Detection: React.FC = () => {
  const [rules, setRules] = useState<DetectionRule[]>(DEMO_RULES);
  const [events] = useState<DetectionEvent[]>(DEMO_EVENTS);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  useEffect(() => {
    getDetectionRules()
      .then((data) => { setRules(Array.isArray(data) ? data : DEMO_RULES); })
      .catch(() => setRules(DEMO_RULES));
  }, []);

  // Ensure rules is always an array (Fast Refresh can preserve stale state)
  const safeRules = Array.isArray(rules) ? rules : DEMO_RULES;

  // Count triggers per rule from detection events + telemetry
  const triggerCount = (ruleId: string) =>
    events.filter((e) => e.rule_id === ruleId && e.matched).length;

  const filters = ['ALL', 'RENDER-001', 'RENDER-002', 'RENDER-003'];
  const filteredEvents = Array.isArray(events)
    ? (activeFilter === 'ALL' ? events : events.filter((e) => e.rule_id === activeFilter))
    : DEMO_EVENTS;

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Shield size={20} color="var(--color-detection)" />
            <h2 style={{ fontSize: 22, fontFamily: 'var(--font-heading)' }}>Detection Rules</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Active detection signatures monitoring for SSTI attack patterns across all template engines.
          </p>
        </div>

        {/* Rule cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
          {safeRules.map((rule, idx) => {
            const color = RULE_SEVERITY_COLOR[rule.id] ?? 'var(--color-warning)';
            const count = triggerCount(rule.id);
            return (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card style={{ borderLeft: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          fontWeight: 600,
                          color,
                          background: `${color}18`,
                          border: `1px solid ${color}50`,
                          borderRadius: 'var(--radius-full)',
                          padding: '2px 10px',
                          letterSpacing: '0.06em',
                        }}>
                          {rule.id}
                        </span>
                        <Badge variant="severity" severity={rule.severity} size="sm">{rule.severity}</Badge>
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                        {rule.name}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
                        {rule.description}
                      </p>
                      <div style={{ background: 'var(--bg-nested)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Trigger Condition
                        </div>
                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-code)', wordBreak: 'break-all' }}>
                          {rule.trigger_condition ?? rule.trigger ?? '—'}
                        </code>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 28, fontFamily: 'var(--font-heading)', fontWeight: 700, color }}>
                        {count}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                        triggered
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Recent Events */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>Recent Events</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    border: `1px solid ${activeFilter === f ? 'var(--color-primary)' : 'var(--border-muted)'}`,
                    background: activeFilter === f ? 'rgba(201,130,82,0.14)' : 'transparent',
                    color: activeFilter === f ? 'var(--color-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredEvents.map((ev, idx) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', minWidth: 80 }}>
                  {formatTime(ev.timestamp)}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: RULE_SEVERITY_COLOR[ev.rule_id] ?? 'var(--color-neutral)',
                  background: `${RULE_SEVERITY_COLOR[ev.rule_id] ?? 'var(--color-neutral)'}18`,
                  border: `1px solid ${RULE_SEVERITY_COLOR[ev.rule_id] ?? 'var(--color-neutral)'}40`,
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  {ev.rule_id}
                </span>
                <EngineBadge engine={ev.engine as EngineId} />
                <StageBadge stage={ev.stage as StageId} />
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-code)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.payload}
                </code>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: ev.matched ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                  color: ev.matched ? 'var(--color-success)' : 'var(--color-neutral)',
                  border: `1px solid ${ev.matched ? 'var(--color-success)' : 'var(--color-neutral)'}50`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  {ev.matched ? 'MATCHED' : 'MISSED'}
                </span>
              </motion.div>
            ))}
            {filteredEvents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                NO EVENTS FOR THIS RULE
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
