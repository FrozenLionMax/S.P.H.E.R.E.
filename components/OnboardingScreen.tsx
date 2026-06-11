'use client';

import { motion } from 'framer-motion';
import LandingBackground from '@/components/LandingBackground';
import ScrambleText from '@/components/ui/ScrambleText';
import Magnetic from '@/components/ui/Magnetic';
import { TRACK_CONFIGS, PROFILE_HARDWARE, TrackKey } from '@/lib/constants';

interface OnboardingScreenProps {
  activeTrackKey: TrackKey;
  handleTrackChange: (key: TrackKey) => void;
  trackConf: typeof TRACK_CONFIGS[TrackKey];
  setIsOnboarded: (val: boolean) => void;
  router: any;
}

export default function OnboardingScreen({
  activeTrackKey,
  handleTrackChange,
  trackConf,
  setIsOnboarded,
  router
}: OnboardingScreenProps) {
  const animContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15
      }
    }
  } as const;

  const animItem = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 110,
        damping: 15
      }
    }
  } as const;

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center relative overflow-hidden px-6 py-12">
      <LandingBackground themeColor={trackConf.themeColor} />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl z-10 flex flex-col items-center"
      >
        {/* Logo and title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-10 flex flex-col items-center"
        >
          <div className="mb-4 relative flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="overflow-visible">
              <path d="M 20,2 L 20,6 M 20,34 L 20,38 M 2,20 L 6,20 M 34,20 L 38,20" stroke={trackConf.themeColor} strokeWidth="1" opacity="0.5" />
              
              <motion.circle
                cx="20"
                cy="20"
                r="16"
                stroke={trackConf.themeColor}
                strokeWidth="0.8"
                strokeDasharray="12 6 4 6"
                style={{ transformOrigin: 'center' }}
              />

              <motion.circle
                cx="20"
                cy="20"
                r="12"
                stroke={trackConf.themeColor}
                strokeWidth="0.5"
                strokeDasharray="6 3"
                opacity="0.6"
                style={{ transformOrigin: 'center' }}
              />

              <motion.path
                d="M 13,20 H 17 L 18.5,15 L 20,25 L 21.5,18 L 23,20 H 27"
                stroke={trackConf.themeColor}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ strokeDashoffset: 40, opacity: 0.6 }}
                animate={{
                  strokeDashoffset: [40, 0, -40],
                  opacity: [0.6, 1, 0.6]
                }}
                strokeDasharray="20 20"
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />

              <motion.circle
                cx="20"
                cy="20"
                r="3.5"
                fill={trackConf.themeColor}
                animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: 'center' }}
              />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-[0.3em] font-mono uppercase text-white mb-2">
            S.P.H.E.R.E.
          </h1>
          <p className="text-[10px] font-mono tracking-[0.2em] text-cyan-400 uppercase max-w-xl">
            Sentinel Physiological Hazard Evaluation & Response Engine
          </p>
          <div className="w-12 h-0.5 mt-4 transition-colors duration-500" style={{ background: trackConf.themeColor }} />
        </motion.div>

        {/* Track selector title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full mb-6 flex items-center gap-4"
        >
           <div className="flex-1 h-px bg-slate-800/60" />
           <span className="text-[10px] font-mono tracking-[0.25em] text-slate-500 uppercase shrink-0">
             Select Operations Interface Track
           </span>
           <div className="flex-1 h-px bg-slate-800/60" />
        </motion.div>

        {/* Cards Grid */}
        <motion.div
          variants={animContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 w-full mb-8"
        >
          {(Object.keys(TRACK_CONFIGS) as Array<TrackKey>).map((k) => {
            const config = TRACK_CONFIGS[k];
            const isSelected = activeTrackKey === k;
            return (
              <motion.div
                key={k}
                variants={animItem}
                onClick={() => handleTrackChange(k)}
                whileHover={{ y: -4, borderColor: config.themeColor, boxShadow: '0 4px 20px ' + config.themeColor + '18' }}
                whileTap={{ scale: 0.98 }}
                className="cursor-pointer p-4 rounded-sm border flex flex-col justify-between h-48 transition-all relative overflow-hidden"
                style={{
                  background: isSelected ? 'var(--panel)' : 'rgba(255,255,255,0.01)',
                  borderColor: isSelected ? config.themeColor : 'var(--border)',
                  boxShadow: isSelected ? '0 0 20px ' + config.themeColor + '15' : 'none'
                }}
                role="button"
                aria-label={`Select ${k.replace('_', ' ')} track`}
                aria-pressed={isSelected}
              >
                <div className="absolute top-0 inset-x-0 h-[2px] transition-all" style={{ background: isSelected ? config.themeColor : 'transparent' }} />
                
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded-sm"
                        style={{
                          background: config.themeColor + '15',
                          color: config.themeColor,
                          border: '1px solid ' + config.themeColor + '30'
                        }}>
                        {k}
                      </span>
                      {isSelected && (
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: config.themeColor }}
                          layoutId="activeDot"
                        />
                      )}
                    </div>
                    <h3 className="text-xs font-bold font-mono tracking-wider text-slate-200 mt-2 uppercase text-left">
                      <ScrambleText text={k.replace('_', ' ')} />
                    </h3>
                    <p className="text-[9px] text-slate-500 font-mono mt-2 leading-relaxed text-left">
                      {config.title.toLowerCase()}
                    </p>
                    
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {PROFILE_HARDWARE[k].map((hw, idx) => (
                        <span
                          key={idx}
                          className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border border-slate-800/60 text-slate-400 bg-slate-900/10"
                        >
                          {hw.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-800/60 pt-2 flex items-center justify-between mt-auto">
                    <span className="text-[8px] font-mono text-slate-600">UNIT AX-7</span>
                    <span className="text-[9px] font-mono font-semibold" style={{ color: config.themeColor }}>
                      {config.metricUnit}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <Magnetic>
          <motion.button
            onClick={() => {
              setIsOnboarded(true);
              router.push('/?onboarded=true');
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            className="px-8 py-3 text-xs font-mono font-bold tracking-[0.2em] uppercase rounded-sm cursor-pointer border relative overflow-hidden group"
            style={{
              background: 'linear-gradient(90deg, ' + trackConf.themeColor + '10, ' + trackConf.themeColor + '20)',
              borderColor: trackConf.themeColor,
              color: '#fff'
            }}
            whileHover={{ scale: 1.03, boxShadow: '0 0 25px ' + trackConf.themeColor + '30' }}
            whileTap={{ scale: 0.98 }}
            role="button"
            aria-label="Initialize Neural Link connection"
          >
            Initialize Neural Link
          </motion.button>
        </Magnetic>
      </motion.div>
    </div>
  );
}
