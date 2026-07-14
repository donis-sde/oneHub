import * as React from "react"
import { CheckIcon, EyeIcon, EyeOffIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
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
import { cn } from "@/lib/utils"

type TenantRow = {
  tenantId: string
  firstName: string
  clientEmail: string
  clientBackendDomain: string
  clientFrontendUrl: string
  clientWabaId: string
  clientSubscriptionId: string
}

type PasswordMode = "random" | "custom"

type AdminFormState = {
  adminEmail: string
  firstName: string
  lastName: string
  passwordMode: PasswordMode
  password: string
}

const initialAdminForm: AdminFormState = {
  adminEmail: "",
  firstName: "",
  lastName: "",
  passwordMode: "custom",
  password: "",
}

function getSampleTenants(tenantId: string): TenantRow[] {
  return [
    {
      tenantId,
      firstName: "sampletext",
      clientEmail: "sampletext@example.com",
      clientBackendDomain: "sampletext.example.com",
      clientFrontendUrl: "https://sampletext.example.com",
      clientWabaId: "1234",
      clientSubscriptionId: "1234",
    },
    {
      tenantId: `${tenantId}-2`,
      firstName: "sampletext",
      clientEmail: "sampletext2@example.com",
      clientBackendDomain: "sampletext2.example.com",
      clientFrontendUrl: "https://sampletext2.example.com",
      clientWabaId: "5678",
      clientSubscriptionId: "5678",
    },
  ]
}

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    capital: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*]/.test(password),
  }
}

function generateRandomPassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"
  return Array.from({ length: 12 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("")
}

const passwordRules = [
  { key: "minLength" as const, label: "Minimum 8 characters" },
  { key: "capital" as const, label: "At least 1 capital letter" },
  { key: "number" as const, label: "At least 1 number" },
  { key: "special" as const, label: "At least 1 special symbol (!@#$%^&*)" },
]

export function CreateExternalAdminTenants() {
  const [tenantId, setTenantId] = React.useState("")
  const [validatedTenants, setValidatedTenants] = React.useState<
    TenantRow[] | null
  >(null)
  const [adminForm, setAdminForm] = React.useState<AdminFormState>(initialAdminForm)
  const [showPassword, setShowPassword] = React.useState(false)

  const passwordChecks = getPasswordChecks(adminForm.password)
  const emailLooksValid =
    adminForm.adminEmail.trim().length > 0 &&
    !adminForm.adminEmail.includes("@")

  const handleValidateTenant = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedId = tenantId.trim()
    if (!trimmedId) {
      setValidatedTenants(null)
      return
    }
    setValidatedTenants(getSampleTenants(trimmedId))
  }

  const handlePasswordModeChange = (mode: PasswordMode) => {
    setAdminForm((current) => ({
      ...current,
      passwordMode: mode,
      password: mode === "random" ? generateRandomPassword() : "",
    }))
    setShowPassword(mode === "random")
  }

  const handleResetForm = () => {
    setAdminForm(initialAdminForm)
    setShowPassword(false)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-4 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create External Admin
        </h1>

        <form
          onSubmit={handleValidateTenant}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <Field className="max-w-md flex-1">
            <FieldLabel htmlFor="tenant-id">TenantId</FieldLabel>
            <Input
              id="tenant-id"
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              placeholder="1234"
            />
          </Field>
          <Button type="submit" variant="outline" className="shrink-0 uppercase">
            Validate tenant
          </Button>
        </form>

        {validatedTenants ? (
          <>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Tenant Data</h2>
              <Card className="overflow-hidden py-0">
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Tenant ID</TableHead>
                        <TableHead>First Name</TableHead>
                        <TableHead>Client Email</TableHead>
                        <TableHead>Client Backend Domain</TableHead>
                        <TableHead>Client Frontend URL</TableHead>
                        <TableHead>Client WABAID</TableHead>
                        <TableHead>Client SubscriptionID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validatedTenants.map((tenant) => (
                        <TableRow key={tenant.tenantId}>
                          <TableCell>{tenant.tenantId}</TableCell>
                          <TableCell>{tenant.firstName}</TableCell>
                          <TableCell>{tenant.clientEmail}</TableCell>
                          <TableCell>{tenant.clientBackendDomain}</TableCell>
                          <TableCell>{tenant.clientFrontendUrl}</TableCell>
                          <TableCell>{tenant.clientWabaId}</TableCell>
                          <TableCell>{tenant.clientSubscriptionId}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>

            <Card className="surface-elevated">
              <CardContent className="space-y-6 pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field>
                      <FieldLabel htmlFor="admin-email">
                        Admin Email (without @clare.ai)*
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          id="admin-email"
                          value={adminForm.adminEmail}
                          onChange={(event) =>
                            setAdminForm((current) => ({
                              ...current,
                              adminEmail: event.target.value,
                            }))
                          }
                          placeholder="sampletext"
                          className={cn(emailLooksValid && "pr-9")}
                          required
                        />
                        {emailLooksValid ? (
                          <CheckIcon className="absolute top-1/2 right-2 size-4 -translate-y-1/2 text-primary" />
                        ) : null}
                      </div>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="first-name">First Name*</FieldLabel>
                      <Input
                        id="first-name"
                        value={adminForm.firstName}
                        onChange={(event) =>
                          setAdminForm((current) => ({
                            ...current,
                            firstName: event.target.value,
                          }))
                        }
                        placeholder="sampletext"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="last-name">Last Name*</FieldLabel>
                      <Input
                        id="last-name"
                        value={adminForm.lastName}
                        onChange={(event) =>
                          setAdminForm((current) => ({
                            ...current,
                            lastName: event.target.value,
                          }))
                        }
                        placeholder="sampletext"
                        required
                      />
                    </Field>
                  </div>

                  <Card className="bg-muted/30 py-4">
                    <CardContent className="space-y-4">
                      <h3 className="text-sm font-semibold">Set Your Password</h3>

                      <FieldGroup className="gap-3">
                        <div className="flex flex-wrap gap-6">
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="password-mode"
                              checked={adminForm.passwordMode === "random"}
                              onChange={() => handlePasswordModeChange("random")}
                              className="size-4 accent-primary"
                            />
                            Generate Random Password
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="password-mode"
                              checked={adminForm.passwordMode === "custom"}
                              onChange={() => handlePasswordModeChange("custom")}
                              className="size-4 accent-primary"
                            />
                            Enter Custom Password
                          </label>
                        </div>

                        <Field>
                          <Label htmlFor="admin-password">Enter Your Password</Label>
                          <div className="relative max-w-md">
                            <Input
                              id="admin-password"
                              type={showPassword ? "text" : "password"}
                              value={adminForm.password}
                              onChange={(event) =>
                                setAdminForm((current) => ({
                                  ...current,
                                  password: event.target.value,
                                }))
                              }
                              disabled={adminForm.passwordMode === "random"}
                              className="pr-9"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="absolute top-1/2 right-1 -translate-y-1/2"
                              onClick={() => setShowPassword((current) => !current)}
                              aria-label={
                                showPassword ? "Hide password" : "Show password"
                              }
                            >
                              {showPassword ? (
                                <EyeOffIcon className="size-3.5" />
                              ) : (
                                <EyeIcon className="size-3.5" />
                              )}
                            </Button>
                          </div>
                        </Field>

                        <ul className="space-y-1 text-sm">
                          {passwordRules.map((rule) => (
                            <li
                              key={rule.key}
                              className={cn(
                                "flex items-center gap-2",
                                passwordChecks[rule.key]
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              )}
                            >
                              <CheckIcon className="size-3.5 shrink-0" />
                              {rule.label}
                            </li>
                          ))}
                        </ul>
                      </FieldGroup>
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" className="min-w-28 uppercase">
                      Submit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-28 uppercase"
                      onClick={handleResetForm}
                    >
                      Reset form
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  )
}
