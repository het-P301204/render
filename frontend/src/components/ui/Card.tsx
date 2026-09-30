import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  accentColor?: string;
  padding?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  interactive = false,
  accentColor,
  padding = '16px',
  style,
}) => {
  const baseStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding,
    position: 'relative',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    ...(accentColor ? { borderLeft: `3px solid ${accentColor}` } : {}),
    ...style,
  };

  if (interactive || onClick) {
    return (
      <motion.div
        className={className}
        style={baseStyle}
        onClick={onClick}
        whileHover={{ borderColor: 'var(--border-accent)', y: -1 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={className} style={baseStyle}>
      {children}
    </div>
  );
};

export const Panel: React.FC<{
  children: React.ReactNode;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  action?: React.ReactNode;
}> = ({ children, title, className = '', style, action }) => (
  <div
    className={className}
    style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}
  >
    {title && (
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
        }}>
          {title}
        </span>
        {action}
      </div>
    )}
    <div style={{ flex: 1, overflow: 'auto' }}>
      {children}
    </div>
  </div>
);
