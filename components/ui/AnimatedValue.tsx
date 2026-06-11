'use client';

import { useState, useEffect } from 'react';
import { useSpring, useTransform } from 'framer-motion';

export default function AnimatedValue({ value, precision = 2 }: { value: number; precision?: number }) {
  const sp = useSpring(value, { stiffness: 50, damping: 16 });
  const tx = useTransform(sp, (v) => v.toFixed(precision));
  const [str, setStr] = useState(value.toFixed(precision));

  useEffect(() => {
    sp.set(value);
  }, [value, sp]);

  useEffect(() => {
    return tx.on('change', setStr);
  }, [tx, precision]);

  return <>{str}</>;
}
