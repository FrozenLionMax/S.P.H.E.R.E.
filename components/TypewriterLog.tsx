'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { C } from '@/lib/constants';

export interface LogEntry {
  id: number;
  time: string;
  level: 'INFO' | 'WARN' | 'ALERT' | 'OK' | 'SYS';
  msg: string;
}

const LOG_C: Record<LogEntry['level'], string> = {
  INFO:  C.muted,
  SYS:   C.subtle,
  WARN:  C.amber,
  ALERT: C.red,
  OK:    C.green,
};

const LOG_BG: Record<LogEntry['level'], string> = {
  INFO:  'transparent',
  SYS:   'transparent',
  WARN:  'rgba(245,158,11,0.04)',
  ALERT: 'rgba(255,59,92,0.06)',
  OK:    'rgba(0,229,153,0.04)',
};

export function TypewriterLog({ text, speed = 8 }: { text: string; speed?: number }) {
  const [display, setDisplay] = useState('');
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);
    
    if (mediaQuery.matches) {
      setDisplay(text);
      return;
    }

    let index = 0;
    let timer: NodeJS.Timeout;
    const type = () => {
      if (index <= text.length) {
        setDisplay(text.slice(0, index));
        index++;
        timer = setTimeout(type, speed + Math.random() * 10);
      }
    };
    type();
    return () => clearTimeout(timer);
  }, [text, speed]);

  return (
    <>
      {display}
      {display.length < text.length && !shouldReduceMotion ? <span className="opacity-50">_</span> : ''}
    </>
  );
}

export function LogRow({ entry, fresh }: { entry: LogEntry; fresh: boolean }) {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);
  }, []);

  const animateProps = shouldReduceMotion
    ? {}
    : {
        initial: fresh ? { opacity: 0, y: 4, filter: 'blur(4px)' } : false,
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        transition: { duration: 0.3, ease: 'easeOut' } as any
      };

  return (
    <motion.div
      {...animateProps}
      className="flex gap-2.5 px-4 py-[4.5px] font-mono text-[10px] leading-relaxed"
      style={{ background: LOG_BG[entry.level], borderLeft: `2px solid ${LOG_C[entry.level]}18` }}
    >
      <span className="shrink-0 tabular-nums w-[52px]" style={{ color: C.subtle }}>{entry.time}</span>
      <span className="shrink-0 w-8 font-semibold" style={{ color: LOG_C[entry.level] }}>{entry.level}</span>
      <span className="break-all" style={{ color: entry.level === 'ALERT' ? '#ffb3bf' : entry.level === 'WARN' ? '#fcd680' : C.muted }}>
        {fresh && !shouldReduceMotion ? <TypewriterLog text={entry.msg} /> : entry.msg}
      </span>
    </motion.div>
  );
}
