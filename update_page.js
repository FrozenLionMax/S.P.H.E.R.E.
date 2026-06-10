const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Add import
if (!content.includes('useTelemetry')) {
  content = content.replace(
    "import { useEffect, useRef, useState, useCallback } from 'react'",
    "import { useEffect, useRef, useState, useCallback } from 'react'\nimport { useTelemetry } from '@/lib/useTelemetry'"
  );
}

// 2. Add TRACK_CONFIGS
const trackConfigs = `
const TRACK_CONFIGS = {
  ASTRONAUT: {
    title: "EXTRAVEHICULAR ACTIVITY (EVA) LIFE-SUPPORT PROTOCOL",
    themeColor: C.violet,
    chart2Label: "Suit Pressure (PSI)",
    metricUnit: "PSI",
    baseEnvVal: 4.3,
    crisisDelta: -0.15,
    terminalLogs: ["[SYSTEM] EVA telemetry locked.", "[LIFE-SUPPORT] Suit pressure balancing."],
    overrideMsg: "AUTOMATED OVERRIDE: INITIATING EMERGENCY SUIT RE-PRESSURIZATION"
  },
  PILOT: {
    title: "FLIGHT DECK BIOMETRIC TELEMETRY CONSOLE",
    themeColor: C.cyan,
    chart2Label: "Cabin Altitude (FT)",
    metricUnit: "FT",
    baseEnvVal: 8000,
    crisisDelta: 450,
    terminalLogs: ["[AVIONICS] Autopilot standby.", "[CABIN] Monitoring cabin pressure matrix."],
    overrideMsg: "AUTOMATED PILOT OVERRIDE: INITIATING EMERGENCY FLIGHT DESCENT RADIAN"
  },
  SURGEON: {
    title: "TELE-ROBOTIC SURGERY CONTROL MATRIX",
    themeColor: C.green,
    chart2Label: "Hand Tremor Index (mm)",
    metricUnit: "mm",
    baseEnvVal: 0.02,
    crisisDelta: 0.04,
    terminalLogs: ["[ROBOTIC] Multi-axis actuators calibrated.", "[SENSE] Micro-force feedback active."],
    overrideMsg: "AUTOMATED OVERRIDE: ENGAGING ROBOTIC STABILIZATION DAMPERS"
  },
  TRAIN_PILOT: {
    title: "LOCOMOTIVE TRAFFIC OVERWATCH NETWORK",
    themeColor: C.amber,
    chart2Label: "Cognitive Latency (ms)",
    metricUnit: "ms",
    baseEnvVal: 210,
    crisisDelta: 85,
    terminalLogs: ["[SIGNAL] ATS-Inductor channel linked.", "[BRAKES] Pneumatic line pressure nominal."],
    overrideMsg: "AUTOMATED OVERRIDE: ENGAGING EMERGENCY PNEUMATIC BRAKES"
  },
  TRUCKER: {
    title: "LONG-HAUL LOGISTICS SWARM RADAR",
    themeColor: C.rose,
    chart2Label: "Driver Focus Index (%)",
    metricUnit: "%",
    baseEnvVal: 95,
    crisisDelta: -4.0,
    terminalLogs: ["[SWARM] V2V Mesh network established.", "[FLEET] Proximity safety margins active."],
    overrideMsg: "FLEET PLATOON WARNING: EXECUTING DISTRIBUTED V2V SHOULDER PULL-OVER"
  }
};

function Gyroscope({ isAstronaut }: { isAstronaut: boolean }) {
  if (!isAstronaut) return null;
  return (
    <div className="absolute top-4 right-4 z-10 opacity-70">
      <motion.svg width="60" height="60" viewBox="0 0 60 60"
        animate={{ rotate: [0, 15, -10, 5, 0], x: [0, 5, -3, 0], y: [0, -4, 2, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      >
        <circle cx="30" cy="30" r="28" fill="none" stroke={C.violet} strokeWidth="1" strokeDasharray="4 4" />
        <line x1="30" y1="5" x2="30" y2="55" stroke={C.violet} strokeWidth="0.5" />
        <line x1="5" y1="30" x2="55" y2="30" stroke={C.violet} strokeWidth="0.5" />
        <circle cx="30" cy="30" r="10" fill="none" stroke={C.violet} strokeWidth="1" />
      </motion.svg>
    </div>
  );
}
`;

if (!content.includes('TRACK_CONFIGS')) {
  content = content.replace('// ─────────────────────────────────────────────────────────────────────────────\n// Helpers', trackConfigs + '\n// ─────────────────────────────────────────────────────────────────────────────\n// Helpers');
}

// 3. Update ECG
content = content.replace(
  'function ECG({ crisis }: { crisis: boolean }) {',
  'function ECG({ crisis, hr }: { crisis: boolean; hr: number }) {'
);
content = content.replace(
  "transition={{ duration: crisis ? 0.5 : 1.2, repeat: Infinity, ease: 'linear' }}",
  "transition={{ duration: crisis ? 0.25 : Math.max(0.3, 60 / (hr || 75)), repeat: Infinity, ease: 'linear' }}"
);
// Fix the instances of <ECG crisis={crisis} />
content = content.replace(/<ECG crisis=\{crisis\} \/>/g, '<ECG crisis={crisis} hr={hr} />');

// 4. Update the Page component
// Replace the start of the Page component
const oldPageStart = `export default function Page() {
  const { samples, crisis, logs, events } = useLiveData()
  const logEnd  = useRef<HTMLDivElement>(null)
  const [clock, setClock] = useState(nowTime())
  const [signalStr] = useState(4)

  useEffect(() => {
    const t = setInterval(() => setClock(nowTime()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  const last = samples[samples.length - 1]
  const spo2     = last?.spo2     ?? 97
  const hr       = last?.hr       ?? 72
  const alt      = last?.alt      ?? 25000
  const lat      = last?.lat      ?? 145
  const temp     = last?.temp     ?? 98.2
  const pressure = last?.pressure ?? 12.4`;

const newPageStart = `export default function Page() {
  const { samples, isCrisis, connected, triggerCrisisMode, resolveCrisisMode, setTrack: setWsTrack } = useTelemetry()
  const crisis = isCrisis;
  const [activeTrackKey, setActiveTrackKey] = useState<keyof typeof TRACK_CONFIGS>('PILOT');
  const trackConf = TRACK_CONFIGS[activeTrackKey];
  
  const [localLogs, setLocalLogs] = useState<LogEntry[]>([]);
  const logEnd  = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState(nowTime());
  const [signalStr] = useState(4);
  const prevCrisis = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setClock(nowTime()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localLogs.length])

  // Track change handler
  const handleTrackChange = (key: keyof typeof TRACK_CONFIGS) => {
    setActiveTrackKey(key);
    setWsTrack(key);
    setLocalLogs(TRACK_CONFIGS[key].terminalLogs.map((msg, i) => ({ id: Date.now() + i, time: nowTime(), level: 'SYS', msg })));
  };

  // Add sample log occasionally or on crisis
  useEffect(() => {
    if (crisis && !prevCrisis.current) {
      setLocalLogs(p => [...p.slice(-50), { id: Date.now(), time: nowTime(), level: 'ALERT', msg: trackConf.overrideMsg }]);
    }
    prevCrisis.current = crisis;
  }, [crisis, trackConf]);

  useEffect(() => {
    if (samples.length > 0 && samples.length % 10 === 0 && !crisis) {
      setLocalLogs(p => [...p.slice(-50), { id: Date.now(), time: nowTime(), level: 'INFO', msg: \`[SYNC] Telemetry packet \${Math.floor(Math.random()*9000+1000)} logged.\` }]);
    }
  }, [samples.length, crisis]);

  const last = samples[samples.length - 1] || {
    spO2: 98, heartRate: 75, environmentMetric: trackConf.baseEnvVal, cognitiveLatency: 210
  };
  const spo2     = last.spO2;
  const hr       = last.heartRate;
  const envMetric = last.environmentMetric;
  const lat      = last.cognitiveLatency;
  
  // Mocks for unused existing metrics to prevent breaking the layout
  const temp     = 98.6;
  const pressure = 12.4;
  
  const logs = localLogs;
  const events = [{ time: nowTime(), label: trackConf.title, color: trackConf.themeColor }];
`;

content = content.replace(oldPageStart, newPageStart);

// 5. Update Override UI state classes
// Search for `--panel` and border colors to make them pulse red
content = content.replace(
  `border: \`1px solid \${flash ? color + '55' : 'var(--border)'}\`,`,
  `border: \`1px solid \${crisis ? '#ff3b5c' : flash ? color + '55' : 'var(--border)'}\`,`
);

content = content.replace(
  `boxShadow: flash ? \`0 0 20px \${color}12\` : status === 'critical' ? \`0 0 12px \${color}15\` : 'none',`,
  `boxShadow: crisis ? \`0 0 20px rgba(255,59,92,0.4)\` : flash ? \`0 0 20px \${color}12\` : status === 'critical' ? \`0 0 12px \${color}15\` : 'none',`
);

// 6. Update Title and Track Selector
const titleRegex = /<span className="text-\\[13px\\].*?S\\.P\\.H\\.E\\.R\\.E\\.<\\/span>/s;
content = content.replace(titleRegex, \`<span className="text-[13px] font-semibold tracking-[0.24em] uppercase font-mono" style={{ color: C.fg }}>
                S.P.H.E.R.E.
              </span>
              <div className="flex gap-1 ml-4">
                {Object.keys(TRACK_CONFIGS).map(k => (
                  <button key={k} onClick={() => handleTrackChange(k as any)}
                    className="px-2 py-0.5 text-[8px] font-mono border rounded-sm"
                    style={{ 
                      borderColor: activeTrackKey === k ? trackConf.themeColor : C.subtle,
                      color: activeTrackKey === k ? trackConf.themeColor : C.muted,
                      background: activeTrackKey === k ? \\\`\\\${trackConf.themeColor}22\\\` : 'transparent'
                    }}>
                    {k}
                  </button>
                ))}
              </div>\`);
              
// 7. Update Mission Header text
content = content.replace(
  'Autonomous Telemetry System',
  '{trackConf.title}'
);

// 8. Update Metric Cards to use dynamic labels
content = content.replace(
  /<MetricCard label="Cabin Altitude" sublabel="Barometric"[\s\S]*?critAt="34 kft" \/>/,
  `<MetricCard label={trackConf.chart2Label} sublabel="Track Metric"
                value={envMetric} unit={trackConf.metricUnit} history={h('environmentMetric' as any)} status={crisis ? 'critical' : 'ok'}
                precision={2} min={0} max={trackConf.baseEnvVal * 2} />`
);

// Add Gyroscope inside the flex-col h-screen
content = content.replace(
  '<div className="flex flex-col h-screen overflow-hidden" style={{ background: \'var(--background)\' }}>',
  '<div className="flex flex-col h-screen overflow-hidden" style={{ background: \'var(--background)\' }}>\n      <Gyroscope isAstronaut={activeTrackKey === "ASTRONAUT"} />'
);

// Hook up Override buttons
content = content.replace(
  '<Btn variant="accent">Override</Btn>',
  '<Btn variant="accent" onClick={triggerCrisisMode}>Override</Btn>'
);
content = content.replace(
  '<Btn variant="ok">Confirm</Btn>',
  '<Btn variant="ok" onClick={resolveCrisisMode}>Resolve</Btn>'
);

fs.writeFileSync(pagePath, content);
console.log('Successfully updated page.tsx');
