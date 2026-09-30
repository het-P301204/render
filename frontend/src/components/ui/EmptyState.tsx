import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 40px',
      textAlign: 'center',
      gap: 12,
    }}
  >
    {icon && (
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
        {icon}
      </div>
    )}
    <p style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
    }}>
      {title}
    </p>
    {description && (
      <p style={{
        fontSize: 13,
        color: 'var(--text-muted)',
        maxWidth: 340,
        lineHeight: 1.6,
      }}>
        {description}
      </p>
    )}
    {action && <div style={{ marginTop: 8 }}>{action}</div>}
  </motion.div>
);
