import * as React from "react"
import { Outlet, useLocation } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { CommandPalette } from "@/components/shared/command-palette"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { mainNavGroups, topLevelNav, headerNav } from "@/config/navigation"
import { useAuth } from "@/contexts/auth-context"
import { activityLog } from "@/lib/activity-log"

function usePageMeta() {
  const location = useLocation()

  return React.useMemo(() => {
    const all = [
      ...topLevelNav,
      ...headerNav,
      ...mainNavGroups.flatMap((g) => g.items),
    ]
    const match = all.find((item) =>
      item.path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.path),
    )
    return {
      title: match?.title ?? "OneHub",
      section: match ? undefined : "Backoffice",
    }
  }, [location.pathname])
}

function useNavigationTracking(title: string) {
  const location = useLocation()
  const { user } = useAuth()
  const lastPath = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (lastPath.current === location.pathname) {
      return
    }
    lastPath.current = location.pathname
    activityLog.record({
      type: "navigation",
      message: `Viewed ${title}`,
      detail: location.pathname,
      user: user?.email,
    })
  }, [location.pathname, title, user?.email])
}

export function AppLayout() {
  const meta = usePageMeta()
  useNavigationTracking(meta.title)

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="bg-transparent">
        <SiteHeader title={meta.title} section={meta.section} />
        <Outlet />
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  )
}
