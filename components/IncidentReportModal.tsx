'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface IncidentReportModalProps {
  show: boolean;
  reportText: string;
  onClose: () => void;
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
}

export default function IncidentReportModal({ show, reportText, onClose, onCopy, onDownload, copied }: IncidentReportModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full max-w-lg p-6 rounded-xl border border-white/10 glass-panel shadow-2xl relative flex flex-col max-h-[85vh] animate-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              onClick={onClose}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5 shrink-0">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-sm font-semibold tracking-wider font-mono text-white uppercase">
                S.P.H.E.R.E. INCIDENT REPORT
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 text-left">
              <pre className="p-4 rounded-lg bg-black/60 border border-white/5 text-[10.5px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                {reportText}
              </pre>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={onCopy}
                className="px-4 py-1.5 text-xs font-mono font-bold tracking-wider uppercase border border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded cursor-pointer"
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={onDownload}
                className="px-4 py-1.5 text-xs font-mono font-bold tracking-wider uppercase border border-slate-700 hover:border-slate-500 text-slate-200 rounded cursor-pointer"
              >
                Download Report
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
