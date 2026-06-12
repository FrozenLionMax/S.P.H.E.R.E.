'use client';

import { useState, useEffect } from 'react';
import GlassPanel from '@/components/ui/GlassPanel';
import { C, TrackKey, TRACK_CONFIGS } from '@/lib/constants';
import { Layers, Globe, Compass, Radio, Lock } from 'lucide-react';

interface OperatorMapProps {
  activeTrackKey: TrackKey;
  crisis: boolean;
}

// Target viewBox coordinate rectangles for operator auto-focus cameras
// Format: [minX, minY, width, height]
const TARGET_VIEWBOXES: Record<TrackKey, [number, number, number, number]> = {
  ASTRONAUT: [0, 0, 200, 100],      // Full Global View
  PILOT: [22, 8, 80, 40],          // North Atlantic (JFK to Heathrow corridor)
  SURGEON: [80, 15, 30, 15],       // Western Europe (Zurich centered)
  TRAIN_PILOT: [138, 29, 16, 10],  // South India (Bengaluru-Chennai rail corridor zoom)
  TRUCKER: [15, 18, 40, 20]        // US Interstate 80 (SF to Salt Lake corridor)
};

// Detailed stylized vector outlines of continents mapped on a 200x100 grid
const CONTINENTS = {
  greenland: 'M 58,4 L 72,2 L 68,12 L 60,15 Z',
  northAmerica: 'M 10,15 L 22,12 L 35,8 L 45,8 L 52,12 L 55,20 L 62,28 L 55,38 L 42,42 L 32,45 L 28,48 L 26,40 L 28,32 L 20,30 L 15,22 Z',
  southAmerica: 'M 42,42 L 52,48 L 58,58 L 54,72 L 48,82 L 44,85 L 42,75 L 38,62 L 38,50 Z',
  eurasia: 'M 70,20 L 82,15 L 95,12 L 115,10 L 140,12 L 165,15 L 180,22 L 185,35 L 175,48 L 155,52 L 145,40 L 135,45 L 125,48 L 115,48 L 110,40 L 98,38 L 88,40 L 78,35 Z',
  africa: 'M 78,35 L 88,40 L 98,38 L 105,45 L 112,50 L 118,58 L 112,70 L 105,78 L 98,82 L 95,75 L 88,60 L 80,50 L 75,42 Z',
  australia: 'M 152,65 L 165,60 L 175,65 L 178,72 L 168,78 L 155,75 Z',
  japan: 'M 172,25 L 175,28 L 178,32 L 175,30 Z',
  uk: 'M 68,22 L 72,18 L 74,22 L 70,25 Z'
};

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

// Tailored local Ground Control base stations matching each operator profile's domain
const getGroundStation = (track: TrackKey): GroundStation | null => {
  switch (track) {
    case 'ASTRONAUT':
      return {
        svgX: 143,
        svgY: 36,
        label: 'ISTRAC IN',
        color: '#00e599', // Green
        pulseSize: 4.5,
        downlinkStatus: 'ISRO BENGALURU GROUND STATION DOWNLINK ESTABLISHED'
      };
    case 'PILOT':
      return {
        svgX: 38,
        svgY: 20, // Gander ATC
        label: 'GANDER ATC',
        color: '#00d4ff', // Cyan
        pulseSize: 4.0,
        downlinkStatus: 'GANDER OCEANIC CONTROL RADAR LINK ESTABLISHED'
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
        svgX: 38,
        svgY: 28, // Salt Lake City Hub
        label: 'SLC HUB',
        color: '#f43f5e', // Rose
        pulseSize: 3.5,
        downlinkStatus: 'FHWA WESTERN FLEET DISPATCH LINK NOMINAL'
      };
    case 'SURGEON':
    default:
      return null;
  }
};

export default function OperatorMap({ activeTrackKey, crisis }: OperatorMapProps) {
  // Theme styling colors based on active operator
  const baseThemeColor = TRACK_CONFIGS[activeTrackKey]?.themeColor || C.cyan;
  const themeColor = crisis ? C.red : baseThemeColor;
  
  // Layer visibility toggles
  const [layers, setLayers] = useState({
    grid: true,
    terrain: true,
    path: true,
    scan: true
  });

  // Simulation controls
  const [simSpeed, setSimSpeed] = useState<0 | 1 | 5 | 10>(1); // Pause, 1x, 5x, 10x warp
  const [progress, setProgress] = useState(0.35); // simulated path progress parameter [0..1]
  const [radarAngle, setRadarAngle] = useState(0); // scan angle [0..360]
  
  // Smooth Camera Panning: viewBox [x, y, w, h] interpolation
  const [viewBox, setViewBox] = useState<[number, number, number, number]>([0, 0, 200, 100]);

  // Click-to-Ping tracker events
  const [pings, setPings] = useState<PingEvent[]>([]);

  const gs = getGroundStation(activeTrackKey);

  // Smooth viewBox panning transition loops
  useEffect(() => {
    const target = TARGET_VIEWBOXES[activeTrackKey] || [0, 0, 200, 100];
    let animId: number;

    const lerpViewBox = () => {
      setViewBox(prev => {
        const easeSpeed = 0.06; // interpolation velocity
        const next = prev.map((val, idx) => val + (target[idx] - val) * easeSpeed) as [number, number, number, number];
        
        const sumDiff = next.reduce((sum, val, idx) => sum + Math.abs(val - target[idx]), 0);
        if (sumDiff < 0.005) {
          return target;
        }
        animId = requestAnimationFrame(lerpViewBox);
        return next;
      });
    };

    animId = requestAnimationFrame(lerpViewBox);
    return () => cancelAnimationFrame(animId);
  }, [activeTrackKey]);

  // Animation ticker loop (progress & radar sweep rotation)
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const run = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Update trajectory position progress parameter
      if (simSpeed > 0) {
        setProgress(prev => {
          let speedFactor = 0.015; // base speed multiplier
          if (activeTrackKey === 'ASTRONAUT') speedFactor = 0.006;
          if (activeTrackKey === 'PILOT') speedFactor = 0.012;
          if (activeTrackKey === 'SURGEON') speedFactor = 0.02;
          if (activeTrackKey === 'TRAIN_PILOT') speedFactor = 0.025;
          if (activeTrackKey === 'TRUCKER') speedFactor = 0.018;

          const increment = speedFactor * simSpeed * dt;
          return (prev + increment) % 1.0;
        });
      }

      // Rotate localized sweep radar
      setRadarAngle(prev => (prev + 90 * dt) % 360);

      frameId = requestAnimationFrame(run);
    };

    frameId = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frameId);
  }, [simSpeed, activeTrackKey]);

  // programmatically map path position parameter to SVG coordinate & real geolocation
  const getTrackingTelemetry = (): {
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
    const t = progress;

    switch (activeTrackKey) {
      case 'ASTRONAUT': {
        // Orbit sinusoid wave: M 10,50 Q 55,10 100,50 T 190,50
        const svgX = 10 + t * 180;
        const svgY = 50 - 35 * Math.sin(t * Math.PI * 2);
        
        // Orbital calculations (Inclination 51.64°, looping coordinates)
        const lat = 51.64 * Math.sin(t * Math.PI * 2);
        const lon = -180 + t * 360;
        
        const alt = 419.2 + Math.cos(t * Math.PI * 4) * 5.4; // km altitude
        const speed = 27562 + Math.sin(t * Math.PI * 2) * 18; // km/h
        const heading = (Math.cos(t * Math.PI * 2) >= 0 ? 52 : 128); // orbital heading
        return {
          svgX, svgY, lat, lon, alt, speed, heading,
          satellites: 14, latency: 232,
          label: 'ISS Orbit Tracker',
          pathName: 'ORBITAL SINUSOID'
        };
      }
      case 'PILOT': {
        // Great Circle Arc JFK to LHR: M 38,28 Q 62,10 87,24
        const svgX = (1 - t) * (1 - t) * 38 + 2 * (1 - t) * t * 62 + t * t * 87;
        const svgY = (1 - t) * (1 - t) * 28 + 2 * (1 - t) * t * 10 + t * t * 24;

        // Geodesic interpolation
        const lat = 40.6413 + t * (51.4700 - 40.6413);
        const lon = -73.7781 + t * (-0.4543 - (-73.7781));
        
        // Takeoff/Cruise/Landing altitude simulation
        const alt = t < 0.1 ? 5000 + t * 10 * 33000 : t > 0.9 ? 38000 - (t - 0.9) * 10 * 38000 : 38000;
        const speed = t < 0.1 ? 260 + t * 10 * 250 : t > 0.9 ? 510 - (t - 0.9) * 10 * 340 : 510; // knots
        const heading = Math.round(76 + t * 28);
        return {
          svgX, svgY, lat, lon, alt, speed, heading,
          satellites: 12, latency: 42,
          label: 'JFK-LHR Atlantic Corridor',
          pathName: 'GREAT-CIRCLE CORRIDOR'
        };
      }
      case 'SURGEON': {
        // Surgeon location information is classified and deactivated per HIPAA/security requirements
        return {
          svgX: 96,
          svgY: 26,
          lat: 0,
          lon: 0,
          alt: 0,
          speed: 0,
          heading: 0,
          satellites: 0,
          latency: 1.2,
          label: 'Zurich OR-4 (Encrypted Session)',
          pathName: 'GEOLOCATION RESTRICTED'
        };
      }
      case 'TRAIN_PILOT': {
        // Indian Railways Vande Bharat (Bengaluru to Chennai): M 143,36 L 144.2,35.8 L 145.4,36.1 L 146.5,36
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

        // Bengaluru to Chennai Central coordinates
        const lat = 12.9716 + t * (13.0827 - 12.9716);
        const lon = 77.5946 + t * (80.2707 - 77.5946);
        
        const speed = t < 0.05 ? t * 20 * 130 : t > 0.95 ? 130 - (t - 0.95) * 20 * 130 : 130 + Math.sin(t * Math.PI * 6) * 4; // km/h (Vande Bharat speed)
        const alt = 920 - t * 900; // Bengaluru elevation (~920m) to Chennai (~20m)
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
        // I-80 corridor highway: M 22,30 L 26,32 L 32,29 L 38,28
        let svgX = 22;
        let svgY = 30;
        if (t < 0.33) {
          const p = t / 0.33;
          svgX = 22 + p * 4;
          svgY = 30 + p * 2;
        } else if (t < 0.66) {
          const p = (t - 0.33) / 0.33;
          svgX = 26 + p * 6;
          svgY = 32 - p * 3;
        } else {
          const p = (t - 0.66) / 0.34;
          svgX = 32 + p * 6;
          svgY = 29 - p * 1;
        }

        // Reno to SLC coordinates
        const lat = 39.5296 + t * (40.7608 - 39.5296);
        const lon = -119.8138 + t * (-111.8910 - (-119.8138));
        
        const alt = 4520 + Math.sin(t * Math.PI * 2) * 480; // ft mountain passes
        const speed = 64.5 + Math.sin(t * Math.PI * 10) * 1.5; // mph
        return {
          svgX, svgY, lat, lon, alt, speed, heading: 86,
          satellites: 11, latency: 26.5,
          label: 'Interstate 80 Corridor',
          pathName: 'HIGHWAY LOGISTICS LINE'
        };
      }
    }
  };

  const tele = getTrackingTelemetry();

  // Handle click coordinates on map to cast sonar pings
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    
    // Calculate relative coordinates in SVG scale
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const [vx, vy, vw, vh] = viewBox;
    const svgX = vx + (clickX / rect.width) * vw;
    const svgY = vy + (clickY / rect.height) * vh;

    // Map to coordinates using Mercator approximations
    const lon = 1.4193 * svgX - 127.71;
    const lat = 134.86 - 3.365 * svgY;

    const newPing: PingEvent = {
      id: Date.now(),
      x: svgX,
      y: svgY,
      lat: Math.max(-90, Math.min(90, lat)),
      lon: ((lon + 180) % 360) - 180
    };

    setPings(prev => [...prev.slice(-3), newPing]); // limit to last 4 clicks
  };

  return (
    <GlassPanel 
      className="rounded-xl overflow-hidden flex flex-col justify-between" 
      style={{ 
        border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}`,
        height: '100%'
      }}
    >
      {/* Panel Header */}
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

      {/* SVG Map Container with Absolute Overlays */}
      <div className="flex-1 bg-black/55 relative flex items-center justify-center overflow-hidden p-1" style={{ minHeight: '160px' }}>
        
        {/* Layer Switches Overlay */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5 bg-black/80 border border-white/10 rounded p-1.5 text-[7.5px] font-mono text-slate-400">
          <div className="text-[6.5px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
            <Layers className="w-2.5 h-2.5" /> LAYERS
          </div>
          <button 
            onClick={() => setLayers(l => ({ ...l, grid: !l.grid }))} 
            className="px-1.5 py-0.5 rounded text-left flex items-center justify-between gap-3 cursor-pointer transition-colors hover:text-white"
            style={{
              color: layers.grid ? themeColor : undefined,
              backgroundColor: layers.grid ? `${themeColor}15` : undefined
            }}
          >
            <span>GRID</span>
            <span className="w-1 h-1 rounded-full bg-current"></span>
          </button>
          <button 
            onClick={() => setLayers(l => ({ ...l, terrain: !l.terrain }))} 
            className="px-1.5 py-0.5 rounded text-left flex items-center justify-between gap-3 cursor-pointer transition-colors hover:text-white"
            style={{
              color: layers.terrain ? themeColor : undefined,
              backgroundColor: layers.terrain ? `${themeColor}15` : undefined
            }}
          >
            <span>TERRAIN</span>
            <span className="w-1 h-1 rounded-full bg-current"></span>
          </button>
          <button 
            onClick={() => setLayers(l => ({ ...l, path: !l.path }))} 
            className="px-1.5 py-0.5 rounded text-left flex items-center justify-between gap-3 cursor-pointer transition-colors hover:text-white"
            style={{
              color: layers.path ? themeColor : undefined,
              backgroundColor: layers.path ? `${themeColor}15` : undefined
            }}
          >
            <span>PATH</span>
            <span className="w-1 h-1 rounded-full bg-current"></span>
          </button>
          <button 
            onClick={() => setLayers(l => ({ ...l, scan: !l.scan }))} 
            className="px-1.5 py-0.5 rounded text-left flex items-center justify-between gap-3 cursor-pointer transition-colors hover:text-white"
            style={{
              color: layers.scan ? themeColor : undefined,
              backgroundColor: layers.scan ? `${themeColor}15` : undefined
            }}
          >
            <span>SCANNER</span>
            <span className="w-1 h-1 rounded-full bg-current"></span>
          </button>
        </div>

        {/* Speed Controls Overlay */}
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

        {/* Target Lock Sonar Pin Coordinate Box */}
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

        {/* SVG Interactive Map */}
        <svg 
          viewBox={viewBox.join(' ')} 
          onClick={handleMapClick}
          className="w-full h-full opacity-90 select-none cursor-crosshair"
          style={{ maxHeight: '200px' }}
        >
          <defs>
            {/* Tighter, high-density glowing micro-dot-matrix landmass pattern */}
            <pattern id="landPattern" width="2" height="2" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.35" fill={themeColor} opacity="0.32" />
            </pattern>
          </defs>

          {/* LAT/LON Coordinate Grid Lines */}
          {layers.grid && (
            <g stroke="rgba(255,255,255,0.03)" strokeWidth="0.3" fill="none">
              {/* Meridians */}
              <line x1="20" y1="0" x2="20" y2="100" />
              <line x1="40" y1="0" x2="40" y2="100" strokeDasharray="1,2" />
              <line x1="60" y1="0" x2="60" y2="100" />
              <line x1="80" y1="0" x2="80" y2="100" strokeDasharray="1,2" />
              <line x1="100" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
              <line x1="120" y1="0" x2="120" y2="100" strokeDasharray="1,2" />
              <line x1="140" y1="0" x2="140" y2="100" />
              <line x1="160" y1="0" x2="160" y2="100" strokeDasharray="1,2" />
              <line x1="180" y1="0" x2="180" y2="100" />
              
              {/* Parallels */}
              <line x1="0" y1="20" x2="200" y2="20" />
              <line x1="0" y1="40" x2="200" y2="40" strokeDasharray="1,2" />
              <line x1="0" y1="50" x2="200" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
              <line x1="0" y1="60" x2="200" y2="60" strokeDasharray="1,2" />
              <line x1="0" y1="80" x2="200" y2="80" />
            </g>
          )}

          {/* Border ticks and coordinate labels */}
          {layers.grid && (
            <g stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" fill="none">
              {/* Border rulers */}
              <rect x="0" y="0" width="200" height="100" />
              <line x1="20" y1="0" x2="20" y2="1.5" />
              <line x1="40" y1="0" x2="40" y2="1.5" />
              <line x1="60" y1="0" x2="60" y2="1.5" />
              <line x1="80" y1="0" x2="80" y2="1.5" />
              <line x1="100" y1="0" x2="100" y2="2.5" />
              <line x1="120" y1="0" x2="120" y2="1.5" />
              <line x1="140" y1="0" x2="140" y2="1.5" />
              <line x1="160" y1="0" x2="160" y2="1.5" />
              <line x1="180" y1="0" x2="180" y2="1.5" />

              <line x1="0" y1="20" x2="1.5" y2="20" />
              <line x1="0" y1="40" x2="1.5" y2="40" />
              <line x1="0" y1="50" x2="2.5" y2="50" />
              <line x1="0" y1="60" x2="1.5" y2="60" />
              <line x1="0" y1="80" x2="1.5" y2="80" />
            </g>
          )}

          {/* Continent Landmass Shapes */}
          <g>
            {Object.entries(CONTINENTS).map(([key, pathD]) => (
              <path 
                key={key} 
                d={pathD}
                stroke={themeColor}
                strokeWidth="0.45"
                fill={layers.terrain ? 'url(#landPattern)' : 'rgba(255,255,255,0.01)'}
                strokeOpacity="0.4"
                className="transition-colors duration-500"
              />
            ))}
          </g>

          {/* Active Ground Command Station Anchor */}
          {gs && (
            <g transform={`translate(${gs.svgX}, ${gs.svgY})`}>
              {/* Pulsing beacon target */}
              <polygon points="0,-2.2 2.2,0 0,2.2 -2.2,0" fill={gs.color} opacity="0.95" />
              <polygon points="0,-4.5 4.5,0 0,4.5 -4.5,0" fill="none" stroke={gs.color} strokeWidth="0.3">
                <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="transform" values="scale(1); scale(1.4); scale(1)" dur="2.2s" repeatCount="indefinite" />
              </polygon>
              {/* Micro station indicator label */}
              <text 
                x="3.5" 
                y="1" 
                fontSize="2.2px" 
                fontFamily="monospace" 
                fill={gs.color} 
                fontWeight="bold"
                letterSpacing="0.04em"
                opacity="0.9"
              >
                {gs.label}
              </text>
            </g>
          )}

          {/* Signal connection line (downlink) from Active Operator to its Ground Station */}
          {gs && activeTrackKey !== 'SURGEON' && (
            <g>
              <line 
                x1={tele.svgX} 
                y1={tele.svgY} 
                x2={gs.svgX} 
                y2={gs.svgY} 
                stroke={themeColor} 
                strokeWidth="0.25" 
                strokeDasharray="1.2,1.2" 
                opacity="0.32" 
              />
              {/* Traveling telemetry packet dot */}
              <circle r="0.5" fill={themeColor}>
                <animateMotion 
                  dur="2.5s" 
                  repeatCount="indefinite" 
                  path={`M ${tele.svgX},${tele.svgY} L ${gs.svgX},${gs.svgY}`} 
                />
              </circle>
            </g>
          )}

          {/* Operator Specific Trajectory/Route Paths */}
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
                />
              )}
              {activeTrackKey === 'PILOT' && (
                <>
                  <path 
                    d="M 38,28 Q 62,10 87,24" 
                    fill="none" 
                    stroke={themeColor} 
                    strokeWidth="0.75" 
                    strokeDasharray="2,2" 
                    opacity="0.8"
                  />
                  {/* Waypoint beacons */}
                  <circle cx="38" cy="28" r="1.2" fill={themeColor} opacity="0.6" />
                  <circle cx="87" cy="24" r="1.2" fill={themeColor} opacity="0.6" />
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
                />
              )}
              {activeTrackKey === 'TRUCKER' && (
                <path 
                  d="M 22,30 L 26,32 L 32,29 L 38,28" 
                  fill="none" 
                  stroke={themeColor} 
                  strokeWidth="0.75" 
                  opacity="0.7"
                />
              )}
            </>
          )}

          {/* Click Sonar ripple indicators */}
          {pings.map(ping => (
            <g key={ping.id}>
              <circle cx={ping.x} cy={ping.y} r="1.5" fill={C.red} />
              <circle cx={ping.x} cy={ping.y} r="8" fill="none" stroke={C.red} strokeWidth="0.4">
                <animate attributeName="r" values="1;9" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.95;0" dur="1.2s" repeatCount="indefinite" />
              </circle>
            </g>
          ))}

          {/* Localized Radar Sweep line centered on tracking target */}
          {layers.scan && activeTrackKey !== 'SURGEON' && (
            <g>
              <line 
                x1={tele.svgX} 
                y1={tele.svgY} 
                x2={tele.svgX + 18 * Math.cos((radarAngle * Math.PI) / 180)} 
                y2={tele.svgY + 18 * Math.sin((radarAngle * Math.PI) / 180)} 
                stroke={themeColor} 
                strokeWidth="0.45" 
                opacity="0.3" 
              />
              <circle 
                cx={tele.svgX} 
                cy={tele.svgY} 
                r="18" 
                fill="none" 
                stroke={themeColor} 
                strokeWidth="0.3" 
                strokeDasharray="1.5,2.5" 
                opacity="0.2" 
              />
            </g>
          )}

          {/* Pulsing Active Operator Tracker Dot - Made smaller and sleeker */}
          {activeTrackKey !== 'SURGEON' && (
            <g transform={`translate(${tele.svgX}, ${tele.svgY})`}>
              {/* Concentric pulsing waves */}
              <circle r="3.5" fill="none" stroke={themeColor} strokeWidth="0.4">
                <animate attributeName="r" values="1.2;5" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.85;0" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle r="1.4" fill={themeColor} />
            </g>
          )}
        </svg>
      </div>

      {/* Geolocation Live Telemetry Dashboard Footer */}
      <div className="px-3.5 py-2.5 bg-black/45 shrink-0 flex flex-col gap-2 border-t border-white/5 font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-slate-500 animate-spin-slow" style={{ color: themeColor }} />
            <span className="text-[9px] font-bold tracking-wider" style={{ color: C.fg }}>
              {tele.label}
            </span>
          </div>
          <span className="text-[7.5px] font-bold uppercase tracking-widest px-1 py-0.2 rounded border bg-black/40 border-white/5" style={{ color: themeColor, borderColor: `${themeColor}30` }}>
            {tele.pathName}
          </span>
        </div>

        {/* Real-time Ticking Numeric GPS Data Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[8.5px] border-t border-white/5 pt-2">
          <div className="flex justify-between">
            <span className="text-slate-500">LATITUDE</span>
            <span className="font-semibold tabular-nums" style={{ color: activeTrackKey === 'SURGEON' ? C.muted : C.fg }}>
              {activeTrackKey === 'SURGEON' ? 'RESTRICTED' : `${Math.abs(tele.lat).toFixed(6)}° ${tele.lat >= 0 ? 'N' : 'S'}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">ALTITUDE</span>
            <span className="font-semibold tabular-nums" style={{ color: activeTrackKey === 'SURGEON' ? C.muted : C.fg }}>
              {activeTrackKey === 'SURGEON' 
                ? 'RESTRICTED'
                : activeTrackKey === 'ASTRONAUT' 
                ? `${tele.alt.toFixed(2)} km` 
                : `${Math.round(tele.alt).toLocaleString()} ft`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">LONGITUDE</span>
            <span className="font-semibold tabular-nums" style={{ color: activeTrackKey === 'SURGEON' ? C.muted : C.fg }}>
              {activeTrackKey === 'SURGEON' ? 'RESTRICTED' : `${Math.abs(tele.lon).toFixed(6)}° ${tele.lon >= 0 ? 'E' : 'W'}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">VELOCITY</span>
            <span className="font-semibold tabular-nums" style={{ color: activeTrackKey === 'SURGEON' ? C.muted : C.fg }}>
              {activeTrackKey === 'SURGEON' 
                ? 'RESTRICTED'
                : activeTrackKey === 'ASTRONAUT' 
                ? `${Math.round(tele.speed).toLocaleString()} km/h` 
                : activeTrackKey === 'PILOT'
                ? `${Math.round(tele.speed)} kn`
                : activeTrackKey === 'TRAIN_PILOT'
                ? `${Math.round(tele.speed)} km/h`
                : `${Math.round(tele.speed)} mph`}
            </span>
          </div>
          <div className="flex justify-between border-t border-white/5 pt-1.5 mt-0.5">
            <span className="text-slate-500">HEADING</span>
            <span className="font-semibold tabular-nums text-slate-400">
              {activeTrackKey === 'SURGEON' ? 'N/A' : `${String(tele.heading).padStart(3, '0')}°`}
            </span>
          </div>
          <div className="flex justify-between border-t border-white/5 pt-1.5 mt-0.5">
            <span className="text-slate-500">GPS SATS</span>
            <span className="font-semibold text-slate-400 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 text-slate-500" style={{ color: themeColor }} /> {activeTrackKey === 'SURGEON' ? '0 LOCK' : `${tele.satellites} LOCK`}
            </span>
          </div>
        </div>

        {/* Security / System link integrity bars with Indian telemetry ground status */}
        <div className="flex items-center justify-between text-[7px] text-slate-500 border-t border-white/5 pt-2">
          <div className="flex items-center gap-1">
            <Lock className="w-2.5 h-2.5 text-green-500" />
            <span>
              {activeTrackKey === 'SURGEON'
                ? 'SYSTEM DOWNLINK RESTRICTED (CONFIDENTIAL SESSION)'
                : gs?.downlinkStatus || 'SECURE DATA LINK NOMINAL'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>PING: {tele.latency.toFixed(1)}ms</span>
            <div className="flex gap-0.5">
              <div className="w-0.5 h-1.5 bg-green-500" style={{ backgroundColor: themeColor }}></div>
              <div className="w-0.5 h-2 bg-green-500" style={{ backgroundColor: themeColor }}></div>
              <div className="w-0.5 h-2.5 bg-green-500" style={{ backgroundColor: themeColor }}></div>
              <div className="w-0.5 h-3 bg-green-500" style={{ backgroundColor: themeColor }}></div>
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}



