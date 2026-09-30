import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

interface LoadingStep {
  label: string;
  detail: string;
  duration: number;
}

const STEPS: LoadingStep[] = [
  { label: 'Loading engines...', detail: 'Jinja2', duration: 600 },
  { label: '', detail: 'Handlebars', duration: 400 },
  { label: '', detail: 'Nunjucks', duration: 400 },
  { label: '', detail: 'Mako', duration: 400 },
  { label: 'Loading payload library...', detail: '50+ payloads', duration: 500 },
  { label: 'Loading detection rules...', detail: '3 rules active', duration: 400 },
];

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let step = 0;

    const advance = () => {
      if (step >= STEPS.length) {
        setTimeout(() => {
          setDone(true);
          setTimeout(onComplete, 600);
        }, 300);
        return;
      }
      setCurrentStep(step);
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, step]);
        step += 1;
        advance();
      }, STEPS[step]?.duration ?? 400);
    };

    setTimeout(advance, 200);
  }, [onComplete]);

  const engineSteps = [
    { label: 'Jinja2', idx: 0 },
    { label: 'Handlebars', idx: 1 },
    { label: 'Nunjucks', idx: 2 },
    { label: 'Mako', idx: 3 },
  ];

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-base)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div style={{ width: 480, maxWidth: '90vw' }}>
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ marginBottom: 48, textAlign: 'center' }}
            >
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 48,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 8,
              }}>
                RENDER
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                INITIALIZING RESEARCH ENVIRONMENT
              </p>
            </motion.div>

            {/* Loading steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Engine loading */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: currentStep >= 0 ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  Loading engines...
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  {engineSteps.map(({ label, idx }) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: completedSteps.includes(idx) ? 1 : 0.3, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                        color: completedSteps.includes(idx) ? 'var(--color-success)' : 'var(--text-muted)',
                      }}
                    >
                      {completedSteps.includes(idx) && <Check size={11} />}
                      {label}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Payload loading */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: currentStep >= 4 ? 1 : 0.3 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  Loading payload library...
                </span>
                <motion.div
                  animate={{ opacity: completedSteps.includes(4) ? 1 : 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}
                >
                  <Check size={11} /> 50+ payloads
                </motion.div>
              </motion.div>

              {/* Detection rules */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: currentStep >= 5 ? 1 : 0.3 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  Loading detection rules...
                </span>
                <motion.div
                  animate={{ opacity: completedSteps.includes(5) ? 1 : 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}
                >
                  <Check size={11} /> 3 rules active
                </motion.div>
              </motion.div>

              {/* Ready message */}
              <AnimatePresence>
                {completedSteps.length >= 6 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      fontSize: 14,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-success)',
                      textAlign: 'center',
                      fontWeight: 500,
                      padding: '8px 0',
                    }}
                  >
                    Research environment ready
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
