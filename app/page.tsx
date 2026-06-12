'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetry } from '@/lib/useTelemetry';
import { useRouter } from 'next/navigation';

// Constants & Helpers
import { C, TRACK_CONFIGS, PROFILE_METRICS, PROFILE_HARDWARE, TrackKey, HEALTH_SCORE_WEIGHTS, HEALTH_INDEX_BOUNDS } from '@/lib/constants';
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
import OperatorMap from '@/components/OperatorMap';

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
    executeSubsystem,
    clearLogs,
    startDemo: triggerStartDemo,
    stopDemo: triggerStopDemo
  } = useTelemetry();

  const crisis = isCrisis;

  const [activeTrackKey, setActiveTrackKey] = useState<TrackKey>('PILOT');
  const [mounted, setMounted] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  // Zustand state triggers for 3D Hologram interaction
  const selectedOrgan = useTelemetryStore((s) => s.selectedOrgan);
  const setSelectedOrgan = useTelemetryStore((s) => s.setSelectedOrgan);
  const updateTelemetryFrame = useTelemetryStore((s) => s.updateTelemetryFrame);
  const storeActiveProfile = useTelemetryStore((s) => s.activeUserProfile);

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

  const handleToggleAudio = useCallback((overrideVal?: boolean) => {
    if (typeof window === 'undefined') return;
    try {
      const targetState = typeof overrideVal === 'boolean' ? overrideVal : !audioEnabled;
      if (targetState) {
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
        useTelemetryStore.getState().setActiveUserProfile(serverTrack);
      }
    }
  }, [samples, activeTrackKey]);

  // Sync initial track to store on mount
  useEffect(() => {
    useTelemetryStore.getState().setActiveUserProfile(activeTrackKey);
  }, [activeTrackKey]);

  // Sync store activeUserProfile changes back to local activeTrackKey (e.g. from 2D organ click)
  useEffect(() => {
    if (storeActiveProfile && storeActiveProfile !== activeTrackKey && storeActiveProfile in TRACK_CONFIGS) {
      setActiveTrackKey(storeActiveProfile as TrackKey);
      setTrack(storeActiveProfile as TrackKey);
    }
  }, [storeActiveProfile, activeTrackKey, setTrack]);

  // Track change handler
  const handleTrackChange = useCallback((key: TrackKey) => {
    setActiveTrackKey(key);
    setTrack(key);
    useTelemetryStore.getState().setActiveUserProfile(key);
  }, [setTrack]);

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

  const last = samples[samples.length - 1] || {
    spO2: 98, heartRate: 75, environmentMetric: trackConf.baseEnvVal, cognitiveLatency: 210,
    activeTrack: activeTrackKey,
    perclos: 3.5, microCorrections: 45, fatigueIndex: 4.8,
    gForce: 1.0, pwtt: 220, spO2Desat: 0.1,
    transthoracicImpedance: 98.0, pCO2: 2.5, suitPressure: 4.3, scrubberFlow: 6.0,
    tremorAmplitude: 0.02, eda: 1.8, gripForce: 12.0, tremorFreq: 2.1,
    hrvRatio: 3.2, gripAsymmetry: 2.0, v2vLink: -62, alertness: 96.0,
    temperature: 98.6, pressure: 14.7,
    isDemoActive: false, demoTime: 0
  };

  // Sync localLogs from server telemetry logs
  useEffect(() => {
    if (last && last.logs) {
      setLocalLogs(last.logs);
    }
  }, [last.logs]);

  // 1. Maintain a circular buffer of up to 300 samples for the Black Box replay and report generator
  const [recordedSamples, setRecordedSamples] = useState<any[]>([]);
  const lastRecordedTimestampRef = useRef<number>(0);

  useEffect(() => {
    if (last && last.timestamp && last.timestamp !== lastRecordedTimestampRef.current) {
      lastRecordedTimestampRef.current = last.timestamp;
      setRecordedSamples((prev) => {
        const next = [...prev, last];
        if (next.length > 300) {
          return next.slice(next.length - 300);
        }
        return next;
      });
    }
  }, [last]);

  // 2. Playback state management
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);

  // Playback timer effect: advances the playback index every 1s when active and playing
  useEffect(() => {
    let timer: any = null;
    if (isPlaybackActive && isPlaybackPlaying) {
      timer = setInterval(() => {
        setPlaybackIndex((prev) => {
          if (prev >= recordedSamples.length - 1) {
            setIsPlaybackPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaybackActive, isPlaybackPlaying, recordedSamples.length]);

  // 3. Incident Report state & handlers
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerateReport = useCallback(() => {
    if (recordedSamples.length === 0) {
      alert('No telemetry data recorded in this session yet.');
      return;
    }

    const hrValues = recordedSamples.map(s => s.heartRate ?? s.bpm ?? 0).filter(v => v > 0);
    const spo2Values = recordedSamples.map(s => s.spO2 ?? s.oxygenSaturation ?? 0).filter(v => v > 0);
    const tempValues = recordedSamples.map(s => s.temperature ?? 0).filter(v => v > 0);
    const latValues = recordedSamples.map(s => s.cognitiveLatency ?? 0).filter(v => v > 0);

    const maxHr = Math.max(...hrValues, 0);
    const minHr = Math.min(...hrValues, 100);
    const maxSpo2 = Math.max(...spo2Values, 0);
    const minSpo2 = Math.min(...spo2Values, 100);
    const maxTemp = Math.max(...tempValues, 0);
    const minTemp = Math.min(...tempValues, 100);
    const maxLat = Math.max(...latValues, 0);
    const minLat = Math.min(...latValues, 100);

    const crisisFrames = recordedSamples.filter(s => s.isCrisisActive);
    const hadCrisis = crisisFrames.length > 0;
    const crisisPercentage = ((crisisFrames.length / recordedSamples.length) * 100).toFixed(1);

    const formatTime = (ts: number) => {
      try {
        return new Date(ts).toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      } catch (err) {
        return new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      }
    };

    const report = `================================================================
          S.P.H.E.R.E. SYSTEM INTELLIGENCE INCIDENT REPORT
================================================================
GENERATED AT : ${formatTime(Date.now())}
TEAM         : Prizzm
MONITORING   : Sentinel Physical Homeostasis & Ecological Recovery Engine

----------------------------------------------------------------
1. MISSION SESSION METADATA
----------------------------------------------------------------
Active Profile : ${activeTrackKey}
Session Start  : ${formatTime(recordedSamples[0].timestamp)}
Session End    : ${formatTime(recordedSamples[recordedSamples.length - 1].timestamp)}
Total Samples  : ${recordedSamples.length} seconds of active telemetry

----------------------------------------------------------------
2. PHYSIOLOGICAL STRESS LOGS
----------------------------------------------------------------
Heart Rate (HR)      : Range: ${minHr.toFixed(1)} - ${maxHr.toFixed(1)} BPM
                       Avg: ${(hrValues.reduce((a,b)=>a+b,0) / hrValues.length).toFixed(1)} BPM
Blood Oxygen (SpO2)  : Range: ${minSpo2.toFixed(1)} - ${maxSpo2.toFixed(1)} %
                       Avg: ${(spo2Values.reduce((a,b)=>a+b,0) / spo2Values.length).toFixed(1)} %
Body Temperature     : Range: ${minTemp.toFixed(1)} - ${maxTemp.toFixed(1)} °F
Cognitive Latency    : Range: ${minLat.toFixed(1)} - ${maxLat.toFixed(1)} ms

----------------------------------------------------------------
3. AUTONOMOUS INTERLOCK PROTOCOLS
----------------------------------------------------------------
Crisis Events Detected : ${hadCrisis ? 'YES' : 'NO'}
Replay Buffer Coverage : ${recordedSamples.length}s
Crisis Mode Active Time: ${crisisFrames.length}s (${crisisPercentage}% of session)
System Failsafe Status : ${crisis ? 'ACTIVE OVERRIDE ENGAGED' : 'ALL VITALS NOMINAL'}
Active Intervention    : ${hadCrisis ? 'Automatic flight path correction / auto-GCAS engaged.' : 'None required.'}

----------------------------------------------------------------
4. SUBSYSTEM INGESTION INTEGRITY
----------------------------------------------------------------
Neural Interface   : ${last.subsystems?.neuralInterface || 'ONLINE'}
Biometric Sensors  : ${last.subsystems?.biometricSensors || 'ONLINE'}
Telemetry Relay    : ${last.subsystems?.telemetryRelay || 'ONLINE'}
Cognitive Processor: ${last.subsystems?.cognitiveProc || 'ONLINE'}
Atmospheric Monitor: ${last.subsystems?.atmosMonitor || 'ONLINE'}

----------------------------------------------------------------
5. DECISION ALGORITHMIC VERDICT
----------------------------------------------------------------
At the end of this monitoring interval, operator homeostatic parameters
were evaluated as: ${minSpo2 < 90 || maxHr > 120 ? 'CRITICAL - AUTOMATED ACTION TAKEN' : 'NOMINAL - MANUAL FLIGHT STATUS'}.
All physical telemetry pipelines verified compile-safe and responsive.
================================================================`;

    setReportText(report);
    setCopied(false);
    setShowReport(true);
  }, [recordedSamples, activeTrackKey, crisis, last]);

  const handleCopyReport = useCallback(() => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [reportText]);

  const handleDownloadReport = useCallback(() => {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SPHERE_INCIDENT_REPORT_${activeTrackKey}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [reportText, activeTrackKey]);

  // Evaluate which sample to show (live vs playback)
  const displaySample = isPlaybackActive && recordedSamples[playbackIndex]
    ? recordedSamples[playbackIndex]
    : last;

  // Demo active and time variables driven by server state
  const demoActive = displaySample.isDemoActive ?? false;
  const demoTime = displaySample.demoTime ?? 0;

  const startDemo = useCallback(() => {
    if (audioEnabled && audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    }
    if (demoActive) {
      triggerStopDemo();
    } else {
      triggerStartDemo();
    }
  }, [demoActive, audioEnabled, audioCtx, triggerStartDemo, triggerStopDemo]);

  const stopDemo = useCallback(() => {
    triggerStopDemo();
  }, [triggerStopDemo]);

  const spo2 = displaySample.spO2;
  const hr = displaySample.heartRate;
  const envMetric = displaySample.environmentMetric;
  const lat = displaySample.cognitiveLatency;
  
  // Dynamic physical values ingested directly from the server's telemetry packet
  const temp = displaySample.temperature ?? 98.6;
  const pressure = displaySample.pressure ?? (activeTrackKey === 'ASTRONAUT' ? 4.3 : 14.7);

  const subStatus = displaySample.subsystems || {
    neuralInterface: 'ONLINE',
    biometricSensors: 'ONLINE',
    telemetryRelay: 'ONLINE',
    cognitiveProc: 'ONLINE',
    atmosMonitor: 'ONLINE'
  };

  const getSubColor = (status: string) => {
    if (status === 'ONLINE') return C.green;
    if (status === 'DEGRADED' || status === 'LATENT') return C.amber;
    if (status === 'CRITICAL' || status === 'OFFLINE') return C.red;
    return C.muted;
  };

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

  const clientHealthScore = Math.round(
    (pct(spo2, HEALTH_INDEX_BOUNDS.RESPIRATORY.min, HEALTH_INDEX_BOUNDS.RESPIRATORY.max) * HEALTH_SCORE_WEIGHTS.RESPIRATORY) +
    (100 - pct(hr, HEALTH_INDEX_BOUNDS.CARDIAC.min, HEALTH_INDEX_BOUNDS.CARDIAC.max)) * HEALTH_SCORE_WEIGHTS.CARDIAC +
    (100 - pct(envMetric, 0, trackConf.baseEnvVal * 2)) * HEALTH_SCORE_WEIGHTS.ENVIRONMENT +
    (100 - pct(lat, HEALTH_INDEX_BOUNDS.COGNITIVE.min, HEALTH_INDEX_BOUNDS.COGNITIVE.max)) * HEALTH_SCORE_WEIGHTS.COGNITIVE
  );

  const healthScore = last && (last as any).healthScore !== undefined ? (last as any).healthScore : clientHealthScore;

  const events = [{ time: clock, label: trackConf.title, color: trackConf.themeColor }];

  // Sync live telemetry variables to the 3D hologram's global Zustand store
  useEffect(() => {
    if (displaySample) {
      const activeTrackData = (displaySample.trackData as any)?.[activeTrackKey] || {};
      updateTelemetryFrame({
        bpm: hr || 72,
        oxygenSaturation: spo2 || 98,
        respiratoryRate: displaySample.respiratoryRate ?? 16,
        glucose: displaySample.glucose ?? 100,
        isCrisisActive: displaySample.isCrisisActive ?? false,
        brainwaveFrequency: activeTrackKey === 'SURGEON'
          ? (activeTrackData.tremorFreq || 2.1) * 3.5
          : activeTrackKey === 'TRAIN_PILOT'
            ? (100 - (activeTrackData.perclos || 0)) / 6
            : activeTrackKey === 'TRUCKER'
              ? (activeTrackData.alertness ?? 96) / 8
              : 12.5 + (Math.sin(samples.length * 0.1) * 2)
      });
    }
  }, [displaySample, hr, spo2, activeTrackKey, updateTelemetryFrame, samples.length]);

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
        setAudioEnabled={handleToggleAudio}
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

      <div 
        className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative z-20 transition-all duration-300"
        style={{ paddingTop: crisis ? 31 : 0 }}
      >
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
                const trackDataAny = last.trackData as any;
                const activeTrackData = trackDataAny?.[activeTrackKey];
                const val = activeTrackData?.[m.key] !== undefined
                  ? activeTrackData[m.key]
                  : (last as any)[m.key] !== undefined
                    ? (last as any)[m.key]
                    : 0;
                const statusVal = classify(val, parseFloat(m.warnAt), parseFloat(m.critAt), m.key === 'spO2' || m.key === 'suitPressure' || m.key === 'alertness' || m.key === 'v2vLink' || m.key === 'gripForce' ? 'lo' : 'hi');
                const cardOrgan = getOrganForMetricKey(m.key);
                return (
                  <MetricCard
                    key={m.label}
                    label={m.label}
                    sublabel={m.sublabel}
                    value={val}
                    unit={m.unit}
                    history={samples.map((s: any) => {
                      const tData = s.trackData?.[activeTrackKey];
                      return (tData?.[m.key] !== undefined ? tData[m.key] : (s[m.key] !== undefined ? s[m.key] : 0)) as number;
                    })}
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
                      <VitalsChart samples={isPlaybackActive ? recordedSamples.slice(0, Math.max(30, playbackIndex + 1)).slice(-30) : samples} />
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

                {/* Sensor Hardware, Subsystems, and Geolocation Map */}
                <div className="grid gap-2.5 grid-cols-1 xl:grid-cols-3">
                  <GlassPanel className="rounded-xl p-3.5 flex flex-col gap-2.5" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                    <SectionLabel>Sensor Hardware</SectionLabel>
                    <TrackVisualizer trackKey={activeTrackKey} crisis={crisis} lastSample={displaySample} />
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
                        <span className="text-[9px] font-mono font-semibold" style={{ color: getSubColor(subStatus.neuralInterface) }}>{subStatus.neuralInterface}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: C.fg }}>Biometric Sensors</span>
                        <span className="text-[9px] font-mono font-semibold" style={{ color: getSubColor(subStatus.biometricSensors) }}>{subStatus.biometricSensors}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: C.fg }}>Telemetry Relay</span>
                        <span className="text-[9px] font-mono font-semibold" style={{ color: !connected ? C.red : getSubColor(subStatus.telemetryRelay) }}>{!connected ? 'OFFLINE' : subStatus.telemetryRelay}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: C.fg }}>Cognitive Proc.</span>
                        <span className="text-[9px] font-mono font-semibold" style={{ color: getSubColor(subStatus.cognitiveProc) }}>{subStatus.cognitiveProc}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-0.5">
                        <span className="text-[10px]" style={{ color: C.fg }}>Atmos Monitor</span>
                        <span className="text-[9px] font-mono font-semibold" style={{ color: getSubColor(subStatus.atmosMonitor) }}>{subStatus.atmosMonitor}</span>
                      </div>
                    </div>
                  </GlassPanel>

                  <OperatorMap activeTrackKey={activeTrackKey} crisis={crisis} />
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
          onClearLogs={clearLogs}
          last={displaySample}
          temp={temp}
          pressure={pressure}
          tempSt={tempSt}
          pressureSt={pressureSt}
          isBlackBoxActive={isPlaybackActive}
          onToggleBlackBox={() => {
            if (!isPlaybackActive) {
              if (recordedSamples.length === 0) {
                alert('No recorded telemetry data available for playback.');
                return;
              }
              setPlaybackIndex(recordedSamples.length - 1);
              setIsPlaybackActive(true);
              setIsPlaybackPlaying(false);
            } else {
              setIsPlaybackActive(false);
              setIsPlaybackPlaying(false);
            }
          }}
          onGenerateReport={handleGenerateReport}
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

      {/* ███ BLACK BOX FLIGHT RECORDER ███ */}
      <AnimatePresence>
        {demoActive && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            className="fixed bottom-4 left-4 right-4 z-[9999] rounded-lg border overflow-hidden"
            style={{
              background: 'rgba(4, 8, 12, 0.92)',
              backdropFilter: 'blur(20px) saturate(1.3)',
              borderColor: demoTime >= 20 && demoTime < 40 ? 'rgba(255,59,92,0.5)' : 'rgba(0,212,255,0.3)',
              boxShadow: demoTime >= 20 && demoTime < 40 
                ? '0 0 30px rgba(255,59,92,0.15), inset 0 1px 0 rgba(255,59,92,0.1)' 
                : '0 0 30px rgba(0,212,255,0.1), inset 0 1px 0 rgba(0,212,255,0.08)'
            }}
          >
            {/* Header strip */}
            <div className="flex items-center justify-between px-4 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
              <div className="flex items-center gap-2">
                <motion.div 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#ff3b5c' }}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                <span className="text-[8px] font-mono font-bold tracking-[0.3em] uppercase" style={{ color: '#ff3b5c' }}>● REC</span>
                <span className="text-[7px] font-mono tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>BLACK BOX RECORDER</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono tabular-nums font-bold" style={{ color: C.cyan }}>
                  T+{String(Math.floor(demoTime / 60)).padStart(2, '0')}:{String(demoTime % 60).padStart(2, '0')}
                </span>
                <span className="text-[7px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded-sm" style={{ 
                  background: demoTime >= 20 && demoTime < 40 ? 'rgba(255,59,92,0.15)' : 'rgba(0,229,153,0.1)',
                  color: demoTime >= 20 && demoTime < 40 ? C.red : C.green,
                  border: `1px solid ${demoTime >= 20 && demoTime < 40 ? 'rgba(255,59,92,0.3)' : 'rgba(0,229,153,0.2)'}`
                }}>
                  {demoTime < 10 && 'NOMINAL'}
                  {demoTime >= 10 && demoTime < 20 && 'DRIFT'}
                  {demoTime >= 20 && demoTime < 40 && 'CRITICAL'}
                  {demoTime >= 40 && demoTime < 50 && 'RECOVERING'}
                  {demoTime >= 50 && 'RESOLVED'}
                </span>
              </div>
            </div>

            {/* Main content */}
            <div className="flex items-stretch gap-0">
              {/* Timeline phases */}
              <div className="flex-1 px-4 py-2.5">
                {/* Phase indicators */}
                <div className="flex items-center gap-0 mb-2">
                  {[
                    { label: 'BASELINE', start: 0, end: 10, color: C.cyan },
                    { label: 'ANOMALY', start: 10, end: 20, color: C.amber },
                    { label: 'CRISIS', start: 20, end: 30, color: C.red },
                    { label: 'OVERRIDE', start: 30, end: 40, color: C.red },
                    { label: 'RECOVERY', start: 40, end: 50, color: C.green },
                    { label: 'NOMINAL', start: 50, end: 60, color: C.green },
                  ].map((phase, i) => {
                    const isActive = demoTime >= phase.start && demoTime < phase.end;
                    const isPast = demoTime >= phase.end;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full h-1.5 rounded-full relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: isPast || isActive ? phase.color : 'transparent' }}
                            animate={{ width: isActive ? `${((demoTime - phase.start) / (phase.end - phase.start)) * 100}%` : isPast ? '100%' : '0%' }}
                            transition={{ duration: 0.3 }}
                          />
                          {isActive && (
                            <motion.div
                              className="absolute top-0 right-0 w-1 h-full rounded-full"
                              style={{ background: phase.color, boxShadow: `0 0 6px ${phase.color}` }}
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                            />
                          )}
                        </div>
                        <span className="text-[6px] font-mono tracking-wider uppercase" style={{ 
                          color: isActive ? phase.color : isPast ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'
                        }}>
                          {phase.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Live event feed */}
                <div className="flex items-center gap-3 mt-1">
                  <motion.div 
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: demoTime >= 20 && demoTime < 40 ? C.red : C.cyan }}
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  <span className="text-[9px] font-mono" style={{ color: demoTime >= 20 && demoTime < 40 ? C.red : 'rgba(255,255,255,0.6)' }}>
                    {demoTime < 10 && '▸ Initializing telemetry baseline... Vitals nominal. Heart rate stable at 75 BPM.'}
                    {demoTime >= 10 && demoTime < 15 && '▸ Z-Score drift detected on SpO₂ channel. σ = 1.4 → Monitoring.'}
                    {demoTime >= 15 && demoTime < 20 && '▸ ⚠ Anomaly predicted: Heart rate trending +12% above rolling mean.'}
                    {demoTime >= 20 && demoTime < 25 && '▸ ⛔ CRISIS TRIGGERED — SpO₂ below 83%. Auto-GCAS engaging.'}
                    {demoTime >= 25 && demoTime < 30 && '▸ ⛔ Control stick LOCKED. Wings-level emergency pull-up initiated.'}
                    {demoTime >= 30 && demoTime < 35 && '▸ ⛔ OVERRIDE ACTIVE — Manual controls bypassed. Cabin pressurization at max.'}
                    {demoTime >= 35 && demoTime < 40 && '▸ ⛔ Emergency descent at 3000 ft/min. Broadcasting MAYDAY on 121.5 MHz.'}
                    {demoTime >= 40 && demoTime < 45 && '▸ Pharmacokinetic recovery protocol engaged. SpO₂ climbing → 91%.'}
                    {demoTime >= 45 && demoTime < 50 && '▸ Heart rate normalizing: 98 → 82 BPM. G-force nominal. Disengaging auto-pilot.'}
                    {demoTime >= 50 && demoTime < 55 && '▸ ✓ All vitals within safe bounds. Override disengaged. Control returned to pilot.'}
                    {demoTime >= 55 && '▸ ✓ HOMEOSTASIS RESTORED — Recording complete. Black box saved.'}
                  </span>
                </div>
              </div>

              {/* Cancel button */}
              <div className="flex items-center px-3" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={stopDemo}
                  className="px-3 py-1.5 text-[8px] font-mono font-bold tracking-[0.2em] uppercase border border-red-500/40 hover:bg-red-500/15 text-red-400 rounded-sm cursor-pointer select-none transition-colors"
                >
                  ■ STOP
                </button>
              </div>
            </div>
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

      {/* Black Box Playback Scrubber Control Bar */}
      <AnimatePresence>
        {isPlaybackActive && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed bottom-4 left-4 right-4 z-[9999] p-3.5 rounded-xl border border-amber-500/30 glass-panel shadow-2xl flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between animate-none"
            style={{
              background: 'rgba(12, 10, 8, 0.9)',
              backdropFilter: 'blur(20px) saturate(1.2)'
            }}
          >
            <div className="flex items-center gap-3 shrink-0 font-mono">
              <motion.div 
                className="w-2.5 h-2.5 rounded-full bg-amber-500"
                animate={{ scale: [1, 1.25, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  BLACK BOX REPLAY
                </span>
                <span className="text-[8px] text-slate-400 mt-0.5">
                  TIME INDEX: {recordedSamples.length - 1 - playbackIndex}s AGO
                </span>
              </div>
            </div>

            <div className="flex-1 px-4 flex items-center gap-3">
              <span className="text-[8.5px] font-mono text-slate-500">START</span>
              <input
                type="range"
                min={0}
                max={Math.max(0, recordedSamples.length - 1)}
                value={playbackIndex}
                onChange={(e) => {
                  setPlaybackIndex(parseInt(e.target.value));
                  setIsPlaybackPlaying(false);
                }}
                className="flex-1 cursor-pointer"
                style={{
                  accentColor: '#f59e0b',
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '2px',
                  outline: 'none',
                  WebkitAppearance: 'none'
                }}
              />
              <span className="text-[8.5px] font-mono text-slate-500">
                {playbackIndex + 1}/{recordedSamples.length} FRAME
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <button
                onClick={() => {
                  setIsPlaybackPlaying(false);
                  setPlaybackIndex((prev) => Math.max(0, prev - 1));
                }}
                className="p-1 px-2.5 text-[8.5px] font-mono border border-white/10 hover:bg-white/5 text-slate-300 rounded cursor-pointer"
                title="Step Backward"
              >
                ◀◀
              </button>

              <button
                onClick={() => setIsPlaybackPlaying((p) => !p)}
                className="p-1 px-3 text-[9px] font-mono font-bold uppercase border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded cursor-pointer"
              >
                {isPlaybackPlaying ? 'PAUSE' : 'PLAY'}
              </button>

              <button
                onClick={() => {
                  setIsPlaybackPlaying(false);
                  setPlaybackIndex((prev) => Math.min(recordedSamples.length - 1, prev + 1));
                }}
                className="p-1 px-2.5 text-[8.5px] font-mono border border-white/10 hover:bg-white/5 text-slate-300 rounded cursor-pointer"
                title="Step Forward"
              >
                ▶▶
              </button>

              <button
                onClick={() => {
                  setIsPlaybackActive(false);
                  setIsPlaybackPlaying(false);
                }}
                className="ml-2 p-1 px-3 text-[9px] font-mono font-bold uppercase border border-red-500/40 hover:bg-red-500/15 text-red-400 rounded cursor-pointer"
              >
                EXIT
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incident Report Modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md"
            onClick={() => setShowReport(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-full max-w-lg p-6 rounded-xl border border-white/10 glass-panel shadow-2xl relative flex flex-col max-h-[85vh] animate-none"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
                onClick={() => setShowReport(false)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5 shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-sm font-semibold tracking-wider font-mono text-white uppercase">
                  S.P.H.E.R.E. INCIDENT REPORT
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 text-left">
                <pre className="p-4 rounded-lg bg-black/60 border border-white/5 text-[10.5px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                  {reportText}
                </pre>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-end gap-3 shrink-0">
                <button
                  onClick={handleCopyReport}
                  className="px-4 py-1.5 text-xs font-mono font-bold tracking-wider uppercase border border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded cursor-pointer"
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
                <button
                  onClick={handleDownloadReport}
                  className="px-4 py-1.5 text-xs font-mono font-bold tracking-wider uppercase border border-slate-700 hover:border-slate-500 text-slate-200 rounded cursor-pointer"
                >
                  Download Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
