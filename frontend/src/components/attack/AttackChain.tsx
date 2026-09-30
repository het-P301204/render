import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AttackResult } from '../../types';

const STAGE_COLORS: Record<string, string> = {
  DETECT: 'var(--color-detection)',
  FINGERPRINT: 'var(--color-primary)',
  EXTRACT: 'var(--color-ssti)',
  ESCAPE: 'var(--color-execution)',
  RCE: 'var(--color-critical)',
};

interface AttackChainProps {
  results: AttackResult[];
}

export const AttackChain: React.FC<AttackChainProps> = ({ results }) => {
  if (results.length === 0) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
      }}>
        Run an attack stage to see results here
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px' }}>
      <AnimatePresence>
        {results.map((result, idx) => {
          const stageColor = STAGE_COLORS[result.stage] ?? 'var(--color-neutral)';
          const isSuccess = result.status === 'SUCCESS';
          const isBlocked = result.status === 'BLOCKED';

          return (
            <motion.div
              key={`${result.stage}-${idx}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${isBlocked ? 'var(--color-success)' : isSuccess ? stageColor : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: stageColor,
                  letterSpacing: '0.06em',
                }}>
                  {result.stage}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-muted)',
                  }}>
                    {result.duration_ms}ms
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: isBlocked ? 'var(--color-success)' : isSuccess ? stageColor : 'var(--color-critical)',
                    fontWeight: 500,
                  }}>
                    {result.status}
                  </span>
                </div>
              </div>

              {/* Payload */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-muted)',
                background: 'var(--bg-nested)',
                padding: '3px 8px',
                borderRadius: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {result.payload}
              </div>

              {/* Response */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: isBlocked ? 'var(--color-success)' : isSuccess ? 'var(--text-primary)' : 'var(--color-critical)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                → {result.response}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
