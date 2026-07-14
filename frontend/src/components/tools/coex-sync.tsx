import * as React from "react"
import { InfoIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

function getSampleContactsSyncPayload(phoneNumberId: string) {
  return {
    phoneNumberId: phoneNumberId || "1234567890",
    syncType: "smb_app_state_sync",
    status: "success",
    message: "Contacts synchronization initiated.",
    requestedAt: new Date().toISOString(),
  }
}

function getSampleHistorySyncPayload(phoneNumberId: string) {
  return {
    phoneNumberId: phoneNumberId || "1234567890",
    syncType: "history",
    status: "success",
    message: "Message history synchronization initiated.",
    requestedAt: new Date().toISOString(),
  }
}

function PayloadPanel({
  title,
  payload,
  emptyMessage,
}: {
  title: string
  payload: object | null
  emptyMessage: string
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="min-h-48 rounded-lg border border-border/60 bg-muted/40 p-4">
        {payload ? (
          <pre className="overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap text-foreground">
            {JSON.stringify(payload, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </div>
    </div>
  )
}

export function CoexSync() {
  const [phoneNumberId, setPhoneNumberId] = React.useState("")
  const [step1Succeeded, setStep1Succeeded] = React.useState(false)
  const [contactsPayload, setContactsPayload] = React.useState<object | null>(
    null
  )
  const [historyPayload, setHistoryPayload] = React.useState<object | null>(
    null
  )

  const handleSyncContacts = () => {
    setContactsPayload(getSampleContactsSyncPayload(phoneNumberId.trim()))
    setHistoryPayload(null)
    setStep1Succeeded(true)
  }

  const handleSyncHistory = () => {
    if (!step1Succeeded) {
      return
    }
    setHistoryPayload(getSampleHistorySyncPayload(phoneNumberId.trim()))
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-4 md:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Coex Sync</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Synchronize WhatsApp Business App data for a phone number. Run the
            steps in order — message history sync can only be triggered after
            contacts sync succeeds.
          </p>
        </div>

        <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            <span className="font-semibold">Step 1:</span> Initiate contacts
            synchronization (<code className="text-xs">smb_app_state_sync</code>
            ). <span className="font-semibold">Step 2:</span> Initiate message
            history synchronization (<code className="text-xs">history</code>) —
            only available after Step 1 succeeds.
          </p>
        </div>

        <div className="space-y-4">
          <Input
            id="business-phone-number-id"
            value={phoneNumberId}
            onChange={(event) => {
              setPhoneNumberId(event.target.value)
              setStep1Succeeded(false)
              setContactsPayload(null)
              setHistoryPayload(null)
            }}
            placeholder="Business Phone Number ID"
            aria-label="Business Phone Number ID"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              className="uppercase"
              onClick={handleSyncContacts}
            >
              Step 1 — Sync Contacts
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                className="uppercase"
                disabled={!step1Succeeded}
                onClick={handleSyncHistory}
              >
                Step 2 — Sync Message History
              </Button>
              {!step1Succeeded ? (
                <p className="text-sm text-muted-foreground">
                  Complete Step 1 first to enable Step 2
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid gap-6 lg:grid-cols-2">
          <PayloadPanel
            title="Step 1 — Contacts Sync Response"
            payload={contactsPayload}
            emptyMessage="Response will appear here..."
          />
          <PayloadPanel
            title="Step 2 — Message History Sync Response"
            payload={historyPayload}
            emptyMessage="Available after Step 1 succeeds..."
          />
        </div>
      </div>
    </div>
  )
}
