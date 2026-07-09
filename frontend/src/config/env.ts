export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  appEnv: import.meta.env.VITE_APP_ENV ?? "local",
  isDev: import.meta.env.DEV,
} as const

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${env.apiBaseUrl}${normalized}`
}
