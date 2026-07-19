import * as React from "react"
import { z } from "zod"

import { ApiToolForm } from "@/components/shared/api-tool-form"
import {
  affiliateDashboardService,
  apiExplorerService,
  backofficeLogsService,
  broadcastService,
  cleanCacheService,
  createExtAdminEuService,
  createExtAdminService,
  deleteContactsService,
  deleteHubspotService,
  frtService,
  manageSubscriptionService,
  mpsManagementService,
  onboardingFixService,
  partnershipService,
  registerCloudApiService,
  usageCalculatorService,
  watiCustomerStatusService,
} from "@/services/tools.service"
import { crossCollectionService } from "@/services/cross-collection.service"
import { wabaService, accessToWabaService } from "@/services/waba.service"
import { featureAccessService } from "@/services/feature-access.service"
import { prmGatewayService } from "@/services/prm-gateway.service"
import { useQuery } from "@tanstack/react-query"
import { JsonViewer } from "@/components/shared/json-viewer"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AssignWabaUserForm } from "@/components/shared/assign-waba-user-form"
import { TeamInboxReportForm } from "@/components/shared/team-inbox-report-form"
import { DUMMY_ACCESS_TO_WABA_USERS, PLATFORM_DEMO_PASSWORD } from "@/config/platform-users"
import type { BackofficeLogKey } from "@/services/tools.service"

function ToolPageShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {children}
    </div>
  )
}

export function AccessToWabaPage() {
  return (
    <ToolPageShell title="Access to WABA" description="Manage WABA user assignments">
      <Tabs defaultValue="get">
        <TabsList>
          <TabsTrigger value="get">Get Users</TabsTrigger>
          <TabsTrigger value="assign">Assign User</TabsTrigger>
        </TabsList>
        <TabsContent value="get" className="mt-4">
          <AccessToWabaUsersPanel />
        </TabsContent>
        <TabsContent value="assign" className="mt-4">
          <AssignWabaUserForm />
        </TabsContent>
      </Tabs>
    </ToolPageShell>
  )
}

function AccessToWabaUsersPanel() {
  const query = useQuery({
    queryKey: ["access-waba-users"],
    queryFn: accessToWabaService.getUsers,
    retry: false,
  })

  return (
    <div className="space-y-6">
      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Assigned Users</CardTitle>
          <CardDescription>
            {DUMMY_ACCESS_TO_WABA_USERS.length} platform users tagged under Get
            Users (@clare.ai) — password{" "}
            <code className="text-foreground">{PLATFORM_DEMO_PASSWORD}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Business ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DUMMY_ACCESS_TO_WABA_USERS.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === "active" ? "default" : "outline"}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{user.businessId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>API Response</CardTitle>
          <CardDescription>
            Live response from `/api/accessToWABA/getUsers` (when backend is available)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : query.isError ? (
            <p className="text-muted-foreground text-sm">
              Could not load live API users. Dummy @clare.ai users above are still
              available.
            </p>
          ) : (
            <JsonViewer data={query.data} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function GetUsersPanel({ fetcher }: { fetcher: () => Promise<unknown> }) {
  const query = useQuery({ queryKey: ["access-waba-users"], queryFn: fetcher })
  return (
    <Card className="surface-card">
      <CardHeader><CardTitle>Assigned Users</CardTitle></CardHeader>
      <CardContent>
        {query.isLoading ? <p className="text-sm">Loading...</p> : <JsonViewer data={query.data} />}
      </CardContent>
    </Card>
  )
}

export function WabaPhoneNumbersPage() {
  return (
    <ToolPageShell title="Get Phone from WABA">
      <ApiToolForm
        title="Phone Numbers"
        schema={z.object({ wabaId: z.string().min(1) })}
        fields={[{ name: "wabaId", label: "WABA ID" }]}
        submitLabel="Fetch"
        onSubmit={({ wabaId }) => wabaService.getPhoneNumbers(wabaId)}
      />
    </ToolPageShell>
  )
}

export function WabaBusinessIdPage() {
  return (
    <ToolPageShell title="Get BMID from WABA">
      <ApiToolForm
        title="Business ID Lookup"
        schema={z.object({ wabaId: z.string().min(1) })}
        fields={[{ name: "wabaId", label: "WABA ID" }]}
        onSubmit={({ wabaId }) => wabaService.getBusinessIdFromWaba(wabaId)}
      />
    </ToolPageShell>
  )
}

export function WabaRevokeCreditPage() {
  return (
    <ToolPageShell title="Revoke Credit Line">
      <ApiToolForm
        title="Revoke Credit Line"
        schema={z.object({ wabaId: z.string().min(1), creditLineId: z.string().min(1) })}
        fields={[
          { name: "wabaId", label: "WABA ID" },
          { name: "creditLineId", label: "Credit Line ID" },
        ]}
        onSubmit={(v) => wabaService.revokeCreditLine(v)}
      />
    </ToolPageShell>
  )
}

export function WabaSubscribedAppsPage() {
  return (
    <ToolPageShell title="Subscribed Apps">
      <Tabs defaultValue="get">
        <TabsList>
          <TabsTrigger value="get">Get</TabsTrigger>
          <TabsTrigger value="post">Subscribe</TabsTrigger>
        </TabsList>
        <TabsContent value="get" className="mt-4">
          <ApiToolForm
            title="Get Subscribed Apps"
            schema={z.object({ wabaId: z.string().min(1) })}
            fields={[{ name: "wabaId", label: "WABA ID" }]}
            onSubmit={({ wabaId }) => wabaService.getSubscribedApps(wabaId)}
          />
        </TabsContent>
        <TabsContent value="post" className="mt-4">
          <ApiToolForm
            title="Subscribe Apps"
            schema={z.object({ wabaId: z.string().min(1) })}
            fields={[{ name: "wabaId", label: "WABA ID" }]}
            onSubmit={wabaService.subscribeApps}
          />
        </TabsContent>
      </Tabs>
    </ToolPageShell>
  )
}

export function WabaRegisterPage() {
  return (
    <ToolPageShell title="Register Number">
      <ApiToolForm
        title="Register Phone Number"
        schema={z.object({ phoneNumber: z.string().min(1), pinCode: z.string().min(1) })}
        fields={[
          { name: "phoneNumber", label: "Phone Number" },
          { name: "pinCode", label: "PIN Code" },
        ]}
        onSubmit={wabaService.register}
      />
    </ToolPageShell>
  )
}

export function WabaRequestCodePage() {
  return (
    <ToolPageShell title="Request OTP">
      <ApiToolForm
        title="Request Verification Code"
        schema={z.object({
          phoneNumberId: z.string().min(1),
          codeMethod: z.enum(["SMS", "VOICE"]),
          language: z.string().length(2),
        })}
        fields={[
          { name: "phoneNumberId", label: "Phone Number ID" },
          { name: "codeMethod", label: "Method (SMS or VOICE)" },
          { name: "language", label: "Language (2-letter)" },
        ]}
        onSubmit={(v) =>
          wabaService.requestCode({
            ...v,
            codeMethod: v.codeMethod as "SMS" | "VOICE",
          })
        }
      />
    </ToolPageShell>
  )
}

export function WabaVerifyCodePage() {
  return (
    <ToolPageShell title="Verify OTP">
      <ApiToolForm
        title="Verify Code"
        schema={z.object({ phoneNumberId: z.string().min(1), code: z.string().length(6) })}
        fields={[
          { name: "phoneNumberId", label: "Phone Number ID" },
          { name: "code", label: "6-digit Code" },
        ]}
        onSubmit={wabaService.verifyCode}
      />
    </ToolPageShell>
  )
}

export function WabaCoexSyncPage() {
  return (
    <ToolPageShell title="Coex Sync">
      <ApiToolForm
        title="Coex Sync"
        schema={z.object({
          phoneNumberId: z.string().min(1),
          syncType: z.enum(["smb_app_state_sync", "history"]),
        })}
        fields={[
          { name: "phoneNumberId", label: "Phone Number ID" },
          { name: "syncType", label: "Sync Type" },
        ]}
        onSubmit={(v) =>
          wabaService.coexSync({
            ...v,
            syncType: v.syncType as "smb_app_state_sync" | "history",
          })
        }
      />
    </ToolPageShell>
  )
}

export function WabaLocalStoragePage() {
  return (
    <ToolPageShell title="Local Storage Settings">
      <ApiToolForm
        title="Local Storage"
        schema={z.object({
          phoneNumberId: z.string().min(1),
          action: z.enum(["enable", "disable"]),
          countryCode: z.string().optional(),
        })}
        fields={[
          { name: "phoneNumberId", label: "Phone Number ID" },
          { name: "action", label: "Action (enable/disable)" },
          { name: "countryCode", label: "Country Code (optional)" },
        ]}
        onSubmit={(v) =>
          wabaService.localStorageSettings({
            phoneNumberId: v.phoneNumberId,
            action: v.action as "enable" | "disable",
            countryCode: v.countryCode,
          })
        }
      />
    </ToolPageShell>
  )
}

export function ClientStatusPage() {
  return (
    <ToolPageShell title="Client Status" description="Search tenant and credit customer status">
      <Tabs defaultValue="tenant">
        <TabsList>
          <TabsTrigger value="tenant">Query Tenant</TabsTrigger>
          <TabsTrigger value="credit">Credit Customer</TabsTrigger>
          <TabsTrigger value="states">WATI States</TabsTrigger>
        </TabsList>
        <TabsContent value="tenant" className="mt-4">
          <ApiToolForm
            title="Query Tenant"
            schema={z.object({ q: z.string().min(1) })}
            fields={[{ name: "q", label: "Search query" }]}
            onSubmit={({ q }) => watiCustomerStatusService.queryTenant(q)}
          />
        </TabsContent>
        <TabsContent value="credit" className="mt-4">
          <ApiToolForm
            title="Query Credit Customer"
            schema={z.object({ q: z.string().min(1) })}
            fields={[{ name: "q", label: "Search query" }]}
            onSubmit={({ q }) => watiCustomerStatusService.queryCreditCustomer(q)}
          />
        </TabsContent>
        <TabsContent value="states" className="mt-4">
          <GetUsersPanel fetcher={watiCustomerStatusService.queryWatiStates} />
        </TabsContent>
      </Tabs>
    </ToolPageShell>
  )
}

export function CreateExtAdminPage() {
  return (
    <ToolPageShell title="Create External Admin">
      <ApiToolForm
        title="Create External Admin"
        schema={z.object({
          tenantID: z.string().min(1),
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          watiInitial: z.string().min(1),
          frontendDomain: z.string().min(1),
          backendDomain: z.string().min(1),
          encodedPassword: z.string().min(1),
        })}
        fields={[
          { name: "tenantID", label: "Tenant ID" },
          { name: "firstName", label: "First Name" },
          { name: "lastName", label: "Last Name" },
          { name: "watiInitial", label: "WATI Initial" },
          { name: "frontendDomain", label: "Frontend Domain" },
          { name: "backendDomain", label: "Backend Domain" },
          { name: "encodedPassword", label: "Encoded Password" },
        ]}
        onSubmit={createExtAdminService.create}
      />
    </ToolPageShell>
  )
}

export function CreateExtAdminEuPage() {
  return (
    <ToolPageShell title="Create External Admin (EU)">
      <ApiToolForm
        title="Create External Admin EU"
        schema={z.object({
          tenantID: z.string().min(1),
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          watiInitial: z.string().min(1),
          frontendDomain: z.string().min(1),
          backendDomain: z.string().min(1),
          encodedPassword: z.string().min(1),
        })}
        fields={[
          { name: "tenantID", label: "Tenant ID" },
          { name: "firstName", label: "First Name" },
          { name: "lastName", label: "Last Name" },
          { name: "watiInitial", label: "WATI Initial" },
          { name: "frontendDomain", label: "Frontend Domain" },
          { name: "backendDomain", label: "Backend Domain" },
          { name: "encodedPassword", label: "Encoded Password" },
        ]}
        onSubmit={createExtAdminEuService.create}
      />
    </ToolPageShell>
  )
}

export function RegisterCloudApiPage() {
  return (
    <ToolPageShell title="Register Cloud API">
      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="retry">Retry</TabsTrigger>
          <TabsTrigger value="logs">Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="register" className="mt-4">
          <ApiToolForm
            title="Register"
            schema={z.object({ subId: z.string().min(1) })}
            fields={[{ name: "subId", label: "Subscription ID" }]}
            onSubmit={registerCloudApiService.register}
          />
        </TabsContent>
        <TabsContent value="retry" className="mt-4">
          <GetUsersPanel fetcher={registerCloudApiService.retryRegister} />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <GetUsersPanel fetcher={() => registerCloudApiService.viewAuditLog()} />
        </TabsContent>
      </Tabs>
    </ToolPageShell>
  )
}

export function OnboardingFixPage() {
  return (
    <ToolPageShell title="Onboarding Fix">
      <Tabs defaultValue="fix">
        <TabsList>
          <TabsTrigger value="fix">Fix</TabsTrigger>
          <TabsTrigger value="lookup">Lookup</TabsTrigger>
        </TabsList>
        <TabsContent value="fix" className="mt-4">
          <ApiToolForm
            title="Run Onboarding Fix"
            schema={z.object({
              subscriptionId: z.string().min(1),
              cloudApiSetupProcessId: z.string().min(1),
            })}
            fields={[
              { name: "subscriptionId", label: "Subscription ID" },
              { name: "cloudApiSetupProcessId", label: "Cloud API Setup Process ID" },
            ]}
            onSubmit={onboardingFixService.fix}
          />
        </TabsContent>
        <TabsContent value="lookup" className="mt-4">
          <ApiToolForm
            title="Lookup"
            schema={z.object({ subscriptionId: z.string().min(1) })}
            fields={[{ name: "subscriptionId", label: "Subscription ID" }]}
            onSubmit={({ subscriptionId }) => onboardingFixService.lookup({ subscriptionId })}
          />
        </TabsContent>
      </Tabs>
    </ToolPageShell>
  )
}

export function CleanCachePage() {
  return (
    <ToolPageShell title="Clean Cache">
      <ApiToolForm
        title="Clean Cache"
        schema={z.object({ clientId: z.string().min(1) })}
        fields={[{ name: "clientId", label: "Client ID" }]}
        onSubmit={cleanCacheService.clean}
      />
    </ToolPageShell>
  )
}

export function StopBroadcastRetriesPage() {
  return (
    <ToolPageShell title="Stop Broadcast Retries">
      <ApiToolForm
        title="Stop Broadcast Retries"
        schema={z.object({
          tenantId: z.string().min(1),
          broadcastId: z.string().min(1),
          slackUrl: z.string().optional(),
        })}
        fields={[
          { name: "tenantId", label: "Tenant ID" },
          { name: "broadcastId", label: "Broadcast ID" },
          { name: "slackUrl", label: "Slack URL (optional)" },
        ]}
        onSubmit={broadcastService.stopRetries}
      />
    </ToolPageShell>
  )
}

export function StopBroadcastPage() {
  return (
    <ToolPageShell title="Stop Broadcast">
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="stop">Stop</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <ApiToolForm
            title="Get Broadcast List"
            schema={z.object({ tenantId: z.string().min(1), keyword: z.string().min(1) })}
            fields={[
              { name: "tenantId", label: "Tenant ID" },
              { name: "keyword", label: "Keyword" },
            ]}
            onSubmit={({ tenantId, keyword }) => broadcastService.getList(tenantId, keyword)}
          />
        </TabsContent>
        <TabsContent value="stop" className="mt-4">
          <ApiToolForm
            title="Stop Broadcast"
            schema={z.object({
              tenantId: z.string().min(1),
              broadcastId: z.string().min(1),
              slackUrl: z.string().optional(),
            })}
            fields={[
              { name: "tenantId", label: "Tenant ID" },
              { name: "broadcastId", label: "Broadcast ID" },
              { name: "slackUrl", label: "Slack URL (optional)" },
            ]}
            onSubmit={broadcastService.stop}
          />
        </TabsContent>
      </Tabs>
    </ToolPageShell>
  )
}

export function ManageSubscriptionPage() {
  return (
    <ToolPageShell title="Manage Subscription">
      <Tabs defaultValue="validate">
        <TabsList>
          <TabsTrigger value="validate">Validate Tenant</TabsTrigger>
          <TabsTrigger value="disable">Disable Feature</TabsTrigger>
        </TabsList>
        <TabsContent value="validate" className="mt-4">
          <ApiToolForm
            title="Validate Tenant ID"
            schema={z.object({ tenantId: z.string().min(1) })}
            fields={[{ name: "tenantId", label: "Tenant ID" }]}
            onSubmit={({ tenantId }) => manageSubscriptionService.validateTenantId(tenantId)}
          />
        </TabsContent>
        <TabsContent value="disable" className="mt-4">
          <ApiToolForm
            title="Disable Tenant Feature"
            schema={z.object({
              tenantId: z.string().min(1),
              shouldCancelChargebee: z.string(),
              chargebeeCancellationReason: z.string(),
              subscriptionId: z.string().min(1),
              manageSubscriptionAction: z.enum(["pause", "resume"]),
            })}
            fields={[
              { name: "tenantId", label: "Tenant ID" },
              { name: "subscriptionId", label: "Subscription ID" },
              { name: "manageSubscriptionAction", label: "Action (pause/resume)" },
              { name: "shouldCancelChargebee", label: "Cancel Chargebee (true/false)" },
              { name: "chargebeeCancellationReason", label: "Cancellation Reason" },
            ]}
            onSubmit={(v) =>
              manageSubscriptionService.disableTenantFeature({
                ...v,
                shouldCancelChargebee: v.shouldCancelChargebee === "true",
                manageSubscriptionAction: v.manageSubscriptionAction,
              })
            }
          />
        </TabsContent>
      </Tabs>
    </ToolPageShell>
  )
}

export function MpsManagementPage() {
  return (
    <ToolPageShell title="MPS Management">
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="update">Update</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <GetUsersPanel fetcher={() => mpsManagementService.list()} />
        </TabsContent>
        <TabsContent value="update" className="mt-4">
          <ApiToolForm
            title="Update MPS"
            schema={z.object({
              tenant_id: z.string().min(1),
              rate_limit: z.coerce.number().min(1).max(200),
            })}
            fields={[
              { name: "tenant_id", label: "Tenant ID" },
              { name: "rate_limit", label: "Rate Limit (1-200)", type: "number" },
            ]}
            onSubmit={mpsManagementService.update}
          />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <GetUsersPanel fetcher={() => mpsManagementService.auditLogs()} />
        </TabsContent>
      </Tabs>
    </ToolPageShell>
  )
}

export function FrtReportPage() {
  return (
    <ToolPageShell title="FRT Report">
      <ApiToolForm
        title="Generate FRT Report"
        schema={z.object({
          startDate: z.string().min(1),
          endDate: z.string().min(1),
          tenantId: z.string().min(1),
        })}
        fields={[
          { name: "startDate", label: "Start Date" },
          { name: "endDate", label: "End Date" },
          { name: "tenantId", label: "Tenant ID" },
        ]}
        onSubmit={(v) => frtService.report(v)}
      />
    </ToolPageShell>
  )
}

export function TeamInboxReportPage() {
  return (
    <ToolPageShell
      title="Team Inbox Report"
      description="Export tickets CSV from the WATI Team Inbox dashboard API"
    >
      <TeamInboxReportForm />
    </ToolPageShell>
  )
}

export function ApiExplorerPage() {
  return (
    <ToolPageShell title="API Explorer">
      <ApiToolForm
        title="API Explorer"
        schema={z.object({
          method: z.string().min(1),
          url: z.string().url(),
          headers: z.string().optional(),
          body: z.string().optional(),
        })}
        fields={[
          { name: "method", label: "HTTP Method" },
          { name: "url", label: "Meta API URL" },
          { name: "headers", label: "Headers (JSON)", type: "textarea" },
          { name: "body", label: "Body", type: "textarea" },
        ]}
        onSubmit={(v) =>
          apiExplorerService.execute({
            method: v.method,
            url: v.url,
            headers: v.headers ? JSON.parse(v.headers) : undefined,
            body: v.body,
          })
        }
      />
    </ToolPageShell>
  )
}

export function DeleteContactsPage() {
  return (
    <ToolPageShell title="Delete Contacts">
      <ApiToolForm
        title="Verify Tenant"
        schema={z.object({ tenantId: z.string().min(1) })}
        fields={[{ name: "tenantId", label: "Tenant ID" }]}
        submitLabel="Verify"
        onSubmit={({ tenantId }) => deleteContactsService.verify(tenantId)}
      />
    </ToolPageShell>
  )
}

export function DeleteHubspotPage() {
  return (
    <ToolPageShell title="Delete HubSpot Contact Mappings">
      <ApiToolForm
        title="Delete Mappings"
        schema={z.object({
          region: z.enum(["mt", "eu"]),
          tenantId: z.string().min(1),
          criteria: z.string().min(2),
        })}
        fields={[
          { name: "region", label: "Region (mt or eu)" },
          { name: "tenantId", label: "Tenant ID" },
          { name: "criteria", label: "Criteria JSON array", type: "textarea" },
        ]}
        onSubmit={(v) =>
          deleteHubspotService.deleteMappings({
            region: v.region as "mt" | "eu",
            tenantId: v.tenantId,
            criteria: JSON.parse(v.criteria),
          })
        }
      />
    </ToolPageShell>
  )
}

export function UsageCalculatorPage() {
  return (
    <ToolPageShell title="Usage Calculator">
      <Tabs defaultValue="calculate">
        <TabsList>
          <TabsTrigger value="calculate">Calculate</TabsTrigger>
          <TabsTrigger value="reference">Reference Data</TabsTrigger>
          <TabsTrigger value="fx">FX Rate</TabsTrigger>
        </TabsList>
        <TabsContent value="calculate" className="mt-4">
          <ApiToolForm
            title="Calculate Usage"
            schema={z.object({
              senderRegion: z.string().min(1),
              recipientCountryCode: z.string().min(1),
              planType: z.string().min(1),
              messageType: z.string().min(1),
              currency: z.string().min(1),
            })}
            fields={[
              { name: "senderRegion", label: "Sender Region" },
              { name: "recipientCountryCode", label: "Recipient Country" },
              { name: "planType", label: "Plan Type" },
              { name: "messageType", label: "Message Type" },
              { name: "currency", label: "Currency" },
            ]}
            onSubmit={usageCalculatorService.calculate}
          />
        </TabsContent>
        <TabsContent value="reference" className="mt-4">
          <GetUsersPanel fetcher={usageCalculatorService.referenceData} />
        </TabsContent>
        <TabsContent value="fx" className="mt-4">
          <GetUsersPanel fetcher={usageCalculatorService.getFxRate} />
        </TabsContent>
      </Tabs>
    </ToolPageShell>
  )
}

export function BackofficeLogsPage() {
  const logTypes: { key: BackofficeLogKey; label: string }[] = [
    { key: "getPhoneNumLogs", label: "Phone Num Logs" },
    { key: "getBmidLogs", label: "BMID Logs" },
    { key: "getOtpLogs", label: "OTP Logs" },
    { key: "regPhoneNumLogs", label: "Register Phone Logs" },
    { key: "removeCreditLineLogs", label: "Credit Line Logs" },
    { key: "backofficeDbUpdateLogs", label: "DB Update Logs" },
    { key: "createUserLogs", label: "Create User Logs" },
    { key: "terminateSubscriptionLogs", label: "Terminate Subscription Logs" },
    { key: "cleanCacheLogs", label: "Clean Cache Logs" },
    { key: "apiExplorerLogs", label: "API Explorer Logs" },
    { key: "stopBroadcastLogs", label: "Stop Broadcast Logs" },
    { key: "stopBroadcastRetriesLogs", label: "Stop Broadcast Retries Logs" },
  ]

  return (
    <ToolPageShell title="Backoffice Logs">
      <Tabs defaultValue={logTypes[0]?.key}>
        <TabsList className="flex h-auto flex-wrap">
          {logTypes.map((log) => (
            <TabsTrigger key={log.key} value={log.key}>
              {log.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {logTypes.map((log) => (
          <TabsContent key={log.key} value={log.key} className="mt-4">
            <GetUsersPanel fetcher={() => backofficeLogsService.list(log.key)} />
          </TabsContent>
        ))}
      </Tabs>
    </ToolPageShell>
  )
}

export function FeatureAccessPage() {
  return (
    <ToolPageShell title="Feature Access Control">
      <GetUsersPanel fetcher={featureAccessService.list} />
    </ToolPageShell>
  )
}

export function CrossCollectionPage() {
  return (
    <ToolPageShell title="Cross Collection Updates">
      <GetUsersPanel fetcher={() => crossCollectionService.getData()} />
    </ToolPageShell>
  )
}

export function PrmGatewayPage() {
  return (
    <ToolPageShell title="PRM Gateway" description="Partner relationship management">
      <Tabs defaultValue="partners">
        <TabsList>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>
        <TabsContent value="partners" className="mt-4">
          <GetUsersPanel fetcher={() => prmGatewayService.partners()} />
        </TabsContent>
        <TabsContent value="customers" className="mt-4">
          <ApiToolForm
            title="List Customers"
            schema={z.object({ partner_id: z.string().min(1) })}
            fields={[{ name: "partner_id", label: "Partner ID" }]}
            onSubmit={({ partner_id }) => prmGatewayService.customers({ partner_id })}
          />
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          <ApiToolForm
            title="List Subscriptions"
            schema={z.object({ partner_id: z.string().min(1) })}
            fields={[{ name: "partner_id", label: "Partner ID" }]}
            onSubmit={({ partner_id }) => prmGatewayService.subscriptions({ partner_id })}
          />
        </TabsContent>
      </Tabs>
    </ToolPageShell>
  )
}

export function PartnershipTransactionsPage() {
  return (
    <ToolPageShell title="Partnership Transactions">
      <GetUsersPanel fetcher={() => partnershipService.transactions.list()} />
    </ToolPageShell>
  )
}

export function AffiliateDashboardPage() {
  return (
    <ToolPageShell title="Affiliate Partner Dashboard">
      <Tabs defaultValue="partners">
        <TabsList>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>
        <TabsContent value="partners" className="mt-4">
          <GetUsersPanel fetcher={() => affiliateDashboardService.partners()} />
        </TabsContent>
        <TabsContent value="customers" className="mt-4">
          <GetUsersPanel fetcher={() => affiliateDashboardService.customers()} />
        </TabsContent>
        <TabsContent value="transactions" className="mt-4">
          <GetUsersPanel fetcher={() => affiliateDashboardService.transactions()} />
        </TabsContent>
        <TabsContent value="groups" className="mt-4">
          <GetUsersPanel fetcher={() => affiliateDashboardService.groups()} />
        </TabsContent>
      </Tabs>
    </ToolPageShell>
  )
}
