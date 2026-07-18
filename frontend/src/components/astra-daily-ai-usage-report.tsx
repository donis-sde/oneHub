import * as React from "react"
import { toast } from "sonner"
import { DownloadIcon, Loader2Icon, RefreshCwIcon } from "lucide-react"

import {
  astraService,
  type AstraDailyAiUsageReport,
} from "@/services/astra.service"
import { activityLog } from "@/lib/activity-log"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function yesterdayUtc(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value)
}

function reportToCsv(report: AstraDailyAiUsageReport): string {
  const headers = [
    "date",
    "tenant_id",
    "agent_id",
    "agent_website",
    "text_conversations",
    "text_turns",
    "text_credits",
    "voice_conversations",
    "voice_turns",
    "voice_credits",
    "voice_duration_sec",
    "action_events",
    "action_credits",
    "total_credits",
  ]

  const escape = (value: string | number | null) => {
    const raw = value == null ? "" : String(value)
    if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
    return raw
  }

  const lines = [headers.join(",")]
  for (const row of report.rows) {
    lines.push(
      [
        row.date,
        row.tenantId,
        row.agentId,
        row.agentWebsite,
        row.textConversations,
        row.textTurns,
        row.textCredits,
        row.voiceConversations,
        row.voiceTurns,
        row.voiceCredits,
        row.voiceDurationSec,
        row.actionEvents,
        row.actionCredits,
        row.totalCredits,
      ]
        .map(escape)
        .join(","),
    )
  }
  return `${lines.join("\n")}\n`
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function AstraDailyAiUsageReportPage() {
  const defaultDay = yesterdayUtc()
  const [fromDate, setFromDate] = React.useState(defaultDay)
  const [toDate, setToDate] = React.useState(defaultDay)
  const [tenantId, setTenantId] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [report, setReport] = React.useState<AstraDailyAiUsageReport | null>(
    null,
  )

  const loadReport = React.useCallback(async () => {
    const tenant = tenantId.trim()
    if (!tenant) {
      toast.error("Astra Tenant ID is required")
      return
    }
    if (!fromDate || !toDate) {
      toast.error("From date and to date are required")
      return
    }
    if (fromDate > toDate) {
      toast.error("From date must be on or before to date")
      return
    }

    setLoading(true)
    try {
      const data = await astraService.getDailyAiUsage({
        fromDate,
        toDate,
        tenantId: tenant,
      })
      setReport(data)
      activityLog.record({
        type: "action",
        message: "Executed: Daily AI Usage Report",
        detail: `tenant=${tenant} from=${fromDate} to=${toDate} rows=${data.rows.length}`,
      })
      toast.success(
        `Loaded ${data.rows.length} day-wise rows (${data.summary.dayCount} days, ${data.summary.agentCount} agents)`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed"
      activityLog.record({
        type: "error",
        message: "Failed: Daily AI Usage Report",
        detail: message,
      })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, tenantId])

  const exportCsv = () => {
    if (!report || report.rows.length === 0) {
      toast.error("Load a report before exporting")
      return
    }
    const csv = reportToCsv(report)
    downloadCsv(
      `astra-daily-ai-usage-${report.fromDate}_to_${report.toDate}.csv`,
      csv,
    )
    activityLog.record({
      type: "action",
      message: "Exported: Daily AI Usage CSV",
      detail: `from=${report.fromDate} to=${report.toDate} rows=${report.rows.length}`,
    })
    toast.success("Day-wise CSV downloaded")
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Get AI Usage</h1>
          <p className="text-muted-foreground text-sm">
            Day-wise AI usage by agent for a tenant — text, voice, and actions
            (UTC)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={!report || report.rows.length === 0}
          >
            <DownloadIcon className="size-3.5" />
            Export CSV
          </Button>
          <Button onClick={() => void loadReport()} disabled={loading}>
            {loading ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-3.5" />
            )}
            {loading ? "Loading…" : "Run report"}
          </Button>
        </div>
      </div>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Report filters</CardTitle>
          <CardDescription>
            Enter the Astra Tenant ID and select a from/to date range (UTC).
            Export includes one row per agent per day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="usage-tenant">Astra Tenant ID</Label>
              <Input
                id="usage-tenant"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="e.g. 5bcc9e8b-b775-41a4-9874-d7b77f8ff89c"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="usage-from">From date (UTC)</Label>
              <Input
                id="usage-from"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="usage-to">To date (UTC)</Label>
              <Input
                id="usage-to"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="Coverage"
              value={`${formatNumber(report.summary.dayCount)} days`}
              hint={`${formatNumber(report.summary.agentCount)} agents · ${report.fromDate} → ${report.toDate}`}
            />
            <SummaryCard
              label="Text AI"
              value={`${formatNumber(report.summary.textCredits)} credits`}
              hint={`${formatNumber(report.summary.textTurns)} turns · ${formatNumber(report.summary.textConversations)} conversations`}
            />
            <SummaryCard
              label="Voice agents"
              value={`${formatNumber(report.summary.voiceCredits)} credits`}
              hint={`${formatNumber(report.summary.voiceTurns)} turns · ${formatNumber(report.summary.voiceDurationSec)}s`}
            />
            <SummaryCard
              label="Actions"
              value={`${formatNumber(report.summary.actionCredits)} credits`}
              hint={`${formatNumber(report.summary.actionEvents)} events`}
            />
            <SummaryCard
              label="Total AI usage"
              value={`${formatNumber(report.summary.totalCredits)} credits`}
              hint={`${report.fromDate} → ${report.toDate} · text + voice + actions`}
            />
          </div>

          <Card className="surface-card">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>
                  Day-wise agent usage — {report.fromDate} to {report.toDate}
                </CardTitle>
                <CardDescription>
                  {formatNumber(report.rows.length)} rows · tenant{" "}
                  <span className="font-mono text-xs">{report.tenantId}</span> ·
                  total credits {formatNumber(report.summary.totalCredits)}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Text</Badge>
                <Badge variant="secondary">Voice</Badge>
                <Badge variant="secondary">Actions</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[560px] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Text turns</TableHead>
                      <TableHead className="text-right">Text credits</TableHead>
                      <TableHead className="text-right">Voice turns</TableHead>
                      <TableHead className="text-right">Voice credits</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                      <TableHead className="text-right">Action credits</TableHead>
                      <TableHead className="text-right">Total credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-muted-foreground text-center text-sm"
                        >
                          No usage found for this tenant and date range.
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.rows.map((row) => (
                        <TableRow
                          key={`${row.date}-${row.tenantId}-${row.agentId}`}
                        >
                          <TableCell className="font-mono text-xs">
                            {row.date}
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-xs">{row.agentId}</div>
                            {row.agentWebsite ? (
                              <div className="text-muted-foreground max-w-[220px] truncate text-xs">
                                {row.agentWebsite}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(row.textTurns)}
                            <div className="text-muted-foreground">
                              {formatNumber(row.textConversations)} conv
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(row.textCredits)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(row.voiceTurns)}
                            <div className="text-muted-foreground">
                              {formatNumber(row.voiceDurationSec)}s
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(row.voiceCredits)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(row.actionEvents)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(row.actionCredits)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium">
                            {formatNumber(row.totalCredits)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : loading ? (
        <p className="text-muted-foreground text-sm">Generating report…</p>
      ) : (
        <p className="text-muted-foreground text-sm">
          Enter tenant ID and date range, then run the report.
        </p>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <Card className="surface-card">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </CardContent>
    </Card>
  )
}
