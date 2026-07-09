import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { JsonViewer } from "@/components/shared/json-viewer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { activityLog } from "@/lib/activity-log"

export type ToolFieldType = "text" | "email" | "number" | "textarea" | "select"

export interface ToolFieldConfig {
  name: string
  label: string
  type?: ToolFieldType
  placeholder?: string
}

interface ApiToolFormProps {
  title: string
  description?: string
  schema: z.ZodTypeAny
  fields: ToolFieldConfig[]
  submitLabel?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (values: any) => Promise<unknown>
}

export function ApiToolForm({
  title,
  description,
  schema,
  fields,
  submitLabel = "Submit",
  onSubmit,
}: ApiToolFormProps) {
  const [result, setResult] = React.useState<unknown>(null)
  const defaultValues = Object.fromEntries(fields.map((f) => [f.name, ""]))

  const form = useForm<Record<string, string>>({
    defaultValues,
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (typeof field === "string") {
          form.setError(field, { message: issue.message })
        }
      }
      return
    }

    try {
      const response = await onSubmit(parsed.data)
      setResult(response)
      activityLog.record({
        type: "action",
        message: `Executed: ${title}`,
      })
      toast.success("Request completed successfully")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed"
      activityLog.record({
        type: "error",
        message: `Failed: ${title}`,
        detail: message,
      })
      toast.error(message)
    }
  })

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="surface-card">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map((field) => (
                <FormField
                  key={field.name}
                  control={form.control}
                  name={field.name}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>{field.label}</FormLabel>
                      <FormControl>
                        {field.type === "textarea" ? (
                          <Textarea
                            placeholder={field.placeholder}
                            {...formField}
                          />
                        ) : (
                          <Input
                            type={field.type ?? "text"}
                            placeholder={field.placeholder}
                            {...formField}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Processing..." : submitLabel}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Response</CardTitle>
          <CardDescription>API response will appear here after submission.</CardDescription>
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
