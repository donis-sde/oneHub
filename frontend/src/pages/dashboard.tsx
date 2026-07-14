import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SampleWindow } from "@/components/sample-window"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { resolveSampleRoute } from "@/config/sample-routes"
import { resolveToolPage } from "@/config/tool-pages"
import { useHashRoute } from "@/hooks/use-hash-route"

import data from "@/app/dashboard/data.json"

export function DashboardPage() {
  const hash = useHashRoute()
  const route = resolveSampleRoute(hash)
  const ToolPage = resolveToolPage(hash)

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
        <SiteHeader
          title={route ? route.title : "Documents"}
          section={route?.section}
        />
        {ToolPage ? (
          <ToolPage />
        ) : route ? (
          <SampleWindow route={route} />
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="@container/main mx-auto flex w-full max-w-7xl flex-1 flex-col gap-2">
              <div className="flex flex-col gap-5 py-6 md:gap-7 md:py-8">
                <SectionCards />
                <div className="px-4 lg:px-6">
                  <ChartAreaInteractive />
                </div>
                <DataTable data={data} />
              </div>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
