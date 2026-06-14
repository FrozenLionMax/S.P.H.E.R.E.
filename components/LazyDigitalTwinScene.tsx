'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import LoadingScreen from '@/components/LoadingScreen';

const DynamicDigitalTwin = dynamic(() => import('@/components/DigitalTwinScene'), {
  ssr: false,
  loading: () => <LoadingScreen />
});

interface LazyDigitalTwinSceneProps {
  transparent?: boolean;
}

export default function LazyDigitalTwinScene({ transparent = false }: LazyDigitalTwinSceneProps) {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' }
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
        <LoadingScreen />
      )}
    </div>
  );
}
