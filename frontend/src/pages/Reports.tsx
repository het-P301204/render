import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { EngineBadge } from '../components/ui/Badge';
import { getReports, generateReport } from '../api/client';
import type { Report, EngineId, ReportGenerateRequest } from '../types';

// Demo report
const DEMO_REPORTS: Report[] = [
  {
    id: 'RPT-001',
    title: 'Jinja2 SSTI Full Chain Analysis',
    generated_at: new Date(Date.now() - 3600000).toISOString(),
    engine: 'jinja2',
    stage_count: 5,
    finding_count: 3,
    content: `# RENDER Security Report — Jinja2

**Generated:** ${new Date(Date.now() - 3600000).toLocaleString()}
**Engine:** Jinja2 (Flask/Django)
**Stages Covered:** DETECT, FINGERPRINT, EXTRACT, ESCAPE, RCE
**Findings:** 3 confirmed vulnerabilities

---

## Executive Summary

The Jinja2 template engine lab revealed critical Server-Side Template Injection vulnerabilities allowing full Remote Code Execution. The attack chain was completed in 5 stages with consistent success across all attempts in vulnerable mode.

## Findings

### REND-001 — Critical: RCE via __subclasses__ Gadget Chain
- **Stage:** RCE
- **Payload:** \`{{"".__class__.__mro__[1].__subclasses__()[396]("id",shell=True,stdout=-1).communicate()[0]}}\`
- **Evidence:** \`uid=1000(www) gid=1000(www) groups=1000(www)\`
- **Remediation:** Enable sandbox environment; never pass raw user input to render_template_string()

### REND-002 — High: Config Object Exposure
- **Stage:** FINGERPRINT
- **Payload:** \`{{config}}\`
- **Evidence:** SECRET_KEY and DATABASE_URI leaked
- **Remediation:** Remove config from template context

### REND-003 — High: MRO Traversal
- **Stage:** EXTRACT
- **Payload:** \`{{"".__class__.__mro__}}\`
- **Evidence:** Full Python class hierarchy exposed
- **Remediation:** Apply input allowlisting

## Recommendations

1. **Immediate:** Upgrade to Jinja2 sandbox mode for all user-controlled templates
2. **Short-term:** Implement strict input validation against template expression patterns
3. **Long-term:** Architect template rendering to use a separate sandboxed process
`,
  },
];

function formatTime(ts: string) {
  return new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

// Backend sometimes embeds a raw ISO timestamp in the title (e.g. "SSTI Report — 2026-09-30T19:28:50+00:00").
// Strip it since generated_at is shown separately in a formatted form.
function cleanTitle(title: string) {
  return title.replace(/\s*[—–-]\s*\d{4}-\d{2}-\d{2}T[\d:.+]+Z?$/, '').trim();
}

function GenerateModal({ onClose, onGenerate }: { onClose: () => void; onGenerate: (req: ReportGenerateRequest) => Promise<void> }) {
  const [engine, setEngine] = useState<EngineId | undefined>(undefined);
  const [includeFindings, setIncludeFindings] = useState(true);
  const [includeTelemetry, setIncludeTelemetry] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    await onGenerate({ engine, include_findings: includeFindings, include_telemetry: includeTelemetry });
    setLoading(false);
    onClose();
  };

  const selectStyle = {
    background: 'var(--bg-nested)',
    border: '1px solid var(--border-muted)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    padding: '6px 10px',
    width: '100%',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        style={{
          position: 'relative',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          width: 400,
          zIndex: 61,
        }}
      >
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 20 }}>Generate Report</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Engine Filter (optional)</label>
            <select value={engine ?? ''} onChange={(e) => setEngine(e.target.value ? e.target.value as EngineId : undefined)} style={selectStyle}>
              <option value="">All Engines</option>
              {['jinja2', 'handlebars', 'nunjucks', 'mako'].map((eng) => (
                <option key={eng} value={eng}>{eng}</option>
              ))}
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={includeFindings} onChange={(e) => setIncludeFindings(e.target.checked)} style={{ accentColor: 'var(--color-primary)' }} />
            Include findings
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={includeTelemetry} onChange={(e) => setIncludeTelemetry(e.target.checked)} style={{ accentColor: 'var(--color-primary)' }} />
            Include telemetry events
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={handleGenerate}>Generate</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getReports()
      .then((data) => setReports(Array.isArray(data) ? data : DEMO_REPORTS))
      .catch(() => setReports(DEMO_REPORTS))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async (req: ReportGenerateRequest) => {
    try {
      const report = await generateReport(req);
      setReports((prev) => [report, ...prev]);
    } catch {
      // Simulate a generated report
      const sim: Report = {
        id: `RPT-${String(reports.length + 1).padStart(3, '0')}`,
        title: `${req.engine ? req.engine.toUpperCase() + ' ' : ''}SSTI Research Report`,
        generated_at: new Date().toISOString(),
        engine: req.engine ?? 'jinja2',
        stage_count: 5,
        finding_count: reports.length > 0 ? reports[0].finding_count : 0,
        content: `# RENDER Report\n\nGenerated at ${new Date().toLocaleString()}\n\nNo API connection — demo mode active.\n`,
      };
      setReports((prev) => [sim, ...prev]);
    }
  };

  const handleCopy = (report: Report) => {
    navigator.clipboard.writeText(report.content);
    setCopied(report.id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <FileText size={20} color="var(--color-primary)" />
              <h2 style={{ fontSize: 22, fontFamily: 'var(--font-heading)' }}>Reports</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Generated security assessment reports from attack lab sessions.
            </p>
          </div>
          <Button
            variant="primary"
            icon={<Plus size={14} />}
            onClick={() => setShowModal(true)}
          >
            Generate Report
          </Button>
        </div>

        {/* Report list */}
        {reports.length === 0 && !loading ? (
          <EmptyState
            icon={<FileText size={32} />}
            title="NO REPORTS GENERATED"
            description="Complete an attack chain and generate your first report."
            action={<Button variant="primary" onClick={() => setShowModal(true)}>Generate Report</Button>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reports.map((report, idx) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-nested)', borderRadius: 4, padding: '1px 6px' }}>
                          {report.id}
                        </span>
                        <EngineBadge engine={report.engine as EngineId} />
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                        {cleanTitle(report.title)}
                      </h3>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatTime(report.generated_at)}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {report.finding_count} findings · {report.stage_count} stages
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Copy size={12} />}
                        onClick={() => handleCopy(report)}
                      >
                        {copied === report.id ? 'Copied!' : 'Copy'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={expanded === report.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        onClick={() => setExpanded(expanded === report.id ? null : report.id)}
                      >
                        View
                      </Button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expanded === report.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{
                          marginTop: 16,
                          background: 'var(--bg-nested)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                          maxHeight: 480,
                          overflow: 'auto',
                        }}>
                          <pre style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            color: 'var(--text-code)',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.7,
                            margin: 0,
                          }}>
                            {report.content?.trim()
                              || `# ${cleanTitle(report.title)}\n\nGenerated: ${formatTime(report.generated_at)}\nFindings: ${(report as any).finding_count ?? (report as any).findings_count ?? 0}\n\n_This report was created before full content generation was supported._\n_Generate a new report to see full markdown output._`}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <GenerateModal onClose={() => setShowModal(false)} onGenerate={handleGenerate} />
        )}
      </AnimatePresence>
    </div>
  );
};
