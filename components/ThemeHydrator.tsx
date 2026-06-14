'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/lib/useThemeStore'

export default function ThemeHydrator() {
  const hydrate = useThemeStore((s) => s.hydrate)
  
  useEffect(() => {
    hydrate()
  }, [hydrate])

  return null
}
