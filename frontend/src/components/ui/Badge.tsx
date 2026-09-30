import React from 'react';
import type { StageId, Severity, EngineId, StageStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'stage' | 'severity' | 'engine' | 'status';
  stage?: StageId;
  severity?: Severity;
  engine?: EngineId;
  status?: StageStatus;
  size?: 'sm' | 'md';
  className?: string;
}

const STAGE_COLORS: Record<StageId, string> = {
  DETECT:      'var(--color-detection)',
  FINGERPRINT: 'var(--color-warning)',
  EXTRACT:     'var(--color-success)',
  ESCAPE:      'var(--color-execution)',
  RCE:         'var(--color-critical)',
};

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'var(--color-critical)',
  high: 'var(--color-execution)',
  medium: 'var(--color-warning)',
  low: 'var(--color-primary)',
  info: 'var(--color-neutral)',
};

const ENGINE_COLORS: Record<EngineId, string> = {
  jinja2:      '#C98252',
  handlebars:  '#C66B67',
  nunjucks:    '#7FA58A',
  mako:        '#5F9E99',
};

const STATUS_COLORS: Record<StageStatus, string> = {
  LOCKED: 'var(--color-neutral)',
  READY: 'var(--color-primary)',
  RUNNING: 'var(--color-warning)',
  SUCCESS: 'var(--color-success)',
  BLOCKED: 'var(--color-success)',
  FAILED: 'var(--color-critical)',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  stage,
  severity,
  engine,
  status,
  size = 'sm',
  className = '',
}) => {
  let color = 'var(--color-neutral)';

  if (variant === 'stage' && stage) color = STAGE_COLORS[stage];
  if (variant === 'severity' && severity) color = SEVERITY_COLORS[severity];
  if (variant === 'engine' && engine) color = ENGINE_COLORS[engine];
  if (variant === 'status' && status) color = STATUS_COLORS[status];

  const sizeStyles = size === 'sm'
    ? { fontSize: '10px', padding: '2px 7px' }
    : { fontSize: '12px', padding: '3px 10px' };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${color}`,
        color,
        background: `${color}18`,
        whiteSpace: 'nowrap',
        ...sizeStyles,
      }}
    >
      {children}
    </span>
  );
};

export const StageBadge: React.FC<{ stage: StageId; size?: 'sm' | 'md' }> = ({ stage, size }) => (
  <Badge variant="stage" stage={stage} size={size}>{stage}</Badge>
);

export const SeverityBadge: React.FC<{ severity: Severity; size?: 'sm' | 'md' }> = ({ severity, size }) => (
  <Badge variant="severity" severity={severity} size={size}>{severity}</Badge>
);

export const EngineBadge: React.FC<{ engine: EngineId; size?: 'sm' | 'md' }> = ({ engine, size }) => (
  <Badge variant="engine" engine={engine} size={size}>{engine}</Badge>
);

export const StatusBadge: React.FC<{ status: StageStatus; size?: 'sm' | 'md' }> = ({ status, size }) => (
  <Badge variant="status" status={status} size={size}>{status}</Badge>
);
