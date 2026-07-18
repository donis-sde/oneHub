import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2Icon, SearchIcon, UserRoundCogIcon } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import { activityLog } from "@/lib/activity-log"
import {
  astraService,
  type AstraChangeOwnershipResponse,
  type AstraOwnershipLookupResponse,
} from "@/services/astra.service"
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

const searchSchema = z.object({
  tenantId: z.string().min(1, "Astra Tenant ID is required"),
})

const updateSchema = z.object({
  newOwnerEmail: z
    .string()
    .min(1, "New owner email is required")
    .email("Enter a valid email address"),
})

type SearchValues = z.infer<typeof searchSchema>
type UpdateValues = z.infer<typeof updateSchema>

export function AstraChangeOwnershipForm() {
  const { user } = useAuth()
  const [lookup, setLookup] =
    React.useState<AstraOwnershipLookupResponse | null>(null)
  const [updateResult, setUpdateResult] =
    React.useState<AstraChangeOwnershipResponse | null>(null)

  const searchForm = useForm<SearchValues>({
    defaultValues: { tenantId: "" },
  })
  const updateForm = useForm<UpdateValues>({
    defaultValues: { newOwnerEmail: "" },
  })

  const onSearch = searchForm.handleSubmit(async (values) => {
    const parsed = searchSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (typeof field === "string") {
          searchForm.setError(field as keyof SearchValues, {
            message: issue.message,
          })
        }
      }
      return
    }

    try {
      const response = await astraService.lookupOwnership(parsed.data.tenantId)
      setLookup(response)
      setUpdateResult(null)
      updateForm.reset({ newOwnerEmail: "" })
      activityLog.record({
        type: "action",
        message: "Executed: Change Ownership lookup",
        detail: `tenantId=${parsed.data.tenantId}`,
        user: user?.email,
      })
      if (!response.found) {
        toast.message("Tenant not found")
      } else {
        toast.success("Owner details loaded")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed"
      activityLog.record({
        type: "error",
        message: "Failed: Change Ownership lookup",
        detail: message,
        user: user?.email,
      })
      toast.error(message)
    }
  })

  const onUpdate = updateForm.handleSubmit(async (values) => {
    if (!lookup?.found || !lookup.tenantId) {
      toast.error("Search a tenant first")
      return
    }

    const parsed = updateSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (typeof field === "string") {
          updateForm.setError(field as keyof UpdateValues, {
            message: issue.message,
          })
        }
      }
      return
    }

    try {
      const response = await astraService.changeOwnership({
        tenantId: lookup.tenantId,
        newOwnerEmail: parsed.data.newOwnerEmail,
      })
      setUpdateResult(response)
      const refreshed = await astraService.lookupOwnership(lookup.tenantId)
      setLookup(refreshed)
      updateForm.reset({ newOwnerEmail: "" })
      activityLog.record({
        type: "action",
        message: "Executed: Change Ownership update",
        detail: `tenantId=${lookup.tenantId} newOwner=${parsed.data.newOwnerEmail}`,
        user: user?.email,
      })
      toast.success(response.message)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed"
      activityLog.record({
        type: "error",
        message: "Failed: Change Ownership update",
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
          <CardTitle>Search tenant</CardTitle>
          <CardDescription>
            Enter an Astra Tenant ID to view the current owner email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...searchForm}>
            <form onSubmit={onSearch} className="space-y-4">
              <FormField
                control={searchForm.control}
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
              <Button type="submit" disabled={searchForm.formState.isSubmitting}>
                {searchForm.formState.isSubmitting ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <SearchIcon className="size-3.5" />
                )}
                {searchForm.formState.isSubmitting ? "Searching…" : "Search"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Current owner</CardTitle>
          <CardDescription>
            Owner details returned for this tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!lookup ? (
            <p className="text-muted-foreground text-sm">
              Search a tenant to view the owner email.
            </p>
          ) : !lookup.found ? (
            <p className="text-muted-foreground text-sm">{lookup.message}</p>
          ) : (
            <>
              <InfoBlock label="Name of Client" value={lookup.clientName ?? "—"} />
              <InfoBlock
                label="Owner email"
                value={lookup.ownerEmail ?? "—"}
                emphasize
              />
              <InfoBlock
                label="Owner name"
                value={lookup.ownerName ?? "—"}
              />
              <InfoBlock
                label="Astra Tenant ID"
                value={lookup.tenantId}
                mono
              />
            </>
          )}
        </CardContent>
      </Card>

      {lookup?.found ? (
        <Card className="surface-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Update ownership</CardTitle>
            <CardDescription>
              Enter the new owner email. If they are not already a member, they
              will be invited and ownership will be transferred.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...updateForm}>
              <form
                onSubmit={onUpdate}
                className="flex flex-col gap-4 sm:flex-row sm:items-end"
              >
                <FormField
                  control={updateForm.control}
                  name="newOwnerEmail"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>New owner email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="new-owner@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={updateForm.formState.isSubmitting}
                >
                  {updateForm.formState.isSubmitting ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <UserRoundCogIcon className="size-3.5" />
                  )}
                  {updateForm.formState.isSubmitting ? "Updating…" : "Update"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : null}

      {updateResult ? (
        <Card className="surface-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Update result</CardTitle>
          </CardHeader>
          <CardContent>
            <JsonViewer data={updateResult} />
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
