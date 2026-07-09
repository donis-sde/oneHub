export type ActivityType =
  | "login"
  | "logout"
  | "navigation"
  | "action"
  | "error"

export interface ActivityEntry {
  id: string
  type: ActivityType
  message: string
  detail?: string
  user: string
  timestamp: string
}

const STORAGE_KEY = "onehub-activity-log"
const MAX_ENTRIES = 500

type Listener = (entries: ActivityEntry[]) => void

const listeners = new Set<Listener>()

function read(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as ActivityEntry[]
    }
  } catch {
    // ignore malformed storage
  }
  return []
}

function write(entries: ActivityEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  listeners.forEach((listener) => listener(entries))
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const activityLog = {
  list(): ActivityEntry[] {
    return read()
  },

  record(entry: {
    type: ActivityType
    message: string
    detail?: string
    user?: string
  }) {
    const entries = read()
    const next: ActivityEntry = {
      id: createId(),
      type: entry.type,
      message: entry.message,
      detail: entry.detail,
      user: entry.user ?? "unknown",
      timestamp: new Date().toISOString(),
    }
    const updated = [next, ...entries].slice(0, MAX_ENTRIES)
    write(updated)
  },

  clear() {
    write([])
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
