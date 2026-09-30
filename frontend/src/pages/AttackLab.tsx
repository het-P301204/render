import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, AlertTriangle, Shield } from 'lucide-react';
import { useAttackStore } from '../stores/attackStore';
import { useLabStore } from '../stores/labStore';
import { Button } from '../components/ui/Button';
import { StageCard } from '../components/attack/StageCard';
import { AttackFlowViz } from '../components/attack/AttackFlowViz';
import { AttackChain } from '../components/attack/AttackChain';
import { PayloadInspector } from '../components/attack/PayloadInspector';
import type { EngineId, AttackMode } from '../types';

const ENGINES: EngineId[] = ['jinja2', 'handlebars', 'nunjucks', 'mako'];

export const AttackLab: React.FC = () => {
  const {
    engine, targetUrl, mode, stages, activeStage, chainRunning, lastResults,
    setEngine, setTargetUrl, setMode, setActiveStage, runStage, runChain, resetStages,
  } = useAttackStore();

  const { apiOnline } = useLabStore();

  // Select first ready stage on mount
  useEffect(() => {
    if (!activeStage) {
      const ready = stages.find((s) => s.status === 'READY');
      if (ready) setActiveStage(ready.id);
    }
  }, []);

  const activeStageData = stages.find((s) => s.id === activeStage);
  const isRunning = stages.some((s) => s.status === 'RUNNING');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* API offline banner */}
      {!apiOnline && (
        <div style={{
          background: 'rgba(245,158,11,0.12)',
          border: 'none',
          borderBottom: '1px solid rgba(245,158,11,0.3)',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}>
          <AlertTriangle size={13} style={{ color: 'var(--color-warning)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>
            LAB OFFLINE — Running in simulation mode. Results are synthetic.
          </span>
        </div>
      )}

      {/* Three-column layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr 340px', overflow: 'hidden' }}>
        {/* ─── Left Panel: Attack Stages ─────────────────────────────── */}
        <div style={{
          background: 'var(--bg-workspace)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Target Config */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>
                ENGINE
              </label>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value as EngineId)}
                style={{
                  width: '100%',
                  background: 'var(--bg-nested)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '7px 10px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {ENGINES.map((e) => (
                  <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>
                TARGET URL
              </label>
              <input
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-nested)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  padding: '7px 10px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Mode toggle */}
            <div>
              <label style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>
                MODE
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['vulnerable', 'hardened'] as AttackMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: `1px solid ${mode === m
                        ? m === 'vulnerable' ? 'var(--color-critical)' : 'var(--color-success)'
                        : 'var(--border-subtle)'}`,
                      background: mode === m
                        ? m === 'vulnerable' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'
                        : 'transparent',
                      color: mode === m
                        ? m === 'vulnerable' ? 'var(--color-critical)' : 'var(--color-success)'
                        : 'var(--text-muted)',
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      transition: 'all 0.15s',
                    }}
                  >
                    {m === 'hardened' ? <Shield size={10} /> : <AlertTriangle size={10} />}
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stage cards */}
          <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stages.map((stage) => (
                <StageCard
                  key={stage.id}
                  stage={stage}
                  active={activeStage === stage.id}
                  onClick={() => setActiveStage(stage.id)}
                  onRun={() => runStage(stage.id)}
                  running={isRunning || chainRunning}
                />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <Button
              variant="primary"
              fullWidth
              loading={chainRunning}
              icon={<Play size={13} />}
              onClick={runChain}
              disabled={isRunning}
            >
              Run Full Chain
            </Button>
            <Button
              variant="ghost"
              fullWidth
              size="sm"
              icon={<RotateCcw size={12} />}
              onClick={resetStages}
              disabled={isRunning || chainRunning}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* ─── Center Panel: Visualization + Results ─────────────────── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-base)',
          overflow: 'hidden',
        }}>
          {/* Flow visualization */}
          <div style={{
            background: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}>
            <div style={{
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Attack Flow
              </span>
              {activeStage && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--color-primary)',
                }}>
                  Stage: {activeStage}
                </span>
              )}
            </div>
            <AttackFlowViz activeStage={activeStage} running={isRunning || chainRunning} />
          </div>

          {/* Results area */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {/* Current stage result */}
            {activeStageData && activeStageData.result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  margin: '16px',
                  padding: '16px',
                  background: activeStageData.status === 'SUCCESS' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                  border: `1px solid ${activeStageData.status === 'SUCCESS' ? 'var(--color-success)' : activeStageData.status === 'BLOCKED' ? 'var(--color-success)' : 'var(--color-critical)'}`,
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {activeStageData.id} RESULT
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: activeStageData.status === 'SUCCESS' ? 'var(--color-success)' : activeStageData.status === 'BLOCKED' ? 'var(--color-success)' : 'var(--color-critical)',
                  }}>
                    {activeStageData.status} {activeStageData.duration_ms && `· ${activeStageData.duration_ms}ms`}
                  </span>
                </div>
                <pre style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--text-code)',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {activeStageData.result}
                </pre>
              </motion.div>
            )}

            {/* Chain results */}
            {lastResults.length > 0 && (
              <div style={{ margin: '0 16px 16px' }}>
                <div style={{ marginBottom: 8, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Chain Results
                </div>
                <AttackChain results={lastResults} />
              </div>
            )}

            {!activeStageData?.result && lastResults.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                Select a stage and run an attack
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Panel: Inspector ────────────────────────────────── */}
        <div style={{
          background: 'var(--bg-workspace)',
          borderLeft: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Inspector
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <PayloadInspector />
          </div>
        </div>
      </div>
    </div>
  );
};
