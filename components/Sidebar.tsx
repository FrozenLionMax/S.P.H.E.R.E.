'use client';

import { motion } from 'framer-motion';
import { C, TrackKey, TRACK_CONFIGS, StatusType } from '@/lib/constants';
import Btn from '@/components/ui/Btn';
import { SectionLabel } from '@/components/ui/SectionLabel';
import Anatomical2DScene from '@/components/Anatomical2DScene';

interface SidebarProps {
  activeTrackKey: TrackKey;
  trackConf: typeof TRACK_CONFIGS[TrackKey];
  crisis: boolean;
  executeSubsystem: (cmd: string) => void;
  triggerCrisisMode: () => void;
  resolveCrisisMode: () => void;
  demoActive: boolean;
  startDemo: () => void;
  handleCaptureScreenshot: () => void;
  connected: boolean;
  onClearLogs: () => void;
  
  // Anatomical 2D props
  last: any;
  temp: number;
  pressure: number;
  tempSt: StatusType;
  pressureSt: StatusType;

  // New Analytics props
  isBlackBoxActive: boolean;
  onToggleBlackBox: () => void;
  onGenerateReport: () => void;
}

export default function Sidebar({
  activeTrackKey,
  trackConf,
  crisis,
  executeSubsystem,
  triggerCrisisMode,
  resolveCrisisMode,
  demoActive,
  startDemo,
  handleCaptureScreenshot,
  last,
  temp,
  pressure,
  tempSt,
  pressureSt,
  isBlackBoxActive,
  onToggleBlackBox,
  onGenerateReport
}: SidebarProps) {
  return (
    <motion.aside
      className="flex flex-col w-full lg:w-[32%] shrink-0 lg:overflow-hidden border-t lg:border-t-0 glass-panel"
      style={{ borderColor: 'var(--border)' }}
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 0, 0, 1] }}
    >
      {/* Panel Header - Integrated Proceed to 3D twin button as a compact tab */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-semibold tracking-[0.22em] uppercase" style={{ color: C.muted }}>Biometric Matrix</span>
          <div className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(0,212,255,0.07)', color: C.cyan, border: '1px solid rgba(0,212,255,0.15)' }}>2D HUD</div>
        </div>
        
        {/* Sleek Proceed to 3D Link in Header */}
        <a 
          href={`/digital-twin?condition=${
            activeTrackKey === 'PILOT' ? 'arrhythmia' :
            activeTrackKey === 'ASTRONAUT' ? 'asthma' :
            activeTrackKey === 'SURGEON' ? 'epilepsy' : 'diabetes'
          }`}
          className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-mono font-bold tracking-widest uppercase rounded border border-cyan-500/25 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-white transition-all duration-300 shadow-[0_0_8px_rgba(0,212,255,0.06)]"
        >
          3D TWIN ➔
        </a>
      </div>

      {/* 2D Anatomical Blueprint - Full height flex container, completely decluttered */}
      <div className="flex-1 w-full min-h-[300px] relative z-0 border-b border-white/5 bg-black/5">
        <Anatomical2DScene
          last={last}
          crisis={crisis}
          activeTrackKey={activeTrackKey}
          temp={temp}
          pressure={pressure}
          tempSt={tempSt}
          pressureSt={pressureSt}
        />
      </div>

      {/* Operator Subsystems & Controls - Highly compacted into two single rows of buttons */}
      <div className="px-4 py-2 pb-3 shrink-0 bg-black/10">
        {/* Row 1: Subsystems (4 columns) */}
        <div className="flex items-center justify-between mb-1.5">
          <SectionLabel>Operator Subsystems</SectionLabel>
        </div>
        <div className="grid grid-cols-4 gap-1 mb-2.5">
          {activeTrackKey === 'ASTRONAUT' && ['Aero Payload', 'Orbit Calc', 'Nav Systems', 'Thruster Align'].map((btn, i) => (
            <Btn key={btn} onClick={() => { executeSubsystem(btn); }} color={trackConf.themeColor} className="px-1 text-[7.5px]">
              {i === 0 ? 'PAYLOAD' : i === 1 ? 'ORBIT' : i === 2 ? 'NAV' : 'THRUST'}
            </Btn>
          ))}
          {activeTrackKey === 'PILOT' && ['Flaps Config', 'Landing Gear', 'Avionics', 'Radio Comms'].map((btn, i) => (
            <Btn key={btn} onClick={() => { executeSubsystem(btn); }} color={trackConf.themeColor} className="px-1 text-[7.5px]">
              {i === 0 ? 'FLAPS' : i === 1 ? 'GEAR' : i === 2 ? 'AVIONICS' : 'RADIO'}
            </Btn>
          ))}
          {activeTrackKey === 'SURGEON' && ['Scalpel Sync', 'Scope Zoom', 'Hemostat', 'Suture Bot'].map((btn, i) => (
            <Btn key={btn} onClick={() => { executeSubsystem(btn); }} color={trackConf.themeColor} className="px-1 text-[7.5px]">
              {i === 0 ? 'SCALPEL' : i === 1 ? 'ZOOM' : i === 2 ? 'HEMO' : 'SUTURE'}
            </Btn>
          ))}
          {activeTrackKey === 'TRAIN_PILOT' && ['Brake Override', 'Track Switch', 'Horn Signal', 'Door Control'].map((btn, i) => (
            <Btn key={btn} onClick={() => { executeSubsystem(btn); }} color={trackConf.themeColor} className="px-1 text-[7.5px]">
              {i === 0 ? 'BRAKE' : i === 1 ? 'SWITCH' : i === 2 ? 'HORN' : 'DOOR'}
            </Btn>
          ))}
          {activeTrackKey === 'TRUCKER' && ['Engine Brake', 'Trailer Hitch', 'CB Radio', 'Wiper Fluid'].map((btn, i) => (
            <Btn key={btn} onClick={() => { executeSubsystem(btn); }} color={trackConf.themeColor} className="px-1 text-[7.5px]">
              {i === 0 ? 'ENG.BRK' : i === 1 ? 'HITCH' : i === 2 ? 'RADIO' : 'WIPER'}
            </Btn>
          ))}
        </div>

        {/* Row 2: Global Controls (4 columns) */}
        <div className="flex items-center justify-between mb-1.5">
          <SectionLabel>Global Controls</SectionLabel>
        </div>
        <div className="grid grid-cols-4 gap-1">
          <Btn onClick={triggerCrisisMode} disabled={demoActive} ariaLabel="Trigger override mode" color={C.red} className="px-1 text-[7.5px]">
            OVERRIDE
          </Btn>
          <Btn onClick={resolveCrisisMode} disabled={demoActive} ariaLabel="Resolve crisis mode" color={C.green} className="px-1 text-[7.5px]">
            RESOLVE
          </Btn>
          <Btn onClick={startDemo} ariaLabel={demoActive ? 'Stop guided scenario demo' : 'Start guided scenario demo'} color={C.amber} className="px-1 text-[7.5px]">
            {demoActive ? 'STOP' : 'DEMO'}
          </Btn>
          <Btn onClick={handleCaptureScreenshot} ariaLabel="Capture dashboard screenshot" color={C.cyan} className="px-1 text-[7.5px]">
            CAPTURE
          </Btn>
        </div>

        {/* Row 3: System Analytics (2 columns) */}
        <div className="flex items-center justify-between mt-3.5 mb-1.5">
          <SectionLabel>System Analytics</SectionLabel>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <Btn onClick={onToggleBlackBox} disabled={demoActive} ariaLabel="Toggle session playback" color={isBlackBoxActive ? C.amber : C.muted} className="px-1 text-[7.5px]">
            {isBlackBoxActive ? 'LIVE STREAM' : 'BLACK BOX'}
          </Btn>
          <Btn onClick={onGenerateReport} ariaLabel="Generate session incident report" color={C.cyan} className="px-1 text-[7.5px]">
            GEN REPORT
          </Btn>
        </div>
      </div>
    </motion.aside>
  );
}
