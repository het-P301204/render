import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Terminal } from 'lucide-react';
import { CodeViewer } from '../ui/CodeViewer';
import { useAttackStore } from '../../stores/attackStore';

type InspectorTab = 'payload' | 'response' | 'evidence' | 'curl';

export const PayloadInspector: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('payload');
  const [copied, setCopied] = useState(false);
  const { currentPayload, currentResponse, currentEvidence, engine, targetUrl, mode, activeStage } = useAttackStore();

  const TABS: { id: InspectorTab; label: string }[] = [
    { id: 'payload',  label: 'Payload' },
    { id: 'response', label: 'Response' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'curl',     label: 'cURL' },
  ];

  const buildCurl = () => {
    if (!currentPayload) return '';
    const isNode = engine === 'handlebars' || engine === 'nunjucks';
    const portMap: Record<string, string> = {
      jinja2: '5001',
      mako: '5003',
      handlebars: '3001',
      nunjucks: '3002',
    };
    const port = mode === 'hardened'
      ? String(parseInt(portMap[engine] ?? '5001') + 1)
      : portMap[engine] ?? '5001';
    const path = isNode ? '/render' : '/render';
    const baseUrl = targetUrl || `http://localhost:${port}${path}`;
    const payload = currentPayload.replace(/'/g, "'\\''");
    const stage = activeStage ?? 'DETECT';

    return `# Stage: ${stage} | Engine: ${engine} | Mode: ${mode}
curl -s -X POST '${baseUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{"template": "${payload.replace(/"/g, '\\"')}"}'

# One-liner:
curl -s -X POST '${baseUrl}' -H 'Content-Type: application/json' -d '{"template":"${payload.replace(/"/g, '\\"')}"}'`;
  };

  const curlCode = buildCurl();

  const CONTENT: Record<InspectorTab, { code: string; label: string; empty: string }> = {
    payload: {
      code: currentPayload,
      label: 'PAYLOAD',
      empty: 'Select a stage to view the payload',
    },
    response: {
      code: currentResponse,
      label: 'HTTP RESPONSE',
      empty: 'Run a stage to capture the response',
    },
    evidence: {
      code: currentEvidence,
      label: 'EVIDENCE',
      empty: 'Run a stage to collect evidence',
    },
    curl: {
      code: curlCode,
      label: 'CURL COMMAND',
      empty: 'Select a stage to generate cURL command',
    },
  };

  const handleCopyCurl = async () => {
    if (!curlCode) return;
    await navigator.clipboard.writeText(curlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const current = CONTENT[activeTab];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 14px',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: `2px solid ${activeTab === tab.id ? 'var(--color-primary)' : 'transparent'}`,
              transition: 'color 0.15s',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {tab.id === 'curl' && <Terminal size={10} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {current.code ? (
              <>
                <CodeViewer code={current.code} label={current.label} maxHeight="none" />
                {activeTab === 'curl' && (
                  <button
                    onClick={handleCopyCurl}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      background: copied ? 'rgba(127,165,138,0.15)' : 'rgba(201,130,82,0.10)',
                      border: `1px solid ${copied ? 'var(--color-success)' : 'var(--color-primary)'}`,
                      borderRadius: 'var(--radius-sm)',
                      color: copied ? 'var(--color-success)' : 'var(--color-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      cursor: 'pointer',
                      alignSelf: 'flex-start',
                      transition: 'all 0.15s',
                    }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy Command'}
                  </button>
                )}
              </>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                textAlign: 'center',
                padding: 24,
              }}>
                {current.empty}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
