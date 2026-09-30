import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Play, Loader2, CheckCircle, XCircle, ShieldOff } from 'lucide-react';
import type { Stage, StageId } from '../../types';

const STAGE_COLORS: Record<StageId, string> = {
  DETECT:      'var(--color-detection)',
  FINGERPRINT: 'var(--color-warning)',
  EXTRACT:     'var(--color-success)',
  ESCAPE:      'var(--color-execution)',
  RCE:         'var(--color-critical)',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  LOCKED: <Lock size={13} />,
  READY: <Play size={13} />,
  RUNNING: <Loader2 size={13} className="spin" />,
  SUCCESS: <CheckCircle size={13} />,
  BLOCKED: <ShieldOff size={13} />,
  FAILED: <XCircle size={13} />,
};

const STATUS_BG: Record<string, string> = {
  LOCKED:  'var(--bg-nested)',
  READY:   'var(--bg-card)',
  RUNNING: 'var(--bg-card)',
  SUCCESS: 'rgba(127,165,138,0.10)',
  BLOCKED: 'rgba(127,165,138,0.10)',
  FAILED:  'rgba(198,107,103,0.10)',
};

const STATUS_BORDER: Record<string, string> = {
  LOCKED: 'var(--border-subtle)',
  READY: 'var(--border-muted)',
  RUNNING: 'var(--color-warning)',
  SUCCESS: 'var(--color-success)',
  BLOCKED: 'var(--color-success)',
  FAILED: 'var(--color-critical)',
};

interface StageCardProps {
  stage: Stage;
  active: boolean;
  onClick: () => void;
  onRun: () => void;
  running: boolean;
}

export const StageCard: React.FC<StageCardProps> = ({ stage, active, onClick, onRun, running }) => {
  const stageColor = STAGE_COLORS[stage.id];
  const isLocked = stage.status === 'LOCKED';

  return (
    <motion.div
      layout
      onClick={isLocked ? undefined : onClick}
      style={{
        background: STATUS_BG[stage.status],
        border: `1px solid ${active ? stageColor : STATUS_BORDER[stage.status]}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        cursor: isLocked ? 'not-allowed' : 'pointer',
        opacity: isLocked ? 0.5 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
      animate={{
        borderColor: active ? stageColor : STATUS_BORDER[stage.status],
        scale: stage.status === 'RUNNING' ? [1, 1.01, 1] : 1,
      }}
      transition={{
        scale: { duration: 1.2, repeat: stage.status === 'RUNNING' ? Infinity : 0, ease: 'easeInOut' },
      }}
      whileHover={isLocked ? {} : { y: -1 }}
    >
      {/* Accent line */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        borderRadius: '3px 0 0 3px',
        background: stageColor,
        opacity: isLocked ? 0.3 : 1,
      }} />

      <div style={{ paddingLeft: 8 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              letterSpacing: '0.05em',
            }}>
              {String(stage.number).padStart(2, '0')}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              color: stageColor,
              letterSpacing: '0.06em',
            }}>
              {stage.id}
            </span>
          </div>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: stage.status === 'RUNNING' ? 'var(--color-warning)'
              : stage.status === 'SUCCESS' || stage.status === 'BLOCKED' ? 'var(--color-success)'
              : stage.status === 'FAILED' ? 'var(--color-critical)'
              : 'var(--text-muted)',
          }}>
            {STATUS_ICONS[stage.status]}
            {stage.status}
          </span>
        </div>

        {/* Payload preview */}
        {stage.payload && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-muted)',
            background: 'var(--bg-nested)',
            borderRadius: 4,
            padding: '4px 8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: stage.status !== 'LOCKED' && stage.status !== 'READY' ? 6 : 0,
          }}>
            {stage.payload}
          </div>
        )}

        {/* Result */}
        {stage.result && stage.status !== 'LOCKED' && stage.status !== 'READY' && (
          <div style={{
            fontSize: 11,
            color: stage.status === 'SUCCESS' ? 'var(--color-success)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            → {stage.result.slice(0, 50)}
          </div>
        )}

        {/* Run button for active/ready stages */}
        {(stage.status === 'READY' || (active && stage.status !== 'RUNNING')) && !isLocked && (
          <motion.button
            onClick={(e) => { e.stopPropagation(); onRun(); }}
            disabled={running}
            whileHover={{ background: stageColor }}
            style={{
              marginTop: 8,
              width: '100%',
              padding: '5px',
              borderRadius: 6,
              border: `1px solid ${stageColor}`,
              background: 'transparent',
              color: stageColor,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              cursor: running ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <Play size={11} />
            RUN {stage.id}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
