import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
    color: '#17130F',
    border: '1px solid transparent',
    boxShadow: '0 2px 12px rgba(201,130,82,0.20)',
  },
  secondary: {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-muted)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--color-critical)',
    color: '#fff',
    border: '1px solid transparent',
  },
  success: {
    background: 'var(--color-success)',
    color: '#fff',
    border: '1px solid transparent',
  },
};

const SIZE_STYLES: Record<string, React.CSSProperties> = {
  sm: { fontSize: '12px', padding: '5px 12px', borderRadius: 'var(--radius-sm)', height: 30 },
  md: { fontSize: '13px', padding: '7px 16px', borderRadius: 'var(--radius-md)', height: 36 },
  lg: { fontSize: '14px', padding: '10px 22px', borderRadius: 'var(--radius-md)', height: 44 },
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  fullWidth = false,
  className = '',
  icon,
}) => {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={className}
      whileHover={isDisabled ? {} : { opacity: 0.9, scale: 1.01 }}
      whileTap={isDisabled ? {} : { scale: 0.98 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        width: fullWidth ? '100%' : 'auto',
        whiteSpace: 'nowrap',
        transition: 'background 0.15s',
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
      }}
    >
      {loading ? (
        <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      ) : icon}
      {children}
    </motion.button>
  );
};
