'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { C } from '@/lib/constants';

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-sm font-mono text-[10px]"
      style={{
        background: 'var(--elevated)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 16px #0008'
      }}
    >
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span style={{ color: C.muted }}>{p.name}</span>
          <span className="ml-auto pl-4 tabular-nums" style={{ color: p.color }}>
            {p.value.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function VitalsChart({ samples }: { samples: any[] }) {
  const [mounted, setMounted] = useState(false);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setShouldReduceMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  if (!mounted) return <div style={{ height: '100%', width: '100%' }} />;

  const data = samples.map((s, i) => ({ t: i, spo2: s.spO2, hr: s.heartRate / 1.4 }));

  const animate = !shouldReduceMotion;

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.cyan} stopOpacity={0.35} />
            <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.green} stopOpacity={0.35} />
            <stop offset="100%" stopColor={C.green} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="t" hide />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 9, fill: C.subtle, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1.5 }} />
        <Area
          type="monotone"
          dataKey="spo2"
          stroke={C.cyan}
          strokeWidth={2}
          fill="url(#gradCyan)"
          filter={shouldReduceMotion ? undefined : "url(#neonGlow)"}
          name="SpO₂ %"
          isAnimationActive={animate}
          animationDuration={600}
          activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }}
        />
        <Area
          type="monotone"
          dataKey="hr"
          stroke={C.green}
          strokeWidth={2}
          fill="url(#gradGreen)"
          filter={shouldReduceMotion ? undefined : "url(#neonGlow)"}
          name="HR/1.4"
          isAnimationActive={animate}
          animationDuration={600}
          activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
