import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { toast } from "sonner"

import { useAuth } from "@/contexts/auth-context"
import {
  PLATFORM_DEMO_PASSWORD,
  PLATFORM_USERS,
} from "@/config/platform-users"
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
import { WatiLogo } from "@/components/wati-logo"

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { signin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from
    ?.pathname

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signin(values.email, values.password)
      toast.success("Welcome back")
      navigate(from ?? "/", { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed")
    }
  })

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <Card className="surface-elevated border-border/60">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <WatiLogo className="size-7" />
            </div>
            <div>
              <CardTitle className="text-2xl">Sign in to OneHub</CardTitle>
              <CardDescription>
                WATI backoffice admin panel
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <FormLabel>Demo platform user</FormLabel>
              <Select
                onValueChange={(email) => {
                  form.setValue("email", email)
                  form.setValue("password", PLATFORM_DEMO_PASSWORD)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a @clare.ai demo user" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_USERS.map((user) => (
                    <SelectItem key={user.userId} value={user.email}>
                      {user.userId} — {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Password for all demo users:{" "}
                <code className="text-foreground">{PLATFORM_DEMO_PASSWORD}</code>
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="ava.chen@clare.ai"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
