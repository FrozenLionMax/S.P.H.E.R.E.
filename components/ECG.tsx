'use client';

import { useRef, useEffect } from 'react';

interface ECGProps {
  crisis: boolean;
  hr: number;
  width?: number;
  height?: number;
  glow?: boolean;
  audioEnabled?: boolean;
  sound?: boolean;
  audioCtx?: any;
  volume?: number;
  onBeat?: () => void;
}

export default function ECG({
  crisis,
  hr,
  width = 420,
  height = 120,
  glow = true,
  audioEnabled = false,
  sound = false,
  audioCtx = null,
  volume = 0.5,
  onBeat
}: ECGProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const xRef = useRef(0);
  const yHistory = useRef<Float32Array | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 2) : 2;
    const W = width;
    const H = height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    if (!yHistory.current || yHistory.current.length !== W) {
      yHistory.current = new Float32Array(W).fill(H / 2);
    }

    const midY = H / 2;
    const ampScale = H / 120;
    const color = crisis ? '#ff3b5c' : '#00ffaa';
    const glowRgba = crisis ? 'rgba(255,59,92,' : 'rgba(0,255,170,';

    const gauss = (amp: number, center: number, width: number, t: number) => {
      return amp * Math.exp(-Math.pow((t - center) / width, 2));
    };

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const drawGrid = () => {
      if (height >= 40) {
        ctx.save();
        ctx.strokeStyle = crisis ? 'rgba(255, 59, 92, 0.012)' : 'rgba(0, 255, 170, 0.012)';
        ctx.lineWidth = 0.3;
        for (let gx = 0; gx < W; gx += 4) {
          if (gx % 16 === 0) continue;
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, H);
          ctx.stroke();
        }
        for (let gy = 0; gy < H; gy += 4) {
          if (gy % 16 === 0) continue;
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(W, gy);
          ctx.stroke();
        }

        ctx.strokeStyle = crisis ? 'rgba(255, 59, 92, 0.04)' : 'rgba(0, 255, 170, 0.04)';
        ctx.lineWidth = 0.5;
        for (let gx = 0; gx < W; gx += 16) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, H);
          ctx.stroke();
        }
        for (let gy = 0; gy < H; gy += 16) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(W, gy);
          ctx.stroke();
        }

        ctx.strokeStyle = crisis ? 'rgba(255, 59, 92, 0.08)' : 'rgba(0, 255, 170, 0.08)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(W, midY);
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      drawGrid();

      // Render a static representation of cardiac waveform across the panel
      ctx.save();
      if (glow) {
        ctx.shadowBlur = 8 * ampScale;
        ctx.shadowColor = color;
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 * ampScale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const bpm = hr || 75;
      const beatDurationMs = 60000 / bpm;
      const T_active = Math.min(600, beatDurationMs * 0.8);

      ctx.moveTo(0, midY);
      for (let x = 0; x < W; x++) {
        // Fit exactly three full wave beats across the width W
        const p = x / (W / 3);
        const absTime = p * beatDurationMs;
        let offset = 0;
        if (crisis) {
          // V-Fib chaotic static representation
          offset = Math.sin(absTime * 0.05) * 14.0 + Math.cos(absTime * 0.12) * 8.0;
          offset += (Math.sin(absTime * 0.3) + Math.cos(absTime * 0.7)) * 1.5;
        } else {
          // Normal static representation but showing a skipped beat in the middle (beat 1 out of 3)
          const beatIndex = Math.floor(p);
          const isSkippedBeat = beatIndex % 3 === 1; // skip middle static beat
          if (!isSkippedBeat) {
            const tInBeat = (p % 1) * beatDurationMs;
            if (tInBeat <= T_active) {
              const theta = tInBeat / T_active;
              const rAmp = -48.0 * (1 + (bpm - 75) * 0.002);
              const tAmp = -9.0;
              const pAmp = -4.5;
              const sAmp = 12.0;

              offset += gauss(pAmp, 0.20, 0.04, theta); // P
              offset += gauss(4.0, 0.38, 0.015, theta); // Q
              offset += gauss(rAmp, 0.42, 0.012, theta); // R
              offset += gauss(sAmp, 0.46, 0.018, theta); // S
              offset += gauss(tAmp, 0.72, 0.07, theta); // T
              offset += gauss(-0.8, 0.88, 0.04, theta); // U
            }
          }
        }
        ctx.lineTo(x, midY + offset * ampScale);
      }
      ctx.stroke();
      ctx.restore();
    };

    let lastTime = performance.now();
    const sweepSpeed = W / 3500;

    const tick = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      const safeDt = Math.max(0, Math.min(dt, 50));

      const bpm = hr || 75;
      const beatDurationMs = 60000 / bpm;
      const T_active = Math.min(600, beatDurationMs * 0.8);
      const phaseAdvance = safeDt / beatDurationMs;
      
      const oldPhase = phaseRef.current;
      phaseRef.current += phaseAdvance;
      const newPhase = phaseRef.current;

      const dx = sweepSpeed * safeDt;
      
      const oldX = xRef.current >= W ? 0 : xRef.current;
      let scanX = oldX + dx;
      if (scanX >= W) scanX %= W;

      const evaluateEcg = (p: number) => {
        const absTime = p * beatDurationMs;
        if (crisis) {
          // Ventricular Fibrillation (V-Fib): Chaotic multi-sine waves with no distinct QRS peaks
          const vfib = Math.sin(absTime * 0.05) * 14.0 + Math.cos(absTime * 0.12) * 8.0;
          const noise = (Math.sin(absTime * 0.3) + Math.cos(absTime * 0.7)) * 1.5;
          return midY + (vfib + noise) * ampScale;
        }

        // Otherwise check for skipped beats (e.g. drop 1 out of 6 beats)
        const beatIndex = Math.floor(p);
        const isSkippedBeat = beatIndex % 6 === 4;
        
        let offset = 0;
        if (!isSkippedBeat) {
          const tInBeat = (p % 1) * beatDurationMs;
          if (tInBeat <= T_active) {
            const theta = tInBeat / T_active;
            const rAmp = -48.0 * (1 + (bpm - 75) * 0.002);
            const tAmp = -9.0;
            const pAmp = -4.5;
            const sAmp = 12.0;

            offset += gauss(pAmp, 0.20, 0.04, theta); // P
            offset += gauss(4.0, 0.38, 0.015, theta); // Q
            offset += gauss(rAmp, 0.42, 0.012, theta); // R
            offset += gauss(sAmp, 0.46, 0.018, theta); // S
            offset += gauss(tAmp, 0.72, 0.07, theta); // T
            offset += gauss(-0.8, 0.88, 0.04, theta); // U
          }
        }
        offset *= ampScale;
        
        const wander = Math.sin(absTime / 2200) * 2.0 * ampScale;
        const noise = (
          Math.sin(absTime * 0.15) * 0.5 + 
          Math.sin(absTime * 0.28) * 0.3 + 
          Math.sin(absTime * 0.45) * 0.2
        ) * 0.25 * ampScale;
        
        return midY + offset + wander + noise;
      };

      const hist = yHistory.current;
      if (!hist) return;

      const startIdx = Math.floor(oldX);
      const endIdx = Math.floor(scanX);

      if (endIdx >= startIdx) {
        for (let i = startIdx; i <= endIdx; i++) {
          const f = (endIdx === startIdx) ? 1.0 : (i - oldX) / (scanX - oldX);
          const p = oldPhase + f * (newPhase - oldPhase);
          hist[i] = evaluateEcg(p);
        }
      } else {
        const totalDist = W - oldX + scanX;
        for (let i = startIdx; i < W; i++) {
          const f = (totalDist === 0) ? 1.0 : (i - oldX) / totalDist;
          const p = oldPhase + f * (newPhase - oldPhase);
          hist[i] = evaluateEcg(p);
        }
        for (let i = 0; i <= endIdx; i++) {
          const f = (totalDist === 0) ? 1.0 : (W + i - oldX) / totalDist;
          const p = oldPhase + f * (newPhase - oldPhase);
          hist[i] = evaluateEcg(p);
        }
      }

      ctx.clearRect(0, 0, W, H);

      drawGrid();

      const gapWidth = Math.max(12, W * 0.06);
      const head = Math.floor(scanX);
      const tail = Math.floor((scanX + gapWidth) % W);

      const drawInterval = (start: number, end: number) => {
        if (start >= end) return;

        const grad = ctx.createLinearGradient(start, 0, end, 0);
        
        const getOpacity = (x: number) => {
          let age = scanX - x;
          if (age < 0) age += W;
          const maxAge = W - gapWidth;
          if (age >= maxAge) return 0;
          
          const expDecay = Math.exp(-age / (W * 0.35));
          const fadeDist = 40;
          const tailFade = Math.min(1, (maxAge - age) / fadeDist);
          return expDecay * tailFade;
        };

        const opacityStart = getOpacity(start);
        const opacityEnd = getOpacity(end);

        const colorStart = crisis ? `rgba(255, 59, 92, ${opacityStart})` : `rgba(0, 255, 170, ${opacityStart})`;
        const colorEnd = crisis ? `rgba(255, 59, 92, ${opacityEnd})` : `rgba(0, 255, 170, ${opacityEnd})`;

        grad.addColorStop(0, colorStart);
        grad.addColorStop(1, colorEnd);

        ctx.beginPath();
        ctx.moveTo(start, hist[start]);
        for (let i = start + 1; i <= end; i++) {
          ctx.lineTo(i, hist[i]);
        }
        
        if (glow) {
          ctx.save();
          ctx.strokeStyle = grad;
          ctx.lineWidth = Math.max(2.5, 4.5 * ampScale);
          ctx.shadowBlur = 10 * ampScale;
          ctx.shadowColor = color;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(1.2, 1.8 * ampScale);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
      };

      if (tail <= head) {
        drawInterval(tail, head);
      } else {
        drawInterval(tail, W - 1);
        drawInterval(0, head);
      }

      if (height >= 60 && !crisis) { // Only draw labels if not in V-Fib crisis
        const minPhase = phaseRef.current - (W / sweepSpeed) / beatDurationMs;
        const maxPhase = phaseRef.current;
        const minBeat = Math.ceil(minPhase);
        const maxBeat = Math.floor(maxPhase);

        const labels = [
          { name: 'P', relPhase: 0.20, yOffset: -9 * ampScale },
          { name: 'Q', relPhase: 0.38, yOffset: 6 * ampScale },
          { name: 'R', relPhase: 0.42, yOffset: -14 * ampScale },
          { name: 'S', relPhase: 0.46, yOffset: 9 * ampScale },
          { name: 'T', relPhase: 0.72, yOffset: -9 * ampScale }
        ];

        for (let b = minBeat - 1; b <= maxBeat + 1; b++) {
          const isSkippedBeat = b % 6 === 4;
          if (isSkippedBeat) continue; // Skip label drawing on arrhythmia blocks

          for (const l of labels) {
            const p = b + (l.relPhase * T_active / beatDurationMs);
            if (p >= minPhase && p <= maxPhase) {
              const agePhase = phaseRef.current - p;
              const ageMs = agePhase * beatDurationMs;
              const ageX = ageMs * sweepSpeed;
              let x = scanX - ageX;
              while (x < 0) x += W;
              while (x >= W) x -= W;

              let agePixels = scanX - x;
              if (agePixels < 0) agePixels += W;

              if (agePixels <= W - gapWidth) {
                const opacity = Math.exp(-agePixels / (W * 0.45));
                if (opacity > 0.15) {
                  const idx = Math.round(x);
                  const labelY = hist[idx] !== undefined ? hist[idx] : midY;
                  
                  ctx.save();
                  ctx.font = 'bold 7.5px var(--font-mono), Courier, monospace';
                  ctx.fillStyle = `rgba(0, 255, 170, ${opacity * 0.85})`;
                  ctx.textAlign = 'center';
                  ctx.shadowBlur = 4 * opacity;
                  ctx.shadowColor = color;
                  ctx.fillText(l.name, x, labelY + l.yOffset);
                  ctx.restore();
                }
              }
            }
          }
        }
      }

      const rWaveTime = 0.42 * T_active;
      const oldBeats = Math.floor(oldPhase);
      const newBeats = Math.floor(newPhase);
      const oldT = (oldPhase % 1) * beatDurationMs;
      const newT = (newPhase % 1) * beatDurationMs;
      
      let crossedR = false;
      if (oldBeats === newBeats) {
        if (oldT < rWaveTime && newT >= rWaveTime) crossedR = true;
      } else {
        if (oldT < rWaveTime || newT >= rWaveTime) crossedR = true;
      }

      const isCurrentSkipped = !crisis && (newBeats % 6 === 4);
      if (crossedR && !isCurrentSkipped) { // Mute audio beep trigger during skipped beats
        if (sound && onBeat) onBeat();
        if (sound && audioEnabled && audioCtx) {
          try {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const gainNode = audioCtx.createGain();
            const baseFreq = Math.max(300, Math.min(1200, 500 + (bpm - 75) * 4.5));
            
            if (crisis) {
              const duration = 0.09;
              gainNode.gain.setValueAtTime(0.12 * volume, audioCtx.currentTime);
              gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
              gainNode.connect(audioCtx.destination);

              const osc1 = audioCtx.createOscillator();
              osc1.type = 'sine';
              osc1.frequency.setValueAtTime(baseFreq * 1.5, audioCtx.currentTime);
              osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, audioCtx.currentTime + 0.02);
              osc1.connect(gainNode);
              osc1.start();
              osc1.stop(audioCtx.currentTime + duration);

              const osc2 = audioCtx.createOscillator();
              osc2.type = 'sine';
              osc2.frequency.setValueAtTime(baseFreq * 1.57, audioCtx.currentTime);
              osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.38, audioCtx.currentTime + 0.02);
              osc2.connect(gainNode);
              osc2.start();
              osc2.stop(audioCtx.currentTime + duration);
            } else {
              const duration = 0.06;
              gainNode.gain.setValueAtTime(0.08 * volume, audioCtx.currentTime);
              gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
              gainNode.connect(audioCtx.destination);

              const osc = audioCtx.createOscillator();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, audioCtx.currentTime + 0.015);
              osc.connect(gainNode);
              osc.start();
              osc.stop(audioCtx.currentTime + duration);
            }
          } catch (e) {}
        }
      }

      const dotY = hist[Math.floor(scanX)] || midY;
      if (glow) {
        ctx.save();
        const bloomRadius = 10 * ampScale;
        const grad = ctx.createRadialGradient(scanX, dotY, 0, scanX, dotY, bloomRadius);
        grad.addColorStop(0, glowRgba + '0.55)');
        grad.addColorStop(1, glowRgba + '0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(scanX, dotY, bloomRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(scanX, dotY, Math.max(1.5, 3 * ampScale), 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      if (glow) {
        ctx.shadowBlur = 24 * ampScale;
        ctx.shadowColor = color;
      }
      ctx.fill();
      ctx.restore();

      xRef.current = scanX;
      animRef.current = requestAnimationFrame(tick);
    };

    if (mediaQuery.matches) {
      drawStatic();
    } else {
      animRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [crisis, hr, width, height, glow, audioEnabled, sound, audioCtx, volume, onBeat]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-sm animate-pulse-slow"
      style={{
        display: 'block',
        background: '#000000',
        imageRendering: 'pixelated'
      }}
      aria-label="Real-time cardiac telemetry ECG waveform"
    />
  );
}
