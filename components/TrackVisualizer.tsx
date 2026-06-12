'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { C, TRACK_CONFIGS } from '@/lib/constants';
import AnimatedValue from '@/components/ui/AnimatedValue';
import ScrambleText from '@/components/ui/ScrambleText';

// ─────────────────────────────────────────────────────────────────────────────
// Reduced Motion Hook Helper
// ─────────────────────────────────────────────────────────────────────────────

function useReducedMotion() {
  const [shouldReduce, setShouldReduce] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduce(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setShouldReduce(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);
  return shouldReduce;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gyroscope Backdrop (for Astronaut)
// ─────────────────────────────────────────────────────────────────────────────

export function Gyroscope({ isAstronaut }: { isAstronaut: boolean }) {
  const reduceMotion = useReducedMotion();
  if (!isAstronaut) return null;

  const animationProps = reduceMotion
    ? {}
    : {
        animate: { rotate: [0, 15, -10, 5, 0], x: [0, 5, -3, 0], y: [0, -4, 2, 0] },
        transition: { duration: 12, repeat: Infinity, ease: 'easeInOut' } as any
      };

  return (
    <div className="absolute top-4 right-[34%] z-10 opacity-70 pointer-events-none">
      <motion.svg width="80" height="80" viewBox="0 0 60 60" {...animationProps}>
        <circle cx="30" cy="30" r="28" fill="none" stroke={C.violet} strokeWidth="1" strokeDasharray="4 4" />
        <line x1="30" y1="5" x2="30" y2="55" stroke={C.violet} strokeWidth="0.5" />
        <line x1="5" y1="30" x2="55" y2="30" stroke={C.violet} strokeWidth="0.5" />
        <circle cx="30" cy="30" r="10" fill="none" stroke={C.violet} strokeWidth="1" />
      </motion.svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Track Visualizer: Train Pilot
// ─────────────────────────────────────────────────────────────────────────────

export function TrainPilotEyeTracker({ crisis, perclos }: { crisis: boolean; perclos: number }) {
  const reduceMotion = useReducedMotion();
  const baseScale = Math.max(0.3, 1.0 - (perclos / 35) * 0.65);
  const baseY = (perclos / 35) * 8.0;

  const pupilAnimation = reduceMotion
    ? { y: baseY, scale: baseScale }
    : crisis
    ? { y: 10, scale: 0.3, boxShadow: '0 0 10px #ff3b5c' }
    : {
        y: [baseY, baseY + 1.5, baseY - 1.5, baseY],
        x: [0, 2.5, -2.5, 0],
        scale: baseScale,
        boxShadow: perclos > 10 ? '0 0 6px rgba(245,158,11,0.2)' : '0 0 5px rgba(0,255,170,0.25)',
      };

  const pupilTransition = reduceMotion
    ? {}
    : crisis
    ? { duration: 0.3 }
    : {
        y: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' },
        x: { repeat: Infinity, duration: 4.5, ease: 'easeInOut' },
      };

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-black/45 border border-white/5 rounded-sm w-full mb-2">
      <div className="w-full flex items-center justify-between text-[7.5px] font-mono text-slate-500 uppercase tracking-widest mb-1">
        <span>IR Pupil Console</span>
        <span style={{ color: crisis ? C.red : perclos > 10 ? C.amber : C.green }}>
          {crisis ? 'MICRO-SLEEP DETECTED' : perclos > 10 ? 'DROWSINESS WARNING' : 'PERCLOS NOMINAL'}
        </span>
      </div>
      <div className="relative w-full h-[62px] flex items-center justify-center bg-slate-950/40 border border-slate-900/60 rounded-sm overflow-hidden">
        <svg width="90" height="34" viewBox="0 0 80 40" className="opacity-30">
          <path d="M 10,20 Q 40,2 70,20 Q 40,38 10,20 Z" fill="none" stroke={crisis ? C.red : perclos > 10 ? C.amber : C.green} strokeWidth="1" />
          <circle cx="40" cy="20" r="12" fill="none" stroke={crisis ? C.red : perclos > 10 ? C.amber : C.green} strokeWidth="0.8" strokeDasharray="3 3" />
        </svg>

        <motion.div
          className="absolute w-4.5 h-4.5 rounded-full flex items-center justify-center"
          style={{
            background: crisis ? 'rgba(255,59,92,0.18)' : perclos > 10 ? 'rgba(245,158,11,0.15)' : 'rgba(0,255,170,0.12)',
            border: `1.2px solid ${crisis ? C.red : perclos > 10 ? C.amber : C.green}`,
          }}
          animate={pupilAnimation}
          transition={pupilTransition}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
        </motion.div>

        {crisis && (
          <motion.div
            className="absolute inset-0 bg-red-950/20 flex items-center justify-center text-[7.5px] font-mono font-bold text-red-500"
            animate={reduceMotion ? { opacity: 0.85 } : { opacity: [0.4, 1, 0.4] }}
            transition={reduceMotion ? {} : { duration: 0.6, repeat: Infinity }}
          >
            ALERT: PUPIL LOCK LOSS
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Track Visualizer: Aviator / Fighter Pilot
// ─────────────────────────────────────────────────────────────────────────────

export function PilotGForceReticle({ crisis, gForce }: { crisis: boolean; gForce: number }) {
  const reduceMotion = useReducedMotion();
  const yOffset = crisis ? 14 : (gForce - 1) * 4.5;

  const reticleAnimation = reduceMotion
    ? { x: 0, y: yOffset }
    : crisis
    ? {
        x: [0, -4, 4, -2, 2, 0],
        y: yOffset,
        boxShadow: '0 0 10px #ff3b5c',
      }
    : {
        x: [0, 2, -2, 1, -1, 0],
        y: yOffset,
        boxShadow: gForce > 5 ? '0 0 8px #f59e0b' : '0 0 6px #00d4ff',
      };

  const reticleTransition = (reduceMotion
    ? {}
    : crisis
    ? {
        x: { repeat: Infinity, duration: 0.12, ease: 'linear' },
        y: { duration: 0.3 },
      }
    : {
        x: { repeat: Infinity, duration: 3.0, ease: 'easeInOut' },
        y: { duration: 0.3 },
      }) as any;

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-black/45 border border-white/5 rounded-sm w-full mb-2">
      <div className="w-full flex items-center justify-between text-[7.5px] font-mono text-slate-500 uppercase tracking-widest mb-1">
        <span>Attitude vector</span>
        <span style={{ color: crisis ? C.red : gForce > 5 ? C.amber : C.green }}>
          {crisis ? 'AUTO-GCAS ACTIVE' : gForce > 5 ? 'HIGH G WARNING' : 'NOMINAL SECTOR'}
        </span>
      </div>
      <div className="relative w-full h-[62px] flex items-center justify-center bg-slate-950/40 border border-slate-900/60 rounded-sm overflow-hidden">
        <div className="absolute w-px h-[50px] bg-slate-800/25" />
        <div className="absolute w-[120px] h-px bg-slate-800/25" />
        <div className="absolute w-10 h-10 border border-slate-800/15 rounded-full" />

        <motion.div
          className="absolute w-2 h-2 rounded-full"
          style={{ background: crisis ? C.red : gForce > 5 ? C.amber : C.cyan }}
          animate={reticleAnimation}
          transition={reticleTransition}
        />

        {crisis && (
          <motion.div
            className="absolute flex flex-col items-center"
            style={{ bottom: 4 }}
            animate={reduceMotion ? { y: 0, opacity: 0.9 } : { opacity: [0.4, 1, 0.4], y: [0, -3, 0] }}
            transition={reduceMotion ? {} : { duration: 0.8, repeat: Infinity }}
          >
            <span className="text-[7px] font-mono font-bold text-red-500">PULL UP</span>
            <svg width="6" height="6" viewBox="0 0 8 8" fill="none" stroke={C.red} strokeWidth="1.5">
              <path d="M 4,7 L 4,1 M 1,4 L 4,1 L 7,4" />
            </svg>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Track Visualizer: Astronaut
// ─────────────────────────────────────────────────────────────────────────────

export function AstronautPressureVent({ crisis, pressure }: { crisis: boolean; pressure: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-black/45 border border-white/5 rounded-sm w-full mb-2">
      <div className="w-full flex items-center justify-between text-[7.5px] font-mono text-slate-500 uppercase tracking-widest mb-1">
        <span>Suit pressure</span>
        <span style={{ color: crisis ? C.red : C.green }}>{crisis ? 'EMERGENCY VENTING' : 'SEALS INTEGRAL'}</span>
      </div>
      <div className="relative w-full h-[62px] flex items-center justify-center bg-slate-950/40 border border-slate-900/60 rounded-sm overflow-hidden">
        {crisis && !reduceMotion && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-cyan-400"
                style={{ left: '58%', top: '50%' }}
                animate={{
                  x: [0, 16 + Math.random() * 12],
                  y: [0, (i - 2) * 5 + (Math.random() * 2 - 1)],
                  opacity: [1, 0],
                  scale: [1.2, 0.4]
                }}
                transition={{
                  duration: 0.5 + Math.random() * 0.3,
                  repeat: Infinity,
                  delay: i * 0.08
                }}
              />
            ))}
          </div>
        )}

        <svg width="50" height="50" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="22" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="3" />
          <motion.circle
            cx="30" cy="30" r="22"
            fill="none"
            stroke={crisis ? C.red : C.cyan}
            strokeWidth="3"
            strokeDasharray={2 * Math.PI * 22}
            initial={{ strokeDashoffset: (2 * Math.PI * 22) }}
            animate={{ strokeDashoffset: (2 * Math.PI * 22) * (1 - Math.min(1, pressure / 4.3)) }}
            transition={{ duration: 0.4 }}
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center font-mono">
          <span className="text-[10px] font-bold text-slate-200">{pressure.toFixed(2)}</span>
          <span className="text-[6px] text-slate-500">PSI</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Track Visualizer: Surgeon
// ─────────────────────────────────────────────────────────────────────────────

export function SurgeonFFTSpectrum({ crisis, tremorAmp, tremorFreq }: { crisis: boolean; tremorAmp: number; tremorFreq: number }) {
  const reduceMotion = useReducedMotion();
  const freqs = [1, 2, 4, 6, 8, 10, 12, 14];

  return (
    <div className="flex flex-col gap-1.5 p-2 bg-black/45 border border-white/5 rounded-sm w-full mb-2">
      <div className="w-full flex items-center justify-between text-[7.5px] font-mono text-slate-500 uppercase tracking-widest">
        <span>FFT Spectrum</span>
        <span style={{ color: crisis ? C.red : C.green }}>{crisis ? 'SCALPEL LOCKED' : 'STABILIZED'}</span>
      </div>

      <div className="relative h-[62px] w-full flex items-end justify-between gap-0.5 border-b border-slate-900/60 px-1 pt-3 bg-slate-950/20 rounded-sm">
        {crisis && (
          <motion.div
            className="absolute left-0 right-0 h-px bg-red-500/40 z-10"
            style={{ bottom: '70%' }}
            animate={reduceMotion ? { opacity: 0.8 } : { opacity: [0.4, 0.9, 0.4] }}
            transition={reduceMotion ? {} : { duration: 0.8, repeat: Infinity }}
          >
            <span className="absolute right-1 -top-1.5 text-[5px] text-red-400 font-bold">STABILIZER LIMIT</span>
          </motion.div>
        )}

        {freqs.map((f, i) => {
          const heightKeyframes = crisis
            ? (f === 8 ? [80, 96, 85, 92, 80] : f === 6 || f === 10 ? [30, 48, 35, 42, 30] : [8, 18, 11, 16, 8])
            : (f === 8 ? [15, 26, 18, 22, 15] : [6, 12, 8, 11, 6]);

          const scale = crisis ? 1.0 : (tremorAmp || 0.02) / 0.025;
          const scaledKeyframes = heightKeyframes.map(h => Math.min(100, Math.max(5, h * scale)));

          const animateProps = reduceMotion
            ? { height: `${scaledKeyframes[0]}%` }
            : {
                animate: { height: scaledKeyframes.map(v => `${v}%`) },
                transition: {
                  repeat: Infinity,
                  duration: 0.7 + (i * 0.08) % 0.5,
                  ease: 'easeInOut'
                } as any
              };

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full bg-slate-900/40 rounded-t-xs relative overflow-hidden h-9">
                <motion.div
                  className="absolute bottom-0 inset-x-0 rounded-t-xs"
                  style={{ background: crisis && f === 8 ? C.red : crisis ? C.amber : C.green }}
                  {...animateProps}
                />
              </div>
              <span className="text-[6px] text-slate-600 font-mono">{f}Hz</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Track Visualizer: Trucker
// ─────────────────────────────────────────────────────────────────────────────

export function TruckerPlatoonGap({ crisis, alertness }: { crisis: boolean; alertness: number }) {
  const reduceMotion = useReducedMotion();
  const isDrowsy = alertness < 80;

  const followerAnimation = reduceMotion
    ? { left: crisis ? '64%' : '50%', y: 0 }
    : crisis
    ? {
        left: '64%',
        y: [0, -1, 1, -1, 0]
      }
    : isDrowsy
    ? {
        left: ['47%', '53%', '47%'],
        y: 0
      }
    : {
        left: '50%',
        y: 0
      };

  const followerTransition = (reduceMotion
    ? {}
    : crisis
    ? {
        left: { type: 'spring', stiffness: 90, damping: 14 },
        y: { repeat: Infinity, duration: 0.2, ease: 'easeInOut' }
      }
    : isDrowsy
    ? {
        left: { repeat: Infinity, duration: 4.5, ease: 'easeInOut' }
      }
    : {
        left: { type: 'spring', stiffness: 90, damping: 14 }
      }) as any;

  return (
    <div className="flex flex-col gap-1.5 p-2 bg-black/45 border border-white/5 rounded-sm w-full mb-2">
      <div className="w-full flex items-center justify-between text-[7.5px] font-mono text-slate-500 uppercase tracking-widest">
        <span>V2V Platoon convoy</span>
        <span style={{ color: crisis ? C.red : isDrowsy ? C.amber : C.green }}>
          {crisis ? 'GAP EXPANDED (45m)' : isDrowsy ? 'DRIVER ALERTNESS WARNING' : 'DENSE CONVOY (15m)'}
        </span>
      </div>

      <div className="relative h-[62px] w-full bg-slate-950/40 border border-slate-900/60 rounded-sm flex items-center px-4 overflow-hidden">
        <div className="absolute inset-x-0 h-px border-t border-dashed border-slate-800/30" style={{ top: '48%' }} />

        <div className="absolute left-2 flex flex-col items-center">
          <div className="w-6 h-3 bg-slate-700 rounded-xs flex items-center justify-center border border-slate-600 text-[5.5px] text-slate-300 font-bold">
            LEAD
          </div>
        </div>

        <div className="absolute" style={{ left: '34%' }}>
          <motion.span
            className="text-[6.5px] font-bold px-1 py-0.5 rounded-xs"
            style={{
              background: crisis ? 'rgba(255,59,92,0.1)' : isDrowsy ? 'rgba(245,158,11,0.08)' : 'rgba(0,255,170,0.05)',
              border: crisis ? '1px solid rgba(255,59,92,0.3)' : isDrowsy ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(0,255,170,0.2)',
              color: crisis ? C.red : isDrowsy ? C.amber : C.green
            }}
            animate={reduceMotion ? { x: crisis ? 10 : 0 } : { x: crisis ? 10 : 0 }}
          >
            {crisis ? '45m' : '15m'}
          </motion.span>
        </div>

        <motion.div
          className="absolute flex flex-col items-center"
          animate={followerAnimation}
          transition={followerTransition}
        >
          <div
            className="w-6 h-3 bg-slate-800 rounded-xs flex items-center justify-center border text-[5.5px] text-slate-300 font-bold"
            style={{ borderColor: crisis ? C.red : isDrowsy ? C.amber : C.cyan }}
          >
            V2V-01
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Master TrackVisualizer Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

interface TrackVisualizerProps {
  trackKey: keyof typeof TRACK_CONFIGS;
  crisis: boolean;
  lastSample: any;
}

export default function TrackVisualizer({ trackKey, crisis, lastSample }: TrackVisualizerProps) {
  if (!lastSample) return null;

  const trackData = lastSample.trackData?.[trackKey] || {};

  switch (trackKey) {
    case 'TRAIN_PILOT':
      return <TrainPilotEyeTracker crisis={crisis} perclos={trackData.perclos !== undefined ? trackData.perclos : (lastSample.perclos || 0)} />;
    case 'PILOT':
      return <PilotGForceReticle crisis={crisis} gForce={trackData.gForce !== undefined ? trackData.gForce : (lastSample.gForce || 1.0)} />;
    case 'ASTRONAUT':
      return <AstronautPressureVent crisis={crisis} pressure={trackData.suitPressure !== undefined ? trackData.suitPressure : (lastSample.suitPressure || 4.3)} />;
    case 'SURGEON':
      return <SurgeonFFTSpectrum crisis={crisis} tremorAmp={trackData.tremorAmplitude !== undefined ? trackData.tremorAmplitude : (lastSample.tremorAmplitude || 0.02)} tremorFreq={trackData.tremorFreq !== undefined ? trackData.tremorFreq : (lastSample.tremorFreq || 2.1)} />;
    case 'TRUCKER':
      return <TruckerPlatoonGap crisis={crisis} alertness={trackData.alertness !== undefined ? trackData.alertness : (lastSample.alertness || 96.0)} />;
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Score Ring Component
// ─────────────────────────────────────────────────────────────────────────────

export function HealthRing({ score, crisis }: { score: number; crisis: boolean }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = crisis ? C.red : score > 80 ? C.green : score > 60 ? C.amber : C.red;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width="76" height="76" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={r} fill="none" stroke={C.slate} strokeWidth={5} />
          <motion.circle
            cx="38"
            cy="38"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${circ}`}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, ease: [0.22, 0, 0, 1] }}
            style={{ transformOrigin: '38px 38px', transform: 'rotate(-90deg)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[18px] font-semibold leading-none" style={{ color }}>
            <AnimatedValue value={score} precision={0} />
          </span>
        </div>
      </div>
      <span className="text-[9px] font-mono tracking-[0.18em] uppercase" style={{ color: C.muted }}>Health</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HBar — Horizontal Bar Gauge
// ─────────────────────────────────────────────────────────────────────────────

export function HBar({ label, value, unit, pct: p, color }: {
  label: string;
  value: string;
  unit?: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: C.muted }}>
          {label}
        </span>
        <span className="text-[11px] font-mono tabular-nums" style={{ color }}>
          {value}
          <span className="text-[9px] ml-0.5" style={{ color: C.subtle }}>{unit}</span>
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${p}%` }}
          transition={{ duration: 0.8, ease: [0.22, 0, 0, 1] }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal Bars Indicator
// ─────────────────────────────────────────────────────────────────────────────

export function SignalBars({ strength }: { strength: number }) {
  const bars = 5;
  return (
    <div className="flex items-end gap-[2px]">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: 4 + i * 3,
            borderRadius: 1,
            background: i < strength ? C.cyan : 'rgba(255,255,255,0.08)',
            transition: 'background 0.4s',
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Timeline & Timeline Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface Event {
  time: string;
  label: string;
  color: string;
}

export function EventTimeline({ events }: { events: Event[] }) {
  return (
    <div className="relative pl-4">
      <div className="absolute left-[6px] top-0 bottom-0 w-px" style={{ background: 'var(--border)' }} />
      {events.map((e, i) => (
        <div key={i} className="relative flex items-start gap-3 pb-3 last:pb-0">
          <div
            className="absolute -left-[10px] top-1 w-2 h-2 rounded-full border"
            style={{ background: e.color + '22', borderColor: e.color + '88' }}
          />
          <div className="min-w-0">
            <span className="text-[9px] font-mono tabular-nums" style={{ color: C.subtle }}>{e.time}</span>
            <p className="text-[10px] font-mono leading-snug mt-0.5" style={{ color: C.muted }}>{e.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
