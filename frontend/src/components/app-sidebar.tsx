"use client"

import * as React from "react"

import { AppSwitcher, type WatiApp } from "@/components/app-switcher"
import { AppNavigation } from "@/components/app-navigation"
import { NavUser } from "@/components/nav-user-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const watiApps: WatiApp[] = [
  {
    id: "mt-backoffice",
    name: "MT-Backoffice",
    description: "Main tenant backoffice",
  },
  {
    id: "eu-backoffice",
    name: "EU-Backoffice",
    description: "European region backoffice",
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeAppId, setActiveAppId] = React.useState(watiApps[0]?.id)

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <AppSwitcher
          apps={watiApps}
          activeAppId={activeAppId}
          onAppChange={(app) => setActiveAppId(app.id)}
        />
      </SidebarHeader>
      <SidebarContent>
        <AppNavigation />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
