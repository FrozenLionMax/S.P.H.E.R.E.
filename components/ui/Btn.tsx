'use client';

import { motion } from 'framer-motion';

interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  ariaLabel?: string;
}

export default function Btn({
  children,
  onClick,
  active = false,
  color = '#00d4ff',
  className = '',
  style = {},
  disabled = false,
  ariaLabel
}: BtnProps) {
  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? {} : { scale: 1.02, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: color }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={`px-3 py-1.5 rounded-sm border font-mono text-[9px] font-bold tracking-widest uppercase select-none transition-colors duration-200 ${className}`}
      style={{
        backgroundColor: active ? `${color}12` : 'rgba(0,0,0,0.2)',
        borderColor: active ? color : 'var(--border)',
        color: active ? '#fff' : 'var(--muted)',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      role="button"
    >
      {children}
    </motion.button>
  );
}
