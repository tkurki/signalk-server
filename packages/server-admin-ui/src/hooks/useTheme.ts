import { ModeConfig, ThemeMode } from '@/store'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faCircleHalfStroke } from '@fortawesome/free-solid-svg-icons/faCircleHalfStroke'
import { faMoon } from '@fortawesome/free-solid-svg-icons/faMoon'
import { useState, useEffect, useCallback } from 'react'

const faSunCustom: IconDefinition = {
  prefix: 'fas',
  iconName: 'sun',
  icon: [
    24,
    24,
    [],
    '',
    'M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0 c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2 c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1 C11.45,19,11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06 c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41 l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41 c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36 c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z'
  ]
}

export const MODES: ModeConfig[] = [
  { mode: 'light', label: 'Light', icon: faSunCustom },
  { mode: 'dark', label: 'Dark', icon: faMoon },
  { mode: 'auto', label: 'Auto', icon: faCircleHalfStroke }
]

const VALID_MODES = MODES.map((m) => m.mode)

const isValidTheme = (value: unknown): value is ThemeMode =>
  typeof value === 'string' && VALID_MODES.includes(value as ThemeMode)

const getStoredTheme = (): ThemeMode | null => {
  const stored = localStorage.getItem('sk:theme')
  return isValidTheme(stored) ? stored : null
}

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const getPreferredTheme = (): ThemeMode => getStoredTheme() ?? 'auto'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getPreferredTheme())

  useEffect(() => {
    const resolved = theme === 'auto' ? getSystemTheme() : theme
    document.documentElement.setAttribute('data-bs-theme', resolved)
  }, [theme])

  useEffect(() => {
    if (theme !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => {
      document.documentElement.setAttribute(
        'data-bs-theme',
        mediaQuery.matches ? 'dark' : 'light'
      )
    }

    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [theme])

  const setTheme = useCallback((mode: ThemeMode) => {
    localStorage.setItem('sk:theme', mode)
    setThemeState(mode)
  }, [])

  return { theme, setTheme }
}
