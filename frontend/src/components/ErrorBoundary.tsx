import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[RENDER] Page error:', error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 16,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          <AlertTriangle size={32} color="var(--color-warning)" />
          <div style={{ fontSize: 13 }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '6px 16px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
