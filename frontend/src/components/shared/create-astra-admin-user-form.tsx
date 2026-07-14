import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"

import { useAuth } from "@/contexts/auth-context"
import { PLATFORM_USERS } from "@/config/platform-users"
import { activityLog } from "@/lib/activity-log"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { JsonViewer } from "@/components/shared/json-viewer"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const createAdminSchema = z.object({
  tenantId: z.string().min(1, "Astra Tenant ID is required"),
  user: z.string().min(1, "User is required"),
})

type CreateAdminForm = z.infer<typeof createAdminSchema>

function localPartFromEmail(email?: string): string {
  if (!email) return ""
  return email.split("@")[0] ?? ""
}

function resolveDefaultUser(email?: string): string {
  if (!email) return ""
  const match = PLATFORM_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  )
  if (match) return localPartFromEmail(match.email)
  return localPartFromEmail(email)
}

export function CreateAstraAdminUserForm() {
  const { user } = useAuth()
  const [result, setResult] = React.useState<unknown>(null)

  const defaultUser = resolveDefaultUser(user?.email)

  const form = useForm<CreateAdminForm>({
    defaultValues: {
      tenantId: "",
      user: defaultUser,
    },
  })

  React.useEffect(() => {
    const next = resolveDefaultUser(user?.email)
    if (next) {
      form.setValue("user", next)
    }
  }, [user?.email, form])

  const userOptions = React.useMemo(
    () =>
      PLATFORM_USERS.map((u) => {
        const username = localPartFromEmail(u.email)
        return {
          value: username,
          label: `${username} — ${u.name}`,
          description: `${u.email} · ${u.role}`,
        }
      }),
    [],
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    const parsed = createAdminSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (typeof field === "string") {
          form.setError(field as keyof CreateAdminForm, {
            message: issue.message,
          })
        }
      }
      return
    }

    try {
      // Backend Astra endpoints are not wired yet — echo the request payload.
      const response = {
        ok: true,
        message: "Create admin user request prepared (Astra API not connected)",
        payload: {
          tenantId: parsed.data.tenantId,
          user: parsed.data.user,
          email: `${parsed.data.user}@clare.ai`,
        },
      }
      setResult(response)
      activityLog.record({
        type: "action",
        message: "Executed: Create Admin User",
        detail: `tenantId=${parsed.data.tenantId} user=${parsed.data.user}`,
        user: user?.email,
      })
      toast.success("Request prepared successfully")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed"
      activityLog.record({
        type: "error",
        message: "Failed: Create Admin User",
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
          <CardTitle>Create Admin User</CardTitle>
          <CardDescription>
            Invite an @clare.ai admin into an Astra tenant. User is auto-filled
            from your signed-in account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Astra Tenant ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Astra Tenant ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="user"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onChange={field.onChange}
                        options={userOptions}
                        placeholder="e.g. amit"
                      />
                    </FormControl>
                    <FormDescription>
                      Logged in as {user?.email ?? "—"}
                      {defaultUser ? ` · default user ${defaultUser}` : ""}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Processing..." : "Submit"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Response</CardTitle>
          <CardDescription>
            API response will appear here after submission.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result ? (
            <JsonViewer data={result} />
          ) : (
            <p className="text-muted-foreground text-sm">No response yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
