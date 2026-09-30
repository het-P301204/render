import React from 'react';
import { motion } from 'framer-motion';

interface StatusDotProps {
  status: 'online' | 'offline' | 'unknown' | 'running';
  label?: string;
  size?: number;
}

const STATUS_COLOR: Record<string, string> = {
  online: 'var(--color-success)',
  offline: 'var(--color-critical)',
  unknown: 'var(--color-neutral)',
  running: 'var(--color-warning)',
};

export const StatusDot: React.FC<StatusDotProps> = ({ status, label, size = 8 }) => {
  const color = STATUS_COLOR[status] ?? 'var(--color-neutral)';
  const isPulsing = status === 'online' || status === 'running';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
        {isPulsing && (
          <motion.span
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: color,
            }}
          />
        )}
        <span style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }} />
      </span>
      {label && (
        <span style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {label}
        </span>
      )}
    </span>
  );
};
