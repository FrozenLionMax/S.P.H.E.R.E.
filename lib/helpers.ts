import { StatusType } from './constants';

export function fmt(n: number, p: number = 2): string {
  return n.toFixed(p);
}

export function nowTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export function classify(v: number, warn: number, crit: number, dir: 'lo' | 'hi'): StatusType {
  if (dir === 'lo') {
    return v <= crit ? 'critical' : v <= warn ? 'warn' : 'ok';
  }
  return v >= crit ? 'critical' : v >= warn ? 'warn' : 'ok';
}

export function pct(v: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
}
