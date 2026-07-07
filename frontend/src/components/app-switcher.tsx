"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { WatiLogo } from "@/components/wati-logo"
import { ChevronsUpDownIcon } from "lucide-react"

export type WatiApp = {
  id: string
  name: string
  description: string
}

export function AppSwitcher({
  apps,
  activeAppId,
  onAppChange,
}: {
  apps: WatiApp[]
  activeAppId?: string
  onAppChange?: (app: WatiApp) => void
}) {
  const { isMobile } = useSidebar()
  const [activeApp, setActiveApp] = React.useState(
    () => apps.find((app) => app.id === activeAppId) ?? apps[0],
  )

  if (!activeApp) {
    return null
  }

  const selectApp = (app: WatiApp) => {
    setActiveApp(app)
    onAppChange?.(app)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                tooltip={activeApp.name}
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-9 items-center justify-center rounded-xl border border-primary/15 bg-linear-to-br from-white to-primary/5 p-1.5 shadow-sm ring-1 ring-primary/10">
              <WatiLogo size={22} />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold tracking-tight">
                {activeApp.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {activeApp.description}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Applications
              </DropdownMenuLabel>
              {apps.map((app, index) => (
                <DropdownMenuItem
                  key={app.id}
                  onClick={() => selectApp(app)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg border border-primary/15 bg-linear-to-br from-white to-primary/5 p-1 shadow-sm">
                    <WatiLogo size={20} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{app.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {app.description}
                    </span>
                  </div>
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
