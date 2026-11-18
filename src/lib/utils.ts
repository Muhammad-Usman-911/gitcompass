import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeStorage() {
  try {
    const k = '__gc_test__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return window.localStorage
  } catch {
    return null
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = safeStorage()?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    safeStorage()?.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: progress just isn't saved */
  }
}

export function encodeSetup(cmds: string[]) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(cmds))))
}

export function decodeSetup(s: string | null): string[] {
  if (!s) return []
  try {
    const v = JSON.parse(decodeURIComponent(escape(atob(s))))
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
