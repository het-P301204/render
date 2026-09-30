import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  House, Crosshair, Cpu, Code, Shield, Activity,
  AlertTriangle, GitCompare, FileText, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';

const NAV_ITEMS = [
  { path: '/',          icon: House,         label: 'Overview' },
  { path: '/lab',       icon: Crosshair,     label: 'Attack Lab' },
  { path: '/engines',   icon: Cpu,           label: 'Engines' },
  { path: '/payloads',  icon: Code,          label: 'Payloads' },
  { path: '/detection', icon: Shield,        label: 'Detection' },
  { path: '/telemetry', icon: Activity,      label: 'Telemetry' },
  { path: '/findings',  icon: AlertTriangle, label: 'Findings' },
  { path: '/compare',   icon: GitCompare,    label: 'Compare' },
  { path: '/reports',   icon: FileText,      label: 'Reports' },
  { path: '/settings',  icon: Settings,      label: 'Settings' },
] as const;

export const Sidebar: React.FC = () => {
  const { navCollapsed, toggleNav } = useUiStore();
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: navCollapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      style={{
        background: 'var(--bg-workspace)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: navCollapsed ? '0 16px' : '0 20px',
        borderBottom: '1px solid var(--border-subtle)',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 700,
          color: '#fff',
          fontFamily: 'var(--font-heading)',
        }}>
          R
        </div>
        <AnimatePresence>
          {!navCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
              }}
            >
              RENDER
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 0', overflow: 'hidden' }}>
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              style={{ display: 'block', textDecoration: 'none' }}
            >
              <motion.div
                whileHover={{ background: 'var(--bg-nested)' }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: navCollapsed ? '9px 18px' : '9px 16px',
                  margin: '1px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'var(--bg-nested)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                  transition: 'color 0.15s',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '15%',
                      bottom: '15%',
                      width: 3,
                      borderRadius: 2,
                      background: 'var(--color-primary)',
                      boxShadow: 'none',
                    }}
                  />
                )}
                <Icon size={16} style={{ flexShrink: 0 }} />
                <AnimatePresence>
                  {!navCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? 500 : 400,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={toggleNav}
        style={{
          margin: '8px',
          padding: '8px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-nested)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'color 0.15s',
        }}
      >
        {navCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </motion.aside>
  );
};
