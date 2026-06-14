'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { C, TrackKey, TRACK_CONFIGS, STATUS, StatusType } from '@/lib/constants';
import { useTelemetryStore } from '@/lib/useTelemetryStore';
import { fmt } from '@/lib/helpers';
import { Heart, Activity, Wind, Brain, Info } from 'lucide-react';

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

  const activeTrackData = last.trackData?.[activeTrackKey] || {};
  const hr = last.heartRate ?? 72;
  const spo2 = last.spO2 ?? 98;
  const lat = last.cognitiveLatency ?? 210;

  const spo2St: StatusType = spo2 < 93 ? 'critical' : spo2 < 95 ? 'warn' : 'ok';
  const hrSt: StatusType = hr > 120 ? 'critical' : hr > 110 ? 'warn' : 'ok';
  const latSt: StatusType = lat > 430 ? 'critical' : lat > 380 ? 'warn' : 'ok';

  const themeColor = trackConf.themeColor;

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
  const heartPeriod = 60 / Math.max(35, Math.min(220, hr));
  const breathDuration = 4 + (crisis ? -1.5 : 0);

  // Track-specific equipment configs
  const TRACK_GEAR: Record<TrackKey, { helmet: boolean; visor: boolean; suit: boolean; gloves: boolean; label: string }> = {
    ASTRONAUT: { helmet: true, visor: true, suit: true, gloves: true, label: 'EVA SUIT' },
    PILOT: { helmet: true, visor: true, suit: false, gloves: true, label: 'FLIGHT GEAR' },
    SURGEON: { helmet: false, visor: false, suit: false, gloves: true, label: 'SURGICAL PPE' },
    TRAIN_PILOT: { helmet: false, visor: false, suit: false, gloves: false, label: 'STANDARD' },
    TRUCKER: { helmet: false, visor: false, suit: false, gloves: false, label: 'CABIN WEAR' },
  };
  const gear = TRACK_GEAR[activeTrackKey];

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-black/10 overflow-hidden select-none">
      <svg
        viewBox="0 0 380 440"
        className="w-full h-full max-h-[440px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow-organ" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="body-grad" cx="50%" cy="35%" r="55%">
            <stop offset="0%" stopColor={themeColor} stopOpacity="0.06" />
            <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
          </radialGradient>
          {/* Blood flow animated dash */}
          <linearGradient id="blood-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={heartColor} stopOpacity="0" />
            <stop offset="50%" stopColor={heartColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={heartColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Subtle body aura */}
        <ellipse cx="190" cy="180" rx="100" ry="160" fill="url(#body-grad)" />

        {/* Background grid - track themed */}
        <g stroke={themeColor} opacity="0.03" strokeWidth="0.5">
          <line x1="190" y1="20" x2="190" y2="420" strokeDasharray="2 4" />
          <line x1="70" y1="140" x2="310" y2="140" strokeDasharray="2 4" />
          <line x1="70" y1="230" x2="310" y2="230" strokeDasharray="3 5" />
        </g>

        {/* Radar sweep - speed varies by track */}
        <motion.line
          x1="60" x2="320" y1="0" y2="0"
          stroke={crisis ? C.red : themeColor}
          strokeWidth="1"
          opacity="0.25"
          animate={{ y: [25, 415, 25] }}
          transition={{ duration: activeTrackKey === 'SURGEON' ? 3 : activeTrackKey === 'ASTRONAUT' ? 8 : 5, repeat: Infinity, ease: "linear" }}
        />

        {/* ====== BODY SILHOUETTE ====== */}
        <g stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none">
          {/* Head */}
          <circle cx="190" cy="62" r="20" stroke="rgba(255,255,255,0.15)" />
          {/* Face detail - eyes hint */}
          <circle cx="183" cy="58" r="1.5" fill="rgba(255,255,255,0.12)" />
          <circle cx="197" cy="58" r="1.5" fill="rgba(255,255,255,0.12)" />

          {/* Helmet / Visor (track-specific) */}
          {gear.helmet && (
            <circle cx="190" cy="62" r="24" stroke={themeColor} strokeWidth="0.8" opacity="0.35" strokeDasharray="3 2" />
          )}
          {gear.visor && (
            <path d="M 177 54 Q 190 48, 203 54" stroke={themeColor} strokeWidth="1.2" opacity="0.5" />
          )}

          {/* Neck */}
          <path d="M 190 82 L 190 100" strokeWidth="1.2" />

          {/* Shoulders - wider for astronaut/pilot */}
          {activeTrackKey === 'ASTRONAUT' ? (
            <path d="M 142 105 Q 165 100, 190 100 Q 215 100, 238 105" strokeWidth="2" stroke="rgba(255,255,255,0.12)" />
          ) : (
            <path d="M 148 105 L 232 105" strokeWidth="1.5" />
          )}

          {/* Left Arm */}
          <path d="M 148 105 Q 138 140, 130 170 Q 124 195, 118 220" />
          <circle cx="148" cy="105" r="3" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" />
          <circle cx="130" cy="170" r="2" fill="rgba(255,255,255,0.08)" />

          {/* Right Arm */}
          <path d="M 232 105 Q 242 140, 250 170 Q 256 195, 262 220" />
          <circle cx="232" cy="105" r="3" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" />
          <circle cx="250" cy="170" r="2" fill="rgba(255,255,255,0.08)" />

          {/* Hand details for surgeon */}
          {activeTrackKey === 'SURGEON' && (
            <g stroke={crisis ? C.red : themeColor} opacity="0.5" strokeWidth="0.6">
              <path d="M 262 220 L 266 228 M 262 220 L 264 230 M 262 220 L 260 229" />
              <path d="M 118 220 L 114 228 M 118 220 L 116 230 M 118 220 L 120 229" />
            </g>
          )}

          {/* Glove indicators */}
          {gear.gloves && (
            <>
              <circle cx="118" cy="220" r="4" stroke={themeColor} strokeWidth="0.5" opacity="0.3" />
              <circle cx="262" cy="220" r="4" stroke={themeColor} strokeWidth="0.5" opacity="0.3" />
            </>
          )}

          {/* Torso / Ribcage */}
          <path d="M 190 100 L 190 228" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
          {[125, 140, 155, 170].map((y, i) => (
            <ellipse key={y} cx="190" cy={y} rx={24 + i * 2} ry={8 + i} stroke="rgba(255,255,255,0.04)" />
          ))}

          {/* Suit outline for astronaut */}
          {gear.suit && (
            <path
              d="M 142 105 Q 135 160, 138 228 L 160 228 L 160 400 M 238 105 Q 245 160, 242 228 L 220 228 L 220 400"
              stroke={themeColor} strokeWidth="0.6" opacity="0.2" strokeDasharray="5 3"
            />
          )}

          {/* Pelvis */}
          <path d="M 160 228 Q 190 240, 220 228" strokeWidth="1.5" />

          {/* Left Leg */}
          <path d="M 168 230 Q 166 280, 166 320 Q 166 360, 166 400" />
          <circle cx="166" cy="320" r="2.5" fill="rgba(255,255,255,0.08)" />

          {/* Right Leg */}
          <path d="M 212 230 Q 214 280, 214 320 Q 214 360, 214 400" />
          <circle cx="214" cy="320" r="2.5" fill="rgba(255,255,255,0.08)" />
        </g>

        {/* ====== CIRCULATORY SYSTEM ====== */}
        <g stroke={heartColor} strokeWidth="0.7" fill="none" opacity="0.35">
          {/* Arterial paths with animated flow */}
          <motion.path
            d="M 190 135 Q 160 120, 132 170 Q 122 200, 118 220"
            strokeDasharray="3 6"
            animate={{ strokeDashoffset: [0, -18] }}
            transition={{ duration: heartPeriod * 2, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M 190 135 Q 220 120, 248 170 Q 258 200, 262 220"
            strokeDasharray="3 6"
            animate={{ strokeDashoffset: [0, -18] }}
            transition={{ duration: heartPeriod * 2, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M 190 175 Q 178 210, 166 320 L 166 395"
            strokeDasharray="4 8"
            animate={{ strokeDashoffset: [0, -24] }}
            transition={{ duration: heartPeriod * 3, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M 190 175 Q 202 210, 214 320 L 214 395"
            strokeDasharray="4 8"
            animate={{ strokeDashoffset: [0, -24] }}
            transition={{ duration: heartPeriod * 3, repeat: Infinity, ease: "linear" }}
          />
        </g>

        {/* ====== TRACK-SPECIFIC OVERLAYS ====== */}

        {/* ASTRONAUT: Radiation rings around body */}
        {activeTrackKey === 'ASTRONAUT' && (
          <g>
            {[0, 1, 2].map(i => (
              <motion.circle key={`rad-${i}`} cx="190" cy="160" r={80 + i * 35}
                stroke={crisis ? C.red : themeColor} strokeWidth="0.4" fill="none"
                strokeDasharray="8 12"
                animate={{ opacity: [0.08, 0.2, 0.08], rotate: [0, 360] }}
                transition={{ duration: 20 + i * 8, repeat: Infinity, ease: "linear", delay: i * 2 }}
                style={{ transformOrigin: '190px 160px' }}
              />
            ))}
            {/* Zero-G particle float */}
            {[1,2,3,4,5].map(i => (
              <motion.circle key={`zg-${i}`} cx={140 + i * 20} cy={100 + i * 30} r="1"
                fill={themeColor} opacity="0.4"
                animate={{ y: [-5, 5, -5], x: [-3, 3, -3] }}
                transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
              />
            ))}
          </g>
        )}

        {/* PILOT: G-Force vector arrows */}
        {activeTrackKey === 'PILOT' && (
          <g>
            {/* G-force direction arrows */}
            {[0, 1, 2].map(i => (
              <motion.g key={`gf-${i}`}
                animate={{ opacity: crisis ? [0.6, 1, 0.6] : [0.1, 0.25, 0.1] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
              >
                <line x1="190" y1={30 + i * 12} x2="190" y2={40 + i * 12} stroke={crisis ? C.red : themeColor} strokeWidth="1.5" />
                <polygon points={`186,${40 + i * 12} 190,${46 + i * 12} 194,${40 + i * 12}`} fill={crisis ? C.red : themeColor} />
              </motion.g>
            ))}
            {/* Speed lines on sides */}
            {[0, 1, 2, 3].map(i => (
              <motion.line key={`sl-${i}`}
                x1={70 + i * 5} y1={80 + i * 40} x2={90 + i * 5} y2={80 + i * 40}
                stroke={themeColor} strokeWidth="0.6" opacity="0.2"
                animate={{ x: [-10, 10, -10] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </g>
        )}

        {/* SURGEON: Precision crosshair + hand tremor visualization */}
        {activeTrackKey === 'SURGEON' && (
          <g>
            {/* Surgical precision grid around hands */}
            <motion.g animate={{ opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 2, repeat: Infinity }}>
              {/* Right hand precision zone */}
              <circle cx="262" cy="220" r="12" stroke={themeColor} strokeWidth="0.4" strokeDasharray="2 2" />
              <line x1="250" y1="220" x2="274" y2="220" stroke={themeColor} strokeWidth="0.3" />
              <line x1="262" y1="208" x2="262" y2="232" stroke={themeColor} strokeWidth="0.3" />
              {/* Left hand precision zone */}
              <circle cx="118" cy="220" r="12" stroke={themeColor} strokeWidth="0.4" strokeDasharray="2 2" />
              <line x1="106" y1="220" x2="130" y2="220" stroke={themeColor} strokeWidth="0.3" />
              <line x1="118" y1="208" x2="118" y2="232" stroke={themeColor} strokeWidth="0.3" />
            </motion.g>
            {/* Tremor visualization (shaking waveform near hands) */}
            <motion.path
              d="M 250 235 Q 253 232, 256 235 Q 259 238, 262 235 Q 265 232, 268 235"
              stroke={crisis ? C.red : themeColor} strokeWidth="0.8" fill="none" opacity="0.5"
              animate={{ y: crisis ? [-2, 2, -2] : [0, 0.5, 0] }}
              transition={{ duration: crisis ? 0.15 : 0.8, repeat: Infinity }}
            />
          </g>
        )}

        {/* TRAIN_PILOT: Eye tracking scan + alertness indicator */}
        {activeTrackKey === 'TRAIN_PILOT' && (
          <g>
            {/* Eye tracking scan beam */}
            <motion.line
              x1="175" y1="56" x2="205" y2="56"
              stroke={themeColor} strokeWidth="1.5" opacity="0.4"
              animate={{ y: [52, 64, 52] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Alertness rings around head */}
            <motion.circle cx="190" cy="62" r="30"
              stroke={crisis ? C.amber : themeColor} strokeWidth="0.6" fill="none"
              strokeDasharray="4 3"
              animate={{ opacity: [0.15, 0.35, 0.15] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            {/* PERCLOS eye closure indicator */}
            <motion.path
              d="M 180 58 Q 190 62, 200 58"
              stroke={crisis ? C.red : themeColor} strokeWidth="1" fill="none" opacity="0.6"
              animate={{ d: crisis ? ["M 180 58 Q 190 62, 200 58", "M 180 60 Q 190 60, 200 60", "M 180 58 Q 190 62, 200 58"] : undefined }}
              transition={crisis ? { duration: 4, repeat: Infinity } : undefined}
            />
          </g>
        )}

        {/* TRUCKER: Drowsiness wave + seat sensors */}
        {activeTrackKey === 'TRUCKER' && (
          <g>
            {/* Seat sensor pad indicators */}
            <rect x="162" y="228" width="56" height="8" rx="2" stroke={themeColor} strokeWidth="0.5" fill={`${themeColor}08`} opacity="0.5" />
            {/* Back sensor */}
            <rect x="182" y="140" width="16" height="60" rx="3" stroke={themeColor} strokeWidth="0.4" fill="none" opacity="0.3" strokeDasharray="2 3" />
            {/* Drowsiness wave over head */}
            <motion.path
              d="M 165 40 Q 172 35, 178 40 Q 184 45, 190 40 Q 196 35, 202 40 Q 208 45, 215 40"
              stroke={crisis ? C.red : C.amber} strokeWidth="0.8" fill="none"
              animate={{ opacity: crisis ? [0.5, 0.8, 0.5] : [0.1, 0.25, 0.1] }}
              transition={{ duration: crisis ? 1 : 3, repeat: Infinity }}
            />
          </g>
        )}

        {/* ====== INTERACTIVE ORGANS ====== */}

        {/* BRAIN */}
        <g filter="url(#glow-organ)">
          <motion.circle cx="190" cy="56" r={selectedOrgan === 'brain' ? 5 : 3}
            fill={brainColor}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          {/* Neural network mesh */}
          {[{x:181,y:60},{x:199,y:60},{x:185,y:68},{x:195,y:68},{x:190,y:52}].map((n, i) => (
            <React.Fragment key={`bn-${i}`}>
              <circle cx={n.x} cy={n.y} r="2" fill={brainColor} opacity="0.7" />
              <line x1="190" y1="56" x2={n.x} y2={n.y} stroke={brainColor} strokeWidth="0.4" opacity="0.4" />
            </React.Fragment>
          ))}
          {/* Neural firing pulses */}
          <motion.circle cx="190" cy="56" r="8"
            stroke={brainColor} strokeWidth="0.6" fill="none"
            animate={{ scale: [0.5, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ transformOrigin: '190px 56px' }}
          />
        </g>
        <circle cx="190" cy="62" r="22" fill="transparent" className="cursor-pointer"
          onClick={() => setSelectedOrgan(selectedOrgan === 'brain' ? 'none' : 'brain')}
        />

        {/* LUNGS */}
        <g filter="url(#glow-organ)">
          {/* Animated breathing lungs */}
          <motion.path
            d="M 182 125 C 168 120, 156 128, 156 145 C 156 160, 170 165, 182 160 Z"
            fill="none" stroke={lungsColor} strokeWidth="1"
            animate={{ scale: [1, 1.06, 1] }}
            style={{ transformOrigin: '170px 142px' }}
            transition={{ duration: breathDuration, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M 198 125 C 212 120, 224 128, 224 145 C 224 160, 210 165, 198 160 Z"
            fill="none" stroke={lungsColor} strokeWidth="1"
            animate={{ scale: [1, 1.06, 1] }}
            style={{ transformOrigin: '210px 142px' }}
            transition={{ duration: breathDuration, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Bronchial tree */}
          <path d="M 190 105 L 190 125 M 190 118 L 175 130 M 190 118 L 205 130" stroke={lungsColor} strokeWidth="0.6" opacity="0.5" />
          {/* O2 flow particles */}
          {[0, 1, 2].map(i => (
            <motion.circle key={`o2-${i}`} cx={165 + i * 25} cy="140" r="1"
              fill={lungsColor} opacity="0.6"
              animate={{ cy: [130, 155, 130], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: breathDuration, repeat: Infinity, delay: i * 0.5 }}
            />
          ))}
        </g>
        <ellipse cx="190" cy="142" rx="38" ry="22" fill="transparent" className="cursor-pointer"
          onClick={() => setSelectedOrgan(selectedOrgan === 'lungs' ? 'none' : 'lungs')}
        />

        {/* HEART */}
        <g filter="url(#glow-organ)">
          {/* Heartbeat pressure wave */}
          <motion.circle cx="187" cy="133" r="14"
            stroke={heartColor} strokeWidth="0.6" fill="none"
            animate={{ scale: [0.6, 1.5], opacity: [0.7, 0] }}
            transition={{ duration: heartPeriod, repeat: Infinity, ease: "easeOut" }}
            style={{ transformOrigin: '187px 133px' }}
          />
          <motion.circle cx="187" cy="133" r="10"
            stroke={heartColor} strokeWidth="0.4" fill="none"
            animate={{ scale: [0.6, 1.3], opacity: [0.5, 0] }}
            transition={{ duration: heartPeriod, repeat: Infinity, ease: "easeOut", delay: 0.1 }}
            style={{ transformOrigin: '187px 133px' }}
          />
          {/* Heart shape */}
          <motion.path
            d="M 187 140 C 184 137, 177 130, 177 124 C 177 118, 183 118, 187 121 C 191 118, 197 118, 197 124 C 197 130, 190 137, 187 140 Z"
            fill={heartColor} stroke={heartColor} strokeWidth="0.4"
            animate={{ scale: [1, 1.14, 1] }}
            transition={{ duration: heartPeriod, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: '187px 130px' }}
          />
        </g>
        <circle cx="187" cy="133" r="14" fill="transparent" className="cursor-pointer"
          onClick={() => setSelectedOrgan(selectedOrgan === 'heart' ? 'none' : 'heart')}
        />

        {/* ====== LEADER LINES ====== */}
        {/* Brain → top-left */}
        <line x1="190" y1="45" x2="130" y2="28" stroke={selectedOrgan === 'brain' ? brainColor : 'rgba(255,255,255,0.12)'} strokeWidth={selectedOrgan === 'brain' ? 1 : 0.6} className="transition-colors duration-300" />
        <line x1="130" y1="28" x2="25" y2="28" stroke={selectedOrgan === 'brain' ? brainColor : 'rgba(255,255,255,0.12)'} strokeWidth={selectedOrgan === 'brain' ? 1 : 0.6} className="transition-colors duration-300" />
        <circle cx="190" cy="45" r="1.5" fill={brainColor} />
        <circle cx="25" cy="28" r="1.5" fill={brainColor} />

        {/* Lungs → mid-right */}
        <line x1="224" y1="142" x2="280" y2="95" stroke={selectedOrgan === 'lungs' ? lungsColor : 'rgba(255,255,255,0.12)'} strokeWidth={selectedOrgan === 'lungs' ? 1 : 0.6} className="transition-colors duration-300" />
        <line x1="280" y1="95" x2="355" y2="95" stroke={selectedOrgan === 'lungs' ? lungsColor : 'rgba(255,255,255,0.12)'} strokeWidth={selectedOrgan === 'lungs' ? 1 : 0.6} className="transition-colors duration-300" />
        <circle cx="224" cy="142" r="1.5" fill={lungsColor} />
        <circle cx="355" cy="95" r="1.5" fill={lungsColor} />

        {/* Heart → mid-left */}
        <line x1="177" y1="133" x2="120" y2="180" stroke={selectedOrgan === 'heart' ? heartColor : 'rgba(255,255,255,0.12)'} strokeWidth={selectedOrgan === 'heart' ? 1 : 0.6} className="transition-colors duration-300" />
        <line x1="120" y1="180" x2="25" y2="180" stroke={selectedOrgan === 'heart' ? heartColor : 'rgba(255,255,255,0.12)'} strokeWidth={selectedOrgan === 'heart' ? 1 : 0.6} className="transition-colors duration-300" />
        <circle cx="177" cy="133" r="1.5" fill={heartColor} />
        <circle cx="25" cy="180" r="1.5" fill={heartColor} />

        {/* Systemic → lower-right */}
        <line x1="200" y1="200" x2="260" y2="270" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6" />
        <line x1="260" y1="270" x2="355" y2="270" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6" />
        <circle cx="200" cy="200" r="1.5" fill={systemicColor} />
        <circle cx="355" cy="270" r="1.5" fill={systemicColor} />

        {/* Track-specific equipment label */}
        <text x="190" y="425" textAnchor="middle" fill={themeColor} opacity="0.2" fontSize="6" fontFamily="monospace" letterSpacing="3">
          {gear.label}
        </text>
      </svg>

      {/* ====== HUD INFO BOXES ====== */}

      {/* Upper-Left: BRAIN */}
      <div
        onClick={() => setSelectedOrgan(selectedOrgan === 'brain' ? 'none' : 'brain')}
        className={`absolute left-2 top-[12px] p-1.5 rounded border text-[8.5px] font-mono w-[105px] bg-black/80 backdrop-blur-md cursor-pointer transition-all duration-300 ${
          selectedOrgan === 'brain' ? 'scale-105' : 'border-white/5 hover:border-white/20'
        }`}
        style={{
          boxShadow: selectedOrgan === 'brain' ? `0 0 10px ${brainColor}33` : 'none',
          borderColor: selectedOrgan === 'brain' ? brainColor : undefined
        }}
      >
        <div className="flex items-center justify-between font-semibold border-b border-white/5 pb-0.5 mb-1" style={{ color: brainColor }}>
          <span className="flex items-center gap-1">
            <Brain className="w-2.5 h-2.5" />
            {activeTrackKey === 'TRAIN_PILOT' ? 'NEUROVIGIL' : activeTrackKey === 'TRUCKER' ? 'ALERTNESS' : activeTrackKey === 'SURGEON' ? 'FOCUS CORE' : 'NEURAL CORE'}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${latSt === 'critical' || crisis ? 'bg-rose-500 animate-ping' : latSt === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        </div>
        <div className="text-slate-400 space-y-0.5">
          {activeTrackKey === 'TRAIN_PILOT' && (
            <>
              <div className="flex justify-between"><span>PERCLOS:</span><span className="text-white font-bold">{fmt(activeTrackData.perclos ?? 3.5, 1)}%</span></div>
              <div className="flex justify-between"><span>BLINK RT:</span><span className="text-white">{fmt(15 + (activeTrackData.perclos ?? 3.5) * 0.8, 0)}/min</span></div>
            </>
          )}
          {activeTrackKey === 'TRUCKER' && (
            <>
              <div className="flex justify-between"><span>FOCUS LVL:</span><span className="text-white font-bold">{fmt(activeTrackData.alertness ?? 96, 0)}%</span></div>
              <div className="flex justify-between"><span>DROWSY IDX:</span><span className="text-white">{fmt(100 - (activeTrackData.alertness ?? 96), 1)}%</span></div>
            </>
          )}
          {activeTrackKey === 'PILOT' && (
            <>
              <div className="flex justify-between"><span>G-LOC RISK:</span><span className="text-white font-bold">{fmt(Math.min(100, ((activeTrackData.gForce ?? 1.2) / 9) * 100), 0)}%</span></div>
              <div className="flex justify-between"><span>SPATIAL OR:</span><span className="text-white">{crisis ? 'IMPAIRED' : 'NOMINAL'}</span></div>
            </>
          )}
          {activeTrackKey === 'SURGEON' && (
            <>
              <div className="flex justify-between"><span>CONC. IDX:</span><span className="text-white font-bold">{crisis ? '32' : '94'}%</span></div>
              <div className="flex justify-between"><span>FATIGUE:</span><span className="text-white">{crisis ? 'HIGH' : 'LOW'}</span></div>
            </>
          )}
          {activeTrackKey === 'ASTRONAUT' && (
            <>
              <div className="flex justify-between"><span>EEG FREQ:</span><span className="text-white font-bold">{fmt(last.brainwaveFrequency ?? 12.5, 1)} Hz</span></div>
              <div className="flex justify-between"><span>μ-GRAVITY:</span><span className="text-white">{crisis ? 'DISORIENTED' : 'ADAPTED'}</span></div>
            </>
          )}
          <div className="flex justify-between"><span>LATENCY:</span><span className="text-white">{fmt(lat, 0)}ms</span></div>
        </div>
      </div>

      {/* Mid-Left: HEART */}
      <div
        onClick={() => setSelectedOrgan(selectedOrgan === 'heart' ? 'none' : 'heart')}
        className={`absolute left-2 top-[165px] p-1.5 rounded border text-[8.5px] font-mono w-[105px] bg-black/80 backdrop-blur-md cursor-pointer transition-all duration-300 ${
          selectedOrgan === 'heart' ? 'scale-105' : 'border-white/5 hover:border-white/20'
        }`}
        style={{
          boxShadow: selectedOrgan === 'heart' ? `0 0 10px ${heartColor}33` : 'none',
          borderColor: selectedOrgan === 'heart' ? heartColor : undefined
        }}
      >
        <div className="flex items-center justify-between font-semibold border-b border-white/5 pb-0.5 mb-1" style={{ color: heartColor }}>
          <span className="flex items-center gap-1">
            <Heart className="w-2.5 h-2.5" />
            {activeTrackKey === 'SURGEON' ? 'HAPTIC CORE' : activeTrackKey === 'TRUCKER' ? 'CARDIO MON' : 'CARDIAC NODE'}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${hrSt === 'critical' || crisis ? 'bg-rose-500 animate-ping' : hrSt === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        </div>
        <div className="text-slate-400 space-y-0.5">
          <div className="flex justify-between"><span>HEART RATE:</span><span className="text-white font-bold">{fmt(hr, 0)} BPM</span></div>
          {activeTrackKey === 'PILOT' && (
            <div className="flex justify-between"><span>ANTI-G SUIT:</span><span className="text-white">{(activeTrackData.gForce ?? 1.2) > 4 ? 'INFLATED' : 'STANDBY'}</span></div>
          )}
          {activeTrackKey === 'SURGEON' && (
            <div className="flex justify-between"><span>STRESS LVL:</span><span className="text-white">{crisis ? 'ELEVATED' : hr > 90 ? 'MODERATE' : 'CALM'}</span></div>
          )}
          {activeTrackKey === 'ASTRONAUT' && activeTrackData.pwtt !== undefined && (
            <div className="flex justify-between"><span>PWTT:</span><span className="text-white">{fmt(activeTrackData.pwtt, 0)} ms</span></div>
          )}
          {activeTrackKey === 'TRAIN_PILOT' && (
            <div className="flex justify-between"><span>ARRHYTHMIA:</span><span className="text-white">{crisis ? 'DETECTED' : 'NONE'}</span></div>
          )}
          {activeTrackKey === 'TRUCKER' && (
            <div className="flex justify-between"><span>HRV INDEX:</span><span className="text-white">{fmt(activeTrackData.hrvRatio ?? 1.4, 2)}</span></div>
          )}
          <div className="flex justify-between"><span>ECG MODE:</span><span className="text-white">{crisis ? 'TACTICAL' : 'MONITOR'}</span></div>
        </div>
      </div>

      {/* Mid-Right: LUNGS */}
      <div
        onClick={() => setSelectedOrgan(selectedOrgan === 'lungs' ? 'none' : 'lungs')}
        className={`absolute right-2 top-[82px] p-1.5 rounded border text-[8.5px] font-mono w-[105px] bg-black/80 backdrop-blur-md cursor-pointer transition-all duration-300 ${
          selectedOrgan === 'lungs' ? 'scale-105' : 'border-white/5 hover:border-white/20'
        }`}
        style={{
          boxShadow: selectedOrgan === 'lungs' ? `0 0 10px ${lungsColor}33` : 'none',
          borderColor: selectedOrgan === 'lungs' ? lungsColor : undefined
        }}
      >
        <div className="flex items-center justify-between font-semibold border-b border-white/5 pb-0.5 mb-1" style={{ color: lungsColor }}>
          <span className="flex items-center gap-1">
            <Wind className="w-2.5 h-2.5" />
            {activeTrackKey === 'ASTRONAUT' ? 'O₂ SYSTEM' : activeTrackKey === 'SURGEON' ? 'RESP GUARD' : 'PULMONARY'}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${spo2St === 'critical' || crisis ? 'bg-rose-500 animate-ping' : spo2St === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        </div>
        <div className="text-slate-400 space-y-0.5">
          <div className="flex justify-between"><span>SpO₂ SENS:</span><span className="text-white font-bold">{fmt(spo2, 1)}%</span></div>
          {activeTrackKey === 'ASTRONAUT' && (
            <div className="flex justify-between"><span>O₂ TANK:</span><span className="text-white">{crisis ? '12%' : '87%'}</span></div>
          )}
          {activeTrackKey === 'PILOT' && (
            <div className="flex justify-between"><span>CABIN O₂:</span><span className="text-white">{crisis ? 'MASK ON' : 'AMBIENT'}</span></div>
          )}
          {activeTrackKey === 'SURGEON' && (
            <div className="flex justify-between"><span>RESP RATE:</span><span className="text-white">{fmt(12 + (crisis ? 8 : 0), 0)}/min</span></div>
          )}
          {activeTrackKey === 'TRAIN_PILOT' && (
            <div className="flex justify-between"><span>CAB AIR:</span><span className="text-white">{crisis ? 'STALE' : 'FRESH'}</span></div>
          )}
          {activeTrackKey === 'TRUCKER' && (
            <div className="flex justify-between"><span>HVAC FAN:</span><span className="text-white">{crisis ? 'MAX' : 'AUTO'}</span></div>
          )}
          <div className="flex justify-between"><span>AIRWAY:</span><span className="text-white">{crisis ? 'RESERVE' : 'NOMINAL'}</span></div>
        </div>
      </div>

      {/* Lower-Right: SYSTEMIC */}
      <div
        className={`absolute right-2 top-[255px] p-1.5 rounded border text-[8.5px] font-mono w-[105px] bg-black/80 backdrop-blur-md transition-all duration-300 ${
          crisis ? 'border-red-500/30' : 'border-white/5'
        }`}
        style={{ borderColor: crisis ? C.red : undefined }}
      >
        <div className="flex items-center justify-between font-semibold border-b border-white/5 pb-0.5 mb-1" style={{ color: systemicColor }}>
          <span className="flex items-center gap-1">
            <Activity className="w-2.5 h-2.5" />
            {activeTrackKey === 'ASTRONAUT' ? 'EVA SUIT' : activeTrackKey === 'SURGEON' ? 'OR ENVIRON' : activeTrackKey === 'PILOT' ? 'COCKPIT' : activeTrackKey === 'TRAIN_PILOT' ? 'CAB SYSTEMS' : 'CABIN ENV'}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${crisis ? 'bg-rose-500 animate-ping' : tempSt === 'warn' || pressureSt === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        </div>
        <div className="text-slate-400 space-y-0.5">
          <div className="flex justify-between">
            <span>{activeTrackKey === 'ASTRONAUT' ? 'SUIT TEMP:' : 'BODY TEMP:'}</span>
            <span className="text-white font-bold">{fmt(temp, 1)}°F</span>
          </div>
          <div className="flex justify-between">
            <span>{activeTrackKey === 'ASTRONAUT' ? 'SUIT PSI:' : activeTrackKey === 'PILOT' ? 'CABIN PSI:' : 'ENV PRES:'}</span>
            <span className="text-white font-bold">{fmt(pressure, 2)}psi</span>
          </div>
          {activeTrackKey === 'ASTRONAUT' && <div className="flex justify-between"><span>RAD DOSE:</span><span className="text-white">{crisis ? '2.4 mSv' : '0.3 mSv'}</span></div>}
          {activeTrackKey === 'PILOT' && <div className="flex justify-between"><span>EJECTION:</span><span className="text-white" style={{ color: crisis ? C.red : C.green }}>{crisis ? 'ARMED' : 'SAFE'}</span></div>}
          {activeTrackKey === 'SURGEON' && <div className="flex justify-between"><span>OR STERILE:</span><span className="text-white">{crisis ? 'BREACH' : 'CLASS-A'}</span></div>}
          {activeTrackKey === 'TRAIN_PILOT' && <div className="flex justify-between"><span>DEADMAN:</span><span className="text-white" style={{ color: crisis ? C.red : C.green }}>{crisis ? 'TRIPPED' : 'HELD'}</span></div>}
          {activeTrackKey === 'TRUCKER' && <div className="flex justify-between"><span>LANE DEV:</span><span className="text-white">{crisis ? '1.8m' : '0.1m'}</span></div>}
          <div className="flex justify-between border-t border-white/5 pt-0.5 mt-0.5">
            <span>INTEGRITY:</span>
            <span className="font-bold" style={{ color: crisis ? C.red : C.green }}>{crisis ? 'CRIT/FAIL' : '99.8%'}</span>
          </div>
        </div>
      </div>

      {/* Bottom tooltip */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 font-mono text-[7px] text-slate-500 bg-black/40 px-2 py-0.5 rounded border border-white/5 pointer-events-none">
        <Info className="w-2 h-2" />
        <span>SELECT ORGAN NODES FOR BIOMETRIC LINK</span>
      </div>
    </div>
  );
}
