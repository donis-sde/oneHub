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
  /** Public IP of the client when the action was recorded */
  ip: string
  timestamp: string
}

const STORAGE_KEY = "onehub-activity-log"
const IP_CACHE_KEY = "onehub-client-ip"
const MAX_ENTRIES = 500

type Listener = (entries: ActivityEntry[]) => void

const listeners = new Set<Listener>()

let cachedIp: string | null = null
let ipResolvePromise: Promise<string> | null = null

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

async function fetchPublicIp(): Promise<string> {
  try {
    const cached = localStorage.getItem(IP_CACHE_KEY)
    if (cached) {
      cachedIp = cached
      return cached
    }
  } catch {
    // ignore
  }

  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(4000),
    })
    if (response.ok) {
      const data = (await response.json()) as { ip?: string }
      if (data.ip) {
        cachedIp = data.ip
        try {
          localStorage.setItem(IP_CACHE_KEY, data.ip)
        } catch {
          // ignore quota errors
        }
        return data.ip
      }
    }
  } catch {
    // fall through
  }

  return "unknown"
}

function resolveIp(): Promise<string> {
  if (cachedIp) {
    return Promise.resolve(cachedIp)
  }
  if (!ipResolvePromise) {
    ipResolvePromise = fetchPublicIp().finally(() => {
      ipResolvePromise = null
    })
  }
  return ipResolvePromise
}

/** Warm the IP cache early (e.g. on app load). */
export function prefetchClientIp(): void {
  void resolveIp()
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
      ip: cachedIp ?? "resolving…",
      timestamp: new Date().toISOString(),
    }
    const updated = [next, ...entries].slice(0, MAX_ENTRIES)
    write(updated)

    // Backfill IP asynchronously if not yet known
    if (!cachedIp || next.ip === "resolving…") {
      void resolveIp().then((ip) => {
        const current = read()
        const patched = current.map((item) =>
          item.id === next.id ? { ...item, ip } : item,
        )
        write(patched)
      })
    }
  },

  clear() {
    write([])
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
