export const ROUTES = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
