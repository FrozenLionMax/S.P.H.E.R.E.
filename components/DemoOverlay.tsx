'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface DemoOverlayProps {
  demoActive: boolean;
  demoTime: number;
  onStop: () => void;
}

const PHASES = [
  { label: 'BASE', start: 0, end: 10, color: '#00d4ff' },
  { label: 'DRIFT', start: 10, end: 20, color: '#ff9900' },
  { label: 'CRISIS', start: 20, end: 30, color: '#ff3b5c' },
  { label: 'OVRD', start: 30, end: 40, color: '#ff3b5c' },
  { label: 'RECV', start: 40, end: 50, color: '#00e599' },
  { label: 'OK', start: 50, end: 60, color: '#00e599' },
];

const EVENTS: [number, number, string][] = [
  [0, 5, 'Calibrating biosensors... Heart rate locked at 75 BPM.'],
  [5, 10, 'All channels nominal. SpO₂ 98.2% — streaming baseline.'],
  [10, 15, 'Z-Score drift on SpO₂ channel: σ = 1.4 → monitoring.'],
  [15, 20, '⚠ Heart rate trending +12% above rolling mean.'],
  [20, 25, '⛔ SpO₂ dropped below 83% — Auto-GCAS engaging.'],
  [25, 30, '⛔ Control stick LOCKED. Emergency pull-up initiated.'],
  [30, 35, '⛔ Manual controls bypassed. Cabin pressurization max.'],
  [35, 40, '⛔ Descent at 3000 ft/min. MAYDAY on 121.5 MHz.'],
  [40, 45, 'Recovery protocol engaged. SpO₂ climbing → 91%.'],
  [45, 50, 'Heart rate normalizing: 98 → 82 BPM. Disengaging AP.'],
  [50, 55, '✓ All vitals nominal. Override disengaged.'],
  [55, 999, '✓ HOMEOSTASIS RESTORED — Black box saved.'],
];

function getEventMsg(t: number): string {
  for (const [start, end, msg] of EVENTS) {
    if (t >= start && t < end) return msg;
  }
  return '';
}

function getPhaseLabel(t: number): string {
  if (t < 10) return 'TELEMETRY INIT';
  if (t < 20) return 'ANOMALY DETECTION';
  if (t < 30) return 'CRISIS PROTOCOL';
  if (t < 40) return 'OVERRIDE ACTIVE';
  if (t < 50) return 'RECOVERY SEQUENCE';
  return 'MISSION COMPLETE';
}

function getStatusLabel(t: number): string {
  if (t < 10) return '● NOMINAL';
  if (t < 20) return '● DRIFT DETECTED';
  if (t < 40) return '● CRITICAL — OVERRIDE';
  if (t < 50) return '● RECOVERING';
  return '● ALL SYSTEMS GO';
}

export default function DemoOverlay({ demoActive, demoTime, onStop }: DemoOverlayProps) {
  const isCrisisPhase = demoTime >= 20 && demoTime < 40;
  const crisisColor = '#ff3b5c';
  const normalColor = '#00d4ff';
  const greenColor = '#00e599';

  return (
    <>
      {/* Black Box Flight Recorder Popup */}
      <AnimatePresence>
        {demoActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end justify-center pb-6 pointer-events-none"
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="pointer-events-auto w-[420px] max-w-[95vw] rounded-xl border overflow-hidden"
              style={{
                background: 'rgba(6, 8, 14, 0.95)',
                backdropFilter: 'blur(24px) saturate(1.4)',
                borderColor: isCrisisPhase ? 'rgba(255,59,92,0.45)' : 'rgba(0,212,255,0.25)',
                boxShadow: isCrisisPhase 
                  ? '0 8px 40px rgba(255,59,92,0.2), 0 0 0 1px rgba(255,59,92,0.08)' 
                  : '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,255,0.06)'
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.35)' }}>
                <div className="flex items-center gap-2.5">
                  <motion.div 
                    className="w-2 h-2 rounded-full"
                    style={{ background: crisisColor, boxShadow: `0 0 8px rgba(255,59,92,0.6)` }}
                    animate={{ opacity: [1, 0.15, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                  <span className="text-[9px] font-mono font-bold tracking-[0.25em] uppercase" style={{ color: crisisColor }}>REC</span>
                  <span className="text-[7px] font-mono tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>BLACK BOX RECORDER</span>
                </div>
                <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: normalColor }}>
                  T+{String(Math.floor(demoTime / 60)).padStart(2, '0')}:{String(demoTime % 60).padStart(2, '0')}
                </span>
              </div>

              {/* Phase Timeline */}
              <div className="px-4 pt-3 pb-1">
                <div className="flex items-center gap-[2px]">
                  {PHASES.map((phase, i) => {
                    const isActive = demoTime >= phase.start && demoTime < phase.end;
                    const isPast = demoTime >= phase.end;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="w-full h-[5px] rounded-sm relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <motion.div
                            className="h-full rounded-sm"
                            style={{ background: isPast || isActive ? phase.color : 'transparent', opacity: isPast ? 0.5 : 1 }}
                            animate={{ width: isActive ? `${((demoTime - phase.start) / (phase.end - phase.start)) * 100}%` : isPast ? '100%' : '0%' }}
                            transition={{ duration: 0.5 }}
                          />
                          {isActive && (
                            <motion.div
                              className="absolute top-0 right-0 w-[3px] h-full rounded-sm"
                              style={{ background: 'white', boxShadow: `0 0 8px ${phase.color}` }}
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 0.6, repeat: Infinity }}
                            />
                          )}
                        </div>
                        <span className="text-[6px] font-mono tracking-wider uppercase" style={{ 
                          color: isActive ? phase.color : isPast ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                          fontWeight: isActive ? 700 : 400
                        }}>
                          {phase.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Event Log */}
              <div className="px-4 py-2.5">
                <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-start gap-2.5">
                    <motion.div 
                      className="w-1.5 h-1.5 rounded-full mt-[3px] flex-shrink-0"
                      style={{ background: isCrisisPhase ? crisisColor : normalColor, boxShadow: `0 0 6px ${isCrisisPhase ? crisisColor : normalColor}` }}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1.0, repeat: Infinity }}
                    />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[7px] font-mono tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {getPhaseLabel(demoTime)}
                      </span>
                      <span className="text-[9px] font-mono leading-relaxed" style={{ color: isCrisisPhase ? crisisColor : 'rgba(255,255,255,0.6)' }}>
                        {getEventMsg(demoTime)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)' }}>
                <span className="text-[7px] font-mono tracking-wider uppercase" style={{ 
                  color: isCrisisPhase ? crisisColor : greenColor 
                }}>
                  {getStatusLabel(demoTime)}
                </span>
                <button
                  onClick={onStop}
                  className="px-3 py-1 text-[8px] font-mono font-bold tracking-[0.15em] uppercase rounded-md cursor-pointer select-none transition-all hover:brightness-125"
                  style={{ background: 'rgba(255,59,92,0.12)', color: crisisColor, border: '1px solid rgba(255,59,92,0.25)' }}
                >
                  ■ STOP REC
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guided Scenario Success Popup */}
      <AnimatePresence>
        {demoActive && demoTime >= 50 && demoTime < 60 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none"
          >
            <div 
              className="p-8 rounded-xl border border-emerald-500/40 glass-panel shadow-2xl flex flex-col items-center gap-3"
              style={{
                background: 'rgba(8, 20, 16, 0.9)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 40px rgba(0, 229, 153, 0.15)'
              }}
            >
              <motion.div 
                className="w-12 h-12 rounded-full border-2 border-emerald-400 flex items-center justify-center mb-1"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h2 className="text-xl font-bold tracking-[0.25em] font-mono text-emerald-400 uppercase">
                ALL SYSTEMS NOMINAL
              </h2>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest text-center max-w-xs leading-relaxed">
                Biometric homeostasis restored. Auto-override offline. Flight deck control returned to manual.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
