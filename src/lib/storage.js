export function readJSON(key,fallback) {
  try {
    const raw=localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key,value) {
  try {
    localStorage.setItem(key,JSON.stringify(value))
  } catch {
    // Prototype: storage may be unavailable in private/restricted browser contexts.
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // no-op
  }
}
