'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { C, TrackKey, TRACK_CONFIGS, STATUS, StatusType } from '@/lib/constants';
import { fmt } from '@/lib/helpers';
import ECG from '@/components/ECG';
import { SignalBars } from '@/components/TrackVisualizer';

interface DashboardHeaderProps {
  activeTrackKey: TrackKey;
  trackConf: typeof TRACK_CONFIGS[TrackKey];
  crisis: boolean;
  hr: number;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
  volume: number;
  setVolume: (val: number) => void;
  connected: boolean;
  healthScore: number;
  isPaused: boolean;
  setShowShortcuts: (val: boolean) => void;
  clock: string;
  setIsOnboarded: (val: boolean) => void;
  audioCtx: any;
  temp: number;
  tempSt: StatusType;
  pressure: number;
  pressureSt: StatusType;
}

export default function DashboardHeader({
  activeTrackKey,
  trackConf,
  crisis,
  hr,
  audioEnabled,
  setAudioEnabled,
  volume,
  setVolume,
  connected,
  healthScore,
  isPaused,
  setShowShortcuts,
  clock,
  setIsOnboarded,
  audioCtx,
  temp,
  tempSt,
  pressure,
  pressureSt
}: DashboardHeaderProps) {
  const router = useRouter();

  return (
    <header
      className="flex items-center justify-between px-4 shrink-0 glass-panel w-full relative z-50"
      style={{ height: 56, borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-4 flex-1 h-full min-w-0">
        {/* Logo & Title (Home Button) */}
        <button
          onClick={() => {
            setIsOnboarded(false);
            router.push('/');
          }}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer text-left group transition-all hover:opacity-90 animate-fade-in"
          title="Return to Operator Selection"
          aria-label="Return to Operator Selection Selection Screen"
        >
          <div className="relative flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="2.2" fill={crisis ? C.red : C.cyan} className="group-hover:fill-white transition-colors" />
              <circle cx="6" cy="6" r="5" stroke={crisis ? C.red : C.cyan} strokeWidth="0.8" fill="none" opacity="0.35" className="group-hover:stroke-white transition-colors" />
            </svg>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[13px] font-semibold tracking-[0.2em] uppercase font-mono group-hover:text-white transition-colors" style={{ color: C.fg }}>
              S.P.H.E.R.E.
            </span>
            <span className="text-[8px] font-mono tracking-widest uppercase group-hover:brightness-125 transition-all" style={{ color: trackConf.themeColor }}>
              TELEMETRY
            </span>
          </div>
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.08)' }} className="shrink-0 hidden sm:block" />

        {/* Patient Twin HUD Metadata */}
        <div className="hidden xl:flex items-center gap-4 text-[7.5px] font-mono leading-[1.3] tracking-widest text-slate-500 uppercase shrink-0">
          <div className="flex flex-col border-r border-white/5 pr-4 shrink-0">
            <span className="text-emerald-400 font-bold text-[8px] leading-none mb-0.5">TWIN</span>
            <span className="text-slate-300">PATIENT ID: TWIN-988</span>
            <span className="text-red-400/80 font-semibold animate-pulse text-[6.5px]">CLASSIFIED SUBJECT</span>
          </div>
          <div className="flex flex-col shrink-0">
            <div>
              <span className="text-slate-500">AGE / SEX:</span> <span className="text-slate-300">32 / MALE</span>
            </div>
            <div>
              <span className="text-slate-500">BLOOD TYPE:</span> <span className="text-slate-300">0-NEGATIVE</span>
            </div>
          </div>
          <div className="flex flex-col shrink-0">
            <div>
              <span className="text-slate-500">HEIGHT / WT:</span> <span className="text-slate-300">182cm / 76kg</span>
            </div>
            <div>
              <span className="text-slate-500">CORE TEMP:</span> <span className="text-slate-300">98.6°F / 37°C</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Top Bar ECG Graph */}
        <div className="hidden lg:flex items-center gap-3 h-full py-2 shrink-0 mr-2" aria-hidden="true">
          <div className="flex flex-col items-end justify-center">
            <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color: C.muted }}>Cardiac</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: crisis ? C.red : C.cyan }}>
              {fmt(hr || 75)} BPM
            </span>
          </div>
          <div
            className="h-9 w-32 rounded-sm overflow-hidden flex items-center justify-center mr-1"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <ECG
              crisis={crisis}
              hr={hr}
              width={128}
              height={36}
              glow={false}
              audioEnabled={audioEnabled}
              sound={false}
              audioCtx={audioCtx}
              volume={volume}
            />
          </div>
          <div className="flex flex-col items-end justify-center ml-1 pl-3 border-l border-white/5">
            <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color: C.muted }}>Body Temp</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: STATUS[tempSt] }}>
              {fmt(temp, 1)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">°F</span>
            </span>
          </div>
          <div className="flex flex-col items-end justify-center ml-1 pl-3 border-l border-white/5">
            <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color: C.muted }}>
              {activeTrackKey === 'ASTRONAUT' ? 'Suit Pres' : 'Cabin Pres'}
            </span>
            <span className="text-[10px] font-mono font-bold" style={{ color: STATUS[pressureSt] }}>
              {fmt(pressure, 2)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">psi</span>
            </span>
          </div>
        </div>

        <div style={{ width: 1, height: 28, background: 'var(--border)' }} className="hidden lg:block shrink-0 mr-1" />

        {/* Audio Controls */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-sm border" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
          <span className="text-[8px] font-mono uppercase hidden sm:inline" style={{ color: audioEnabled ? C.green : C.muted }}>SYS.AUDIO</span>
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="w-6 h-3 rounded-sm border flex items-center px-0.5 transition-colors shrink-0"
            style={{
              borderColor: audioEnabled ? C.green : C.subtle,
              background: audioEnabled ? 'rgba(0, 255, 170, 0.1)' : 'transparent',
            }}
            role="switch"
            aria-checked={audioEnabled}
            aria-label="Toggle system audio"
          >
            <motion.div
              className="w-2 h-2 rounded-[1px]"
              style={{ background: audioEnabled ? C.green : C.subtle }}
              animate={{ x: audioEnabled ? 10 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
          {audioEnabled && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="ml-1 shrink-0 cursor-pointer hidden lg:block"
              style={{
                width: '36px',
                height: '3px',
                accentColor: C.green,
                background: 'rgba(255,255,255,0.08)',
                outline: 'none',
                borderRadius: '2px',
                WebkitAppearance: 'none'
              }}
              aria-label="System audio volume level"
            />
          )}
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-sm border" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
          <SignalBars strength={connected ? 5 : 0} />
          <span className="text-[8px] font-mono uppercase" style={{ color: C.muted }}>WS-LINK</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-sm border" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: healthScore > 75 ? C.green : healthScore > 50 ? C.amber : C.red }} />
          <span className="text-[8px] font-mono tabular-nums whitespace-nowrap" style={{ color: C.muted }}>
            HLT <span className="font-semibold" style={{ color: healthScore > 75 ? C.green : C.amber }}>{healthScore.toFixed(2)}%</span>
          </span>
        </div>

        <AnimatePresence mode="wait">
          {isPaused ? (
            <motion.div
              key="p"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-widest uppercase shrink-0"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)', color: C.amber }}
            >
              <motion.div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.amber }} animate={{ opacity: [1, 0.1, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />
              Paused
            </motion.div>
          ) : crisis ? (
            <motion.div
              key="c"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-widest uppercase shrink-0"
              style={{ background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.4)', color: C.red }}
            >
              <motion.div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.red }} animate={{ opacity: [1, 0.1, 1] }} transition={{ duration: 0.38, repeat: Infinity }} />
              Crisis
            </motion.div>
          ) : (
            <motion.div
              key="n"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-[8px] font-mono tracking-widest uppercase shrink-0"
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: C.muted }}
            >
              <motion.div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.green }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              Nominal
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setShowShortcuts(true)}
          className="hidden sm:flex items-center justify-center w-7 h-7 rounded-sm border hover:border-white/20 transition-all cursor-pointer shrink-0"
          style={{ background: 'var(--panel)', borderColor: 'var(--border)', color: C.muted }}
          title="Keyboard Shortcuts (Key: ?)"
          aria-label="Show keyboard shortcuts help dialog"
        >
          <span className="text-xs font-mono font-bold">?</span>
        </button>

        <div className="hidden sm:block px-2 py-1 rounded-sm text-[9px] font-mono tabular-nums tracking-widest border shrink-0" style={{ background: 'var(--panel)', borderColor: 'var(--border)', color: C.muted }}>
          {clock}
        </div>
      </div>
    </header>
  );
}
