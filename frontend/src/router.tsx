import { createBrowserRouter, Navigate } from "react-router-dom"

import { DashboardPage } from "@/pages/dashboard"
import { LoginPage } from "@/pages/login"
import { ROUTES } from "@/lib/app-routes"

export const router = createBrowserRouter([
  {
    path: ROUTES.home,
    element: <Navigate to={ROUTES.login} replace />,
  },
  {
    path: ROUTES.login,
    element: <LoginPage />,
  },
  {
    path: ROUTES.dashboard,
    element: <DashboardPage />,
  },
  {
    path: "*",
    element: <Navigate to={ROUTES.login} replace />,
  },
])
