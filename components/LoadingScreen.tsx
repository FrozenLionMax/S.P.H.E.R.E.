'use client'

import { useState, useEffect } from 'react'

export default function LoadingScreen({ onComplete }: { onComplete?: () => void }) {
  const [progress, setProgress] = useState(0)
  const [textIndex, setTextIndex] = useState(0)
  const text = 'INITIALIZING NEURAL TWIN'

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 100
        if (p < 70) return p + Math.random() * 3 + 0.5
        return p + Math.random() * 8 + 2
      })
    }, 80)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (textIndex < text.length) {
      const t = setTimeout(() => setTextIndex(textIndex + 1), 60)
      return () => clearTimeout(t)
    }
  }, [textIndex, text.length])

  useEffect(() => {
    if (progress >= 100 && onComplete) {
      const t = setTimeout(onComplete, 400)
      return () => clearTimeout(t)
    }
  }, [progress, onComplete])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#040806] relative overflow-hidden">
      {/* Pulsing concentric rings */}
      <div className="relative w-32 h-32 mb-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border opacity-0"
            style={{
              borderColor: i === 0 ? '#00ffaa' : i === 1 ? '#00ccff' : '#c040ff',
              animation: `pulse-ring 2.4s ease-out ${i * 0.4}s infinite`,
              borderWidth: '1px',
            }}
          />
        ))}
        {/* DNA helix spinner */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-8 h-8"
            style={{ animation: 'spin 1.5s linear infinite' }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: i % 2 === 0 ? '#00ffaa' : '#c040ff',
                  left: `${50 + Math.cos((i / 6) * Math.PI * 2) * 40}%`,
                  top: `${50 + Math.sin((i / 6) * Math.PI * 2) * 40}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: 0.6 + (i / 6) * 0.4,
                  animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite alternate`,
                }}
              />
            ))}
          </div>
        </div>
        {/* Center glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-3 h-3 rounded-full bg-[#00ffaa]"
            style={{
              boxShadow: '0 0 20px #00ffaa, 0 0 40px #00ffaa40',
              animation: 'pulse-glow 1.5s ease-in-out infinite alternate',
            }}
          />
        </div>
      </div>

      {/* Typewriter text */}
      <div className="font-mono text-[10px] tracking-[0.3em] text-[#00ffaa]/80 mb-4 h-4">
        {text.slice(0, textIndex)}
        <span className="animate-pulse">▊</span>
      </div>

      {/* Progress bar */}
      <div className="w-48 h-[2px] bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-100 ease-out"
          style={{
            width: `${Math.min(progress, 100)}%`,
            background: 'linear-gradient(90deg, #00ffaa, #00ccff, #c040ff)',
            boxShadow: '0 0 8px #00ffaa60',
          }}
        />
      </div>
      <div className="font-mono text-[8px] text-slate-600 mt-1.5 tracking-wider">
        {Math.min(Math.floor(progress), 100)}%
      </div>

      <style jsx>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.5); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes pulse-dot {
          0% { transform: translate(-50%, -50%) scale(0.8); }
          100% { transform: translate(-50%, -50%) scale(1.4); }
        }
        @keyframes pulse-glow {
          0% { opacity: 0.4; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
