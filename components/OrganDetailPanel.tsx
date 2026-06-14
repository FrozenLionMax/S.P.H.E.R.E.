'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTelemetryStore } from '@/lib/useTelemetryStore'
import { CONDITIONS } from '@/lib/conditions'
import { X, Activity, AlertTriangle, Shield } from 'lucide-react'

const ORGAN_META: Record<string, { icon: string; label: string; color: string; condition: string; metric: string; metricKey: string; unit: string }> = {
  brain: { icon: '🧠', label: 'CEREBRAL CORTEX', color: '#c040ff', condition: 'epilepsy', metric: 'Brainwave Freq', metricKey: 'brainwaveFrequency', unit: 'Hz' },
  lungs: { icon: '🫁', label: 'PULMONARY SYSTEM', color: '#00ccff', condition: 'asthma', metric: 'O₂ Saturation', metricKey: 'oxygenSaturation', unit: '%' },
  heart: { icon: '❤️', label: 'MYOCARDIUM', color: '#ff2b56', condition: 'arrhythmia', metric: 'Heart Rate', metricKey: 'bpm', unit: 'BPM' },
  liver: { icon: '🟠', label: 'HEPATIC SYSTEM', color: '#ff9900', condition: 'diabetes', metric: 'Blood Glucose', metricKey: 'glucose', unit: 'mg/dL' },
}

export default function OrganDetailPanel() {
  const selectedOrgan = useTelemetryStore((s) => s.selectedOrgan)
  const frame = useTelemetryStore((s) => s.liveTelemetryFrame)
  
  const isActive = selectedOrgan !== 'none' && selectedOrgan !== 'custom' && ORGAN_META[selectedOrgan]
  const meta = isActive ? ORGAN_META[selectedOrgan] : null
  const condData = meta ? CONDITIONS[meta.condition as keyof typeof CONDITIONS] : null

  const metricValue = meta ? (frame as any)[meta.metricKey] || (frame as any).bloodGlucose || 0 : 0

  return (
    <AnimatePresence>
      {isActive && meta && condData && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-2"
        >
          {/* Header */}
          <div 
            className="p-3 rounded border font-mono"
            style={{ 
              borderColor: `${meta.color}40`,
              background: `${meta.color}08`,
              boxShadow: `inset 0 0 20px ${meta.color}10, 0 0 15px ${meta.color}08`
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{meta.icon}</span>
                <span className="text-[10px] tracking-[0.2em] font-bold" style={{ color: meta.color }}>
                  {meta.label}
                </span>
              </div>
              <button
                onClick={() => {
                  useTelemetryStore.getState().setSelectedOrgan('none')
                  useTelemetryStore.getState().setCustomZoomTarget(null)
                }}
                className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>

            {/* Primary Metric */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums" style={{ color: meta.color }}>
                {typeof metricValue === 'number' ? (metricValue % 1 !== 0 ? metricValue.toFixed(1) : Math.round(metricValue)) : metricValue}
              </span>
              <span className="text-[8px] text-slate-500 uppercase tracking-wider">{meta.unit}</span>
            </div>
            <span className="text-[8px] text-slate-600 tracking-wider">{meta.metric}</span>
          </div>

          {/* Condition Info */}
          <div className="glass-panel p-3 rounded">
            <div className="flex items-center gap-1.5 mb-2">
              <Activity size={10} className="text-slate-500" />
              <span className="text-[9px] font-mono text-slate-500 tracking-wider uppercase font-semibold">
                CONDITION
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono font-bold text-slate-200">{condData.label}</span>
              <span 
                className="text-[7px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider"
                style={{
                  color: condData.status === 'CRISIS' ? '#ef4444' : condData.status === 'WARNING' ? '#f59e0b' : '#00ffaa',
                  background: condData.status === 'CRISIS' ? '#ef444415' : condData.status === 'WARNING' ? '#f59e0b15' : '#00ffaa15',
                  border: `1px solid ${condData.status === 'CRISIS' ? '#ef444430' : condData.status === 'WARNING' ? '#f59e0b30' : '#00ffaa30'}`,
                }}
              >
                {condData.status}
              </span>
            </div>
            <p className="text-[8px] text-slate-500 leading-relaxed font-mono">
              {condData.description}
            </p>
          </div>

          {/* Affected Systems */}
          <div className="glass-panel p-3 rounded">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle size={10} className="text-slate-500" />
              <span className="text-[9px] font-mono text-slate-500 tracking-wider uppercase font-semibold">
                RISK FACTORS
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {condData.riskFactors.map((factor: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full" style={{ background: meta.color }} />
                  <span className="text-[8px] font-mono text-slate-400">{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Treatment Protocol */}
          <div className="glass-panel p-3 rounded">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield size={10} className="text-slate-500" />
              <span className="text-[9px] font-mono text-slate-500 tracking-wider uppercase font-semibold">
                TREATMENT PROTOCOL
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {condData.treatment.map((step: string, i: number) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[7px] font-mono font-bold mt-0.5" style={{ color: meta.color }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[8px] font-mono text-slate-400">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard hint */}
          <div className="text-center text-[7px] font-mono text-slate-600 tracking-wider">
            ESC TO CLOSE · ← → CYCLE ORGANS
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
