'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface KeyboardShortcutsDialogProps {
  show: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsDialog({ show, onClose }: KeyboardShortcutsDialogProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full max-w-md p-6 rounded-xl border border-white/10 glass-panel shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              onClick={onClose}
              aria-label="Dismiss help dialog"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-sm font-semibold tracking-wider font-mono text-white uppercase">
                S.P.H.E.R.E. Keybindings
              </h3>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-300">Switch Profiles</span>
                <div className="flex gap-1">
                  {['1', '2', '3', '4', '5'].map((k) => (
                    <kbd key={k} className="px-1.5 py-0.5 rounded border border-white/15 bg-white/5 text-[9px] font-mono font-bold text-white shadow-sm">
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
              <p className="text-[9px] text-slate-500 -mt-2 leading-relaxed font-mono">
                (1: Astronaut | 2: Pilot | 3: Surgeon | 4: Train Pilot | 5: Trucker)
              </p>

              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[11px] font-mono text-slate-300">Trigger Crisis</span>
                <kbd className="px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-[9px] font-mono font-bold text-red-400 uppercase shadow-sm">
                  C
                </kbd>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-300">Resolve Crisis</span>
                <kbd className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-[9px] font-mono font-bold text-emerald-400 uppercase shadow-sm">
                  R
                </kbd>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[11px] font-mono text-slate-300">Toggle System Audio</span>
                <kbd className="px-2 py-0.5 rounded border border-white/15 bg-white/5 text-[9px] font-mono font-bold text-white uppercase shadow-sm">
                  A
                </kbd>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-300">Pause / Resume Telemetry</span>
                <kbd className="px-3 py-0.5 rounded border border-white/15 bg-white/5 text-[9px] font-mono font-bold text-white uppercase shadow-sm">
                  Space
                </kbd>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[11px] font-mono text-slate-300">Toggle Help Overlay</span>
                <kbd className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-[9px] font-mono font-bold text-amber-400 uppercase shadow-sm">
                  ?
                </kbd>
              </div>
            </div>

            <div className="mt-5 text-center">
              <span className="text-[9px] text-slate-500 font-mono tracking-wider">
                Press <kbd className="px-1 py-0.2 rounded border border-white/10 bg-white/5 font-bold">ESC</kbd> or click outside to dismiss
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
