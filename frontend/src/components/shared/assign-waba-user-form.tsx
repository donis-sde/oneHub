import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"

import { useAuth } from "@/contexts/auth-context"
import { PLATFORM_USERS } from "@/config/platform-users"
import { accessToWabaService } from "@/services/waba.service"
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

const assignSchema = z.object({
  wabaId: z.string().min(1, "WABA ID is required"),
  userId: z.string().min(1, "User ID is required"),
})

type AssignForm = z.infer<typeof assignSchema>

function resolveLoggedInUserId(email?: string, userId?: string): string {
  if (userId) return userId
  if (!email) return ""
  return PLATFORM_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())
    ?.userId ?? email
}

export function AssignWabaUserForm() {
  const { user } = useAuth()
  const [result, setResult] = React.useState<unknown>(null)

  const defaultUserId = resolveLoggedInUserId(user?.email, user?.userId)

  const form = useForm<AssignForm>({
    defaultValues: {
      wabaId: "",
      userId: defaultUserId,
    },
  })

  // Keep User ID in sync when auth user loads / changes
  React.useEffect(() => {
    const next = resolveLoggedInUserId(user?.email, user?.userId)
    if (next) {
      form.setValue("userId", next)
    }
  }, [user?.email, user?.userId, form])

  const userOptions = React.useMemo(
    () =>
      PLATFORM_USERS.map((u) => ({
        value: u.userId,
        label: `${u.userId} — ${u.name}`,
        description: `${u.email} · ${u.role}`,
      })),
    [],
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    const parsed = assignSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (typeof field === "string") {
          form.setError(field as keyof AssignForm, { message: issue.message })
        }
      }
      return
    }

    try {
      const response = await accessToWabaService.assignUser(parsed.data)
      setResult(response)
      activityLog.record({
        type: "action",
        message: "Executed: Assign User",
        detail: `userId=${parsed.data.userId}`,
        user: user?.email,
      })
      toast.success("Request completed successfully")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed"
      activityLog.record({
        type: "error",
        message: "Failed: Assign User",
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
          <CardTitle>Assign User</CardTitle>
          <CardDescription>
            User ID is auto-filled from your signed-in account. You can still
            edit it or pick another platform user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="wabaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WABA ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter WABA ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User ID</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onChange={field.onChange}
                        options={userOptions}
                        placeholder="Select or type a user ID"
                      />
                    </FormControl>
                    <FormDescription>
                      Logged in as {user?.email ?? "—"}
                      {defaultUserId ? ` · default ID ${defaultUserId}` : ""}
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
