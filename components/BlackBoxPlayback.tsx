'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface BlackBoxPlaybackProps {
  isActive: boolean;
  playbackIndex: number;
  totalFrames: number;
  isPlaying: boolean;
  onIndexChange: (idx: number) => void;
  onTogglePlay: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onExit: () => void;
}

export default function BlackBoxPlayback({
  isActive,
  playbackIndex,
  totalFrames,
  isPlaying,
  onIndexChange,
  onTogglePlay,
  onStepBack,
  onStepForward,
  onExit
}: BlackBoxPlaybackProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed bottom-4 left-4 right-4 z-[9999] p-3.5 rounded-xl border border-amber-500/30 glass-panel shadow-2xl flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between animate-none"
          style={{
            background: 'rgba(12, 10, 8, 0.9)',
            backdropFilter: 'blur(20px) saturate(1.2)'
          }}
        >
          <div className="flex items-center gap-3 shrink-0 font-mono">
            <motion.div 
              className="w-2.5 h-2.5 rounded-full bg-amber-500"
              animate={{ scale: [1, 1.25, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                BLACK BOX REPLAY
              </span>
              <span className="text-[8px] text-slate-400 mt-0.5">
                TIME INDEX: {totalFrames - 1 - playbackIndex}s AGO
              </span>
            </div>
          </div>

          <div className="flex-1 px-4 flex items-center gap-3">
            <span className="text-[8.5px] font-mono text-slate-500">START</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, totalFrames - 1)}
              value={playbackIndex}
              onChange={(e) => onIndexChange(parseInt(e.target.value))}
              className="flex-1 cursor-pointer"
              style={{
                accentColor: '#f59e0b',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                outline: 'none',
                WebkitAppearance: 'none'
              }}
            />
            <span className="text-[8.5px] font-mono text-slate-500">
              {playbackIndex + 1}/{totalFrames} FRAME
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <button
              onClick={onStepBack}
              className="p-1 px-2.5 text-[8.5px] font-mono border border-white/10 hover:bg-white/5 text-slate-300 rounded cursor-pointer"
              title="Step Backward"
            >
              ◀◀
            </button>
            <button
              onClick={onTogglePlay}
              className="p-1 px-3 text-[9px] font-mono font-bold uppercase border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded cursor-pointer"
            >
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>
            <button
              onClick={onStepForward}
              className="p-1 px-2.5 text-[8.5px] font-mono border border-white/10 hover:bg-white/5 text-slate-300 rounded cursor-pointer"
              title="Step Forward"
            >
              ▶▶
            </button>
            <button
              onClick={onExit}
              className="ml-2 p-1 px-3 text-[9px] font-mono font-bold uppercase border border-red-500/40 hover:bg-red-500/15 text-red-400 rounded cursor-pointer"
            >
              EXIT
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
