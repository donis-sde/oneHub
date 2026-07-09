import type { LucideIcon } from "lucide-react"
import {
  ActivityIcon,
  BookMarkedIcon,
  BookOpenIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  MapIcon,
  PieChartIcon,
  PlugIcon,
  SettingsIcon,
  WrenchIcon,
} from "lucide-react"

import { backofficeNavigation } from "@/config/backoffice-navigation"

export type SampleRoute = {
  hash: string
  title: string
  section: string
  description: string
  icon: LucideIcon
}

function buildBackofficeRoutes(): SampleRoute[] {
  const routes: SampleRoute[] = []

  for (const group of backofficeNavigation.groups) {
    for (const item of group.items) {
      routes.push({
        hash: item.url,
        title: item.title,
        section: group.title,
        description: `Sample window for the "${item.title}" tool under ${group.title}. Wire up the real workflow here.`,
        icon: item.icon,
      })
    }
  }

  for (const link of backofficeNavigation.links) {
    routes.push({
      hash: link.url,
      title: link.title,
      section: backofficeNavigation.sectionLabel,
      description: `Sample window for ${link.title}. Wire up the real workflow here.`,
      icon: link.icon,
    })
  }

  return routes
}

const otherAppRoutes: SampleRoute[] = [
  {
    hash: "#overview-dashboard",
    title: "Dashboard",
    section: "Overview",
    description: "Sample window for the Overview dashboard.",
    icon: LayoutDashboardIcon,
  },
  {
    hash: "#overview-activity",
    title: "Activity",
    section: "Overview",
    description: "Sample window for recent activity.",
    icon: ActivityIcon,
  },
  {
    hash: "#config-general",
    title: "General",
    section: "Configuration",
    description: "Sample window for general configuration.",
    icon: SettingsIcon,
  },
  {
    hash: "#config-integrations",
    title: "Integrations",
    section: "Configuration",
    description: "Sample window for integrations configuration.",
    icon: PlugIcon,
  },
  {
    hash: "#tools-utilities",
    title: "Utilities",
    section: "Tools",
    description: "Sample window for internal utilities.",
    icon: WrenchIcon,
  },
  {
    hash: "#tools-monitoring",
    title: "Monitoring",
    section: "Tools",
    description: "Sample window for monitoring.",
    icon: GaugeIcon,
  },
  {
    hash: "#docs-guides",
    title: "Guides",
    section: "Docs",
    description: "Sample window for documentation guides.",
    icon: BookOpenIcon,
  },
  {
    hash: "#docs-reference",
    title: "Reference",
    section: "Docs",
    description: "Sample window for the reference documentation.",
    icon: BookMarkedIcon,
  },
  {
    hash: "#workspace-a",
    title: "Workspace A",
    section: "Projects",
    description: "Sample window for Workspace A.",
    icon: PieChartIcon,
  },
  {
    hash: "#workspace-b",
    title: "Workspace B",
    section: "Projects",
    description: "Sample window for Workspace B.",
    icon: PieChartIcon,
  },
  {
    hash: "#workspace-c",
    title: "Workspace C",
    section: "Projects",
    description: "Sample window for Workspace C.",
    icon: MapIcon,
  },
]

const allRoutes: SampleRoute[] = [...buildBackofficeRoutes(), ...otherAppRoutes]

const routesByHash = new Map<string, SampleRoute>(
  allRoutes.map((route) => [route.hash, route])
)

export function resolveSampleRoute(hash: string): SampleRoute | undefined {
  if (!hash || hash === "#") {
    return undefined
  }
  return routesByHash.get(hash)
}
