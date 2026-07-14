import * as React from "react"
import {
  ChevronDownIcon,
  HashIcon,
  RocketIcon,
  SearchIcon,
  TypeIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type CampaignStatus = "active" | "retrying"

type Campaign = {
  id: string
  clientId: string
  name: string
  status: CampaignStatus
  scheduledDate: string
  createdDate: string
}

type BulkAction = "stop-broadcast" | "stop-retries" | null

const CAMPAIGN_NAME_MAX = 255

const bulkActionLabels: Record<Exclude<BulkAction, null>, string> = {
  "stop-broadcast": "Stop Broadcast",
  "stop-retries": "Stop Retries",
}

function getSampleCampaigns(clientId: string, campaignName: string): Campaign[] {
  return [
    {
      id: "1",
      clientId,
      name: campaignName || "sampletext",
      status: "active",
      scheduledDate: "Aug 1, 2024, 09:00 AM EST",
      createdDate: "Jul 28, 2024, 02:30 PM EST",
    },
    {
      id: "2",
      clientId: clientId === "1234" ? "5678" : clientId,
      name: `${campaignName || "sampletext"} 2`,
      status: "retrying",
      scheduledDate: "Aug 5, 2024, 11:30 AM EST",
      createdDate: "Jul 30, 2024, 08:15 AM EST",
    },
    {
      id: "3",
      clientId,
      name: `${campaignName || "sampletext"} 3`,
      status: "active",
      scheduledDate: "Aug 12, 2024, 04:00 PM EST",
      createdDate: "Aug 1, 2024, 10:00 AM EST",
    },
  ]
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  if (status === "active") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400"
      >
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Active
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400"
    >
      <span className="size-1.5 rounded-full bg-amber-500" />
      Retrying
    </Badge>
  )
}

function CampaignsTable({
  campaigns,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onStopCampaign,
}: {
  campaigns: Campaign[]
  selectedIds: Set<string>
  onToggleRow: (id: string, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
  onStopCampaign: (id: string) => void
}) {
  const allSelected =
    campaigns.length > 0 && selectedIds.size === campaigns.length
  const someSelected = selectedIds.size > 0 && !allSelected

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => onToggleAll(checked === true)}
                  aria-label="Select all campaigns"
                />
              </TableHead>
              <TableHead>Client ID</TableHead>
              <TableHead>Campaign Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled Date (EST)</TableHead>
              <TableHead>Created date</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(campaign.id)}
                    onCheckedChange={(checked) =>
                      onToggleRow(campaign.id, checked === true)
                    }
                    aria-label={`Select ${campaign.name}`}
                  />
                </TableCell>
                <TableCell>{campaign.clientId}</TableCell>
                <TableCell>{campaign.name}</TableCell>
                <TableCell>
                  <StatusBadge status={campaign.status} />
                </TableCell>
                <TableCell>{campaign.scheduledDate}</TableCell>
                <TableCell>{campaign.createdDate}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onStopCampaign(campaign.id)}
                  >
                    Stop
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function StopBroadcastRetries() {
  const [showFetchModal, setShowFetchModal] = React.useState(true)
  const [hasFetched, setHasFetched] = React.useState(false)
  const [clientId, setClientId] = React.useState("")
  const [campaignName, setCampaignName] = React.useState("")
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = React.useState<BulkAction>(null)

  const commitEnabled = selectedIds.size > 0 && bulkAction !== null

  const handleFetchCampaigns = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedClientId = clientId.trim() || "1234"
    const trimmedName = campaignName.trim() || "sampletext"
    setCampaigns(getSampleCampaigns(trimmedClientId, trimmedName))
    setSelectedIds(new Set())
    setBulkAction(null)
    setHasFetched(true)
    setShowFetchModal(false)
  }

  const handleCancelSearch = () => {
    setShowFetchModal(false)
  }

  const handleOpenSearch = () => {
    setShowFetchModal(true)
  }

  const handleToggleRow = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(campaigns.map((campaign) => campaign.id)))
      return
    }
    setSelectedIds(new Set())
  }

  const handleStopCampaign = (id: string) => {
    setCampaigns((current) => current.filter((campaign) => campaign.id !== id))
    setSelectedIds((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }

  const handleCommit = () => {
    if (!commitEnabled) {
      return
    }
    setCampaigns((current) =>
      current.filter((campaign) => !selectedIds.has(campaign.id))
    )
    setSelectedIds(new Set())
    setBulkAction(null)
  }

  const displayCampaigns = hasFetched
    ? campaigns
    : getSampleCampaigns("1234", "sampletext")

  return (
    <div className="relative flex flex-1 flex-col">
      {showFetchModal ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0 z-40 bg-black/40"
          />
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="fetch-campaigns-title"
              className="grid w-full max-w-md gap-4 rounded-xl border border-border/60 bg-popover p-6 text-xs/relaxed text-popover-foreground shadow-lg"
            >
              <div className="flex flex-col gap-1.5">
                <h2
                  id="fetch-campaigns-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Stop Campaign/Retries
                </h2>
                <p className="text-sm text-muted-foreground">
                  Enter the details for your next marketing initiative.
                </p>
              </div>

              <form onSubmit={handleFetchCampaigns} className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="client-id" className="gap-1.5">
                    <HashIcon className="size-3.5 text-muted-foreground" />
                    Client ID *
                  </FieldLabel>
                  <Input
                    id="client-id"
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
                    placeholder="Enter Client ID (e.g., 1234)"
                    required
                  />
                  <FieldDescription>
                    A unique numeric identifier for the client.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="campaign-name" className="gap-1.5">
                    <TypeIcon className="size-3.5 text-muted-foreground" />
                    Campaign Name *
                  </FieldLabel>
                  <Input
                    id="campaign-name"
                    value={campaignName}
                    onChange={(event) =>
                      setCampaignName(
                        event.target.value.slice(0, CAMPAIGN_NAME_MAX)
                      )
                    }
                    placeholder="e.g., sampletext"
                    required
                  />
                  <div className="flex justify-end text-xs text-muted-foreground">
                    {campaignName.length} / {CAMPAIGN_NAME_MAX}
                  </div>
                </Field>

                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelSearch}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="gap-2">
                    <RocketIcon className="size-3.5" />
                    Fetch Campaigns
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      ) : null}

      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 transition-[filter] duration-200 md:p-8",
          showFetchModal && "pointer-events-none blur-sm"
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Active Campaigns
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {hasFetched ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="outline" className="gap-2">
                        Bulk Actions
                        <ChevronDownIcon className="size-3.5" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setBulkAction("stop-broadcast")}
                    >
                      Stop Broadcast
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setBulkAction("stop-retries")}
                    >
                      Stop Retries
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {bulkAction ? (
                  <span className="text-xs text-muted-foreground">
                    {bulkActionLabels[bulkAction]} selected
                  </span>
                ) : null}
                <Button
                  type="button"
                  disabled={!commitEnabled}
                  onClick={handleCommit}
                >
                  Commit
                </Button>
              </>
            ) : null}
            <Button type="button" className="gap-2" onClick={handleOpenSearch}>
              <SearchIcon className="size-3.5" />
              Search Campaigns
            </Button>
          </div>
        </div>

        {hasFetched ? (
          <CampaignsTable
            campaigns={campaigns}
            selectedIds={selectedIds}
            onToggleRow={handleToggleRow}
            onToggleAll={handleToggleAll}
            onStopCampaign={handleStopCampaign}
          />
        ) : !showFetchModal ? (
          <Card className="border-dashed">
            <CardContent className="flex min-h-48 items-center justify-center py-10 text-sm text-muted-foreground">
              No campaigns loaded. Use Search Campaigns to fetch results.
            </CardContent>
          </Card>
        ) : (
          <CampaignsTable
            campaigns={displayCampaigns}
            selectedIds={new Set()}
            onToggleRow={() => undefined}
            onToggleAll={() => undefined}
            onStopCampaign={() => undefined}
          />
        )}
      </div>
    </div>
  )
}
