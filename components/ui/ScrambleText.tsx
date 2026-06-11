'use client';

import { useState, useEffect } from 'react';

export default function ScrambleText({ text }: { text: string }) {
  const [display, setDisplay] = useState(text);
  const chars = '!<>-_\\/[]{}—=+*^?#________';

  useEffect(() => {
    // Accessibility check: bypass animation if reduced motion is requested
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setDisplay(text);
      return;
    }

    let frame = 0;
    const len = text.length;
    let timer: number;

    const update = () => {
      let output = '';
      let complete = 0;
      for (let i = 0; i < len; i++) {
        if (frame >= i * 2) {
          output += text[i];
          complete++;
        } else {
          output += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      setDisplay(output);
      if (complete === len) return;
      frame += 1.5;
      timer = requestAnimationFrame(update);
    };

    timer = requestAnimationFrame(update);
    return () => cancelAnimationFrame(timer);
  }, [text]);

  return <>{display}</>;
}
