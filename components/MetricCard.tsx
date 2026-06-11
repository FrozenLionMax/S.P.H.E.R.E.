'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import GlassPanel from '@/components/ui/GlassPanel';
import AnimatedValue from '@/components/ui/AnimatedValue';
import { STATUS, C, StatusType } from '@/lib/constants';
import { pct } from '@/lib/helpers';

interface MetricCardProps {
  label: string;
  sublabel: string;
  value: number;
  unit: string;
  history: number[];
  status: StatusType;
  precision?: number;
  min: number;
  max: number;
  warnAt?: string;
  critAt?: string;
  crisis?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
}

export default function MetricCard({
  label,
  sublabel,
  value,
  unit,
  history,
  status,
  precision = 1,
  min,
  max,
  warnAt,
  critAt,
  crisis,
  highlighted = false,
  onClick
}: MetricCardProps) {
  const color = STATUS[status];
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isAnomaly = useMemo(() => {
    if (!history || history.length < 10) return false;
    const samples = history.slice(-30);
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const stdDev = Math.sqrt(samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length);
    const zScore = Math.abs((value - mean) / (stdDev || 1));
    return zScore > 2.0 && status === 'ok' && !crisis;
  }, [value, history, status, crisis]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (Math.abs(prev.current - value) > 0.05) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 350);
      prev.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  const pts = history.map((v, i) => ({ t: i, v }));
  const gid = 'g' + label.replace(/\s/g, '');

  return (
    <GlassPanel
      tilt={true}
      className={`relative rounded-xl overflow-hidden transition-all duration-300 ${isAnomaly ? 'anomaly-glow' : ''} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
      onClick={onClick}
      style={{
        borderColor: highlighted ? color : (status === 'ok' ? 'var(--border)' : flash ? color : color + '40'),
        boxShadow: highlighted 
          ? `0 0 15px ${color}33, inset 0 0 20px ${color}15` 
          : (status === 'ok' ? '' : `inset 0 0 20px ${color}10`),
      }}
    >
      <div
        className="absolute top-0 left-0 w-full h-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: status === 'ok' ? 0.55 : 1,
        }}
      />

      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div>
          <p className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: C.muted }}>
            {label}
          </p>
          <p className="text-[10px]" style={{ color: C.subtle }}>{sublabel}</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <motion.div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] font-mono tracking-widest uppercase mt-0.5"
            style={{
              background: color + '15',
              border: `1px solid ${color}30`,
              color,
            }}
            animate={status !== 'ok' ? { opacity: [1, 0.55, 1] } : {}}
            transition={{ duration: 0.7, repeat: Infinity }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            {status}
          </motion.div>
          {isAnomaly && (
            <motion.div
              className="px-2 py-0.5 rounded-sm text-[8px] font-mono tracking-widest font-bold"
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.35)'
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ⚠ ANOMALY PREDICTED
            </motion.div>
          )}
        </div>
      </div>

      <div className="px-4 pb-1 flex items-baseline gap-2">
        <span className="text-[38px] leading-none font-mono font-semibold tracking-tight tabular-nums" style={{ color }}>
          <AnimatedValue value={value} precision={precision} />
        </span>
        <span className="text-[12px] font-mono mb-1" style={{ color: C.subtle }}>{unit}</span>
      </div>

      {(warnAt || critAt) && (
        <div className="flex items-center gap-3 px-4 pb-2">
          {warnAt && (
            <span className="text-[9px] font-mono" style={{ color: C.amber }}>
              warn {warnAt}
            </span>
          )}
          {critAt && (
            <span className="text-[9px] font-mono" style={{ color: C.red }}>
              crit {critAt}
            </span>
          )}
        </div>
      )}

      <div className="px-0 pb-0 shadow-[inset_0_-10px_20px_-10px_rgba(0,0,0,0.5)]" style={{ height: 56 }}>
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <AreaChart data={pts} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#${gid})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '100%', width: '100%' }} />
        )}
      </div>

      <div className="h-[3px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <motion.div
          className="h-full"
          style={{ background: color + '80' }}
          animate={{ width: `${pct(value, min, max)}%` }}
          transition={{ duration: 0.8, ease: [0.22, 0, 0, 1] }}
        />
      </div>
    </GlassPanel>
  );
}
