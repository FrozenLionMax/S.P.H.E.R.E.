'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetry } from '@/lib/useTelemetry';
import { useRouter } from 'next/navigation';

// Constants & Helpers
import { C, TRACK_CONFIGS, PROFILE_METRICS, PROFILE_SENSORS, SensorDef, TrackKey, HEALTH_SCORE_WEIGHTS, HEALTH_INDEX_BOUNDS } from '@/lib/constants';
import { fmt, nowTime, classify, pct } from '@/lib/helpers';

// Extracted UI Atoms & Cockpit Widgets
import GlassPanel from '@/components/ui/GlassPanel';
import Btn from '@/components/ui/Btn';
import { SectionLabel } from '@/components/ui/SectionLabel';
import LandingBackground from '@/components/LandingBackground';
import ECG from '@/components/ECG';
import MetricCard from '@/components/MetricCard';
import dynamic from 'next/dynamic';
const VitalsChart = dynamic(() => import('@/components/VitalsChart'), { ssr: false, loading: () => <div style={{ height: '100%', width: '100%' }} /> });
import { LogEntry } from '@/components/TypewriterLog';
import TrackVisualizer, { Gyroscope, HBar } from '@/components/TrackVisualizer';
import OnboardingScreen from '@/components/OnboardingScreen';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import TelemetryConsole from '@/components/TelemetryConsole';
import { useTelemetryStore } from '@/lib/useTelemetryStore';
import OperatorMap from '@/components/OperatorMap';
import DemoOverlay from '@/components/DemoOverlay';
import KeyboardShortcutsDialog from '@/components/KeyboardShortcutsDialog';
import BlackBoxPlayback from '@/components/BlackBoxPlayback';
import IncidentReportModal from '@/components/IncidentReportModal';
import LoadingScreen from '@/components/LoadingScreen';
import { useAudioEngine } from '@/lib/useAudioEngine';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';

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
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('sphere-loaded');
    }
    return true;
  });

  // Zustand state triggers for 3D Hologram interaction
  const selectedOrgan = useTelemetryStore((s) => s.selectedOrgan);
  const setSelectedOrgan = useTelemetryStore((s) => s.setSelectedOrgan);
  const updateTelemetryFrame = useTelemetryStore((s) => s.updateTelemetryFrame);
  const storeActiveProfile = useTelemetryStore((s) => s.activeUserProfile);

  // Integrate audio engine (heartbeat + crisis alerts + organ clicks)
  const { isMuted: audioMuted, toggleMute: toggleAudioMute } = useAudioEngine();

  // Integrate keyboard shortcuts (arrow keys, number keys for organs)
  useKeyboardShortcuts();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('onboarded') || params.has('from3d')) {
        setIsOnboarded(true);
      }
      // If returning from 3D twin, skip loading
      if (params.has('from3d') || sessionStorage.getItem('sphere-loaded')) {
        setIsLoading(false);
      }
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

  // ── Intelligent Subsystem Status Engine ──
  // Each subsystem's status is derived from real telemetry signals
  const computeSubStatus = () => {
    const base = displaySample.subsystems

    // Neural Interface — driven by cognitive latency & brainwave stability
    // High latency = degraded neural link, extreme = critical
    const neuralInterface = (() => {
      if (base?.neuralInterface === 'OFFLINE') return 'OFFLINE'
      if (lat > 430) return 'CRITICAL'
      if (lat > 380) return 'DEGRADED'
      if (crisis) return 'DEGRADED'
      return 'ONLINE'
    })()

    // Biometric Sensors — driven by SpO2 + heart rate signal quality
    // If vitals are at extreme ranges, sensors are under stress
    const biometricSensors = (() => {
      if (base?.biometricSensors === 'OFFLINE') return 'OFFLINE'
      if (spo2 < 88 || hr > 150) return 'CRITICAL'
      if (spo2 < 93 || hr > 120 || hr < 50) return 'DEGRADED'
      return 'ONLINE'
    })()

    // Telemetry Relay — driven by connection state + data freshness
    const telemetryRelay = (() => {
      if (!connected) return 'OFFLINE'
      if (base?.telemetryRelay === 'CRITICAL') return 'CRITICAL'
      if (crisis) return 'LATENT'
      return 'ONLINE'
    })()

    // Cognitive Processing — driven by cognitive latency + stress load
    // Simulates the AI analysis pipeline under load
    const cognitiveProc = (() => {
      if (base?.cognitiveProc === 'OFFLINE') return 'OFFLINE'
      if (lat > 400 && crisis) return 'CRITICAL'
      if (lat > 350 || crisis) return 'DEGRADED'
      return 'ONLINE'
    })()

    // Atmospheric Monitor — driven by environmental metric
    // High env readings = atmospheric stress
    const atmosMonitor = (() => {
      if (base?.atmosMonitor === 'OFFLINE') return 'OFFLINE'
      const threshold = trackConf.baseEnvVal
      if (envMetric > threshold * 2) return 'CRITICAL'
      if (envMetric > threshold * 1.5) return 'DEGRADED'
      return 'ONLINE'
    })()

    return { neuralInterface, biometricSensors, telemetryRelay, cognitiveProc, atmosMonitor }
  }

  const subStatus = computeSubStatus()

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
        setIsOnboarded={(v: boolean) => { setIsOnboarded(v); setIsLoading(true); }}
        router={router}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#040806]">
        <LoadingScreen onComplete={() => { sessionStorage.setItem('sphere-loaded', '1'); setIsLoading(false); }} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`flex flex-col h-screen overflow-x-hidden overflow-y-auto lg:overflow-hidden relative ${crtEnabled ? 'crt-container crt-flicker' : ''}`}
      style={{ backgroundColor: '#000000' }}
    >
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
        data-layout="main-grid"
        className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative z-20 transition-all duration-300"
        style={{ paddingTop: crisis ? 31 : 0 }}
      >
        <motion.main
          data-layout="main-content"
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
            <div className="grid gap-3 grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr]">
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
                <div className="grid gap-2.5 grid-cols-1 xl:grid-cols-[1fr_minmax(300px,420px)]">
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
                        width={0}
                        height={76}
                        glow={true}
                        audioEnabled={audioEnabled}
                        sound={true}
                        audioCtx={audioCtx}
                        volume={volume}
                        onBeat={triggerAudioPulse}
                        responsive={true}
                        trackKey={activeTrackKey}
                      />
                    </div>
                  </GlassPanel>
                </div>

                {/* Sensor Hardware, Subsystems, and Geolocation Map */}
                <div className="grid gap-2.5 grid-cols-1 xl:grid-cols-3">
                  <GlassPanel className="rounded-xl p-3.5 flex flex-col gap-2.5" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                    <SectionLabel>Sensor Hardware</SectionLabel>
                    <TrackVisualizer trackKey={activeTrackKey} crisis={crisis} lastSample={displaySample} />
                    {PROFILE_SENSORS[activeTrackKey].map((sensor, i) => {
                      const trackData = displaySample.trackData?.[activeTrackKey] || {}
                      const raw = trackData[sensor.key] ?? (displaySample as any)[sensor.key]
                      // Provide realistic fallbacks for sensors that may not have server data
                      const fallbacks: Record<string, number> = {
                        suitPressure: 4.3, co2Level: 2.8, temperature: 98.6,
                        spO2: 98, gForce: 1.2, cabinAlt: 8000,
                        tremorAmplitude: 0.02, edaLevel: 2.1,
                        perclos: 3.5, gripForce: 22, vibration: 3.2,
                        alertness: 96, meshSignal: -42
                      }
                      const value = raw ?? fallbacks[sensor.key] ?? 0
                      const [min, max] = sensor.nominal
                      const inRange = value >= min && value <= max
                      const warnRange = (max - min) * 0.15
                      const nearEdge = value < min - warnRange || value > max + warnRange
                      const status = crisis && i === 0 ? 'CRITICAL' : nearEdge ? 'CRITICAL' : !inRange ? 'WARNING' : 'NOMINAL'
                      const statusColor = status === 'NOMINAL' ? C.green : status === 'WARNING' ? C.amber : C.red
                      const display = sensor.format ? sensor.format(value) : String(Math.round(value * 100) / 100)
                      // Bar fill: how far through the nominal range (clamped 0-100)
                      const range = max - min || 1
                      const barPct = Math.max(5, Math.min(100, ((value - min) / range) * 100))

                      return (
                        <div key={i} className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: C.muted }}>
                              {sensor.label}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono tabular-nums font-semibold" style={{ color: C.fg }}>
                                {display}
                                <span className="text-[8px] ml-0.5" style={{ color: C.muted }}>{sensor.unit}</span>
                              </span>
                              <span className="text-[7px] font-mono font-bold px-1 py-px rounded" style={{
                                color: statusColor,
                                background: `${statusColor}15`,
                                border: `1px solid ${statusColor}30`
                              }}>
                                {status}
                              </span>
                            </div>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: statusColor }}
                              animate={{ width: `${barPct}%` }}
                              transition={{ duration: 0.8 }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </GlassPanel>

                  <GlassPanel className="rounded-xl overflow-hidden flex flex-col" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                    <div className="px-4 py-1.5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: C.muted }}>Subsystems</span>
                    </div>
                    <div className="flex flex-col gap-1.5 px-3.5 py-2">
                      {([
                        { label: 'Neural Interface', key: 'neuralInterface' as const },
                        { label: 'Biometric Sensors', key: 'biometricSensors' as const },
                        { label: 'Telemetry Relay', key: 'telemetryRelay' as const },
                        { label: 'Cognitive Proc.', key: 'cognitiveProc' as const },
                        { label: 'Atmos Monitor', key: 'atmosMonitor' as const },
                      ]).map(({ label, key }) => {
                        const status = subStatus[key]
                        const color = getSubColor(status)
                        const isPulsing = status === 'CRITICAL' || status === 'DEGRADED' || status === 'LATENT'
                        return (
                          <div key={key} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPulsing ? 'animate-pulse' : ''}`}
                                style={{ background: color, boxShadow: `0 0 4px ${color}` }}
                              />
                              <span className="text-[10px] whitespace-nowrap" style={{ color: C.fg }}>{label}</span>
                            </div>
                            <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color }}>{status}</span>
                          </div>
                        )
                      })}
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

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog show={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Demo Black Box Recorder Overlay */}
      <DemoOverlay demoActive={demoActive} demoTime={demoTime} onStop={stopDemo} />

      {/* Black Box Playback Scrubber */}
      <BlackBoxPlayback
        isActive={isPlaybackActive}
        playbackIndex={playbackIndex}
        totalFrames={recordedSamples.length}
        isPlaying={isPlaybackPlaying}
        onIndexChange={(idx) => { setPlaybackIndex(idx); setIsPlaybackPlaying(false); }}
        onTogglePlay={() => setIsPlaybackPlaying((p) => !p)}
        onStepBack={() => { setIsPlaybackPlaying(false); setPlaybackIndex((prev) => Math.max(0, prev - 1)); }}
        onStepForward={() => { setIsPlaybackPlaying(false); setPlaybackIndex((prev) => Math.min(recordedSamples.length - 1, prev + 1)); }}
        onExit={() => { setIsPlaybackActive(false); setIsPlaybackPlaying(false); }}
      />

      {/* Incident Report Modal */}
      <IncidentReportModal
        show={showReport}
        reportText={reportText}
        onClose={() => setShowReport(false)}
        onCopy={handleCopyReport}
        onDownload={handleDownloadReport}
        copied={copied}
      />
    </motion.div>
  );
}
