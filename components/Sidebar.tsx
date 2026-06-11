'use client';

import { motion } from 'framer-motion';
import { C, TrackKey, TRACK_CONFIGS, StatusType, STATUS } from '@/lib/constants';
import { fmt, nowTime } from '@/lib/helpers';
import Btn from '@/components/ui/Btn';
import { SectionLabel, Divider } from '@/components/ui/SectionLabel';
import { HealthRing, EventTimeline } from '@/components/TrackVisualizer';
import { LogRow, LogEntry } from '@/components/TypewriterLog';

interface SidebarProps {
  activeTrackKey: TrackKey;
  trackConf: typeof TRACK_CONFIGS[TrackKey];
  crisis: boolean;
  spo2St: StatusType;
  hrSt: StatusType;
  envSt: StatusType;
  latSt: StatusType;
  tempSt: StatusType;
  pressureSt: StatusType;
  spo2: number;
  hr: number;
  envMetric: number;
  lat: number;
  temp: number;
  pressure: number;
  healthScore: number;
  localLogs: LogEntry[];
  setLocalLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  logEnd: React.RefObject<HTMLDivElement | null>;
  events: Array<{ time: string; label: string; color: string }>;
  executeSubsystem: (cmd: string) => void;
  triggerCrisisMode: () => void;
  resolveCrisisMode: () => void;
  demoActive: boolean;
  startDemo: () => void;
  handleCaptureScreenshot: () => void;
  connected: boolean;
}

export default function Sidebar({
  activeTrackKey,
  trackConf,
  crisis,
  spo2St,
  hrSt,
  envSt,
  latSt,
  tempSt,
  pressureSt,
  spo2,
  hr,
  envMetric,
  lat,
  temp,
  pressure,
  healthScore,
  localLogs,
  setLocalLogs,
  logEnd,
  events,
  executeSubsystem,
  triggerCrisisMode,
  resolveCrisisMode,
  demoActive,
  startDemo,
  handleCaptureScreenshot,
  connected
}: SidebarProps) {
  return (
    <motion.aside
      className="flex flex-col w-full lg:w-[32%] shrink-0 lg:overflow-hidden border-t lg:border-t-0 glass-panel"
      style={{ borderColor: 'var(--border)' }}
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 0, 0, 1] }}
    >
      <div className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-semibold tracking-[0.22em] uppercase" style={{ color: C.muted }}>Autonomous Console</span>
          <div className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(0,229,153,0.07)', color: C.green, border: '1px solid rgba(0,229,153,0.15)' }}>LIVE</div>
        </div>
      </div>

      <div className="px-5 py-3 shrink-0 grid grid-cols-3 gap-x-3 gap-y-2.5" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>SPO2 <span className="text-[7px] text-green-500/50 ml-1">(&gt;95)</span></span>
          <span className="text-[11px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[spo2St] }}>{fmt(spo2)}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>HR <span className="text-[7px] text-green-500/50 ml-1">(60-100)</span></span>
          <span className="text-[11px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[hrSt] }}>{fmt(hr, 0)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">bpm</span></span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>
            {activeTrackKey === 'ASTRONAUT' ? 'SUIT' : activeTrackKey === 'PILOT' ? 'ALT' : activeTrackKey === 'SURGEON' ? 'TRMR' : activeTrackKey === 'TRAIN_PILOT' ? 'COGL' : 'ALRT'}
            <span className="text-[7px] text-green-500/50 ml-1">(~{fmt(trackConf.baseEnvVal, activeTrackKey === 'SURGEON' ? 2 : 0)})</span>
          </span>
          <span className="text-[11px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[envSt] }}>{fmt(envMetric, activeTrackKey === 'SURGEON' ? 3 : 1)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">{trackConf.metricUnit}</span></span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>LAT <span className="text-[7px] text-green-500/50 ml-1">(&lt;300)</span></span>
          <span className="text-[11px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[latSt] }}>{fmt(lat, 0)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">ms</span></span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>TEMP <span className="text-[7px] text-green-500/50 ml-1">(98.6)</span></span>
          <span className="text-[11px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[tempSt] }}>{fmt(temp, 1)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">°F</span></span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>PRES <span className="text-[7px] text-green-500/50 ml-1">(~14.7)</span></span>
          <span className="text-[11px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[pressureSt] }}>{fmt(pressure, 2)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">psi</span></span>
        </div>
      </div>

      <div className="px-5 py-3 shrink-0 flex items-center gap-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <HealthRing score={healthScore} crisis={crisis} />
        <div className="flex-1 flex flex-col gap-2">
          <span className="text-[9px] font-mono tracking-[0.18em] uppercase text-slate-500 mb-0.5">Index Breakdown</span>
          
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[8px] font-mono">
              <span className="text-slate-400">RESPIRATORY</span>
              <span style={{ color: STATUS[spo2St] }}>{Math.round(fmt(spo2) === '100.00' ? 100 : (spo2 - 88) / (100 - 88) * 100)}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-slate-800">
              <motion.div className="h-full" style={{ background: STATUS[spo2St] }} animate={{ width: Math.max(0, Math.min(100, ((spo2 - 88) / (100 - 88)) * 100)) + '%' }} transition={{ duration: 0.8 }} />
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[8px] font-mono">
              <span className="text-slate-400">CARDIAC</span>
              <span style={{ color: STATUS[hrSt] }}>{Math.round(Math.max(0, Math.min(100, (1 - (hr - 52) / (140 - 52)) * 100)))}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-slate-800">
              <motion.div className="h-full" style={{ background: STATUS[hrSt] }} animate={{ width: Math.max(0, Math.min(100, (1 - (hr - 52) / (140 - 52)) * 100)) + '%' }} transition={{ duration: 0.8 }} />
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[8px] font-mono">
              <span className="text-slate-400">ENVIRONMENT</span>
              <span style={{ color: STATUS[envSt] }}>{Math.round(Math.max(0, Math.min(100, (1 - envMetric / (trackConf.baseEnvVal * 2)) * 100)))}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-slate-800">
              <motion.div className="h-full" style={{ background: STATUS[envSt] }} animate={{ width: Math.max(0, Math.min(100, (1 - envMetric / (trackConf.baseEnvVal * 2)) * 100)) + '%' }} transition={{ duration: 0.8 }} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1" style={{ fontSize: 0 }}>
        {localLogs.map((e, i) => (
          <LogRow key={e.id} entry={e} fresh={i === localLogs.length - 1} />
        ))}
        <div ref={logEnd} />
      </div>

      <Divider />

      <div className="px-5 pt-3 pb-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <SectionLabel>Event Timeline</SectionLabel>
        <EventTimeline events={events} />
      </div>

      <div className="px-5 pt-3 pb-4 shrink-0">
        <SectionLabel>Operator Subsystems</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {activeTrackKey === 'ASTRONAUT' && ['Aero Payload', 'Orbit Calc', 'Nav Systems', 'Thruster Align'].map((btn) => (
            <Btn key={btn} onClick={() => { executeSubsystem(btn); setLocalLogs(p => [...p.slice(-50), { id: Date.now() + Math.random(), time: nowTime(), level: 'SYS', msg: `[CMD] Executing: ${btn}... SUCCESS` }]); }}>{btn}</Btn>
          ))}
          {activeTrackKey === 'PILOT' && ['Flaps Config', 'Landing Gear', 'Avionics', 'Radio Comms'].map((btn) => (
            <Btn key={btn} onClick={() => { executeSubsystem(btn); setLocalLogs(p => [...p.slice(-50), { id: Date.now() + Math.random(), time: nowTime(), level: 'SYS', msg: `[CMD] Executing: ${btn}... SUCCESS` }]); }}>{btn}</Btn>
          ))}
          {activeTrackKey === 'SURGEON' && ['Scalpel Sync', 'Scope Zoom', 'Hemostat', 'Suture Bot'].map((btn) => (
            <Btn key={btn} onClick={() => { executeSubsystem(btn); setLocalLogs(p => [...p.slice(-50), { id: Date.now() + Math.random(), time: nowTime(), level: 'SYS', msg: `[CMD] Executing: ${btn}... SUCCESS` }]); }}>{btn}</Btn>
          ))}
          {activeTrackKey === 'TRAIN_PILOT' && ['Brake Override', 'Track Switch', 'Horn Signal', 'Door Control'].map((btn) => (
            <Btn key={btn} onClick={() => { executeSubsystem(btn); setLocalLogs(p => [...p.slice(-50), { id: Date.now() + Math.random(), time: nowTime(), level: 'SYS', msg: `[CMD] Executing: ${btn}... SUCCESS` }]); }}>{btn}</Btn>
          ))}
          {activeTrackKey === 'TRUCKER' && ['Engine Brake', 'Trailer Hitch', 'CB Radio', 'Wiper Fluid'].map((btn) => (
            <Btn key={btn} onClick={() => { executeSubsystem(btn); setLocalLogs(p => [...p.slice(-50), { id: Date.now() + Math.random(), time: nowTime(), level: 'SYS', msg: `[CMD] Executing: ${btn}... SUCCESS` }]); }}>{btn}</Btn>
          ))}
        </div>

        <SectionLabel>Global Controls</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <Btn onClick={triggerCrisisMode} disabled={demoActive} ariaLabel="Trigger override mode">Trigger Override</Btn>
          <Btn onClick={resolveCrisisMode} disabled={demoActive} ariaLabel="Resolve crisis mode">Resolve Crisis</Btn>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mb-4">
          <Btn onClick={startDemo} ariaLabel={demoActive ? 'Stop guided scenario demo' : 'Start guided scenario demo'}>
            {demoActive ? 'Stop' : 'Demo'}
          </Btn>
          <Btn onClick={handleCaptureScreenshot} ariaLabel="Capture dashboard screenshot">Capture</Btn>
          <Btn onClick={() => setLocalLogs([])} ariaLabel="Clear cockpit console logs">Clear</Btn>
        </div>
      </div>
    </motion.aside>
  );
}
