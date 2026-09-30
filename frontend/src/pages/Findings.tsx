import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, Trash2, Download } from 'lucide-react';
import { Badge, SeverityBadge, EngineBadge, StageBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Drawer } from '../components/ui/Drawer';
import { EmptyState } from '../components/ui/EmptyState';
import { useFindingsStore } from '../stores/findingsStore';
import type { Finding, Severity, EngineId, StageId } from '../types';

const SEVERITY_BORDER: Record<Severity, string> = {
  critical: 'var(--color-critical)',
  high: 'var(--color-execution)',
  medium: 'var(--color-warning)',
  low: 'var(--color-primary)',
  info: 'var(--color-neutral)',
};

// Demo findings when API offline
const DEMO_FINDINGS: Finding[] = [
  {
    id: 'REND-001',
    title: 'Jinja2 RCE via __subclasses__ Gadget Chain',
    severity: 'critical',
    engine: 'jinja2',
    stage: 'RCE',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    payload: '{{"".__class__.__mro__[1].__subclasses__()[396]("id",shell=True,stdout=-1).communicate()[0]}}',
    evidence: 'Response: b"uid=1000(www) gid=1000(www) groups=1000(www)\\n"',
    impact: 'Full remote code execution as web server user. Attacker can read /etc/passwd, write files, establish reverse shells.',
    remediation: 'Enable Jinja2 sandbox environment. Validate and sanitize all user input before template rendering. Never pass user input directly to render().',
    description: 'Confirmed RCE via Python class introspection gadget chain.',
  },
  {
    id: 'REND-002',
    title: 'Nunjucks range.constructor RCE',
    severity: 'critical',
    engine: 'nunjucks',
    stage: 'RCE',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    payload: "{{range.constructor(\"return require('child_process').execSync('id').toString()\")()}}",
    evidence: "uid=1000(node) gid=1000(node) groups=1000(node)",
    impact: 'Arbitrary Node.js code execution. Full access to file system, network, and process environment.',
    remediation: 'Use nunjucks in sandboxed mode. Apply input validation and allowlisting for template expressions.',
    description: 'Nunjucks range.constructor allows arbitrary Function construction and execution.',
  },
  {
    id: 'REND-003',
    title: 'Jinja2 Config Object Exposure',
    severity: 'high',
    engine: 'jinja2',
    stage: 'FINGERPRINT',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    payload: '{{config}}',
    evidence: '<Config {SECRET_KEY: "dev-secret-xyz123", DATABASE_URI: "postgresql://..."}}>',
    impact: 'Exposure of application secrets including database credentials and secret keys.',
    remediation: 'Remove direct config object access from template context. Restrict template variables to minimum required.',
    description: 'Config object accessible directly in template context.',
  },
];

type SortField = 'severity' | 'engine' | 'stage';

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'var(--color-critical)',
  high:     'var(--color-execution)',
  medium:   'var(--color-warning)',
  low:      'var(--color-primary)',
  info:     'var(--color-neutral)',
};

function formatTime(ts: string) {
  return new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

function SeverityChart({ findings }: { findings: { severity: Severity }[] }) {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  findings.forEach((f) => { if (f.severity in counts) counts[f.severity]++; });
  const max = Math.max(...Object.values(counts), 1);

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      padding: '14px 16px',
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 20,
      flexWrap: 'wrap',
    }}>
      {Object.entries(counts).map(([sev, count]) => (
        <div key={sev} style={{ flex: 1, minWidth: 80 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: SEVERITY_COLORS[sev], textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {sev}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: count > 0 ? SEVERITY_COLORS[sev] : 'var(--text-muted)' }}>
              {count}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-nested)', borderRadius: 3, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(count / max) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', background: SEVERITY_COLORS[sev], borderRadius: 3 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export const Findings: React.FC = () => {
  const navigate = useNavigate();
  const { findings, fetchFindings, removeFinding } = useFindingsStore();
  const [selected, setSelected] = useState<Finding | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>('severity');
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'ALL'>('ALL');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchFindings();
  }, []);

  // Use demo if no real findings loaded
  const displayFindings: Finding[] = findings.length > 0 ? findings : DEMO_FINDINGS;

  const handleExport = () => {
    const data = JSON.stringify(displayFindings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `render-findings-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = displayFindings.filter((f) =>
    filterSeverity === 'ALL' || f.severity === filterSeverity
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'severity') return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sortBy === 'engine') return a.engine.localeCompare(b.engine);
    if (sortBy === 'stage') return a.stage.localeCompare(b.stage);
    return 0;
  });

  const openDrawer = (f: Finding) => {
    setSelected(f);
    setDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    await removeFinding(selected.id);
    setDeleting(false);
    setDrawerOpen(false);
    setSelected(null);
  };

  const chipStyle = (active: boolean) => ({
    fontFamily: 'var(--font-mono)' as const,
    fontSize: 10,
    padding: '3px 10px',
    borderRadius: 'var(--radius-full)' as const,
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--border-muted)'}`,
    background: active ? 'rgba(201,130,82,0.14)' : 'transparent',
    color: active ? 'var(--color-primary)' : 'var(--text-muted)',
    cursor: 'pointer' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <AlertTriangle size={20} color="var(--color-warning)" />
              <h2 style={{ fontSize: 22, fontFamily: 'var(--font-heading)' }}>Findings</h2>
              <Badge>{displayFindings.length}</Badge>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Confirmed vulnerabilities discovered during attack lab sessions.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={12} />}
            onClick={handleExport}
          >
            Export JSON
          </Button>
        </div>

        {/* Severity distribution */}
        <SeverityChart findings={displayFindings} />

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['ALL', 'critical', 'high', 'medium', 'low'] as const).map((sev) => (
              <button key={sev} style={chipStyle(filterSeverity === sev)} onClick={() => setFilterSeverity(sev)}>
                {sev}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SORT</span>
            {(['severity', 'engine', 'stage'] as SortField[]).map((s) => (
              <button key={s} style={chipStyle(sortBy === s)} onClick={() => setSortBy(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {sorted.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle size={32} />}
            title="NO ACTIVE FINDINGS"
            description="Run a scenario in the Attack Lab to identify vulnerabilities."
            action={<Button variant="primary" onClick={() => navigate('/lab')}>Open Attack Lab</Button>}
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
            gap: 16,
          }}>
            {sorted.map((finding, idx) => (
              <motion.div
                key={finding.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <Card style={{ borderLeft: `3px solid ${SEVERITY_BORDER[finding.severity]}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          color: 'var(--text-muted)',
                          background: 'var(--bg-nested)',
                          borderRadius: 4,
                          padding: '1px 6px',
                        }}>
                          {finding.id}
                        </span>
                        <SeverityBadge severity={finding.severity} />
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>
                        {finding.title}
                      </h3>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    <EngineBadge engine={finding.engine as EngineId} />
                    <StageBadge stage={finding.stage as StageId} />
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                      {formatTime(finding.timestamp)}
                    </span>
                  </div>

                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--text-code)',
                    background: 'var(--bg-nested)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 12,
                  }}>
                    {finding.payload}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Eye size={12} />}
                    onClick={() => openDrawer(finding)}
                  >
                    View Details
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selected?.id ?? 'Finding Details'}
        width={520}
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <SeverityBadge severity={selected.severity} size="md" />
                <EngineBadge engine={selected.engine as EngineId} size="md" />
                <StageBadge stage={selected.stage as StageId} size="md" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>
                {selected.title}
              </h3>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                {formatTime(selected.timestamp)}
              </p>
            </div>

            <section>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Payload</h4>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-code)', background: 'var(--bg-nested)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', wordBreak: 'break-all' }}>
                {selected.payload}
              </div>
            </section>

            <section>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Evidence</h4>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-success)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', wordBreak: 'break-all' }}>
                {selected.evidence}
              </div>
            </section>

            <section>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Impact</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {selected.impact}
              </p>
            </section>

            <section>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Remediation</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {selected.remediation}
              </p>
            </section>

            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={12} />}
                loading={deleting}
                onClick={handleDelete}
              >
                Delete Finding
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
