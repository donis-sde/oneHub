import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { authService } from "@/services/auth.service"
import { activityLog } from "@/lib/activity-log"
import { findPlatformUserByEmail } from "@/config/platform-users"
import type { AdminUser } from "@/types/auth"

function enrichUser(user: AdminUser | null): AdminUser | null {
  if (!user) return null
  const platform = findPlatformUserByEmail(user.email)
  return {
    ...user,
    userId: user.userId ?? platform?.userId,
    name: user.name ?? platform?.name,
  }
}

interface AuthContextValue {
  user: AdminUser | null
  isLoading: boolean
  isAuthenticated: boolean
  signin: (email: string, password: string) => Promise<void>
  signout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authService.me,
    retry: false,
    staleTime: 60_000,
  })

  const user = enrichUser(data?.user ?? null)

  React.useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.setQueryData(["auth", "me"], { user: null })
      navigate("/login", { replace: true })
    }

    window.addEventListener("auth:unauthorized", handleUnauthorized)
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized)
  }, [navigate, queryClient])

  const signin = React.useCallback(
    async (email: string, password: string) => {
      const response = await authService.signin({ email, password })
      if (!response.success) {
        activityLog.record({
          type: "error",
          message: "Failed sign-in attempt",
          detail: response.error ?? "Sign in failed",
          user: email,
        })
        throw new Error(response.error ?? "Sign in failed")
      }
      if (response.metadata?.adminUser) {
        queryClient.setQueryData(["auth", "me"], {
          user: enrichUser(response.metadata.adminUser),
        })
      }
      activityLog.record({
        type: "login",
        message: "Signed in",
        user: email,
      })
      await refetch()
    },
    [queryClient, refetch],
  )

  const signout = React.useCallback(async () => {
    const currentEmail = user?.email
    await authService.signout()
    activityLog.record({
      type: "logout",
      message: "Signed out",
      user: currentEmail,
    })
    queryClient.setQueryData(["auth", "me"], { user: null })
    navigate("/login", { replace: true })
  }, [navigate, queryClient, user?.email])

  const refreshUser = React.useCallback(async () => {
    await refetch()
  }, [refetch])

  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      signin,
      signout,
      refreshUser,
    }),
    [user, isLoading, signin, signout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
