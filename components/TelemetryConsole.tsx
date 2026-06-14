'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { C, TrackKey, TRACK_CONFIGS, StatusType, STATUS, HEALTH_INDEX_BOUNDS } from '@/lib/constants';
import { fmt } from '@/lib/helpers';
import { HealthRing } from '@/components/TrackVisualizer';
import { LogRow, LogEntry } from '@/components/TypewriterLog';

interface TelemetryConsoleProps {
  activeTrackKey: TrackKey;
  trackConf: typeof TRACK_CONFIGS[TrackKey];
  crisis: boolean;
  spo2St: StatusType;
  hrSt: StatusType;
  envSt: StatusType;
  latSt: StatusType;
  tempSt: StatusType;
  pressureSt: StatusType;
  spo2: number;
  hr: number;
  envMetric: number;
  lat: number;
  temp: number;
  pressure: number;
  healthScore: number;
  localLogs: LogEntry[];
}

export default function TelemetryConsole({
  activeTrackKey,
  trackConf,
  crisis,
  spo2St,
  hrSt,
  envSt,
  latSt,
  tempSt,
  pressureSt,
  spo2,
  hr,
  envMetric,
  lat,
  temp,
  pressure,
  healthScore,
  localLogs
}: TelemetryConsoleProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const rowsWrapperRef = useRef<HTMLDivElement>(null);

  // ResizeObserver to ensure container scrolls to bottom when logs append or wrap
  useEffect(() => {
    const container = logContainerRef.current;
    const wrapper = rowsWrapperRef.current;
    if (!container || !wrapper) return;

    const observer = new ResizeObserver(() => {
      container.scrollTop = container.scrollHeight;
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0 w-full">
      {/* Telemetry Core Grid (SPO2, HR, ENV, LAT) */}
      <div className="px-4 py-3 shrink-0 grid grid-cols-2 gap-x-4 gap-y-2" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>SPO2 <span className="text-[7px] text-green-500/50 ml-1">(&gt;95)</span></span>
          <span className="text-[11.5px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[spo2St] }}>{fmt(spo2)}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>HR <span className="text-[7px] text-green-500/50 ml-1">(60-100)</span></span>
          <span className="text-[11.5px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[hrSt] }}>{fmt(hr, 0)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">bpm</span></span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>
            {activeTrackKey === 'ASTRONAUT' ? 'SUIT' : activeTrackKey === 'PILOT' ? 'ALT' : activeTrackKey === 'SURGEON' ? 'TRMR' : activeTrackKey === 'TRAIN_PILOT' ? 'COGL' : 'ALRT'}
            <span className="text-[7px] text-green-500/50 ml-1">(~{fmt(trackConf.baseEnvVal, activeTrackKey === 'SURGEON' ? 2 : 0)})</span>
          </span>
          <span className="text-[11.5px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[envSt] }}>{fmt(envMetric, activeTrackKey === 'SURGEON' ? 3 : 1)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">{trackConf.metricUnit}</span></span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>LAT <span className="text-[7px] text-green-500/50 ml-1">(&lt;300)</span></span>
          <span className="text-[11.5px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[latSt] }}>{fmt(lat, 0)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">ms</span></span>
        </div>
      </div>

      {/* Index Breakdown (Health Ring & Progress Bars) */}
      <div className="px-4 py-3 shrink-0 flex items-center gap-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <HealthRing score={healthScore} crisis={crisis} />
        <div className="flex-1 flex flex-col gap-1.5">
          <span className="text-[8px] font-mono tracking-[0.18em] uppercase text-slate-500">Index Breakdown</span>
          
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[7.5px] font-mono">
              <span className="text-slate-400">RESPIRATORY</span>
              <span style={{ color: STATUS[spo2St] }}>
                {Math.round(
                  fmt(spo2) === '100.00'
                    ? 100
                    : ((spo2 - HEALTH_INDEX_BOUNDS.RESPIRATORY.min) /
                        (HEALTH_INDEX_BOUNDS.RESPIRATORY.max - HEALTH_INDEX_BOUNDS.RESPIRATORY.min)) *
                        100
                )}%
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-slate-800">
              <motion.div
                className="h-full"
                style={{ background: STATUS[spo2St] }}
                animate={{
                  width:
                    Math.max(
                      0,
                      Math.min(
                        100,
                        ((spo2 - HEALTH_INDEX_BOUNDS.RESPIRATORY.min) /
                          (HEALTH_INDEX_BOUNDS.RESPIRATORY.max - HEALTH_INDEX_BOUNDS.RESPIRATORY.min)) *
                          100
                      )
                    ) + '%'
                }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[7.5px] font-mono">
              <span className="text-slate-400">CARDIAC</span>
              <span style={{ color: STATUS[hrSt] }}>
                {Math.round(
                  Math.max(
                    0,
                    Math.min(
                      100,
                      (1 -
                        (hr - HEALTH_INDEX_BOUNDS.CARDIAC.min) /
                          (HEALTH_INDEX_BOUNDS.CARDIAC.max - HEALTH_INDEX_BOUNDS.CARDIAC.min)) *
                        100
                    )
                  )
                )}%
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-slate-800">
              <motion.div
                className="h-full"
                style={{ background: STATUS[hrSt] }}
                animate={{
                  width:
                    Math.max(
                      0,
                      Math.min(
                        100,
                        (1 -
                          (hr - HEALTH_INDEX_BOUNDS.CARDIAC.min) /
                            (HEALTH_INDEX_BOUNDS.CARDIAC.max - HEALTH_INDEX_BOUNDS.CARDIAC.min)) *
                          100
                      )
                    ) + '%'
                }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[7.5px] font-mono">
              <span className="text-slate-400">BODY TEMP</span>
              <span style={{ color: STATUS[tempSt] }}>
                {Math.round(
                  Math.max(
                    0,
                    Math.min(
                      100,
                      (1 -
                        Math.max(0, temp - HEALTH_INDEX_BOUNDS.TEMPERATURE.nominal) /
                          HEALTH_INDEX_BOUNDS.TEMPERATURE.maxOffset) *
                        100
                    )
                  )
                )}%
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-slate-800">
              <motion.div
                className="h-full"
                style={{ background: STATUS[tempSt] }}
                animate={{
                  width:
                    Math.max(
                      0,
                      Math.min(
                        100,
                        (1 -
                          Math.max(0, temp - HEALTH_INDEX_BOUNDS.TEMPERATURE.nominal) /
                            HEALTH_INDEX_BOUNDS.TEMPERATURE.maxOffset) *
                          100
                      )
                    ) + '%'
                }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[7.5px] font-mono">
              <span className="text-slate-400">{activeTrackKey === 'ASTRONAUT' ? 'SUIT PRESSURE' : 'CABIN PRESSURE'}</span>
              <span style={{ color: STATUS[pressureSt] }}>
                {Math.round(
                  Math.max(
                    0,
                    Math.min(
                      100,
                      (pressure /
                        (activeTrackKey === 'ASTRONAUT'
                          ? HEALTH_INDEX_BOUNDS.PRESSURE.ASTRONAUT
                          : HEALTH_INDEX_BOUNDS.PRESSURE.DEFAULT)) *
                        100
                    )
                  )
                )}%
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-slate-800">
              <motion.div
                className="h-full"
                style={{ background: STATUS[pressureSt] }}
                animate={{
                  width:
                    Math.max(
                      0,
                      Math.min(
                        100,
                        (pressure /
                          (activeTrackKey === 'ASTRONAUT'
                            ? HEALTH_INDEX_BOUNDS.PRESSURE.ASTRONAUT
                            : HEALTH_INDEX_BOUNDS.PRESSURE.DEFAULT)) *
                          100
                      )
                    ) + '%'
                }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Predictive Alert Banner */}
      {(() => {
        const predictions: { icon: string; msg: string; color: string }[] = [];
        // SpO2 trending low
        if (spo2 < 96.5 && spo2 >= 95) predictions.push({ icon: '🫁', msg: `SpO₂ drop to ${(spo2 - 1.2).toFixed(1)}% predicted in ~30s`, color: C.amber });
        if (spo2 < 95) predictions.push({ icon: '🫁', msg: 'CRITICAL: SpO₂ desaturation active', color: C.red });
        // HR trending high
        if (hr > 95 && hr < 120) predictions.push({ icon: '❤️', msg: `Tachycardia threshold in ~${Math.round((120 - hr) / 2)}s`, color: C.amber });
        // Latency rising
        if (lat > 320 && lat < 430) predictions.push({ icon: '🧠', msg: `Cognitive latency rising — ${Math.round((430 - lat) / 5)}s to WARN`, color: C.amber });
        // Track-specific
        if (activeTrackKey === 'PILOT' && envMetric > 5) predictions.push({ icon: '⚡', msg: `G-LOC risk ${Math.min(100, Math.round((envMetric / 9) * 100))}% — anti-G suit active`, color: envMetric > 7 ? C.red : C.amber });
        if (activeTrackKey === 'TRUCKER' && envMetric < 88) predictions.push({ icon: '😴', msg: `Drowsiness index rising — alertness ${Math.round(envMetric)}%`, color: C.amber });
        if (activeTrackKey === 'TRAIN_PILOT' && envMetric > 280) predictions.push({ icon: '👁️', msg: `PERCLOS elevated — fatigue intervention suggested`, color: C.amber });

        if (predictions.length === 0) return null;
        return (
          <div className="shrink-0 border-b" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.3)' }}>
            <div className="px-3 py-1.5 flex items-center gap-1">
              <span className="text-[7px] font-mono tracking-[0.2em] uppercase font-semibold" style={{ color: C.amber }}>⚠ PREDICTIVE</span>
            </div>
            {predictions.slice(0, 2).map((p, i) => (
              <div key={i} className="px-3 py-1 flex items-center gap-2 text-[8px] font-mono" style={{ color: p.color }}>
                <span>{p.icon}</span>
                <span className="opacity-80">{p.msg}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Scrolling Log Output Console */}
      <div 
        ref={logContainerRef}
        className="flex-1 overflow-y-auto py-2 bg-black/10 flex flex-col min-h-0"
      >
        <div ref={rowsWrapperRef} className="flex flex-col">
          {localLogs.map((e, i) => (
            <LogRow key={e.id} entry={e} fresh={i === localLogs.length - 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
