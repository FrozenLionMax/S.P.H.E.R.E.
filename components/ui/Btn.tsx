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
      whileHover={disabled ? {} : { 
        scale: 1.03, 
        borderColor: color, 
        color: '#ffffff',
        boxShadow: `0 0 12px ${color}44`,
        textShadow: `0 0 4px ${color}55`
      }}
      whileTap={disabled ? {} : { scale: 0.96 }}
      className={`px-3 py-1.5 rounded border font-mono text-[8.5px] font-bold tracking-widest uppercase select-none transition-all duration-300 ${className}`}
      style={{
        background: active 
          ? `linear-gradient(135deg, ${color}22, ${color}11)` 
          : 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))',
        borderColor: active ? color : 'rgba(255,255,255,0.08)',
        color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
        boxShadow: active ? `inset 0 0 8px ${color}15` : 'none',
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
