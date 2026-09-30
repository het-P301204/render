import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  language?: string;
  label?: string;
  maxHeight?: number | string;
  showCopy?: boolean;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  label,
  maxHeight = 240,
  showCopy = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'var(--bg-nested)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
    }}>
      {(label || showCopy) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-panel)',
        }}>
          {label && (
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {label}
            </span>
          )}
          {showCopy && (
            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: copied ? 'var(--color-success)' : 'var(--text-muted)',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: '2px 6px',
                borderRadius: 4,
                transition: 'color 0.15s',
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      )}
      <pre style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        lineHeight: 1.7,
        color: 'var(--text-code)',
        padding: '12px 14px',
        overflow: 'auto',
        maxHeight,
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}>
        <code>{code || '—'}</code>
      </pre>
    </div>
  );
};
