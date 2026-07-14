import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CreateAstraAdminUserForm } from "@/components/shared/create-astra-admin-user-form"

function AstraToolPlaceholderPage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <Card className="surface-card">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Astra Tools workspace — connect Astra APIs or workflows here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            This page is ready in the sidebar. Wire the corresponding Astra
            admin action when backend endpoints are available.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function AstraCreateAdminUserPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Admin User</h1>
        <p className="text-muted-foreground text-sm">
          Invite an Astra admin user to a tenant
        </p>
      </div>
      <CreateAstraAdminUserForm />
    </div>
  )
}

export function AstraExtendTrialPage() {
  return (
    <AstraToolPlaceholderPage
      title="Extend Trial"
      description="Extend a customer's Astra trial end date"
    />
  )
}

export function AstraChangeOwnershipPage() {
  return (
    <AstraToolPlaceholderPage
      title="Change Ownership"
      description="Transfer Astra tenant ownership to another user"
    />
  )
}

export function AstraGetAiUsagePage() {
  return (
    <AstraToolPlaceholderPage
      title="Get AI Usage"
      description="Look up Astra AI usage for a tenant"
    />
  )
}
