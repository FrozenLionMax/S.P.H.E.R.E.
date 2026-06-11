'use client';

import { useRef, useEffect } from 'react';

export default function LandingBackground({ themeColor = '#00d4ff' }: { themeColor?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', resize);
    resize();

    const particles: { x: number; y: number; vx: number; vy: number; size: number; phase: number }[] = [];
    const particleCount = Math.min(100, Math.floor((width * height) / 9000));
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let t = 0;
    let raf: number;

    const hexToRgb = (hex: string) => {
      // Handle potential formats safely
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
      const g = parseInt(cleanHex.slice(2, 4), 16) || 212;
      const b = parseInt(cleanHex.slice(4, 6), 16) || 255;
      return `${r},${g},${b}`;
    };

    const rgb = hexToRgb(themeColor);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      // Connections
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.08;
            ctx.strokeStyle = `rgba(${rgb},${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      // Static nodes
      for (const p of particles) {
        ctx.fillStyle = `rgba(${rgb},0.15)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      t += 0.003;

      // Draw connections first (behind particles)
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.12;
            ctx.strokeStyle = `rgba(${rgb},${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + p.phase);
        const alpha = 0.15 + pulse * 0.2;

        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + pulse * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    if (mediaQuery.matches) {
      drawStatic();
    } else {
      draw();
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [themeColor]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, background: '#000000' }}
    />
  );
}
