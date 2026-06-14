import { useEffect, useRef } from 'react'
import { useTelemetryStore } from '@/lib/useTelemetryStore'

const ORGAN_CYCLE = ['none', 'brain', 'lungs', 'heart', 'liver'] as const
const ORGAN_CONDITIONS: Record<string, string> = {
  brain: 'epilepsy',
  lungs: 'asthma',
  heart: 'arrhythmia',
  liver: 'diabetes',
}

export function useKeyboardShortcuts() {
  const activeRef = useRef(true)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire if typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const store = useTelemetryStore.getState()
      const current = store.selectedOrgan
      const idx = ORGAN_CYCLE.indexOf(current as any)

      switch (e.key) {
        case 'ArrowRight': {
          e.preventDefault()
          const next = ORGAN_CYCLE[(idx + 1) % ORGAN_CYCLE.length]
          store.setSelectedOrgan(next as any)
          if (next !== 'none') store.setCurrentCondition(ORGAN_CONDITIONS[next] as any)
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          const prev = ORGAN_CYCLE[(idx - 1 + ORGAN_CYCLE.length) % ORGAN_CYCLE.length]
          store.setSelectedOrgan(prev as any)
          if (prev !== 'none') store.setCurrentCondition(ORGAN_CONDITIONS[prev] as any)
          break
        }
        case 'Escape':
          store.setSelectedOrgan('none')
          store.setCustomZoomTarget(null)
          break
        case '0':
          store.setSelectedOrgan('none')
          store.setCustomZoomTarget(null)
          break
        case '1':
          store.setSelectedOrgan('brain')
          store.setCurrentCondition('epilepsy')
          break
        case '2':
          store.setSelectedOrgan('lungs')
          store.setCurrentCondition('asthma')
          break
        case '3':
          store.setSelectedOrgan('heart')
          store.setCurrentCondition('arrhythmia')
          break
        case '4':
          store.setSelectedOrgan('liver')
          store.setCurrentCondition('diabetes')
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
