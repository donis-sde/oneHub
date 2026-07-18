import { AstraDailyAiUsageReportPage } from "@/components/astra-daily-ai-usage-report"
import { AstraDatabasesPage as AstraDatabasesBrowser } from "@/components/astra-databases-page"
import { AstraAccountDetailsForm } from "@/components/shared/astra-account-details-form"
import { AstraChangeOwnershipForm } from "@/components/shared/astra-change-ownership-form"
import { AstraExtendTrialForm } from "@/components/shared/astra-extend-trial-form"
import { CreateAstraAdminUserForm } from "@/components/shared/create-astra-admin-user-form"

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
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Change Ownership</h1>
        <p className="text-muted-foreground text-sm">
          Look up the current owner by tenant ID, then transfer ownership to a
          new email
        </p>
      </div>
      <AstraChangeOwnershipForm />
    </div>
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
