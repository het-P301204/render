import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Crosshair, Shield, Link2, GitCompare, Code, Moon, Sun, Search
} from 'lucide-react';
import { useUiStore } from '../stores/uiStore';
import { useAttackStore } from '../stores/attackStore';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen, toggleTheme, theme } = useUiStore();
  const navigate = useNavigate();
  const { runChain } = useAttackStore();
  const [query, setQuery] = useState('');

  const close = useCallback(() => {
    setCommandPaletteOpen(false);
    setQuery('');
  }, [setCommandPaletteOpen]);

  const commands: Command[] = [
    {
      id: 'lab',
      label: 'Launch Attack Lab',
      description: 'Open the main attack research interface',
      icon: <Crosshair size={16} />,
      action: () => { navigate('/lab'); close(); },
      shortcut: 'L',
    },
    {
      id: 'detect',
      label: 'Run Detection Stage',
      description: 'Trigger DETECT stage in Attack Lab',
      icon: <Shield size={16} />,
      action: () => { navigate('/lab'); close(); },
    },
    {
      id: 'chain',
      label: 'Run Full Attack Chain',
      description: 'Execute complete 5-stage attack chain',
      icon: <Link2 size={16} />,
      action: () => { navigate('/lab'); runChain(); close(); },
    },
    {
      id: 'findings',
      label: 'View Findings',
      description: 'Browse all identified vulnerabilities',
      icon: <Shield size={16} />,
      action: () => { navigate('/findings'); close(); },
    },
    {
      id: 'compare',
      label: 'Compare Hardened vs Vulnerable',
      description: 'Side-by-side security comparison',
      icon: <GitCompare size={16} />,
      action: () => { navigate('/compare'); close(); },
    },
    {
      id: 'payloads',
      label: 'Open Payload Library',
      description: 'Browse all available SSTI payloads',
      icon: <Code size={16} />,
      action: () => { navigate('/payloads'); close(); },
    },
    {
      id: 'theme',
      label: `Toggle Theme (${theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'})`,
      description: 'Change the interface color scheme',
      icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />,
      action: () => { toggleTheme(); close(); },
      shortcut: 'T',
    },
  ];

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, setCommandPaletteOpen, close]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 560,
              maxWidth: '90vw',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-xl)',
              zIndex: 101,
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
          >
            {/* Search input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands..."
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 15,
                  fontFamily: 'var(--font-body)',
                }}
              />
              <kbd style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                background: 'var(--bg-nested)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 4,
                padding: '2px 6px',
              }}>
                ESC
              </kbd>
            </div>

            {/* Commands */}
            <div style={{ maxHeight: 360, overflow: 'auto', padding: 8 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No commands found
                </div>
              ) : (
                filtered.map((cmd) => (
                  <motion.button
                    key={cmd.id}
                    onClick={cmd.action}
                    whileHover={{ background: 'var(--bg-nested)' }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      {cmd.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{cmd.label}</div>
                      {cmd.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                          {cmd.description}
                        </div>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <kbd style={{
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                        background: 'var(--bg-nested)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 4,
                        padding: '2px 6px',
                        flexShrink: 0,
                      }}>
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </motion.button>
                ))
              )}
            </div>

            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: 16,
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>ESC close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
