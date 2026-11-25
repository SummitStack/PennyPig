import { useEffect, useState } from 'react'

const KEY = 'pp-theme'

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getTheme() {
  if (typeof window === 'undefined') return 'dark'
  try {
    return localStorage.getItem(KEY) || (systemPrefersDark() ? 'dark' : 'light')
  } catch {
    return 'dark'
  }
}

export function setTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // storage unavailable (private mode); the toggle still works for this visit
  }
  window.dispatchEvent(new CustomEvent('pp-theme', { detail: theme }))
}

export function useTheme() {
  const [theme, setLocal] = useState(getTheme)
  useEffect(() => {
    const on = (e) => setLocal(e.detail)
    window.addEventListener('pp-theme', on)
    return () => window.removeEventListener('pp-theme', on)
  }, [])
  return [theme, (t) => setTheme(t)]
}
