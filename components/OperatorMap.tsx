'use client';

import { useState, useEffect, useRef } from 'react';
import GlassPanel from '@/components/ui/GlassPanel';
import { C, TrackKey, TRACK_CONFIGS } from '@/lib/constants';
import { Layers, Globe, Compass, Radio, Lock } from 'lucide-react';

interface OperatorMapProps {
  activeTrackKey: TrackKey;
  crisis: boolean;
}

// Target viewBox coordinate rectangles for operator auto-focus cameras
// Format: [minX, minY, width, height]
// Configured to zoom into different regions of India dynamically!
const TARGET_VIEWBOXES: Record<TrackKey, [number, number, number, number]> = {
  ASTRONAUT: [0, 0, 200, 100],      // Full Global View (Astronaut orbit)
  PILOT: [136, 26, 18, 12],        // North-to-South India flight corridor (New Delhi to Bengaluru)
  SURGEON: [140, 29, 8, 6],         // Northern India local center (New Delhi AIIMS hospital tight zoom)
  TRAIN_PILOT: [138, 29, 16, 10],  // South India rail corridor (Bengaluru to Chennai Central)
  TRUCKER: [136, 29, 12, 8]        // West India expressway corridor (Mumbai to Pune)
};

// Detailed vector outlines of continents + countries on a 200x100 Mercator grid
// x: 0→200 = lon -180→+180, y: 0→100 = lat +85→-85
const LAND_MASSES: { id: string; d: string; highlight?: boolean }[] = [
  // North America
  { id: 'na', d: 'M8,16 L12,14 L18,11 L24,9 L32,7 L38,7 L44,8 L48,10 L52,13 L54,16 L56,19 L58,22 L60,26 L58,30 L54,34 L50,37 L46,39 L42,41 L38,43 L35,44 L32,46 L30,48 L28,46 L26,42 L25,38 L26,34 L25,30 L22,28 L18,26 L14,22 L10,19 Z' },
  // Central America
  { id: 'ca', d: 'M32,46 L35,44 L37,46 L39,48 L38,50 L36,51 L34,50 L33,48 Z' },
  // South America
  { id: 'sa', d: 'M38,50 L42,48 L46,50 L50,52 L54,55 L56,58 L57,62 L56,66 L54,70 L52,74 L50,78 L48,81 L46,84 L44,86 L43,82 L42,78 L41,74 L40,68 L39,62 L38,56 Z' },
  // Greenland
  { id: 'gl', d: 'M56,4 L62,3 L68,2 L72,4 L70,8 L68,12 L64,14 L60,13 L58,9 Z' },
  // Europe
  { id: 'eu', d: 'M80,18 L84,16 L88,14 L92,15 L96,17 L98,20 L97,23 L94,25 L90,26 L86,27 L82,26 L79,24 L78,21 Z' },
  // Scandinavia
  { id: 'sc', d: 'M84,10 L86,8 L90,7 L92,9 L91,12 L89,14 L86,14 L84,12 Z' },
  // UK/Ireland
  { id: 'uk', d: 'M78,18 L80,16 L82,17 L81,20 L79,21 Z M76,18 L77,17 L78,18 L77,20 Z' },
  // Russia/Central Asia
  { id: 'ru', d: 'M96,17 L102,14 L110,11 L120,9 L132,8 L144,9 L156,11 L165,14 L172,17 L178,20 L180,24 L178,28 L174,30 L168,30 L162,28 L156,27 L150,26 L144,25 L138,24 L132,22 L126,21 L120,20 L114,19 L108,18 L102,17 Z' },
  // Middle East
  { id: 'me', d: 'M108,30 L112,28 L116,29 L120,30 L122,32 L124,34 L122,36 L118,37 L114,36 L110,34 L108,32 Z' },
  // Africa
  { id: 'af', d: 'M82,35 L86,34 L90,33 L94,34 L98,36 L102,38 L106,40 L110,43 L114,47 L116,52 L117,57 L116,62 L114,67 L111,72 L107,76 L103,79 L99,81 L95,80 L92,76 L89,71 L87,66 L85,60 L84,54 L83,48 L82,42 Z' },
  // Madagascar
  { id: 'mg', d: 'M118,65 L120,63 L121,66 L120,70 L118,69 Z' },
  // India (HIGHLIGHTED - main tracking area)
  { id: 'in', d: 'M134,28 L136,27 L138,27 L140,28 L142,29 L144,30 L145,32 L144,34 L143,36 L142,38 L140,40 L139,38 L138,36 L137,34 L136,32 L135,30 Z', highlight: true },
  // Sri Lanka
  { id: 'lk', d: 'M141,40 L142,39.5 L142.5,41 L141.5,42 L141,41 Z' },
  // China/East Asia
  { id: 'cn', d: 'M144,25 L150,24 L156,23 L162,24 L166,26 L168,28 L168,31 L166,34 L162,36 L158,37 L154,36 L150,34 L148,32 L146,30 L144,28 Z' },
  // Southeast Asia
  { id: 'sea', d: 'M154,38 L158,37 L162,38 L164,40 L162,43 L160,45 L157,46 L155,44 L154,41 Z' },
  // Indonesia
  { id: 'id', d: 'M155,48 L158,47 L162,48 L166,49 L170,50 L174,50 L172,52 L168,52 L164,51 L160,50 L156,50 Z' },
  // Japan
  { id: 'jp', d: 'M172,22 L174,20 L176,22 L175,25 L173,27 L172,25 Z' },
  // Korea
  { id: 'kr', d: 'M168,24 L170,22 L171,24 L170,27 L168,26 Z' },
  // Australia
  { id: 'au', d: 'M156,62 L162,58 L168,57 L174,59 L178,62 L180,66 L178,70 L174,73 L170,75 L166,74 L162,72 L158,69 L156,66 Z' },
  // New Zealand
  { id: 'nz', d: 'M184,72 L186,70 L187,73 L186,76 L184,75 Z M185,77 L186,76 L187,78 L186,80 L185,79 Z' },
];

interface PingEvent {
  id: number;
  x: number;
  y: number;
  lat: number;
  lon: number;
}

interface GroundStation {
  svgX: number;
  svgY: number;
  label: string;
  color: string;
  pulseSize: number;
  downlinkStatus: string;
}

// Tailored local Ground Control base stations located in India for each user profile
const getGroundStation = (track: TrackKey): GroundStation | null => {
  switch (track) {
    case 'ASTRONAUT':
      return {
        svgX: 143,
        svgY: 36, // Bengaluru ISRO
        label: 'ISRO ISTRAC',
        color: '#00e599', // Green
        pulseSize: 4.5,
        downlinkStatus: 'ISRO BENGALURU GROUND STATION DOWNLINK ESTABLISHED'
      };
    case 'PILOT':
      return {
        svgX: 144,
        svgY: 32, // New Delhi DEL ATC
        label: 'DELHI ATC',
        color: '#00d4ff', // Cyan
        pulseSize: 4.0,
        downlinkStatus: 'DELHI AIR TRAFFIC CONTROL SECURE CHANNEL ESTABLISHED'
      };
    case 'TRAIN_PILOT':
      return {
        svgX: 143,
        svgY: 36, // Bengaluru SBC terminal
        label: 'SWR BNC HQ',
        color: '#f59e0b', // Amber
        pulseSize: 3.5,
        downlinkStatus: 'INDIAN RAILWAYS BENGALURU DIVISION COMMS LINKED'
      };
    case 'TRUCKER':
      return {
        svgX: 141,
        svgY: 34, // Mumbai NHAI Hub
        label: 'MUMBAI HUB',
        color: '#f43f5e', // Rose
        pulseSize: 3.5,
        downlinkStatus: 'NHAI WESTERN CORRIDOR SWARM DISPATCH LINK NOMINAL'
      };
    case 'SURGEON':
    default:
      return null;
  }
};

const getTrackingTelemetryAt = (
  t: number,
  track: TrackKey
): {
  svgX: number;
  svgY: number;
  lat: number;
  lon: number;
  alt: number;
  speed: number;
  heading: number;
  satellites: number;
  latency: number;
  label: string;
  pathName: string;
} => {
  switch (track) {
    case 'ASTRONAUT': {
      const svgX = 10 + t * 180;
      const svgY = 50 - 35 * Math.sin(t * Math.PI * 2);
      const lat = 51.64 * Math.sin(t * Math.PI * 2);
      const lon = -180 + t * 360;
      const alt = 419.2 + Math.cos(t * Math.PI * 4) * 5.4;
      const speed = 27562 + Math.sin(t * Math.PI * 2) * 18;
      const heading = (Math.cos(t * Math.PI * 2) >= 0 ? 52 : 128);
      return {
        svgX, svgY, lat, lon, alt, speed, heading,
        satellites: 14, latency: 232,
        label: 'ISS Orbit Tracker',
        pathName: 'ORBITAL SINUSOID'
      };
    }
    case 'PILOT': {
      const svgX = (1 - t) * (1 - t) * 144 + 2 * (1 - t) * t * 142.5 + t * t * 143;
      const svgY = (1 - t) * (1 - t) * 32 + 2 * (1 - t) * t * 34 + t * t * 36;
      const lat = 28.6139 + t * (12.9716 - 28.6139);
      const lon = 77.2090 + t * (77.5946 - 77.2090);
      const alt = t < 0.1 ? 4000 + t * 10 * 32000 : t > 0.9 ? 36000 - (t - 0.9) * 10 * 36000 : 36000;
      const speed = t < 0.1 ? 220 + t * 10 * 230 : t > 0.9 ? 450 - (t - 0.9) * 10 * 290 : 450;
      const heading = Math.round(182 - t * 4);
      return {
        svgX, svgY, lat, lon, alt, speed, heading,
        satellites: 12, latency: 38,
        label: 'Air India AI-803 (DEL-BLR)',
        pathName: 'DOMESTIC FLIGHT PATH'
      };
    }
    case 'SURGEON': {
      return {
        svgX: 144,
        svgY: 32,
        lat: 0,
        lon: 0,
        alt: 0,
        speed: 0,
        heading: 0,
        satellites: 0,
        latency: 1.2,
        label: 'AIIMS New Delhi OR-2 (Encrypted)',
        pathName: 'GEOLOCATION RESTRICTED'
      };
    }
    case 'TRAIN_PILOT': {
      let svgX = 143;
      let svgY = 36;
      if (t < 0.33) {
        const p = t / 0.33;
        svgX = 143 + p * 1.2;
        svgY = 36 - p * 0.2;
      } else if (t < 0.66) {
        const p = (t - 0.33) / 0.33;
        svgX = 144.2 + p * 1.2;
        svgY = 35.8 + p * 0.3;
      } else {
        const p = (t - 0.66) / 0.34;
        svgX = 145.4 + p * 1.1;
        svgY = 36.1 - p * 0.1;
      }
      const lat = 12.9716 + t * (13.0827 - 12.9716);
      const lon = 77.5946 + t * (80.2707 - 77.5946);
      const speed = t < 0.05 ? t * 20 * 130 : t > 0.95 ? 130 - (t - 0.95) * 20 * 130 : 130 + Math.sin(t * Math.PI * 6) * 4;
      const alt = 920 - t * 900;
      return {
        svgX, svgY, lat, lon,
        alt,
        speed, heading: 88,
        satellites: 11, latency: 4.8,
        label: 'Vande Bharat Express (SBC-MAS)',
        pathName: 'SOUTHERN RAILWAY CORRIDOR'
      };
    }
    case 'TRUCKER': {
      let svgX = 141;
      let svgY = 34;
      if (t < 0.5) {
        const p = t / 0.5;
        svgX = 141 + p * 0.5;
        svgY = 34 + p * 0.4;
      } else {
        const p = (t - 0.5) / 0.5;
        svgX = 141.5 + p * 0.5;
        svgY = 34.4 + p * 0.6;
      }
      const lat = 19.0760 + t * (18.5204 - 19.0760);
      const lon = 72.8777 + t * (73.8567 - 72.8777);
      const alt = 20 + t * 540;
      const speed = 62.5 + Math.sin(t * Math.PI * 8) * 1.8;
      return {
        svgX, svgY, lat, lon, alt, speed, heading: 135,
        satellites: 11, latency: 26.5,
        label: 'Mumbai-Pune Expressway',
        pathName: 'LOGISTICS CARRIER LINE'
      };
    }
  }
};

export default function OperatorMap({ activeTrackKey, crisis }: OperatorMapProps) {
  const baseThemeColor = TRACK_CONFIGS[activeTrackKey]?.themeColor || C.cyan;
  const themeColor = crisis ? C.red : baseThemeColor;
  
  const [layers, setLayers] = useState({
    grid: true,
    terrain: true,
    path: true,
    scan: true
  });

  const [simSpeed, setSimSpeed] = useState<0 | 1 | 5 | 10>(1);
  const viewBoxRef = useRef<[number, number, number, number]>([0, 0, 200, 100]);
  const [pings, setPings] = useState<PingEvent[]>([]);

  const svgRef = useRef<SVGSVGElement>(null);
  const dotGroupRef = useRef<SVGGElement>(null);
  const radarSweepRef = useRef<SVGGElement>(null);
  const downlinkLineRef = useRef<SVGLineElement>(null);
  const signalPacketRef = useRef<SVGCircleElement>(null);

  const latTextRef = useRef<HTMLSpanElement>(null);
  const lonTextRef = useRef<HTMLSpanElement>(null);
  const altTextRef = useRef<HTMLSpanElement>(null);
  const velTextRef = useRef<HTMLSpanElement>(null);
  const headingTextRef = useRef<HTMLSpanElement>(null);
  const satTextRef = useRef<HTMLSpanElement>(null);

  const gs = getGroundStation(activeTrackKey);

  useEffect(() => {
    const target = TARGET_VIEWBOXES[activeTrackKey] || [0, 0, 200, 100];
    let animId: number;
    let lastT = performance.now();

    const lerpViewBox = (now: number) => {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      const easeFactor = 1 - Math.pow(1 - 0.08, dt * 60);
      const current = viewBoxRef.current;
      const next = current.map((val, idx) => val + (target[idx] - val) * easeFactor) as [number, number, number, number];
      
      viewBoxRef.current = next;
      if (svgRef.current) {
        svgRef.current.setAttribute('viewBox', next.join(' '));
      }

      const sumDiff = next.reduce((sum, val, idx) => sum + Math.abs(val - target[idx]), 0);
      if (sumDiff < 0.005) {
        viewBoxRef.current = target;
        if (svgRef.current) {
          svgRef.current.setAttribute('viewBox', target.join(' '));
        }
        return;
      }
      animId = requestAnimationFrame(lerpViewBox);
    };

    animId = requestAnimationFrame(lerpViewBox);
    return () => cancelAnimationFrame(animId);
  }, [activeTrackKey]);

  // Use refs so animation loop doesn't restart on speed change
  const simSpeedRef = useRef(simSpeed);
  simSpeedRef.current = simSpeed;
  const localProgressRef = useRef(0.35);
  const labelRef = useRef<HTMLSpanElement>(null);
  const pathNameRef = useRef<HTMLSpanElement>(null);

  // Reset progress when switching tracks
  useEffect(() => {
    localProgressRef.current = 0.35;
  }, [activeTrackKey]);

  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;
    let frameCount = 0;
    let localRadarAngle = 0;

    const updateDom = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      frameCount++;

      const currentSpeed = simSpeedRef.current;

      if (currentSpeed > 0) {
        // Amplify higher speeds so the difference is very obvious
        const amplifiedSpeed = currentSpeed === 1 ? 1 : currentSpeed === 5 ? 15 : 40;
        let speedFactor = 0.025;
        if (activeTrackKey === 'ASTRONAUT') speedFactor = 0.01;
        if (activeTrackKey === 'PILOT') speedFactor = 0.02;
        if (activeTrackKey === 'SURGEON') speedFactor = 0.03;
        if (activeTrackKey === 'TRAIN_PILOT') speedFactor = 0.035;
        if (activeTrackKey === 'TRUCKER') speedFactor = 0.03;
        localProgressRef.current = (localProgressRef.current + speedFactor * amplifiedSpeed * dt) % 1.0;
      }
      localRadarAngle = (localRadarAngle + 90 * dt) % 360;

      const tele = getTrackingTelemetryAt(localProgressRef.current, activeTrackKey);

      if (dotGroupRef.current) {
        if (activeTrackKey === 'SURGEON') {
          dotGroupRef.current.setAttribute('opacity', '0');
        } else {
          dotGroupRef.current.setAttribute('opacity', '1');
          dotGroupRef.current.setAttribute('transform', `translate(${tele.svgX}, ${tele.svgY})`);
        }
      }

      if (radarSweepRef.current) {
        if (activeTrackKey === 'SURGEON' || !layers.scan) {
          radarSweepRef.current.setAttribute('opacity', '0');
        } else {
          radarSweepRef.current.setAttribute('opacity', '1');
          radarSweepRef.current.setAttribute('transform', `translate(${tele.svgX}, ${tele.svgY}) rotate(${localRadarAngle})`);
        }
      }

      if (downlinkLineRef.current && gs) {
        if (activeTrackKey === 'SURGEON') {
          downlinkLineRef.current.setAttribute('opacity', '0');
        } else {
          downlinkLineRef.current.setAttribute('opacity', '0.32');
          downlinkLineRef.current.setAttribute('x1', String(tele.svgX));
          downlinkLineRef.current.setAttribute('y1', String(tele.svgY));
          downlinkLineRef.current.setAttribute('x2', String(gs.svgX));
          downlinkLineRef.current.setAttribute('y2', String(gs.svgY));
        }
      }

      if (signalPacketRef.current && gs) {
        if (activeTrackKey === 'SURGEON') {
          signalPacketRef.current.setAttribute('opacity', '0');
        } else {
          signalPacketRef.current.setAttribute('opacity', '1');
          const packetProgress = (now / 2200) % 1.0;
          const px = tele.svgX + packetProgress * (gs.svgX - tele.svgX);
          const py = tele.svgY + packetProgress * (gs.svgY - tele.svgY);
          signalPacketRef.current.setAttribute('cx', String(px));
          signalPacketRef.current.setAttribute('cy', String(py));
        }
      }

      if (frameCount % 6 === 0) {
        const isSurgeon = activeTrackKey === 'SURGEON';
        if (latTextRef.current) latTextRef.current.textContent = isSurgeon ? 'RESTRICTED' : `${Math.abs(tele.lat).toFixed(6)}° ${tele.lat >= 0 ? 'N' : 'S'}`;
        if (lonTextRef.current) lonTextRef.current.textContent = isSurgeon ? 'RESTRICTED' : `${Math.abs(tele.lon).toFixed(6)}° ${tele.lon >= 0 ? 'E' : 'W'}`;
        if (altTextRef.current) {
          if (isSurgeon) altTextRef.current.textContent = 'RESTRICTED';
          else if (activeTrackKey === 'ASTRONAUT') altTextRef.current.textContent = `${tele.alt.toFixed(2)} km`;
          else if (activeTrackKey === 'TRUCKER') altTextRef.current.textContent = `${Math.round(tele.alt)} m`;
          else altTextRef.current.textContent = `${Math.round(tele.alt).toLocaleString()} ft`;
        }
        if (velTextRef.current) {
          if (isSurgeon) velTextRef.current.textContent = 'RESTRICTED';
          else if (activeTrackKey === 'ASTRONAUT') velTextRef.current.textContent = `${Math.round(tele.speed).toLocaleString()} km/h`;
          else if (activeTrackKey === 'PILOT') velTextRef.current.textContent = `${Math.round(tele.speed)} kn`;
          else if (activeTrackKey === 'TRAIN_PILOT') velTextRef.current.textContent = `${Math.round(tele.speed)} km/h`;
          else velTextRef.current.textContent = `${Math.round(tele.speed)} km/h`;
        }
        if (headingTextRef.current) headingTextRef.current.textContent = isSurgeon ? 'N/A' : `${String(tele.heading).padStart(3, '0')}°`;
        if (satTextRef.current) satTextRef.current.textContent = isSurgeon ? '0 LOCK' : `${tele.satellites} LOCK`;
        if (labelRef.current) labelRef.current.textContent = tele.label;
        if (pathNameRef.current) pathNameRef.current.textContent = tele.pathName;
      }
      frameId = requestAnimationFrame(updateDom);
    };

    frameId = requestAnimationFrame(updateDom);
    return () => cancelAnimationFrame(frameId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simSpeed, activeTrackKey, layers.scan, gs]);

  const initialTele = getTrackingTelemetryAt(0.35, activeTrackKey);

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const [vx, vy, vw, vh] = viewBoxRef.current;
    const svgX = vx + (clickX / rect.width) * vw;
    const svgY = vy + (clickY / rect.height) * vh;
    const lon = 1.4193 * svgX - 127.71;
    const lat = 134.86 - 3.365 * svgY;
    const newPing: PingEvent = {
      id: Date.now(),
      x: svgX,
      y: svgY,
      lat: Math.max(-90, Math.min(90, lat)),
      lon: ((lon + 180) % 360) - 180
    };
    setPings(prev => [...prev.slice(-3), newPing]);
  };

  return (
    <GlassPanel 
      className="rounded-xl overflow-hidden flex flex-col justify-between" 
      style={{ 
        border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}`,
        height: '100%'
      }}
    >
      <div className="px-4 py-2 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5">
          <Globe className="w-3 h-3 text-slate-500 animate-spin-slow" style={{ color: themeColor }} />
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: C.fg }}>
            OPERATOR GEOLOCATION
          </span>
        </div>
        <div className="flex items-center gap-2">
          {crisis && (
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
            </span>
          )}
          <span className="text-[8px] font-mono font-bold tracking-wider" style={{ color: themeColor }}>
            {crisis ? 'EMERGENCY OVERRIDE INTERFACE' : 'GPS 3D COORD LOCK'}
          </span>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden" style={{ minHeight: '180px', background: 'linear-gradient(180deg, #020a08 0%, #041210 40%, #061a14 100%)' }}>
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-0.5 bg-black/85 backdrop-blur-sm border border-white/8 rounded-md p-1.5 text-[7px] font-mono">
          <div className="text-[6px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-0.5 flex items-center gap-1 px-1">
            <Layers className="w-2.5 h-2.5" /> LAYERS
          </div>
          {(['grid', 'terrain', 'path', 'scan'] as const).map(key => (
            <button
              key={key}
              onClick={() => setLayers(l => ({ ...l, [key]: !l[key] }))}
              className="px-1.5 py-[3px] rounded text-left flex items-center justify-between gap-3 cursor-pointer transition-all duration-150"
              style={{
                color: layers[key] ? themeColor : '#475569',
                backgroundColor: layers[key] ? `${themeColor}12` : 'transparent',
                borderLeft: layers[key] ? `2px solid ${themeColor}` : '2px solid transparent'
              }}
            >
              <span className="uppercase">{key === 'scan' ? 'SCANNER' : key}</span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: layers[key] ? themeColor : '#334155' }}></span>
            </button>
          ))}
        </div>

        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/80 border border-white/10 rounded px-1.5 py-1 text-[7.5px] font-mono">
          <span className="text-[6.5px] text-slate-500 uppercase tracking-wider mr-1">TIME WARP</span>
          {([0, 1, 5, 10] as const).map(speed => (
            <button
              key={speed}
              onClick={() => setSimSpeed(speed)}
              className="px-1 rounded text-center cursor-pointer transition-colors hover:text-white"
              style={{
                color: simSpeed === speed ? themeColor : '#64748b',
                backgroundColor: simSpeed === speed ? `${themeColor}20` : 'transparent',
                fontWeight: simSpeed === speed ? 'bold' : 'normal'
              }}
            >
              {speed === 0 ? 'II' : `${speed}x`}
            </button>
          ))}
        </div>

        {pings.length > 0 && (
          <div className="absolute bottom-2 right-2 z-10 bg-black/80 border border-red-950/50 rounded px-1.5 py-1 text-[7.5px] font-mono text-red-400 flex flex-col gap-0.5 animate-pulse">
            <div className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500"></span>
              <span className="font-bold text-[7px] tracking-wider">PING LOCKED</span>
            </div>
            <div>LAT: {pings[pings.length - 1].lat.toFixed(4)}° {pings[pings.length - 1].lat >= 0 ? 'N' : 'S'}</div>
            <div>LON: {pings[pings.length - 1].lon.toFixed(4)}° {pings[pings.length - 1].lon >= 0 ? 'E' : 'W'}</div>
          </div>
        )}

        <svg 
          ref={svgRef}
          viewBox="0 0 200 100" 
          onClick={handleMapClick}
          className="w-full h-full select-none cursor-crosshair"
        >
          <defs>
            <radialGradient id="oceanGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={themeColor} stopOpacity="0.04" />
              <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="200" height="100" fill="url(#oceanGlow)" />

          {layers.grid && (
            <g stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" fill="none">
              <line x1="20" y1="0" x2="20" y2="100" vectorEffect="non-scaling-stroke" />
              <line x1="40" y1="0" x2="40" y2="100" strokeDasharray="1,2" vectorEffect="non-scaling-stroke" />
              <line x1="60" y1="0" x2="60" y2="100" vectorEffect="non-scaling-stroke" />
              <line x1="80" y1="0" x2="80" y2="100" strokeDasharray="1,2" vectorEffect="non-scaling-stroke" />
              <line x1="100" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
              <line x1="120" y1="0" x2="120" y2="100" strokeDasharray="1,2" vectorEffect="non-scaling-stroke" />
              <line x1="140" y1="0" x2="140" y2="100" vectorEffect="non-scaling-stroke" />
              <line x1="160" y1="0" x2="160" y2="100" strokeDasharray="1,2" vectorEffect="non-scaling-stroke" />
              <line x1="180" y1="0" x2="180" y2="100" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="20" x2="200" y2="20" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="40" x2="200" y2="40" strokeDasharray="1,2" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="50" x2="200" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="60" x2="200" y2="60" strokeDasharray="1,2" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="80" x2="200" y2="80" vectorEffect="non-scaling-stroke" />
            </g>
          )}

          {/* Country/Continent borders with solid fills */}
          <g>
            {LAND_MASSES.map(({ id, d, highlight }) => (
              <path 
                key={id} 
                d={d}
                stroke={highlight ? themeColor : 'rgba(255,255,255,0.25)'}
                strokeWidth={highlight ? '0.5' : '0.3'}
                fill={
                  !layers.terrain ? 'transparent' :
                  highlight ? `${themeColor}20` : 'rgba(255,255,255,0.04)'
                }
                strokeOpacity={highlight ? 0.8 : 0.5}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>

          {gs && (
            <g transform={`translate(${gs.svgX}, ${gs.svgY})`}>
              <polygon points="0,-0.8 0.8,0 0,-0.8 -0.8,0" fill={gs.color} opacity="0.95" />
              <polygon points="0,-1.5 1.5,0 0,1.5 -1.5,0" fill="none" stroke={gs.color} strokeWidth="0.3" vectorEffect="non-scaling-stroke">
                <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="transform" values="scale(1); scale(1.3); scale(1)" dur="2.2s" repeatCount="indefinite" />
              </polygon>
              <text 
                x="1.8" 
                y="0.4" 
                fontSize="1px" 
                fontFamily="monospace" 
                fill={gs.color} 
                fontWeight="bold"
                letterSpacing="0.03em"
                opacity="0.9"
              >
                {gs.label}
              </text>
            </g>
          )}

          {gs && activeTrackKey !== 'SURGEON' && (
            <g>
              <line 
                ref={downlinkLineRef}
                x1={initialTele.svgX} 
                y1={initialTele.svgY} 
                x2={gs.svgX} 
                y2={gs.svgY} 
                stroke={themeColor} 
                strokeWidth="0.25" 
                strokeDasharray="1.2,1.2" 
                opacity="0.32" 
                vectorEffect="non-scaling-stroke"
              />
              <circle ref={signalPacketRef} r="0.2" fill={themeColor} />
            </g>
          )}

          {layers.path && activeTrackKey !== 'SURGEON' && (
            <>
              {activeTrackKey === 'ASTRONAUT' && (
                <path 
                  d="M 10,50 Q 55,10 100,50 T 190,50" 
                  fill="none" 
                  stroke={themeColor} 
                  strokeWidth="0.75" 
                  strokeDasharray="2,3" 
                  opacity="0.65"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {activeTrackKey === 'PILOT' && (
                <>
                  <path 
                    d="M 144,32 Q 142.5,34 143,36" 
                    fill="none" 
                    stroke={themeColor} 
                    strokeWidth="0.75" 
                    strokeDasharray="2,2" 
                    opacity="0.8"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle cx="144" cy="32" r="0.4" fill={themeColor} opacity="0.7" />
                  <circle cx="143" cy="36" r="0.4" fill={themeColor} opacity="0.7" />
                </>
              )}
              {activeTrackKey === 'TRAIN_PILOT' && (
                <path 
                  d="M 143,36 L 144.2,35.8 L 145.4,36.1 L 146.5,36" 
                  fill="none" 
                  stroke={themeColor} 
                  strokeWidth="0.95" 
                  strokeDasharray="3,1" 
                  opacity="0.8"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {activeTrackKey === 'TRUCKER' && (
                <path 
                  d="M 141,34 L 141.5,34.4 L 142,35" 
                  fill="none" 
                  stroke={themeColor} 
                  strokeWidth="0.75" 
                  opacity="0.7"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </>
          )}

          {pings.map(ping => (
            <g key={ping.id}>
              <circle cx={ping.x} cy={ping.y} r="0.4" fill={C.red} />
              <circle cx={ping.x} cy={ping.y} r="3" fill="none" stroke={C.red} strokeWidth="0.3" vectorEffect="non-scaling-stroke">
                <animate attributeName="r" values="0.4;3" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.95;0" dur="1.2s" repeatCount="indefinite" />
              </circle>
            </g>
          ))}

          {layers.scan && activeTrackKey !== 'SURGEON' && (
            <g ref={radarSweepRef}>
              <line 
                x1="0" 
                y1="0" 
                x2="5" 
                y2="0" 
                stroke={themeColor} 
                strokeWidth="0.3" 
                opacity="0.25" 
                vectorEffect="non-scaling-stroke"
              />
              <circle 
                cx="0" 
                cy="0" 
                r="5" 
                fill="none" 
                stroke={themeColor} 
                strokeWidth="0.2" 
                strokeDasharray="0.5,1" 
                opacity="0.15" 
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}

          <g ref={dotGroupRef}>
            <circle r="1" fill="none" stroke={themeColor} strokeWidth="0.3" vectorEffect="non-scaling-stroke">
              <animate attributeName="r" values="0.3;1.5" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.85;0" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle r="0.35" fill={themeColor} />
          </g>
        </svg>
      </div>

      <div className="px-3.5 py-2.5 bg-black/45 shrink-0 flex flex-col gap-2 border-t border-white/5 font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 animate-spin-slow" style={{ color: themeColor }} />
            <span ref={labelRef} className="text-[9px] font-bold tracking-wider" style={{ color: C.fg }}>
              {initialTele.label}
            </span>
          </div>
          <span ref={pathNameRef} className="text-[7.5px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: themeColor, background: `${themeColor}12`, border: `1px solid ${themeColor}25` }}>
            {initialTele.pathName}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[8.5px] border-t border-white/5 pt-2">
          <div className="flex justify-between">
            <span className="text-slate-500">{activeTrackKey === 'SURGEON' ? 'LOCATION' : 'LATITUDE'}</span>
            <span ref={latTextRef} className="font-semibold tabular-nums" style={{ color: activeTrackKey === 'SURGEON' ? C.muted : C.fg }}>
              {activeTrackKey === 'SURGEON' ? 'RESTRICTED' : `${Math.abs(initialTele.lat).toFixed(6)}° ${initialTele.lat >= 0 ? 'N' : 'S'}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">
              {activeTrackKey === 'ASTRONAUT' ? 'ORBITAL ALT' : activeTrackKey === 'PILOT' ? 'CABIN ALT' : activeTrackKey === 'TRUCKER' ? 'ELEVATION' : activeTrackKey === 'SURGEON' ? 'FLOOR' : 'TRACK ALT'}
            </span>
            <span ref={altTextRef} className="font-semibold tabular-nums" style={{ color: activeTrackKey === 'SURGEON' ? C.muted : C.fg }}>
              {activeTrackKey === 'SURGEON' ? 'RESTRICTED'
                : activeTrackKey === 'ASTRONAUT' ? `${initialTele.alt.toFixed(2)} km`
                : activeTrackKey === 'TRUCKER' ? `${Math.round(initialTele.alt)} m`
                : `${Math.round(initialTele.alt).toLocaleString()} ft`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{activeTrackKey === 'SURGEON' ? 'ACCESS' : 'LONGITUDE'}</span>
            <span ref={lonTextRef} className="font-semibold tabular-nums" style={{ color: activeTrackKey === 'SURGEON' ? C.muted : C.fg }}>
              {activeTrackKey === 'SURGEON' ? 'RESTRICTED' : `${Math.abs(initialTele.lon).toFixed(6)}° ${initialTele.lon >= 0 ? 'E' : 'W'}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">
              {activeTrackKey === 'ASTRONAUT' ? 'ORBITAL VEL' : activeTrackKey === 'PILOT' ? 'AIRSPEED' : activeTrackKey === 'TRAIN_PILOT' ? 'RAIL SPEED' : activeTrackKey === 'TRUCKER' ? 'ROAD SPEED' : 'LATENCY'}
            </span>
            <span ref={velTextRef} className="font-semibold tabular-nums" style={{ color: activeTrackKey === 'SURGEON' ? C.muted : C.fg }}>
              {activeTrackKey === 'SURGEON' ? 'RESTRICTED'
                : activeTrackKey === 'ASTRONAUT' ? `${Math.round(initialTele.speed).toLocaleString()} km/h`
                : activeTrackKey === 'PILOT' ? `${Math.round(initialTele.speed)} kn`
                : activeTrackKey === 'TRAIN_PILOT' ? `${Math.round(initialTele.speed)} km/h`
                : `${Math.round(initialTele.speed)} km/h`}
            </span>
          </div>
          <div className="flex justify-between border-t border-white/5 pt-1.5 mt-0.5">
            <span className="text-slate-500">{activeTrackKey === 'SURGEON' ? 'BEARING' : 'HEADING'}</span>
            <span ref={headingTextRef} className="font-semibold tabular-nums text-slate-400">
              {activeTrackKey === 'SURGEON' ? 'N/A' : `${String(initialTele.heading).padStart(3, '0')}°`}
            </span>
          </div>
          <div className="flex justify-between border-t border-white/5 pt-1.5 mt-0.5">
            <span className="text-slate-500">{activeTrackKey === 'SURGEON' ? 'NETWORK' : 'GPS SATS'}</span>
            <span ref={satTextRef} className="font-semibold text-slate-400 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5" style={{ color: themeColor }} />
              {activeTrackKey === 'SURGEON' ? 'LAN ONLY' : `${initialTele.satellites} LOCK`}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[7px] text-slate-500 border-t border-white/5 pt-2">
          <div className="flex items-center gap-1 min-w-0">
            <Lock className="w-2.5 h-2.5 shrink-0" style={{ color: activeTrackKey === 'SURGEON' ? C.amber : C.green }} />
            <span className="truncate">
              {activeTrackKey === 'SURGEON'
                ? 'HIPAA RESTRICTED — NO GPS BROADCAST'
                : gs?.downlinkStatus || 'SECURE DATA LINK NOMINAL'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span>PING: {initialTele.latency.toFixed(1)}ms</span>
            <div className="flex gap-0.5">
              {[1.5, 2, 2.5, 3].map((h, i) => (
                <div key={i} className="w-0.5 rounded-sm" style={{ height: `${h * 4}px`, backgroundColor: themeColor, opacity: i < (activeTrackKey === 'SURGEON' ? 2 : 4) ? 1 : 0.2 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
