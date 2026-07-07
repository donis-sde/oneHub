"use client"

import * as React from "react"

import { AppSwitcher, type WatiApp } from "@/components/app-switcher"
import { NavBackoffice } from "@/components/nav-backoffice"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { backofficeNavigation } from "@/config/backoffice-navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  BookOpenIcon,
  BotIcon,
  FrameIcon,
  MapIcon,
  PieChartIcon,
  Settings2Icon,
  TerminalSquareIcon,
} from "lucide-react"

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
  {
    id: "wati-tools",
    name: "Wati Tools",
    description: "Internal operations tools",
  },
  {
    id: "app-builder",
    name: "AppBuilder",
    description: "App configuration builder",
  },
]

const defaultUser = {
  name: "Admin",
  email: "admin@wati.local",
  avatar: "/wati-logo.png",
}

const placeholderNav = {
  navMain: [
    {
      title: "Overview",
      url: "#",
      icon: <TerminalSquareIcon />,
      isActive: true,
      items: [
        { title: "Dashboard", url: "#overview-dashboard" },
        { title: "Activity", url: "#overview-activity" },
      ],
    },
    {
      title: "Configuration",
      url: "#",
      icon: <Settings2Icon />,
      items: [
        { title: "General", url: "#config-general" },
        { title: "Integrations", url: "#config-integrations" },
      ],
    },
  ],
  projects: [
    { name: "Workspace A", url: "#workspace-a", icon: <FrameIcon /> },
    { name: "Workspace B", url: "#workspace-b", icon: <PieChartIcon /> },
    { name: "Workspace C", url: "#workspace-c", icon: <MapIcon /> },
  ],
}

const watiToolsNav = {
  navMain: [
    {
      title: "Tools",
      url: "#",
      icon: <BotIcon />,
      isActive: true,
      items: [
        { title: "Utilities", url: "#tools-utilities" },
        { title: "Monitoring", url: "#tools-monitoring" },
      ],
    },
    {
      title: "Docs",
      url: "#",
      icon: <BookOpenIcon />,
      items: [
        { title: "Guides", url: "#docs-guides" },
        { title: "Reference", url: "#docs-reference" },
      ],
    },
  ],
  projects: placeholderNav.projects,
}

function isBackofficeApp(appId: string) {
  return appId === "mt-backoffice" || appId === "eu-backoffice"
}

function SidebarNavigation({ appId }: { appId: string }) {
  if (isBackofficeApp(appId)) {
    return <NavBackoffice navigation={backofficeNavigation} />
  }

  const nav =
    appId === "wati-tools"
      ? watiToolsNav
      : appId === "app-builder"
        ? placeholderNav
        : placeholderNav

  return (
    <>
      <NavMain items={nav.navMain} />
      <NavProjects projects={nav.projects} />
    </>
  )
}

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
        {activeAppId ? <SidebarNavigation appId={activeAppId} /> : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={defaultUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
