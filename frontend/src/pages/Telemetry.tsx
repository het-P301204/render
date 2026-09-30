import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Radio } from 'lucide-react';
import { StageBadge, EngineBadge, StatusBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useTelemetryStore, DEMO_EVENTS } from '../stores/telemetryStore';
import type { StageId, EngineId, StageStatus } from '../types';

const STAGE_COLORS: Record<StageId, string> = {
  DETECT: 'var(--color-detection)',
  FINGERPRINT: 'var(--color-primary)',
  EXTRACT: 'var(--color-ssti)',
  ESCAPE: 'var(--color-execution)',
  RCE: 'var(--color-critical)',
};

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const STAGES: (StageId | 'ALL')[] = ['ALL', 'DETECT', 'FINGERPRINT', 'EXTRACT', 'ESCAPE', 'RCE'];
const ENGINES: (EngineId | 'ALL')[] = ['ALL', 'jinja2', 'handlebars', 'nunjucks', 'mako'];
const STATUSES: (StageStatus | 'ALL')[] = ['ALL', 'SUCCESS', 'BLOCKED', 'FAILED'];

export const Telemetry: React.FC = () => {
  const {
    events,
    polling,
    filterStage,
    filterEngine,
    filterStatus,
    startPolling,
    stopPolling,
    setFilterStage,
    setFilterEngine,
    setFilterStatus,
  } = useTelemetryStore();

  const [autoScroll, setAutoScroll] = useState(true);
  const topRef = useRef<HTMLDivElement>(null);

  // Use demo events when no real events
  const displayEvents = events.length > 0 ? events : DEMO_EVENTS;

  const filtered = displayEvents.filter((e) => {
    if (filterStage !== 'ALL' && e.stage !== filterStage) return false;
    if (filterEngine !== 'ALL' && e.engine !== filterEngine) return false;
    if (filterStatus !== 'ALL' && e.status !== filterStatus) return false;
    return true;
  });

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (autoScroll && topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filtered.length, autoScroll]);

  const chipStyle = (active: boolean, color?: string) => ({
    fontFamily: 'var(--font-mono)' as const,
    fontSize: 10,
    padding: '3px 10px',
    borderRadius: 'var(--radius-full)' as const,
    border: `1px solid ${active ? (color ?? 'var(--color-primary)') : 'var(--border-muted)'}`,
    background: active ? `${color ?? 'var(--color-primary)'}18` : 'transparent',
    color: active ? (color ?? 'var(--color-primary)') : 'var(--text-muted)',
    cursor: 'pointer' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Activity size={20} color="var(--color-success)" />
              <h2 style={{ fontSize: 22, fontFamily: 'var(--font-heading)' }}>Live Telemetry</h2>
              {polling && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--color-success)',
                    display: 'inline-block',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    boxShadow: '0 0 0 0 rgba(16,185,129,0.4)',
                  }} />
                  <style>{`@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 50% { box-shadow: 0 0 0 6px rgba(16,185,129,0); } }`}</style>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    POLLING
                  </span>
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Real-time event stream from all active template engine labs.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            Auto-scroll
          </label>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Stage</span>
            {STAGES.map((s) => (
              <button key={s} style={chipStyle(filterStage === s, s !== 'ALL' ? STAGE_COLORS[s as StageId] : undefined)} onClick={() => setFilterStage(s as StageId | 'ALL')}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Engine</span>
            {ENGINES.map((eng) => (
              <button key={eng} style={chipStyle(filterEngine === eng)} onClick={() => setFilterEngine(eng as EngineId | 'ALL')}>
                {eng}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Status</span>
            {STATUSES.map((st) => (
              <button key={st} style={chipStyle(filterStatus === st)} onClick={() => setFilterStatus(st as StageStatus | 'ALL')}>
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Event feed */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Radio size={32} />}
            title="AWAITING EVENTS"
            description="Launch an attack scenario to see live telemetry."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div ref={topRef} />
            <AnimatePresence initial={false}>
              {filtered.map((ev) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `3px solid ${STAGE_COLORS[ev.stage as StageId] ?? 'var(--color-neutral)'}`,
                    borderRadius: 'var(--radius-md)',
                    flexWrap: 'wrap',
                    minWidth: 0,
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', minWidth: 76, flexShrink: 0 }}>
                    {formatTime(ev.timestamp)}
                  </span>
                  <StageBadge stage={ev.stage as StageId} />
                  <EngineBadge engine={ev.engine as EngineId} />
                  <code style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--text-code)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    background: 'var(--bg-nested)',
                    borderRadius: 4,
                    padding: '2px 6px',
                  }}>
                    {ev.payload}
                  </code>
                  <StatusBadge status={ev.status} />
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 180,
                    flexShrink: 0,
                  }}>
                    {ev.response_preview}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
