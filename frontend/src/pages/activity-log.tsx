import * as React from "react"
import { formatDistanceToNow, format } from "date-fns"
import {
  ActivityIcon,
  AlertTriangleIcon,
  LogInIcon,
  LogOutIcon,
  MousePointerClickIcon,
  NavigationIcon,
  Trash2Icon,
} from "lucide-react"

import { useActivityLog } from "@/hooks/use-activity-log"
import type { ActivityEntry, ActivityType } from "@/lib/activity-log"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/shared/empty-state"
import { SearchIcon } from "lucide-react"

const typeMeta: Record<
  ActivityType,
  { label: string; icon: React.ComponentType<{ className?: string }>; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  login: { label: "Login", icon: LogInIcon, variant: "default" },
  logout: { label: "Logout", icon: LogOutIcon, variant: "secondary" },
  navigation: { label: "Navigation", icon: NavigationIcon, variant: "outline" },
  action: { label: "Action", icon: MousePointerClickIcon, variant: "default" },
  error: { label: "Error", icon: AlertTriangleIcon, variant: "destructive" },
}

const filterOptions: { value: ActivityType | "all"; label: string }[] = [
  { value: "all", label: "All activity" },
  { value: "login", label: "Logins" },
  { value: "logout", label: "Logouts" },
  { value: "navigation", label: "Navigation" },
  { value: "action", label: "Actions" },
  { value: "error", label: "Errors" },
]

export function ActivityLogPage() {
  const { entries, clear } = useActivityLog()
  const [typeFilter, setTypeFilter] = React.useState<ActivityType | "all">("all")
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    return entries.filter((entry) => {
      const matchesType = typeFilter === "all" || entry.type === typeFilter
      const matchesSearch =
        !search ||
        entry.message.toLowerCase().includes(search.toLowerCase()) ||
        entry.user.toLowerCase().includes(search.toLowerCase()) ||
        (entry.detail?.toLowerCase().includes(search.toLowerCase()) ?? false)
      return matchesType && matchesSearch
    })
  }, [entries, typeFilter, search])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ActivityIcon className="text-primary size-5" />
          <h1 className="text-2xl font-semibold">Activity Log</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          User sign-ins, page visits, and actions performed in the dashboard, with timestamps.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search activity..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as ActivityType | "all")}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={clear}
          disabled={entries.length === 0}
          className="w-fit"
        >
          <Trash2Icon className="mr-2 size-4" />
          Clear log
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No activity recorded"
          description="Sign-ins, navigation, and tool actions will appear here as you use the dashboard."
        />
      ) : (
        <div className="surface-card overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Type</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const meta = typeMeta[entry.type]
  const Icon = meta.icon
  const date = new Date(entry.timestamp)

  return (
    <TableRow>
      <TableCell>
        <Badge variant={meta.variant} className="gap-1">
          <Icon className="size-3" />
          {meta.label}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{entry.message}</span>
          {entry.detail ? (
            <span className="text-muted-foreground text-xs">{entry.detail}</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{entry.user}</TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <span title={format(date, "PPpp")}>
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
          <span className="text-muted-foreground text-xs">
            {format(date, "MMM d, HH:mm:ss")}
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}
