import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crosshair, Cpu, PlayCircle, ShieldAlert, Activity, FileSearch } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AttackFlowViz } from '../components/attack/AttackFlowViz';
import { useLabStore } from '../stores/labStore';

const BASE_STATS = [
  { value: '4',   label: 'Engines',         color: 'var(--color-primary)' },
  { value: '5',   label: 'Attack Stages',   color: 'var(--color-ssti)' },
  { value: '12+', label: 'Payloads',        color: 'var(--color-detection)' },
  { value: '3',   label: 'Detection Rules', color: 'var(--color-execution)' },
];

const QUICK_ACTIONS = [
  { label: 'Attack Lab',    desc: 'Run 5-stage SSTI chain',      path: '/lab',       icon: Crosshair,   color: 'var(--color-critical)' },
  { label: 'Engines',       desc: 'Browse 4 template engines',   path: '/engines',   icon: Cpu,         color: 'var(--color-primary)' },
  { label: 'Payloads',      desc: 'Library of SSTI payloads',    path: '/payloads',  icon: PlayCircle,  color: 'var(--color-detection)' },
  { label: 'Findings',      desc: 'Review confirmed vulns',       path: '/findings',  icon: ShieldAlert, color: 'var(--color-warning)' },
  { label: 'Telemetry',     desc: 'Live event stream',           path: '/telemetry', icon: Activity,    color: 'var(--color-success)' },
  { label: 'Reports',       desc: 'Export security assessments', path: '/reports',   icon: FileSearch,  color: 'var(--color-ssti)' },
];

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { status, labs } = useLabStore();
  const runningLabs = labs.filter((l) => l.running).length;

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Hero */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px 32px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background grid */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(201,130,82,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.7,
          pointerEvents: 'none',
        }} />

        {/* Gradient orbs */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          left: '25%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,130,82,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-80px',
          right: '15%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(169,104,69,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '-80px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(95,158,153,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Main heading */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Live badge */}
          {runningLabs > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(127,165,138,0.40)',
                background: 'rgba(127,165,138,0.08)',
                marginBottom: 16,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block', animation: 'pulse-ring 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-success)', letterSpacing: '0.06em' }}>
                {runningLabs} LAB{runningLabs > 1 ? 'S' : ''} ONLINE
              </span>
            </motion.div>
          )}

          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(52px, 9vw, 100px)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--color-primary) 70%, var(--color-accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 16,
          }}>
            RENDER
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(13px, 1.6vw, 18px)',
              color: 'var(--text-muted)',
              letterSpacing: '0.12em',
              marginBottom: 36,
              textTransform: 'uppercase',
            }}
          >
            Inject · Escape · Understand
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Button variant="primary" size="lg" icon={<Crosshair size={16} />} onClick={() => navigate('/lab')}>
              Launch Research Lab
            </Button>
            <Button variant="secondary" size="lg" icon={<Cpu size={16} />} onClick={() => navigate('/engines')}>
              Explore Engines
            </Button>
            <Button variant="ghost" size="lg" icon={<PlayCircle size={16} />} onClick={() => navigate('/payloads')}>
              View Payloads
            </Button>
          </motion.div>
        </motion.div>

        {/* Attack flow visualization */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          style={{
            marginTop: 52,
            width: '100%',
            maxWidth: 740,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 1,
            boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
          }}
        >
          <div style={{
            padding: '10px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-workspace)',
          }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {['var(--color-critical)', 'var(--color-warning)', 'var(--color-success)'].map((c, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.8 }} />
              ))}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginLeft: 4 }}>
              SSTI ATTACK CHAIN — 5 STAGES
            </span>
          </div>
          <AttackFlowViz activeStage={null} running={false} />
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        style={{ padding: '24px 40px', borderTop: '1px solid var(--border-subtle)' }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 14 }}>
            Quick Launch
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {QUICK_ACTIONS.map(({ label, desc, path, icon: Icon, color }, idx) => (
              <motion.button
                key={path}
                onClick={() => navigate(path)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + idx * 0.05 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = color; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
              >
                <Icon size={15} style={{ color }} />
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {label}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {desc}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        {BASE_STATS.map((stat, idx) => (
          <div
            key={stat.label}
            style={{
              padding: '20px 24px',
              textAlign: 'center',
              borderRight: idx < BASE_STATS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 28,
              fontWeight: 700,
              color: stat.color,
              letterSpacing: '-0.02em',
              textShadow: `0 0 20px ${stat.color}40`,
            }}>
              {stat.value}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginTop: 4,
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};
