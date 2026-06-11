'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

export default function Magnetic({ children }: { children: React.ReactElement }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 200, damping: 15, mass: 0.1 });
  const y = useSpring(0, { stiffness: 200, damping: 15, mass: 0.1 });
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setShouldReduceMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const handleMouse = (e: React.MouseEvent) => {
    if (shouldReduceMotion || !ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    x.set(middleX * 0.15);
    y.set(middleY * 0.15);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  if (shouldReduceMotion) {
    return <div style={{ display: 'inline-block' }}>{children}</div>;
  }

  return (
    <motion.div ref={ref} onMouseMove={handleMouse} onMouseLeave={reset} style={{ x, y, display: 'inline-block' }}>
      {children}
    </motion.div>
  );
}
