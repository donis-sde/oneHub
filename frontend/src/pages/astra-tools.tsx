import { AstraDailyAiUsageReportPage } from "@/components/astra-daily-ai-usage-report"
import { AstraDatabasesPage as AstraDatabasesBrowser } from "@/components/astra-databases-page"
import { AstraAccountDetailsForm } from "@/components/shared/astra-account-details-form"
import { AstraExtendTrialForm } from "@/components/shared/astra-extend-trial-form"
import { CreateAstraAdminUserForm } from "@/components/shared/create-astra-admin-user-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Extend Trial</h1>
        <p className="text-muted-foreground text-sm">
          Look up the current Astra trial end date by tenant ID
        </p>
      </div>
      <AstraExtendTrialForm />
    </div>
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

export function AstraAccountDetailsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Astra Account Details</h1>
        <p className="text-muted-foreground text-sm">
          Look up client, owner, and billing details by Astra Tenant ID
        </p>
      </div>
      <AstraAccountDetailsForm />
    </div>
  )
}

export function AstraGetAiUsagePage() {
  return <AstraDailyAiUsageReportPage />
}

export function AstraDatabasesPage() {
  return <AstraDatabasesBrowser />
}
