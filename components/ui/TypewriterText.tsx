'use client';

import { useState, useEffect } from 'react';

export default function TypewriterText({ text, delay = 0, speed = 20 }: { text: string; delay?: number; speed?: number }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setDisplay(text);
      return;
    }

    let timeout: NodeJS.Timeout;
    let index = 0;
    setDisplay('');

    const start = () => {
      timeout = setInterval(() => {
        if (index < text.length) {
          setDisplay((prev) => prev + text.charAt(index));
          index++;
        } else {
          clearInterval(timeout);
        }
      }, speed);
    };

    const initialDelay = setTimeout(start, delay);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(timeout);
    };
  }, [text, delay, speed]);

  return <>{display}</>;
}
