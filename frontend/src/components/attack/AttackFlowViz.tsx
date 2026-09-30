import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StageId } from '../../types';

interface FlowNode {
  id: string;
  label: string;
  sublabel: string;
}

const NODES: FlowNode[] = [
  { id: 'input',    label: 'INPUT',       sublabel: 'User Template' },
  { id: 'engine',   label: 'TEMPLATE',    sublabel: 'Rendering Engine' },
  { id: 'eval',     label: 'EVALUATE',    sublabel: 'Expression Parser' },
  { id: 'sandbox',  label: 'SANDBOX',     sublabel: 'Security Boundary' },
  { id: 'execute',  label: 'EXECUTE',     sublabel: 'OS / Runtime' },
];

const STAGE_ACTIVE_NODE: Record<StageId, number> = {
  DETECT: 0,
  FINGERPRINT: 1,
  EXTRACT: 2,
  ESCAPE: 3,
  RCE: 4,
};

interface AttackFlowVizProps {
  activeStage: StageId | null;
  running: boolean;
}

export const AttackFlowViz: React.FC<AttackFlowVizProps> = ({ activeStage, running }) => {
  const activeNodeIdx = activeStage != null ? STAGE_ACTIVE_NODE[activeStage] : -1;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      gap: 0,
      position: 'relative',
    }}>
      {NODES.map((node, idx) => {
        const isActive = idx === activeNodeIdx;
        const isPassed = idx < activeNodeIdx;
        const isRunning = isActive && running;

        let nodeColor = 'var(--text-muted)';
        let nodeBorder = 'var(--border-subtle)';
        let nodeBg = 'var(--bg-nested)';

        if (isRunning) {
          nodeColor = 'var(--color-warning)';
          nodeBorder = 'var(--color-warning)';
          nodeBg = 'rgba(245,158,11,0.08)';
        } else if (isActive) {
          const stageColors = ['var(--color-detection)', 'var(--color-primary)', 'var(--color-ssti)', 'var(--color-execution)', 'var(--color-critical)'];
          nodeColor = stageColors[idx];
          nodeBorder = stageColors[idx];
          nodeBg = `${stageColors[idx]}15`;
        } else if (isPassed) {
          nodeColor = 'var(--color-success)';
          nodeBorder = 'var(--color-success)';
          nodeBg = 'rgba(16,185,129,0.08)';
        }

        return (
          <React.Fragment key={node.id}>
            {/* Node */}
            <motion.div
              animate={{
                borderColor: nodeBorder,
                background: nodeBg,
                scale: isActive ? (isRunning ? [1, 1.04, 1] : 1.04) : 1,
              }}
              transition={{
                scale: isRunning
                  ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.2 },
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: 88,
                height: 72,
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${nodeBorder}`,
                background: nodeBg,
                position: 'relative',
                flexShrink: 0,
                zIndex: 1,
              }}
            >
              {/* Pulse ring when running */}
              <AnimatePresence>
                {isRunning && (
                  <motion.div
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: 'calc(var(--radius-md) + 4px)',
                      border: `1.5px solid ${nodeColor}`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </AnimatePresence>

              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: nodeColor,
                textAlign: 'center',
              }}>
                {node.label}
              </span>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: 9,
                color: 'var(--text-muted)',
                marginTop: 3,
                textAlign: 'center',
                lineHeight: 1.3,
              }}>
                {node.sublabel}
              </span>

              {/* Step number */}
              <div style={{
                position: 'absolute',
                top: -8,
                left: -8,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: nodeBg,
                border: `1.5px solid ${nodeBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: nodeColor,
              }}>
                {idx + 1}
              </div>
            </motion.div>

            {/* Connector arrow */}
            {idx < NODES.length - 1 && (
              <div style={{ position: 'relative', width: 32, height: 2, flexShrink: 0 }}>
                {/* Base line */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: 1.5,
                  background: isPassed || isActive ? 'var(--color-success)' : 'var(--border-muted)',
                  transform: 'translateY(-50%)',
                  transition: 'background 0.3s',
                }} />

                {/* Animated flow particle */}
                <AnimatePresence>
                  {isActive && running && (
                    <motion.div
                      initial={{ left: '0%', opacity: 0 }}
                      animate={{ left: '100%', opacity: [0, 1, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--color-warning)',
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Arrow head */}
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 0,
                  height: 0,
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderLeft: `5px solid ${isPassed || isActive ? 'var(--color-success)' : 'var(--border-muted)'}`,
                  transition: 'border-left-color 0.3s',
                }} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
