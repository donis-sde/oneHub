import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { DownloadIcon, Loader2Icon } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import { activityLog } from "@/lib/activity-log"
import {
  teamInboxReportService,
  type TeamInboxReportResponse,
} from "@/services/tools.service"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
] as const

const MAX_RANGE_DAYS = 7

const schema = z
  .object({
    clientId: z
      .string()
      .min(1, "WATI Client ID is required")
      .regex(/^\d+$/, "WATI Client ID must be numeric"),
    bearerToken: z.string().min(1, "Bearer Token is required"),
    fromDate: z.string().min(1, "From Date is required"),
    toDate: z.string().min(1, "To Date is required"),
    timezone: z.string().min(1, "Timezone is required"),
  })
  .superRefine((values, ctx) => {
    if (!values.fromDate || !values.toDate) return
    if (values.fromDate > values.toDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toDate"],
        message: "To Date must be on or after From Date",
      })
      return
    }
    const from = new Date(`${values.fromDate}T00:00:00.000Z`)
    const to = new Date(`${values.toDate}T00:00:00.000Z`)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return
    const daySpan =
      Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1
    if (daySpan > MAX_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toDate"],
        message: `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
      })
    }
  })

type FormValues = z.infer<typeof schema>

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function addDaysYmd(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function TeamInboxReportForm() {
  const { user } = useAuth()
  const [lastResult, setLastResult] =
    React.useState<TeamInboxReportResponse | null>(null)

  const form = useForm<FormValues>({
    defaultValues: {
      clientId: "",
      bearerToken: "",
      fromDate: "",
      toDate: "",
      timezone: "UTC",
    },
  })

  const fromDate = form.watch("fromDate")
  const maxToDate = fromDate ? addDaysYmd(fromDate, MAX_RANGE_DAYS - 1) : undefined

  const onSubmit = form.handleSubmit(async (values) => {
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (typeof field === "string") {
          form.setError(field as keyof FormValues, { message: issue.message })
        }
      }
      return
    }

    try {
      const response = await teamInboxReportService.export(parsed.data)
      setLastResult(response)
      downloadCsv(response.filename, response.csv)
      activityLog.record({
        type: "action",
        message: "Executed: Team Inbox Report",
        detail: `clientId=${parsed.data.clientId} from=${parsed.data.fromDate} to=${parsed.data.toDate} tz=${parsed.data.timezone}`,
        user: user?.email,
      })
      toast.success("Team Inbox report downloaded")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed"
      activityLog.record({
        type: "error",
        message: "Failed: Team Inbox Report",
        detail: message,
        user: user?.email,
      })
      toast.error(message)
    }
  })

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Export Team Inbox Report</CardTitle>
          <CardDescription>
            Calls the WATI tickets CSV export API for the given client and date
            range (max 7 days).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WATI Client ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 451039" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bearerToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bearer Token</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Paste Bearer token"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fromDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          min={fromDate || undefined}
                          max={maxToDate}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <DownloadIcon className="size-3.5" />
                )}
                {form.formState.isSubmitting
                  ? "Exporting…"
                  : "Export CSV"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Last export</CardTitle>
          <CardDescription>
            Summary of the most recent successful download.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!lastResult ? (
            <p className="text-muted-foreground text-sm">
              Submit the form to export and download the Team Inbox CSV.
            </p>
          ) : (
            <>
              <InfoBlock label="Client ID" value={lastResult.clientId} mono />
              <InfoBlock label="Timezone" value={lastResult.timezone} />
              <InfoBlock label="From" value={lastResult.from} mono />
              <InfoBlock label="To" value={lastResult.to} mono />
              <InfoBlock label="Filename" value={lastResult.filename} />
              <InfoBlock
                label="CSV size"
                value={`${lastResult.csv.length.toLocaleString()} characters`}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  downloadCsv(lastResult.filename, lastResult.csv)
                }
              >
                <DownloadIcon className="size-3.5" />
                Download again
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoBlock({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={mono ? "mt-1 font-mono text-xs break-all" : "mt-1 text-sm break-all"}>
        {value}
      </p>
    </div>
  )
}
