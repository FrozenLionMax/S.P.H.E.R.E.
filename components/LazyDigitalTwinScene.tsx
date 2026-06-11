'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';

const DynamicDigitalTwin = dynamic(() => import('@/components/DigitalTwinScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-slate-500">
      LOADING 3D NEURAL TWIN...
    </div>
  )
});

interface LazyDigitalTwinSceneProps {
  transparent?: boolean;
}

export default function LazyDigitalTwinScene({ transparent = false }: LazyDigitalTwinSceneProps) {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for prefers-reduced-motion to potentially customize observer behaviour
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect(); // Only trigger once
        }
      },
      { rootMargin: '120px' } // Pre-load slightly before entry
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[160px] relative">
      {isInView ? (
        <DynamicDigitalTwin transparent={transparent} />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-[8px] font-mono text-slate-500 gap-1 bg-black/20">
          <div className="w-2.5 h-2.5 border border-slate-700/50 border-t-transparent rounded-full animate-spin" />
          <span>ESTABLISHING 3D BIOMETRIC SECTOR...</span>
        </div>
      )}
    </div>
  );
}
