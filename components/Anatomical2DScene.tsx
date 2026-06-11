'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { C, TrackKey, TRACK_CONFIGS, STATUS, StatusType } from '@/lib/constants';
import { useTelemetryStore } from '@/lib/useTelemetryStore';
import { fmt } from '@/lib/helpers';
import { Heart, Activity, Wind, Brain, Info, ShieldAlert } from 'lucide-react';

interface Anatomical2DSceneProps {
  last: any;
  crisis: boolean;
  activeTrackKey: TrackKey;
  temp: number;
  pressure: number;
  tempSt: StatusType;
  pressureSt: StatusType;
}

export default function Anatomical2DScene({
  last,
  crisis,
  activeTrackKey,
  temp,
  pressure,
  tempSt,
  pressureSt
}: Anatomical2DSceneProps) {
  const selectedOrgan = useTelemetryStore((s) => s.selectedOrgan);
  const setSelectedOrgan = useTelemetryStore((s) => s.setSelectedOrgan);
  const trackConf = TRACK_CONFIGS[activeTrackKey];

  // Map values
  const hr = last.heartRate ?? 72;
  const spo2 = last.spO2 ?? 98;
  const lat = last.cognitiveLatency ?? 210;

  // Determine specific statuses
  const spo2St: StatusType = spo2 < 93 ? 'critical' : spo2 < 95 ? 'warn' : 'ok';
  const hrSt: StatusType = hr > 120 ? 'critical' : hr > 110 ? 'warn' : 'ok';
  const latSt: StatusType = lat > 430 ? 'critical' : lat > 380 ? 'warn' : 'ok';

  // Base theme color helper
  const themeColor = trackConf.themeColor;

  // Organ dynamic colors based on status/crisis
  const getOrganColor = (organ: 'brain' | 'heart' | 'lungs' | 'systemic') => {
    if (crisis) return C.red;
    switch (organ) {
      case 'brain':
        return latSt === 'critical' ? C.red : latSt === 'warn' ? C.amber : themeColor;
      case 'heart':
        return hrSt === 'critical' ? C.red : hrSt === 'warn' ? C.amber : themeColor;
      case 'lungs':
        return spo2St === 'critical' ? C.red : spo2St === 'warn' ? C.amber : themeColor;
      case 'systemic':
        const sysCrit = tempSt === 'critical' || pressureSt === 'critical';
        const sysWarn = tempSt === 'warn' || pressureSt === 'warn';
        return sysCrit ? C.red : sysWarn ? C.amber : themeColor;
      default:
        return themeColor;
    }
  };

  const brainColor = getOrganColor('brain');
  const heartColor = getOrganColor('heart');
  const lungsColor = getOrganColor('lungs');
  const systemicColor = getOrganColor('systemic');

  // Heartbeat calculation (duration in seconds)
  const heartPeriod = 60 / Math.max(35, Math.min(220, hr));

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-black/10 overflow-hidden select-none select-none">
      {/* 2D Cybernetic Blueprint SVG */}
      <svg
        viewBox="0 0 380 440"
        className="w-full h-full max-h-[440px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Dynamic glows */}
          <filter id="glow-brain-filter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-heart-filter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-lungs-filter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background Radar Rings */}
        <circle cx="190" cy="140" r="75" stroke="rgba(255,255,255,0.015)" strokeWidth="0.8" strokeDasharray="3 3" />
        <circle cx="190" cy="140" r="110" stroke="rgba(255,255,255,0.01)" strokeWidth="0.8" />
        <circle cx="190" cy="140" r="140" stroke="rgba(255,255,255,0.007)" strokeWidth="0.8" strokeDasharray="5 5" />
        
        {/* Radar Sweeper Laser Line */}
        <motion.line
          x1="50"
          x2="330"
          y1="0"
          y2="0"
          stroke={crisis ? C.red : themeColor}
          strokeWidth="1.2"
          opacity="0.3"
          animate={{ y: [20, 420, 20] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />

        {/* Cybernetic Tech Outlines (Grid lines) */}
        <g stroke="rgba(255,255,255,0.025)" strokeWidth="0.5">
          <line x1="190" y1="20" x2="190" y2="420" strokeDasharray="2 2" />
          <line x1="30" y1="140" x2="350" y2="140" strokeDasharray="2 2" />
          <line x1="30" y1="230" x2="350" y2="230" strokeDasharray="4 4" />
        </g>

        {/* Body Blueprint Silhouette */}
        <g stroke="rgba(255,255,255,0.09)" strokeWidth="1" fill="none">
          {/* Head & Neck */}
          <circle cx="190" cy="65" r="22" stroke="rgba(255,255,255,0.14)" />
          <path d="M 190 87 L 190 105" />
          
          {/* Shoulders & Arms */}
          <path d="M 150 108 L 230 108" strokeWidth="1.5" />
          {/* Left Arm */}
          <path d="M 150 108 L 132 165 L 120 220" />
          <circle cx="150" cy="108" r="3" fill="rgba(255,255,255,0.1)" />
          <circle cx="132" cy="165" r="2" fill="rgba(255,255,255,0.1)" />
          <circle cx="120" cy="220" r="2" fill="rgba(255,255,255,0.1)" />
          
          {/* Right Arm */}
          <path d="M 230 108 L 248 165 L 260 220" />
          <circle cx="230" cy="108" r="3" fill="rgba(255,255,255,0.1)" />
          <circle cx="248" cy="165" r="2" fill="rgba(255,255,255,0.1)" />
          <circle cx="260" cy="220" r="2" fill="rgba(255,255,255,0.1)" />

          {/* Spine & Ribcage */}
          <path d="M 190 105 L 190 230" strokeWidth="1.2" strokeDasharray="4 2" />
          <ellipse cx="190" cy="138" rx="28" ry="10" stroke="rgba(255,255,255,0.05)" />
          <ellipse cx="190" cy="158" rx="32" ry="12" stroke="rgba(255,255,255,0.05)" />
          <ellipse cx="190" cy="178" rx="28" ry="10" stroke="rgba(255,255,255,0.05)" />

          {/* Pelvis */}
          <path d="M 162 230 L 218 230" strokeWidth="1.5" />
          <circle cx="190" cy="230" r="6" stroke="rgba(255,255,255,0.15)" />

          {/* Left Leg */}
          <path d="M 165 230 L 165 315 L 165 400" />
          <circle cx="165" cy="315" r="2.5" fill="rgba(255,255,255,0.1)" />
          <circle cx="165" cy="400" r="2.5" fill="rgba(255,255,255,0.1)" />

          {/* Right Leg */}
          <path d="M 215 230 L 215 315 L 215 400" />
          <circle cx="215" cy="315" r="2.5" fill="rgba(255,255,255,0.1)" />
          <circle cx="215" cy="400" r="2.5" fill="rgba(255,255,255,0.1)" />
        </g>

        {/* Circulatory Pathways (Pulsing tech lines) */}
        <g stroke={systemicColor} strokeWidth="0.8" fill="none" opacity="0.4">
          <path d="M 190 135 L 140 108 L 122 215" strokeDasharray="4 6" />
          <path d="M 190 135 L 240 108 L 258 215" strokeDasharray="4 6" />
          <path d="M 190 178 L 165 230 L 165 390" strokeDasharray="5 7" />
          <path d="M 190 178 L 215 230 L 215 390" strokeDasharray="5 7" />
        </g>

        {/* ==================== LEADER LINES ==================== */}
        {/* Brain Line: From head to upper-left */}
        <path
          d="M 190 55 L 130 30 L 25 30"
          stroke={selectedOrgan === 'brain' ? brainColor : 'rgba(255,255,255,0.15)'}
          strokeWidth={selectedOrgan === 'brain' ? 1.2 : 0.8}
          fill="none"
          className="transition-colors duration-300"
        />
        <circle cx="190" cy="55" r="2" fill={brainColor} />
        <circle cx="25" cy="30" r="2" fill={brainColor} />

        {/* Lungs Line: From lung region to mid-right */}
        <path
          d="M 215 145 L 260 100 L 355 100"
          stroke={selectedOrgan === 'lungs' ? lungsColor : 'rgba(255,255,255,0.15)'}
          strokeWidth={selectedOrgan === 'lungs' ? 1.2 : 0.8}
          fill="none"
          className="transition-colors duration-300"
        />
        <circle cx="215" cy="145" r="2" fill={lungsColor} />
        <circle cx="355" cy="100" r="2" fill={lungsColor} />

        {/* Heart Line: From heart region to mid-left */}
        <path
          d="M 180 135 L 125 185 L 25 185"
          stroke={selectedOrgan === 'heart' ? heartColor : 'rgba(255,255,255,0.15)'}
          strokeWidth={selectedOrgan === 'heart' ? 1.2 : 0.8}
          fill="none"
          className="transition-colors duration-300"
        />
        <circle cx="180" cy="135" r="2" fill={heartColor} />
        <circle cx="25" cy="185" r="2" fill={heartColor} />

        {/* Systemic Line: From lower spine to lower-right */}
        <path
          d="M 190 205 L 250 275 L 355 275"
          stroke={selectedOrgan === 'none' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)'}
          strokeWidth={0.8}
          fill="none"
        />
        <circle cx="190" cy="205" r="2" fill={systemicColor} />
        <circle cx="355" cy="275" r="2" fill={systemicColor} />


        {/* ==================== ORGAN INTERACTIVE SHAPES ==================== */}
        
        {/* BRAIN NODES & MESH */}
        <g filter="url(#glow-brain-filter)">
          {/* Glowing brain stem/nodes */}
          <motion.circle
            cx="190"
            cy="58"
            r={selectedOrgan === 'brain' ? 5 : 3}
            fill={brainColor}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <circle cx="180" cy="64" r="3" fill={brainColor} opacity="0.8" />
          <circle cx="200" cy="64" r="3" fill={brainColor} opacity="0.8" />
          <circle cx="190" cy="72" r="3.5" fill={brainColor} />
          <path d="M 180 64 L 190 58 L 200 64 L 190 72 Z M 180 64 L 190 72 M 190 58 L 190 72" stroke={brainColor} strokeWidth="0.5" opacity="0.6" />
        </g>
        {/* Brain click detector */}
        <circle
          cx="190"
          cy="65"
          r="20"
          fill="transparent"
          className="cursor-pointer"
          onClick={() => setSelectedOrgan(selectedOrgan === 'brain' ? 'none' : 'brain')}
        />

        {/* LUNGS VECTOR SHAPES */}
        <g filter="url(#glow-lungs-filter)">
          {/* Left Lung Lobe */}
          <motion.path
            d="M 184 130 C 170 126, 160 132, 160 148 C 160 162, 172 166, 184 162 Z"
            fill="none"
            stroke={lungsColor}
            strokeWidth="1.2"
            animate={{ scale: [1, 1.05, 1] }}
            style={{ transformOrigin: '184px 146px' }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Right Lung Lobe */}
          <motion.path
            d="M 196 130 C 210 126, 220 132, 220 148 C 220 162, 208 166, 196 162 Z"
            fill="none"
            stroke={lungsColor}
            strokeWidth="1.2"
            animate={{ scale: [1, 1.05, 1] }}
            style={{ transformOrigin: '196px 146px' }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Air tubes */}
          <path d="M 190 108 L 190 128 L 180 138 M 190 128 L 200 138" stroke={lungsColor} strokeWidth="0.8" opacity="0.6" />
        </g>
        {/* Lungs click detector */}
        <ellipse
          cx="190"
          cy="146"
          rx="32"
          ry="18"
          fill="transparent"
          className="cursor-pointer"
          onClick={() => setSelectedOrgan(selectedOrgan === 'lungs' ? 'none' : 'lungs')}
        />

        {/* HEART STYLIZED SHAPE */}
        <g filter="url(#glow-heart-filter)">
          {/* Concentric Heart Beat Waves */}
          <motion.circle
            cx="187"
            cy="134"
            r="16"
            stroke={heartColor}
            strokeWidth="0.8"
            fill="none"
            animate={{ scale: [0.7, 1.6], opacity: [0.8, 0] }}
            transition={{ duration: heartPeriod, repeat: Infinity, ease: "easeOut" }}
            style={{ transformOrigin: '187px 134px' }}
          />
          {/* Core Heart Node */}
          <motion.path
            d="M 187 141 C 184 138, 177 131, 177 125 C 177 119, 183 119, 187 122 C 191 119, 197 119, 197 125 C 197 131, 190 138, 187 141 Z"
            fill={heartColor}
            stroke={heartColor}
            strokeWidth="0.5"
            animate={{ scale: [1, 1.16, 1] }}
            transition={{ duration: heartPeriod, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: '187px 131px' }}
          />
        </g>
        {/* Heart click detector */}
        <circle
          cx="187"
          cy="134"
          r="12"
          fill="transparent"
          className="cursor-pointer"
          onClick={() => setSelectedOrgan(selectedOrgan === 'heart' ? 'none' : 'heart')}
        />
      </svg>

      {/* ==================== SMALL HUD INFO BOXES ==================== */}
      {/* Upper-Left: BRAIN */}
      <div
        onClick={() => setSelectedOrgan(selectedOrgan === 'brain' ? 'none' : 'brain')}
        className={`absolute left-2 top-[12px] p-1.5 rounded border text-[8.5px] font-mono w-[105px] bg-black/80 backdrop-blur-md cursor-pointer transition-all duration-300 ${
          selectedOrgan === 'brain'
            ? 'border-white/80 shadow-[0_0_10px_rgba(255,255,255,0.15)] scale-105'
            : 'border-white/5 hover:border-white/20'
        }`}
        style={{
          boxShadow: selectedOrgan === 'brain' ? `0 0 10px ${brainColor}33` : 'none',
          borderColor: selectedOrgan === 'brain' ? brainColor : undefined
        }}
      >
        <div className="flex items-center justify-between font-semibold border-b border-white/5 pb-0.5 mb-1" style={{ color: brainColor }}>
          <span className="flex items-center gap-1">
            <Brain className="w-2.5 h-2.5" /> NEURAL CORE
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${latSt === 'critical' || crisis ? 'bg-rose-500 animate-ping' : latSt === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        </div>
        <div className="text-slate-400 space-y-0.5">
          <div className="flex justify-between">
            <span>EEG FREQ:</span>
            <span className="text-white font-bold">{fmt(last.brainwaveFrequency ?? 12.5, 1)} Hz</span>
          </div>
          {activeTrackKey === 'TRAIN_PILOT' && (
            <div className="flex justify-between">
              <span>PERCLOS:</span>
              <span className="text-white">{fmt(last.perclos ?? 3.5, 1)}%</span>
            </div>
          )}
          {activeTrackKey === 'TRUCKER' && (
            <div className="flex justify-between">
              <span>FOCUS:</span>
              <span className="text-white">{fmt(last.alertness ?? 96, 1)}%</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>LATENCY:</span>
            <span className="text-white">{fmt(lat, 0)}ms</span>
          </div>
        </div>
      </div>

      {/* Mid-Left: HEART */}
      <div
        onClick={() => setSelectedOrgan(selectedOrgan === 'heart' ? 'none' : 'heart')}
        className={`absolute left-2 top-[165px] p-1.5 rounded border text-[8.5px] font-mono w-[105px] bg-black/80 backdrop-blur-md cursor-pointer transition-all duration-300 ${
          selectedOrgan === 'heart'
            ? 'border-white/80 shadow-[0_0_10px_rgba(255,255,255,0.15)] scale-105'
            : 'border-white/5 hover:border-white/20'
        }`}
        style={{
          boxShadow: selectedOrgan === 'heart' ? `0 0 10px ${heartColor}33` : 'none',
          borderColor: selectedOrgan === 'heart' ? heartColor : undefined
        }}
      >
        <div className="flex items-center justify-between font-semibold border-b border-white/5 pb-0.5 mb-1" style={{ color: heartColor }}>
          <span className="flex items-center gap-1">
            <Heart className="w-2.5 h-2.5" /> CARDIAC NODE
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${hrSt === 'critical' || crisis ? 'bg-rose-500 animate-ping' : hrSt === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        </div>
        <div className="text-slate-400 space-y-0.5">
          <div className="flex justify-between">
            <span>HEART RATE:</span>
            <span className="text-white font-bold">{fmt(hr, 0)} BPM</span>
          </div>
          {last.pwtt !== undefined && (
            <div className="flex justify-between">
              <span>PWTT:</span>
              <span className="text-white">{fmt(last.pwtt, 0)} ms</span>
            </div>
          )}
          {last.hrvRatio !== undefined && (
            <div className="flex justify-between">
              <span>HRV RATIO:</span>
              <span className="text-white">{fmt(last.hrvRatio, 2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>ECG MODE:</span>
            <span className="text-white">{crisis ? 'TACTICAL' : 'MONITOR'}</span>
          </div>
        </div>
      </div>

      {/* Mid-Right: LUNGS */}
      <div
        onClick={() => setSelectedOrgan(selectedOrgan === 'lungs' ? 'none' : 'lungs')}
        className={`absolute right-2 top-[82px] p-1.5 rounded border text-[8.5px] font-mono w-[105px] bg-black/80 backdrop-blur-md cursor-pointer transition-all duration-300 ${
          selectedOrgan === 'lungs'
            ? 'border-white/80 shadow-[0_0_10px_rgba(255,255,255,0.15)] scale-105'
            : 'border-white/5 hover:border-white/20'
        }`}
        style={{
          boxShadow: selectedOrgan === 'lungs' ? `0 0 10px ${lungsColor}33` : 'none',
          borderColor: selectedOrgan === 'lungs' ? lungsColor : undefined
        }}
      >
        <div className="flex items-center justify-between font-semibold border-b border-white/5 pb-0.5 mb-1" style={{ color: lungsColor }}>
          <span className="flex items-center gap-1">
            <Wind className="w-2.5 h-2.5" /> PULMONARY
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${spo2St === 'critical' || crisis ? 'bg-rose-500 animate-ping' : spo2St === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        </div>
        <div className="text-slate-400 space-y-0.5">
          <div className="flex justify-between">
            <span>SPO2 SENS:</span>
            <span className="text-white font-bold">{fmt(spo2, 1)}%</span>
          </div>
          {last.pCO2 !== undefined && (
            <div className="flex justify-between">
              <span>pCO2 CAPN:</span>
              <span className="text-white">{fmt(last.pCO2, 1)} mmHg</span>
            </div>
          )}
          {last.transthoracicImpedance !== undefined && (
            <div className="flex justify-between">
              <span>RESP VOL:</span>
              <span className="text-white">{fmt(last.transthoracicImpedance, 1)}%</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>AIRWAY:</span>
            <span className="text-white">{crisis ? 'RESERVE' : 'NOMINAL'}</span>
          </div>
        </div>
      </div>

      {/* Lower-Right: SYSTEMIC */}
      <div
        className={`absolute right-2 top-[255px] p-1.5 rounded border text-[8.5px] font-mono w-[105px] bg-black/80 backdrop-blur-md transition-all duration-300 ${
          crisis ? 'border-red-500/30' : 'border-white/5'
        }`}
        style={{
          borderColor: crisis ? C.red : undefined
        }}
      >
        <div className="flex items-center justify-between font-semibold border-b border-white/5 pb-0.5 mb-1" style={{ color: systemicColor }}>
          <span className="flex items-center gap-1">
            <Activity className="w-2.5 h-2.5" /> SYSTEMIC
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${crisis ? 'bg-rose-500 animate-ping' : tempSt === 'warn' || pressureSt === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        </div>
        <div className="text-slate-400 space-y-0.5">
          <div className="flex justify-between">
            <span>BODY TEMP:</span>
            <span className="text-white font-bold">{fmt(temp, 1)}°F</span>
          </div>
          <div className="flex justify-between">
            <span>PRESSURE:</span>
            <span className="text-white font-bold">{fmt(pressure, 2)}psi</span>
          </div>
          <div className="flex justify-between">
            <span>GLUCOSE:</span>
            <span className="text-white">{fmt(last.glucose ?? 95, 0)} mg/dL</span>
          </div>
          <div className="flex justify-between border-t border-white/5 pt-0.5 mt-0.5">
            <span>INTEGRITY:</span>
            <span className="font-bold" style={{ color: crisis ? C.red : C.green }}>
              {crisis ? 'CRIT/FAIL' : '99.8%'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive instruction tooltip (Bottom Center) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 font-mono text-[7px] text-slate-500 bg-black/40 px-2 py-0.5 rounded border border-white/5 pointer-events-none">
        <Info className="w-2 h-2 text-slate-500" />
        <span>SELECT ORGAN NODES FOR BIOMETRIC LINK</span>
      </div>
    </div>
  );
}
