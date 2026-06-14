import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeStore {
  theme: Theme
  _hydrated: boolean
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  hydrate: () => void
}

const applyTheme = (theme: Theme) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'dark', // Always start with dark to match SSR
  _hydrated: false,
  toggleTheme: () =>
    set((state) => {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem('sphere-theme', next) } catch {}
      applyTheme(next)
      return { theme: next }
    }),
  setTheme: (theme: Theme) =>
    set(() => {
      try { localStorage.setItem('sphere-theme', theme) } catch {}
      applyTheme(theme)
      return { theme }
    }),
  hydrate: () =>
    set(() => {
      if (typeof window === 'undefined') return { _hydrated: true }
      let stored: Theme = 'dark'
      try {
        const val = localStorage.getItem('sphere-theme')
        if (val === 'light' || val === 'dark') stored = val
      } catch {}
      applyTheme(stored)
      return { theme: stored, _hydrated: true }
    }),
}))
