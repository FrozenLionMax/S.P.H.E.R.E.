'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  tilt?: boolean;
}

export default function GlassPanel({ children, className = '', style = {}, tilt = false }: GlassPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 400, damping: 30 });
  const y = useSpring(0, { stiffness: 400, damping: 30 });
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setShouldReduceMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!tilt || shouldReduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    if (!tilt || shouldReduceMotion) return;
    x.set(0);
    y.set(0);
  };

  const rotateX = useTransform(y, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-6, 6]);

  const activeTilt = tilt && !shouldReduceMotion;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`glass-panel ${activeTilt ? 'glass-panel-tilt' : ''} ${className}`}
      style={{
        ...style,
        rotateX: activeTilt ? rotateX : 0,
        rotateY: activeTilt ? rotateY : 0,
      }}
    >
      {children}
    </motion.div>
  );
}
