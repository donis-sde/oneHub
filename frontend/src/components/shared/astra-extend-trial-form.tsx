import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2Icon, SearchIcon } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import { activityLog } from "@/lib/activity-log"
import {
  astraService,
  type AstraTrialLookupResponse,
} from "@/services/astra.service"
import { Badge } from "@/components/ui/badge"
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
import { Label } from "@/components/ui/label"
import { JsonViewer } from "@/components/shared/json-viewer"

const schema = z.object({
  tenantId: z.string().min(1, "Astra Tenant ID is required"),
})

type FormValues = z.infer<typeof schema>

function formatHkt(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Hong_Kong",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function addDaysUtc(iso: string, days: number): string {
  const date = new Date(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString()
}

export function AstraExtendTrialForm() {
  const { user } = useAuth()
  const [result, setResult] = React.useState<AstraTrialLookupResponse | null>(
    null,
  )
  const [extendDays, setExtendDays] = React.useState("7")

  const form = useForm<FormValues>({
    defaultValues: { tenantId: "" },
  })

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
      const response = await astraService.lookupTrial(parsed.data.tenantId)
      setResult(response)
      setExtendDays("7")
      activityLog.record({
        type: "action",
        message: "Executed: Extend Trial lookup",
        detail: `tenantId=${parsed.data.tenantId}`,
        user: user?.email,
      })
      if (!response.found) {
        toast.message("No subscription found")
      } else if (response.trialExtendable) {
        toast.success("Trial end date loaded")
      } else {
        toast.message(response.message)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed"
      activityLog.record({
        type: "error",
        message: "Failed: Extend Trial lookup",
        detail: message,
        user: user?.email,
      })
      toast.error(message)
    }
  })

  const sub = result?.subscription
  const oldTrialEndAt = sub?.trialEndAt ?? null

  const daysNumber = Number(extendDays)
  const daysValid =
    Number.isFinite(daysNumber) &&
    Number.isInteger(daysNumber) &&
    daysNumber > 0 &&
    daysNumber <= 365

  const newTrialEndAt =
    oldTrialEndAt && daysValid
      ? addDaysUtc(oldTrialEndAt, daysNumber)
      : null

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Look up trial end date</CardTitle>
          <CardDescription>
            Enter an Astra Tenant ID to fetch the current subscription trial end
            date from prod-astra-account-service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Astra Tenant ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. eeefe618-95ff-4342-be96-b63e183a68e4"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <SearchIcon className="size-3.5" />
                )}
                {form.formState.isSubmitting
                  ? "Searching…"
                  : "Search trial end date"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Current subscription</CardTitle>
          <CardDescription>
            Trial end date and plan details for this tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result ? (
            <p className="text-muted-foreground text-sm">
              Search a tenant to view the trial end date.
            </p>
          ) : !result.found || !sub ? (
            <p className="text-muted-foreground text-sm">{result.message}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant={result.isTrial ? "default" : "outline"}>
                  {sub.planLabel}
                </Badge>
                <Badge variant="secondary">{sub.statusLabel}</Badge>
                {result.trialExtendable ? (
                  <Badge variant="default">Trial extendable</Badge>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBlock
                  label="Trial / period end (UTC)"
                  value={sub.trialEndAt ?? "—"}
                  emphasize
                />
                <InfoBlock
                  label="Trial / period end (HKT)"
                  value={sub.trialEndAtHkt ?? "—"}
                  emphasize
                />
                <InfoBlock
                  label="Period start (UTC)"
                  value={sub.currentPeriodStart ?? "—"}
                />
                <InfoBlock label="Subscription UUID" value={sub.uuid} mono />
              </div>

              <p className="text-muted-foreground text-sm">{result.message}</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="surface-card lg:col-span-2">
        <CardHeader>
          <CardTitle>Extend trial</CardTitle>
          <CardDescription>
            Enter how many days to add to the current trial end date. New end
            date is calculated from the old trial end (UTC).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!oldTrialEndAt ? (
            <p className="text-muted-foreground text-sm">
              Search a tenant first to load the current trial end date.
            </p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="extend-days">Number of days to extend</Label>
                  <Input
                    id="extend-days"
                    type="number"
                    min={1}
                    max={365}
                    step={1}
                    value={extendDays}
                    onChange={(e) => setExtendDays(e.target.value)}
                    placeholder="e.g. 7"
                  />
                  {!daysValid && extendDays.trim() !== "" ? (
                    <p className="text-destructive text-xs">
                      Enter a whole number between 1 and 365.
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Days are added to the current trial end date.
                    </p>
                  )}
                </div>

                <InfoBlock
                  label="Old trial end date (UTC)"
                  value={oldTrialEndAt}
                  emphasize
                />
                <InfoBlock
                  label="New trial end date (UTC)"
                  value={newTrialEndAt ?? "—"}
                  emphasize
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBlock
                  label="Old trial end date (HKT)"
                  value={formatHkt(oldTrialEndAt)}
                />
                <InfoBlock
                  label="New trial end date (HKT)"
                  value={formatHkt(newTrialEndAt)}
                />
              </div>

              {result && !result.trialExtendable ? (
                <p className="text-muted-foreground text-sm">
                  This subscription is not marked as an active trial — review
                  before extending.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {result ? (
        <Card className="surface-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Raw response</CardTitle>
            <CardDescription>
              Includes recent subscription history for this tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JsonViewer data={result} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function InfoBlock({
  label,
  value,
  emphasize,
  mono,
}: {
  label: string
  value: string
  emphasize?: boolean
  mono?: boolean
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={
          emphasize
            ? "mt-1 text-base font-semibold break-all"
            : mono
              ? "mt-1 font-mono text-xs break-all"
              : "mt-1 text-sm break-all"
        }
      >
        {value}
      </p>
    </div>
  )
}
