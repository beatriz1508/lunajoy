export function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const item = window.localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : fallback
  } catch {
    return fallback
  }
}

export function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    console.error("Failed to save to localStorage")
  }
}

export function removeItem(key: string): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(key)
}
