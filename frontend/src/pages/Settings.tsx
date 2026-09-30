import React, { useState } from 'react';
import { Settings2, Moon, Sun, Globe, RefreshCw, CheckCircle, XCircle, Clock, Server } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusDot } from '../components/ui/StatusDot';
import { Card } from '../components/ui/Card';
import { useUiStore } from '../stores/uiStore';
import { useLabStore } from '../stores/labStore';

const VERSION = '1.0.0';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 13,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-muted)',
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  control,
}: {
  label: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: '1px solid var(--border-subtle)',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {control}
      </div>
    </div>
  );
}

const ENGINE_COLORS: Record<string, string> = {
  jinja2: 'var(--color-ssti)',
  handlebars: 'var(--color-warning)',
  nunjucks: 'var(--color-detection)',
  mako: 'var(--color-execution)',
};

const ENGINE_LANG: Record<string, string> = {
  jinja2: 'Python',
  handlebars: 'JavaScript',
  nunjucks: 'JavaScript',
  mako: 'Python',
};

export const Settings: React.FC = () => {
  const { theme, toggleTheme, apiBaseUrl, setApiBaseUrl, navCollapsed, setNavCollapsed } = useUiStore();
  const { status, labs, loading, lastChecked, fetchStatus } = useLabStore();

  const [apiUrl, setApiUrl] = useState(apiBaseUrl);
  const [savedUrl, setSavedUrl] = useState(false);

  const handleSaveUrl = () => {
    setApiBaseUrl(apiUrl);
    setSavedUrl(true);
    setTimeout(() => setSavedUrl(false), 2000);
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-nested)',
    border: '1px solid var(--border-muted)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    padding: '6px 10px',
    outline: 'none',
    width: '260px',
  };

  const themeBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 'var(--radius-sm)',
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--border-muted)'}`,
    background: active ? 'rgba(201,130,82,0.14)' : 'var(--bg-nested)',
    color: active ? 'var(--color-primary)' : 'var(--text-muted)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const labStatusColor = (engine: string): 'online' | 'offline' | 'unknown' => {
    if (!status) return 'unknown';
    const val = (status as Record<string, string>)[engine];
    if (val === 'online' || val === 'offline') return val;
    return 'unknown';
  };

  const runningCount = labs.filter((l) => l.running).length;
  const totalCount = labs.length;

  const engineGroups = ['jinja2', 'handlebars', 'nunjucks', 'mako'];

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Settings2 size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: 22, fontFamily: 'var(--font-heading)' }}>Settings</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Configure RENDER platform appearance, API connections, and lab servers.
          </p>
        </div>

        {/* Lab Infrastructure Overview */}
        <Section title="Lab Infrastructure">
          <div style={{ padding: '12px 0 20px' }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <Card style={{ flex: 1, minWidth: 140 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Server size={16} color="var(--color-primary)" />
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>
                      {runningCount}/{totalCount}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Labs Running
                    </div>
                  </div>
                </div>
              </Card>
              <Card style={{ flex: 1, minWidth: 140 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: runningCount > 0 ? 'var(--color-success)' : 'var(--color-neutral)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {runningCount > 0 ? 'Ready for Attack' : 'Labs Offline'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {lastChecked ? `Updated ${new Date(lastChecked).toLocaleTimeString()}` : 'Not checked'}
                    </div>
                  </div>
                </div>
              </Card>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RefreshCw size={12} className={loading ? 'spin' : ''} />}
                  onClick={() => fetchStatus().catch(() => {})}
                >
                  {loading ? 'Checking…' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Lab detail cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
              {engineGroups.map((engine) => {
                const engineLabs = labs.filter((l) => l.engine === engine);
                const engineColor = ENGINE_COLORS[engine] ?? 'var(--color-primary)';
                const engineStatus = labStatusColor(engine);
                return (
                  <Card key={engine} style={{ borderLeft: `3px solid ${engineColor}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusDot status={engineStatus} />
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>
                          {engine}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--bg-nested)', padding: '1px 6px', borderRadius: 'var(--radius-full)' }}>
                          {ENGINE_LANG[engine]}
                        </span>
                      </div>
                      <span style={{
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: engineStatus === 'online' ? 'var(--color-success)' : 'var(--text-muted)',
                      }}>
                        {engineStatus}
                      </span>
                    </div>
                    {engineLabs.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        No lab data
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {engineLabs.map((lab) => (
                          <div
                            key={lab.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              background: 'var(--bg-nested)',
                              borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${lab.running ? 'var(--color-success)30' : 'var(--border-subtle)'}`,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {lab.running ? (
                                <CheckCircle size={13} color="var(--color-success)" />
                              ) : (
                                <XCircle size={13} color="var(--color-neutral)" />
                              )}
                              <span style={{
                                fontSize: 12,
                                fontFamily: 'var(--font-mono)',
                                color: lab.mode === 'vulnerable' ? 'var(--color-critical)' : 'var(--color-success)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                fontWeight: 600,
                              }}>
                                {lab.mode}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                {lab.url}
                              </span>
                            </div>
                            <span style={{
                              fontSize: 10,
                              fontFamily: 'var(--font-mono)',
                              color: lab.status_code === 200 ? 'var(--color-success)' : 'var(--text-muted)',
                            }}>
                              {lab.status_code ? `HTTP ${lab.status_code}` : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-nested)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={12} color="var(--text-muted)" />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Status auto-refreshes every 30s. To start labs: run <code style={{ color: 'var(--text-code)' }}>python apps/jinja-lab/vulnerable_app.py</code> etc. from the RENDER project root.
                </span>
              </div>
            </div>
          </div>
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <SettingRow
            label="Theme"
            description="Switch between dark and light mode. Dark mode is recommended for lab sessions."
            control={
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  style={themeBtn(theme === 'dark')}
                  onClick={() => theme !== 'dark' && toggleTheme()}
                >
                  <Moon size={13} />
                  Dark
                </button>
                <button
                  style={themeBtn(theme === 'light')}
                  onClick={() => theme !== 'light' && toggleTheme()}
                >
                  <Sun size={13} />
                  Light
                </button>
              </div>
            }
          />
          <SettingRow
            label="Sidebar"
            description="Start with the sidebar expanded or collapsed by default."
            control={
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  style={themeBtn(!navCollapsed)}
                  onClick={() => setNavCollapsed(false)}
                >
                  Expanded
                </button>
                <button
                  style={themeBtn(navCollapsed)}
                  onClick={() => setNavCollapsed(true)}
                >
                  Collapsed
                </button>
              </div>
            }
          />
        </Section>

        {/* API Server */}
        <Section title="API Server">
          <SettingRow
            label="Base URL"
            description="URL of the RENDER FastAPI backend. Default: http://localhost:8000"
            control={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  style={inputStyle}
                  placeholder="http://localhost:8000"
                />
                <Button variant="secondary" size="sm" onClick={handleSaveUrl}>
                  {savedUrl ? 'Saved!' : 'Save'}
                </Button>
              </div>
            }
          />
        </Section>

        {/* About */}
        <Section title="About">
          <SettingRow
            label={`RENDER v${VERSION}`}
            description="Server-Side Template Injection (SSTI) security research platform. Supports Jinja2, Handlebars, Nunjucks, and Mako with 5-stage attack chain: DETECT → FINGERPRINT → EXTRACT → ESCAPE → RCE."
            control={
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-primary)' }}>
                  v{VERSION}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  SSTI Research Suite
                </div>
              </div>
            }
          />
          <SettingRow
            label="Documentation"
            description="PortSwigger SSTI research — attack vectors, remediation, and real-world case studies."
            control={
              <Button
                variant="ghost"
                size="sm"
                icon={<Globe size={12} />}
                onClick={() => window.open('https://portswigger.net/web-security/server-side-template-injection', '_blank')}
              >
                Open Docs
              </Button>
            }
          />
        </Section>
      </div>
    </div>
  );
};
