import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  ActivityIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { useAuth } from "@/contexts/auth-context"
import { mainNavGroups } from "@/config/navigation"
import { healthService } from "@/services/health.service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { ErrorState } from "@/components/shared/error-state"

const quickLinks = mainNavGroups.flatMap((g) => g.items).slice(0, 6)

export function HomeDashboardPage() {
  const { user } = useAuth()

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: healthService.check,
    retry: 1,
  })

  const stats = [
    {
      title: "Role",
      value: user?.role ?? "—",
      icon: ShieldIcon,
      description: "Current access level",
    },
    {
      title: "API Status",
      value: healthQuery.isSuccess ? "Healthy" : healthQuery.isLoading ? "Checking" : "Offline",
      icon: ActivityIcon,
      description: "Backend health check",
    },
    {
      title: "Tools",
      value: String(mainNavGroups.flatMap((g) => g.items).length),
      icon: DatabaseIcon,
      description: "Integrated backoffice tools",
    },
    {
      title: "Account",
      value: user?.email?.split("@")[0] ?? "—",
      icon: UsersIcon,
      description: user?.email ?? "",
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm">
          WATI OneHub backoffice — manage tenants, WABA tools, and internal operations.
        </p>
      </motion.div>

      {healthQuery.isError ? (
        <ErrorState
          title="Backend unreachable"
          message="Could not connect to the API. Ensure the backend is running and VITE_API_BASE_URL is configured."
          onRetry={() => healthQuery.refetch()}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="surface-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{stat.title}</CardDescription>
                <stat.icon className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold capitalize">{stat.value}</div>
                <p className="text-muted-foreground mt-1 truncate text-xs">{stat.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Quick access</CardTitle>
            <CardDescription>Frequently used backoffice tools</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {quickLinks.map((item) => (
              <Button key={item.path} variant="outline" className="justify-start" render={<Link to={item.path} />}>
                <item.icon className="mr-2 size-4" />
                {item.title}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle>System</CardTitle>
            <CardDescription>Environment and connectivity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">API health</span>
              <Badge variant={healthQuery.isSuccess ? "default" : "secondary"}>
                {healthQuery.isSuccess ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2Icon className="size-3" /> OK
                  </span>
                ) : (
                  "Pending"
                )}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Environment</span>
              <Badge variant="outline">{import.meta.env.VITE_APP_ENV ?? "local"}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="surface-card rounded-xl p-4 lg:p-6">
        <ChartAreaInteractive />
      </div>
    </div>
  )
}
