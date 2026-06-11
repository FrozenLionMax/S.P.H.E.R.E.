'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetry } from '@/lib/useTelemetry';
import { useRouter } from 'next/navigation';

// Constants & Helpers
import { C, TRACK_CONFIGS, PROFILE_METRICS, PROFILE_HARDWARE, TrackKey } from '@/lib/constants';
import { fmt, nowTime, classify, pct } from '@/lib/helpers';

// Extracted UI Atoms & Cockpit Widgets
import GlassPanel from '@/components/ui/GlassPanel';
import Btn from '@/components/ui/Btn';
import { SectionLabel } from '@/components/ui/SectionLabel';
import LandingBackground from '@/components/LandingBackground';
import ECG from '@/components/ECG';
import MetricCard from '@/components/MetricCard';
import VitalsChart from '@/components/VitalsChart';
import { LogEntry } from '@/components/TypewriterLog';
import TrackVisualizer, { Gyroscope, HBar } from '@/components/TrackVisualizer';
import OnboardingScreen from '@/components/OnboardingScreen';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import TelemetryConsole from '@/components/TelemetryConsole';
import { useTelemetryStore } from '@/lib/useTelemetryStore';

function getOrganForMetricKey(key: string): 'none' | 'heart' | 'lungs' | 'brain' {
  if (['heartRate', 'bpm', 'pwtt'].includes(key)) return 'heart';
  if (['spO2', 'transthoracicImpedance', 'pCO2', 'suitPressure'].includes(key)) return 'lungs';
  if (['perclos', 'fatigueIndex', 'tremorAmplitude', 'tremorFreq', 'alertness', 'cognitiveLatency'].includes(key)) return 'brain';
  return 'none';
}

export default function Page() {
  const router = useRouter();
  const {
    samples,
    isCrisis,
    connected,
    isPaused,
    togglePause,
    triggerCrisisMode,
    resolveCrisisMode,
    setTrack,
    executeSubsystem
  } = useTelemetry();

  const crisis = isCrisis;

  const [activeTrackKey, setActiveTrackKey] = useState<TrackKey>('PILOT');
  const [mounted, setMounted] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  // Zustand state triggers for 3D Hologram interaction
  const selectedOrgan = useTelemetryStore((s) => s.selectedOrgan);
  const setSelectedOrgan = useTelemetryStore((s) => s.setSelectedOrgan);
  const updateTelemetryFrame = useTelemetryStore((s) => s.updateTelemetryFrame);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && window.location.search.includes('onboarded=true')) {
      setIsOnboarded(true);
    }
  }, []);

  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioCtx, setAudioCtx] = useState<any>(null);
  const [volume, setVolume] = useState(0.5);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [pulseAudio, setPulseAudio] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [demoTime, setDemoTime] = useState(0);
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAudioPulse = useCallback(() => {
    setPulseAudio(true);
    const t = setTimeout(() => setPulseAudio(false), 100);
    return () => clearTimeout(t);
  }, []);

  const trackConf = TRACK_CONFIGS[activeTrackKey];

  const playSuccessChime = useCallback((ctx = audioCtx) => {
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.08 * volume, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
      gainNode.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc1.connect(gainNode);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.25);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(830.61, ctx.currentTime + 0.05);
      osc2.connect(gainNode);
      osc2.start(ctx.currentTime + 0.05);
      osc2.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn("Failed to play success chime:", e);
    }
  }, [audioCtx, volume]);

  const handleToggleAudio = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!audioEnabled) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return;
        
        const ctx = audioCtx || new AudioCtxClass();
        setAudioCtx(ctx);
        setAudioEnabled(true);
        playSuccessChime(ctx);
      } else {
        setAudioEnabled(false);
      }
    } catch (e) {
      console.warn("Failed to initialize AudioContext:", e);
    }
  }, [audioEnabled, audioCtx, playSuccessChime]);

  const [localLogs, setLocalLogs] = useState<LogEntry[]>([
    { id: 0, time: nowTime(), level: 'SYS', msg: 'Kernel v4.2.1 initialized.' },
  ]);

  const [clock, setClock] = useState(nowTime());
  const prevCrisis = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setClock(nowTime()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!audioEnabled || !audioCtx) return;
    const resumeAudio = () => {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    };
    window.addEventListener('click', resumeAudio);
    return () => window.removeEventListener('click', resumeAudio);
  }, [audioEnabled, audioCtx]);

  // Sync local track state if server streams a different track (external switch)
  useEffect(() => {
    if (samples.length > 0) {
      const serverTrack = samples[samples.length - 1].activeTrack;
      if (serverTrack && serverTrack !== activeTrackKey && serverTrack in TRACK_CONFIGS) {
        setActiveTrackKey(serverTrack as keyof typeof TRACK_CONFIGS);
      }
    }
  }, [samples, activeTrackKey]);

  // Track change handler
  const handleTrackChange = useCallback((key: TrackKey) => {
    setActiveTrackKey(key);
    setTrack(key);
    setLocalLogs([{ id: Date.now(), time: nowTime(), level: 'SYS', msg: `[TRACK] Switched to ${TRACK_CONFIGS[key].title}` }]);
    TRACK_CONFIGS[key].terminalLogs.forEach((msg, i) => {
      setTimeout(() => {
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + i, time: nowTime(), level: 'INFO', msg }]);
      }, i * 300);
    });
  }, [setTrack]);

  const stopDemo = useCallback(() => {
    setDemoActive(false);
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
    setLocalLogs(p => [...p.slice(-50), { id: Date.now(), time: nowTime(), level: 'SYS', msg: '[DEMO] Scenario script terminated.' }]);
  }, []);

  const startDemo = useCallback(() => {
    if (demoActive) {
      stopDemo();
      return;
    }
    
    // Reset states
    setDemoActive(true);
    setDemoTime(0);
    setTrack('PILOT');
    setActiveTrackKey('PILOT');
    resolveCrisisMode();
    
    // Enable audio context on click if audio is enabled
    if (audioEnabled && typeof window !== 'undefined') {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const ctx = audioCtx || new AudioCtxClass();
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
          setAudioCtx(ctx);
        }
      } catch (e) {
        console.warn("Failed to initialize audio on demo start:", e);
      }
    }

    setLocalLogs([{ id: Date.now(), time: nowTime(), level: 'SYS', msg: '--- STARTING S.P.H.E.R.E. SCENARIO DEMO (60s) ---' }]);
    
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
    }
    
    let time = 0;
    demoIntervalRef.current = setInterval(() => {
      time += 1;
      setDemoTime(time);
      
      if (time === 1) {
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 1, time: nowTime(), level: 'INFO', msg: '[DEMO] 0-10s: Nominal baseline established on track PILOT. All systems nominal.' }]);
      } else if (time === 10) {
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 10, time: nowTime(), level: 'WARN', msg: '[DEMO] 10-20s: Subtle anomaly drift detected. Rolling Z-Score alarms active.' }]);
      } else if (time === 20) {
        triggerCrisisMode();
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 20, time: nowTime(), level: 'ALERT', msg: '[DEMO] 20-30s: Emergency override thresholds breached. Alarm audio active.' }]);
      } else if (time === 30) {
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 30, time: nowTime(), level: 'ALERT', msg: '[DEMO] 30-40s: Autopilot auto-override active. Executing emergency descent.' }]);
      } else if (time === 40) {
        resolveCrisisMode();
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 40, time: nowTime(), level: 'OK', msg: '[DEMO] 40-50s: Override successful. Gradual recovery active, vitals normalizing.' }]);
      } else if (time === 50) {
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 50, time: nowTime(), level: 'OK', msg: '[DEMO] 50-60s: All systems nominal. Biometric safety margins restored.' }]);
        if (audioEnabled) {
          playSuccessChime();
        }
      } else if (time >= 60) {
        setDemoActive(false);
        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 60, time: nowTime(), level: 'SYS', msg: '--- S.P.H.E.R.E. SCENARIO DEMO COMPLETED ---' }]);
      }
    }, 1000);
  }, [demoActive, audioEnabled, audioCtx, resolveCrisisMode, triggerCrisisMode, setTrack, stopDemo, playSuccessChime]);

  // Clean up demo interval on unmount
  useEffect(() => {
    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
      }
    };
  }, []);

  const handleCaptureScreenshot = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      setLocalLogs(p => [...p.slice(-50), { id: Date.now(), time: nowTime(), level: 'SYS', msg: '[SCREENSHOT] Capturing dashboard layout...' }]);
      
      const html2canvas = (await import('html2canvas-pro')).default;
      const element = document.querySelector('.crt-container') || document.body;
      
      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: '#080c10',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        onclone: (clonedDoc) => {
          const rootElement = clonedDoc.querySelector('.crt-container') || clonedDoc.body;
          rootElement.classList.remove('crt-container', 'crt-flicker');
          
          const scrollables = clonedDoc.querySelectorAll('*');
          scrollables.forEach((el: any) => {
            if (el.style) {
              el.style.scrollbarWidth = 'none';
              el.style.msOverflowStyle = 'none';
            }
          });
          
          const panels = clonedDoc.querySelectorAll('.glass-panel');
          panels.forEach((panel: any) => {
            panel.style.background = 'rgba(17, 24, 32, 0.9)';
            panel.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            panel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.6)';
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const filename = `SPHERE_${activeTrackKey}_${year}-${month}-${day}_${hours}-${minutes}.png`;
      
      const link = document.createElement('a');
      link.href = imgData;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 1, time: nowTime(), level: 'OK', msg: `[SCREENSHOT] Downloaded: ${filename}` }]);
      
      if (audioEnabled) {
        playSuccessChime();
      }
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
      setLocalLogs(p => [...p.slice(-50), { id: Date.now(), time: nowTime(), level: 'ALERT', msg: '[SCREENSHOT] Capture failed.' }]);
    }
  }, [activeTrackKey, audioEnabled, playSuccessChime]);

  // Keyboard shortcuts event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === '1') {
        handleTrackChange('ASTRONAUT');
      } else if (key === '2') {
        handleTrackChange('PILOT');
      } else if (key === '3') {
        handleTrackChange('SURGEON');
      } else if (key === '4') {
        handleTrackChange('TRAIN_PILOT');
      } else if (key === '5') {
        handleTrackChange('TRUCKER');
      } else if (key === 'c') {
        triggerCrisisMode();
      } else if (key === 'r') {
        resolveCrisisMode();
      } else if (key === 'a') {
        handleToggleAudio();
      } else if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePause();
      } else if (e.key === '?' || e.key === '/') {
        if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
          setShowShortcuts((prev) => !prev);
        }
      } else if (e.key === 'Escape') {
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTrackChange, triggerCrisisMode, resolveCrisisMode, handleToggleAudio, togglePause]);

  useEffect(() => {
    if (crisis && !prevCrisis.current) {
      setLocalLogs(p => [...p.slice(-50), { id: Date.now(), time: nowTime(), level: 'ALERT', msg: trackConf.overrideMsg }]);
      
      const crisisSequences = {
        TRAIN_PILOT: [
          "[PERCLOS] Micro-sleep state detected.",
          "[BRAKES] Stage 1 pneumatic clamp engaged.",
          "[OVERRIDE] Manual controls bypassed."
        ],
        PILOT: [
          "[HYPOXIA] SpO2 below 83% threshold.",
          "[AUTO-GCAS] Control stick locked.",
          "[CLIMB] Wings-level pull-up initiated."
        ],
        ASTRONAUT: [
          "[SCRUBBER] pCO2 spike detected.",
          "[O2] Auxiliary valve fired.",
          "[THRUSTER] Return-to-airlock trajectory calculated."
        ],
        SURGEON: [
          "[TREMOR] 8Hz FFT amplitude critical.",
          "[STABILIZER] Micro-filter engaged.",
          "[HOLD] Digital scalpel locked in 3D space."
        ],
        TRUCKER: [
          "[HRV] Parasympathetic override detected.",
          "[V2V] Platoon gap expansion broadcast.",
          "[NAV] Shoulder pull-over sequence initiated."
        ]
      };

      const sequence = crisisSequences[activeTrackKey] || [];
      sequence.forEach((msg, i) => {
        setTimeout(() => {
          setLocalLogs(p => [...p.slice(-50), { id: Date.now() + i + 1, time: nowTime(), level: 'ALERT', msg }]);
        }, (i + 1) * 500);
      });
    }
    prevCrisis.current = crisis;
  }, [crisis, trackConf, activeTrackKey]);

  useEffect(() => {
    if (samples.length > 0 && samples.length % 10 === 0 && !crisis) {
      setLocalLogs(p => [...p.slice(-50), { id: Date.now(), time: nowTime(), level: 'SYS', msg: `[SYNC] Telemetry packet ${Math.floor(Math.random()*9000+1000)} logged.` }]);
    }
  }, [samples.length, crisis]);

  const last = samples[samples.length - 1] || {
    spO2: 98, heartRate: 75, environmentMetric: trackConf.baseEnvVal, cognitiveLatency: 210,
    activeTrack: activeTrackKey,
    perclos: 3.5, microCorrections: 45, fatigueIndex: 4.8,
    gForce: 1.0, pwtt: 220, spO2Desat: 0.1,
    transthoracicImpedance: 98.0, pCO2: 2.5, suitPressure: 4.3, scrubberFlow: 6.0,
    tremorAmplitude: 0.02, eda: 1.8, gripForce: 12.0, tremorFreq: 2.1,
    hrvRatio: 3.2, gripAsymmetry: 2.0, v2vLink: -62, alertness: 96.0
  };

  const spo2 = last.spO2;
  const hr = last.heartRate;
  const envMetric = last.environmentMetric;
  const lat = last.cognitiveLatency;
  
  // Dynamic physical simulation for demo fidelity
  const temp = crisis 
    ? 98.6 + (hr - 75) * 0.04 
    : 98.6 + (Math.sin(samples.length * 0.2) * 0.15);
  
  const pressure = activeTrackKey === 'ASTRONAUT'
    ? (last.suitPressure ?? 4.3)
    : activeTrackKey === 'PILOT'
      ? (() => {
          const altitude = last.environmentMetric ?? 8000;
          return 14.696 * Math.pow(1 - 0.00000687558 * altitude, 5.25588);
        })()
      : (14.7 + (Math.sin(samples.length * 0.1) * 0.05) + (crisis ? -0.15 * Math.min(10, samples.length) : 0));

  const spo2St = classify(spo2, 95, 93, 'lo');
  const hrSt = classify(hr, 110, 120, 'hi');
  const envSt = classify(envMetric, trackConf.baseEnvVal * 1.5, trackConf.baseEnvVal * 2, 'hi');
  const latSt = classify(lat, 380, 430, 'hi');
  const tempSt = classify(temp, 99.5, 101.0, 'hi');
  const pressureSt = activeTrackKey === 'ASTRONAUT'
    ? classify(pressure, 4.0, 3.8, 'lo')
    : activeTrackKey === 'PILOT'
      ? classify(pressure, 10.1, 8.6, 'lo')
      : classify(pressure, 12.0, 11.0, 'lo');

  const healthScore = Math.round(
    (pct(spo2, 88, 100) * 0.35) +
    (100 - pct(hr, 52, 140)) * 0.3 +
    (100 - pct(envMetric, 0, trackConf.baseEnvVal * 2)) * 0.2 +
    (100 - pct(lat, 0, 620)) * 0.15
  );

  const events = [{ time: clock, label: trackConf.title, color: trackConf.themeColor }];

  // Sync live telemetry variables to the 3D hologram's global Zustand store
  useEffect(() => {
    if (last) {
      updateTelemetryFrame({
        bpm: hr || 72,
        oxygenSaturation: spo2 || 98,
        brainwaveFrequency: activeTrackKey === 'SURGEON'
          ? (last.tremorFreq || 2.1) * 3.5
          : activeTrackKey === 'TRAIN_PILOT'
            ? (100 - (last.perclos || 0)) / 6
            : activeTrackKey === 'TRUCKER'
              ? (last.alertness ?? 96) / 8
              : 12.5 + (Math.sin(samples.length * 0.1) * 2),
        glucose: activeTrackKey === 'TRUCKER'
          ? (last.alertness ?? 96) * 1.25
          : activeTrackKey === 'ASTRONAUT'
            ? (last.pCO2 ?? 2.5) * 35
            : 90 + (Math.sin(samples.length * 0.05) * 15)
      });
    }
  }, [last, hr, spo2, activeTrackKey, updateTelemetryFrame, samples.length]);

  if (!mounted) return null;

  if (!isOnboarded) {
    return (
      <OnboardingScreen
        activeTrackKey={activeTrackKey}
        handleTrackChange={handleTrackChange}
        trackConf={trackConf}
        setIsOnboarded={setIsOnboarded}
        router={router}
      />
    );
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden relative ${crtEnabled ? 'crt-container crt-flicker' : ''}`} style={{ backgroundColor: '#000000' }}>
      <LandingBackground themeColor={trackConf.themeColor} />
      <Gyroscope isAstronaut={activeTrackKey === "ASTRONAUT"} />
      
      {/* Crisis Warning Vignette overlay */}
      <AnimatePresence>
        {crisis && (
          <motion.div
            key="vig"
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,59,92,0.09) 0%, transparent 65%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.5] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, repeat: Infinity, repeatType: 'mirror' }}
          />
        )}
      </AnimatePresence>

      {/* Top Crisis Banner */}
      <AnimatePresence>
        {crisis && (
          <motion.div
            key="crisis-banner"
            initial={{ y: -20, opacity: 0 }}
            animate={{ 
              y: 0, 
              opacity: 1,
              backgroundColor: ['rgba(255,59,92,0.12)', 'rgba(255,59,92,0.24)', 'rgba(255,59,92,0.12)']
            }}
            exit={{ y: -20, opacity: 0 }}
            transition={{
              y: { type: 'spring', stiffness: 260, damping: 26 },
              opacity: { duration: 0.2 },
              backgroundColor: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
            }}
            className="fixed left-0 right-0 z-50 flex items-center justify-center py-2 px-6 border-b border-red-500/30 text-center font-mono"
            style={{
              top: 54,
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 15px rgba(255, 59, 92, 0.08)'
            }}
          >
            <div className="flex items-center gap-2">
              <motion.span 
                className="w-1.5 h-1.5 rounded-full bg-[#ff3b5c]"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span className="text-[10px] md:text-[11px] font-bold tracking-[0.12em] uppercase text-red-400">
                {trackConf.overrideMsg}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DashboardHeader
        activeTrackKey={activeTrackKey}
        trackConf={trackConf}
        crisis={crisis}
        hr={hr}
        audioEnabled={audioEnabled}
        setAudioEnabled={setAudioEnabled}
        volume={volume}
        setVolume={setVolume}
        connected={connected}
        healthScore={healthScore}
        isPaused={isPaused}
        setShowShortcuts={setShowShortcuts}
        clock={clock}
        setIsOnboarded={setIsOnboarded}
        audioCtx={audioCtx}
        temp={temp}
        tempSt={tempSt}
        pressure={pressure}
        pressureSt={pressureSt}
      />

      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative z-20">
        <motion.main
          className="flex flex-col w-full lg:w-[68%] shrink-0 lg:overflow-y-auto"
          style={{ borderRight: '1px solid var(--border)' }}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 0, 0, 1] }}
        >
          <div className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono font-semibold tracking-[0.22em] uppercase" style={{ color: C.muted }}>
                Biometric Telemetry
              </span>
              <div
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm tabular-nums"
                style={{ background: 'rgba(0,212,255,0.07)', color: C.cyan, border: '1px solid rgba(0,212,255,0.16)' }}
              >
                {samples.length}/30 samples
              </div>
              <div
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm"
                style={{ background: 'rgba(255,255,255,0.03)', color: C.subtle, border: '1px solid var(--border)' }}
              >
                1 Hz
              </div>
            </div>
          </div>

          <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">
            {/* Top row metrics cards grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {PROFILE_METRICS[activeTrackKey].map((m) => {
                const val = (last as any)[m.key] !== undefined ? (last as any)[m.key] : 0;
                const statusVal = classify(val, parseFloat(m.warnAt), parseFloat(m.critAt), m.key === 'spO2' || m.key === 'suitPressure' || m.key === 'alertness' || m.key === 'v2vLink' || m.key === 'gripForce' ? 'lo' : 'hi');
                const cardOrgan = getOrganForMetricKey(m.key);
                return (
                  <MetricCard
                    key={m.label}
                    label={m.label}
                    sublabel={m.sublabel}
                    value={val}
                    unit={m.unit}
                    history={samples.map((s: any) => s[m.key] as number)}
                    status={statusVal}
                    precision={m.precision}
                    min={m.min}
                    max={m.max}
                    warnAt={m.warnAt}
                    critAt={m.critAt}
                    crisis={crisis}
                    highlighted={cardOrgan !== 'none' && selectedOrgan === cardOrgan}
                    onClick={cardOrgan !== 'none' ? () => {
                      setSelectedOrgan(selectedOrgan === cardOrgan ? 'none' : cardOrgan);
                    } : undefined}
                  />
                );
              })}
            </div>

            {/* Reorganized Dashboard Grid: Left tall column for Autonomous Telemetry Console, right column for stacked widgets */}
            <div className="grid gap-3 grid-cols-1 lg:grid-cols-[380px_1fr]">
              {/* Left Column: Autonomous Console (SPO2, HR, ENV, LAT + Logs) */}
              <GlassPanel className="rounded-xl overflow-hidden relative flex flex-col h-[460px] min-h-[460px] max-h-[460px]" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                <div className="flex items-center justify-between px-4 py-3 shrink-0 relative z-10" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: C.muted }}>Autonomous Console</span>
                  </div>
                  <div className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(0,229,153,0.07)', color: C.green, border: '1px solid rgba(0,229,153,0.15)' }}>LIVE</div>
                </div>
                
                <div className="flex-1 w-full relative z-0 overflow-hidden">
                  <TelemetryConsole
                    activeTrackKey={activeTrackKey}
                    trackConf={trackConf}
                    crisis={crisis}
                    spo2St={spo2St}
                    hrSt={hrSt}
                    envSt={envSt}
                    latSt={latSt}
                    tempSt={tempSt}
                    pressureSt={pressureSt}
                    spo2={spo2}
                    hr={hr}
                    envMetric={envMetric}
                    lat={lat}
                    temp={temp}
                    pressure={pressure}
                    healthScore={healthScore}
                    localLogs={localLogs}
                  />
                </div>
              </GlassPanel>

              {/* Right Column: Other Widgets stacked in smaller spaces */}
              <div className="flex flex-col gap-2.5">
                {/* Vitals Trend and Cardiac Waveform */}
                <div className="grid gap-2.5 grid-cols-1 xl:grid-cols-[1fr_420px]">
                  <GlassPanel className="rounded-xl overflow-hidden" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                    <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: C.muted }}>Vitals Trend</span>
                      </div>
                    </div>
                    <div style={{ height: 100, padding: '4px 0 0', position: 'relative', width: '100%', minWidth: 0 }}>
                      <VitalsChart samples={samples} />
                    </div>
                  </GlassPanel>

                  <GlassPanel className="rounded-xl overflow-hidden flex flex-col" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                    <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: C.muted }}>Cardiac Waveform (ECG)</span>
                      <span className="text-[8px] font-mono font-bold tracking-wider" style={{ color: crisis ? C.red : C.green }}>LIVE SCANNER</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-2 bg-black">
                      <ECG
                        crisis={crisis}
                        hr={hr}
                        width={396}
                        height={76}
                        glow={true}
                        audioEnabled={audioEnabled}
                        sound={true}
                        audioCtx={audioCtx}
                        volume={volume}
                        onBeat={triggerAudioPulse}
                      />
                    </div>
                  </GlassPanel>
                </div>

                {/* Sensor Hardware and Subsystems */}
                <div className="grid gap-2.5 grid-cols-1 xl:grid-cols-2">
                  <GlassPanel className="rounded-xl p-3.5 flex flex-col gap-2.5" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                    <SectionLabel>Sensor Hardware</SectionLabel>
                    <TrackVisualizer trackKey={activeTrackKey} crisis={crisis} lastSample={last} />
                    {PROFILE_HARDWARE[activeTrackKey].map((h, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: C.muted }}>
                            {h.label}
                          </span>
                          <span className="text-[10px] font-mono font-semibold" style={{ color: crisis ? C.amber : C.green }}>
                            {crisis && i === 1 ? 'INTERVENING' : h.value}
                          </span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: crisis ? C.amber : C.green }}
                            animate={{ width: crisis ? '100%' : '85%' }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </div>
                    ))}
                  </GlassPanel>

                  <GlassPanel className="rounded-xl overflow-hidden flex flex-col justify-between" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                    <div className="px-4 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: C.muted }}>Subsystems</span>
                    </div>
                    <div className="flex flex-col justify-center gap-2 p-3.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: C.fg }}>Neural Interface</span>
                        <span className="text-[9px] font-mono font-semibold" style={{ color: crisis ? C.amber : C.green }}>{crisis ? 'DEGRADED' : 'ONLINE'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: C.fg }}>Biometric Sensors</span>
                        <span className="text-[9px] font-mono font-semibold" style={{ color: crisis ? C.amber : C.green }}>{crisis ? 'DEGRADED' : 'ONLINE'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: C.fg }}>Telemetry Relay</span>
                        <span className="text-[9px] font-mono font-semibold" style={{ color: !connected ? C.red : crisis ? C.amber : C.green }}>{!connected ? 'OFFLINE' : crisis ? 'LATENT' : 'ONLINE'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: C.fg }}>Cognitive Proc.</span>
                        <span className="text-[9px] font-mono font-semibold" style={{ color: crisis ? C.red : C.green }}>{crisis ? 'CRITICAL' : 'ONLINE'}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-0.5">
                        <span className="text-[10px]" style={{ color: C.fg }}>Atmos Monitor</span>
                        <span className="text-[9px] font-mono font-semibold" style={{ color: crisis ? C.red : C.green }}>{crisis ? 'CRITICAL' : 'ONLINE'}</span>
                      </div>
                    </div>
                  </GlassPanel>
                </div>
              </div>
            </div>
          </div>
        </motion.main>

        <Sidebar
          activeTrackKey={activeTrackKey}
          trackConf={trackConf}
          crisis={crisis}
          executeSubsystem={executeSubsystem}
          triggerCrisisMode={triggerCrisisMode}
          resolveCrisisMode={resolveCrisisMode}
          demoActive={demoActive}
          startDemo={startDemo}
          handleCaptureScreenshot={handleCaptureScreenshot}
          connected={connected}
          onClearLogs={() => setLocalLogs([])}
          last={last}
          temp={temp}
          pressure={pressure}
          tempSt={tempSt}
          pressureSt={pressureSt}
        />
      </div>

      {/* Keyboard Shortcuts Dialog Overlay */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={() => setShowShortcuts(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-full max-w-md p-6 rounded-xl border border-white/10 glass-panel shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                onClick={() => setShowShortcuts(false)}
                aria-label="Dismiss help dialog"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h3 className="text-sm font-semibold tracking-wider font-mono text-white uppercase">
                  S.P.H.E.R.E. Keybindings
                </h3>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-300">Switch Profiles</span>
                  <div className="flex gap-1">
                    {['1', '2', '3', '4', '5'].map((k) => (
                      <kbd key={k} className="px-1.5 py-0.5 rounded border border-white/15 bg-white/5 text-[9px] font-mono font-bold text-white shadow-sm">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 -mt-2 leading-relaxed font-mono">
                  (1: Astronaut | 2: Pilot | 3: Surgeon | 4: Train Pilot | 5: Trucker)
                </p>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-[11px] font-mono text-slate-300">Trigger Crisis</span>
                  <kbd className="px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-[9px] font-mono font-bold text-red-400 uppercase shadow-sm">
                    C
                  </kbd>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-300">Resolve Crisis</span>
                  <kbd className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-[9px] font-mono font-bold text-emerald-400 uppercase shadow-sm">
                    R
                  </kbd>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-[11px] font-mono text-slate-300">Toggle System Audio</span>
                  <kbd className="px-2 py-0.5 rounded border border-white/15 bg-white/5 text-[9px] font-mono font-bold text-white uppercase shadow-sm">
                    A
                  </kbd>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-300">Pause / Resume Telemetry</span>
                  <kbd className="px-3 py-0.5 rounded border border-white/15 bg-white/5 text-[9px] font-mono font-bold text-white uppercase shadow-sm">
                    Space
                  </kbd>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-[11px] font-mono text-slate-300">Toggle Help Overlay</span>
                  <kbd className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-[9px] font-mono font-bold text-amber-400 uppercase shadow-sm">
                    ?
                  </kbd>
                </div>
              </div>

              <div className="mt-5 text-center">
                <span className="text-[9px] text-slate-500 font-mono tracking-wider">
                  Press <kbd className="px-1 py-0.2 rounded border border-white/10 bg-white/5 font-bold">ESC</kbd> or click outside to dismiss
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guided Scenario Demo Bottom Banner */}
      <AnimatePresence>
        {demoActive && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed bottom-4 left-4 right-4 z-[9999] p-3 rounded-lg border border-cyan-500/30 glass-panel shadow-2xl flex items-center justify-between"
            style={{
              background: 'rgba(8, 12, 16, 0.85)',
              backdropFilter: 'blur(16px) saturate(1.2)'
            }}
          >
            <div className="flex items-center gap-3 font-mono">
              <motion.div 
                className="w-2 h-2 rounded-full bg-cyan-400"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.0, repeat: Infinity }}
              />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  S.P.H.E.R.E. DEMO RUNNING
                </span>
                <span className="text-[8px] text-slate-400 mt-0.5">
                  {demoTime < 10 && '0-10s: Nominal Baseline (PILOT)'}
                  {demoTime >= 10 && demoTime < 20 && '10-20s: Subtle Anomaly Drift (Z-Score Active)'}
                  {demoTime >= 20 && demoTime < 30 && '20-30s: Crisis Override (Alarm Audio & Vignette)'}
                  {demoTime >= 30 && demoTime < 40 && '30-40s: Emergency Descent Auto-Override'}
                  {demoTime >= 40 && demoTime < 50 && '40-50s: Gradual Recovery & Normalization'}
                  {demoTime >= 50 && '50-60s: Resolution (All Systems Nominal Banner)'}
                </span>
              </div>
            </div>

            <div className="flex-1 max-w-md mx-6 hidden md:block">
              <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-500 mb-1">
                <span>PROGRESS</span>
                <span className="tabular-nums">{demoTime}s / 60s</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden bg-slate-800 relative">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ 
                    width: `${(demoTime / 60) * 100}%`,
                    background: demoTime >= 20 && demoTime < 40 ? C.red : C.cyan
                  }}
                />
              </div>
            </div>

            <button
              onClick={stopDemo}
              className="px-3 py-1 text-[9px] font-mono font-bold tracking-widest uppercase border border-red-500/40 hover:bg-red-500/10 text-red-400 rounded-sm cursor-pointer select-none"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guided Scenario Nominal Success Popup Overlay */}
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
    </div>
  );
}
