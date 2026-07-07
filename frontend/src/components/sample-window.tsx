import type { SampleRoute } from "@/config/sample-routes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityIcon, LayersIcon, SparklesIcon } from "lucide-react"

const statCards = [
  { label: "Overview", icon: LayersIcon },
  { label: "Details", icon: ActivityIcon },
  { label: "Status", icon: SparklesIcon },
] as const

export function SampleWindow({ route }: { route: SampleRoute }) {
  const Icon = route.icon

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative overflow-hidden border-b border-border/40 bg-linear-to-br from-primary/8 via-background to-background px-4 py-8 md:px-8 md:py-10">
        <div className="pointer-events-none absolute -top-24 right-0 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-wrap items-start gap-5">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <Icon className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">
              {route.section}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              {route.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {route.description}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-primary"
          >
            Sample window
          </Badge>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map(({ label, icon: StatIcon }) => (
            <Card
              key={label}
              size="sm"
              className="surface-card transition-shadow hover:shadow-md"
            >
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <StatIcon className="size-4" />
                </div>
                <div>
                  <CardDescription>{label}</CardDescription>
                  <CardTitle className="text-lg">
                    <Skeleton className="mt-1 h-5 w-20" />
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-2.5 w-full rounded-full" />
                <Skeleton className="h-2.5 w-4/5 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="surface-elevated">
          <CardHeader className="border-b border-border/40">
            <CardTitle className="text-lg">{route.title}</CardTitle>
            <CardDescription>
              This is a placeholder for the {route.title} screen. Replace this
              with the real form, table, or workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-32 rounded-full" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-32 rounded-full" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-40 rounded-full" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border/40 pt-5">
              <Button size="sm" className="rounded-lg px-4">
                Primary action
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg px-4">
                Secondary
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
