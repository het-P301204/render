import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon, Command, Zap } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useLabStore } from '../../stores/labStore';
import { StatusDot } from '../ui/StatusDot';

const PAGE_TITLES: Record<string, string> = {
  '/':          'Overview',
  '/lab':       'Attack Lab',
  '/engines':   'Engine Explorer',
  '/payloads':  'Payload Library',
  '/detection': 'Detection Rules',
  '/telemetry': 'Live Telemetry',
  '/findings':  'Findings',
  '/compare':   'Vulnerable vs Hardened',
  '/reports':   'Reports',
  '/settings':  'Settings',
};

const ENGINES = ['jinja2', 'handlebars', 'nunjucks', 'mako'] as const;

const ENGINE_ABBR: Record<string, string> = {
  jinja2: 'JINJ',
  handlebars: 'HAND',
  nunjucks: 'NUNJ',
  mako: 'MAKO',
};

export const Header: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme, setCommandPaletteOpen } = useUiStore();
  const { status, apiOnline, labs } = useLabStore();

  const title = PAGE_TITLES[location.pathname] ?? 'RENDER';
  const runningCount = labs.filter((l) => l.running).length;

  return (
    <header style={{
      height: 52,
      background: 'var(--bg-workspace)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 14,
      flexShrink: 0,
    }}>
      {/* Page title */}
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--text-primary)',
        flex: 1,
      }}>
        {title}
      </h1>

      {/* Lab status dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {runningCount > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(127,165,138,0.10)',
            border: '1px solid rgba(127,165,138,0.25)',
          }}>
            <Zap size={9} color="var(--color-success)" />
            <span style={{ fontSize: 10, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
              {runningCount} LIVE
            </span>
          </div>
        )}

        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          LABS
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {ENGINES.map((engine) => {
            const s = status?.[engine] ?? 'unknown';
            return (
              <div key={engine} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <StatusDot status={s} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {ENGINE_ABBR[engine]}
                </span>
              </div>
            );
          })}
        </div>

        {/* API status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 7px',
          borderRadius: 'var(--radius-full)',
          background: apiOnline ? 'rgba(127,165,138,0.08)' : 'rgba(98,93,85,0.08)',
          border: `1px solid ${apiOnline ? 'rgba(127,165,138,0.20)' : 'rgba(98,93,85,0.15)'}`,
        }}>
          <StatusDot status={apiOnline ? 'online' : 'offline'} />
          <span style={{ fontSize: 10, color: apiOnline ? 'var(--color-success)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            API
          </span>
        </div>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title="Toggle theme"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-nested)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
      </button>

      {/* Command palette hint */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-nested)',
          border: '1px solid var(--border-muted)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          transition: 'all 0.15s',
        }}
      >
        <Command size={11} />
        <span>Ctrl K</span>
      </button>
    </header>
  );
};
