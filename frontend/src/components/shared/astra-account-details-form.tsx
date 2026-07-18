import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2Icon, SearchIcon } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import { activityLog } from "@/lib/activity-log"
import {
  astraService,
  type AstraAccountDetailsResponse,
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
import { JsonViewer } from "@/components/shared/json-viewer"

const schema = z.object({
  tenantId: z.string().min(1, "Astra Tenant ID is required"),
})

type FormValues = z.infer<typeof schema>

export function AstraAccountDetailsForm() {
  const { user } = useAuth()
  const [result, setResult] =
    React.useState<AstraAccountDetailsResponse | null>(null)

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
      const response = await astraService.getAccountDetails(parsed.data.tenantId)
      setResult(response)
      activityLog.record({
        type: "action",
        message: "Executed: Astra Account Details",
        detail: `tenantId=${parsed.data.tenantId}`,
        user: user?.email,
      })
      if (!response.found) {
        toast.message("No account details found")
      } else {
        toast.success("Account details loaded")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed"
      activityLog.record({
        type: "error",
        message: "Failed: Astra Account Details",
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
          <CardTitle>Look up account details</CardTitle>
          <CardDescription>
            Enter an Astra Tenant ID to load client, owner, and billing details.
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
                        placeholder="e.g. cd42c79e-9c96-4121-b940-2e2fad211278"
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
                {form.formState.isSubmitting ? "Searching…" : "Search"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>
            Client identity and billing information for this tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result ? (
            <p className="text-muted-foreground text-sm">
              Search a tenant to view account details.
            </p>
          ) : !result.found ? (
            <p className="text-muted-foreground text-sm">{result.message}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {result.currentBillingPlan ? (
                  <Badge variant="default">{result.currentBillingPlan}</Badge>
                ) : null}
                {result.subscriptionStatus ? (
                  <Badge variant="secondary">{result.subscriptionStatus}</Badge>
                ) : null}
                {result.billingSchedule ? (
                  <Badge variant="outline">{result.billingSchedule}</Badge>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBlock
                  label="Name of Client"
                  value={result.clientName ?? "—"}
                  emphasize
                />
                <InfoBlock
                  label="Email Registered (owner)"
                  value={result.ownerEmail ?? "—"}
                  emphasize
                />
                <InfoBlock
                  label="Astra Tenant ID"
                  value={result.tenantId}
                  mono
                />
                <InfoBlock
                  label="Current Billing Plan"
                  value={result.currentBillingPlan ?? "—"}
                />
                <InfoBlock
                  label="Billing renew date (UTC)"
                  value={result.billingRenewDate ?? "—"}
                />
                <InfoBlock
                  label="Billing renew date (HKT)"
                  value={result.billingRenewDateHkt ?? "—"}
                />
                <InfoBlock
                  label="Plan Price"
                  value={result.planPrice ?? "—"}
                  emphasize
                />
                <InfoBlock
                  label="Owner name"
                  value={result.ownerName ?? "—"}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {result ? (
        <Card className="surface-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Raw response</CardTitle>
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
