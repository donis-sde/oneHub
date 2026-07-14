import * as React from "react"
import { InfoIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const DEFAULT_CREDIT_LINE_ID = "3183208175125622"

type CreditLineSource = "default" | "custom"

function getSampleSharingPayload(clientBmid: string, creditLineId: string) {
  return {
    clientBmid: clientBmid || "1234",
    creditLineId,
    creditSharingId: "sampletext-1234",
    status: "active",
    fetchedAt: new Date().toISOString(),
  }
}

function getSampleRevokePayload(creditSharingId: string) {
  return {
    creditSharingId,
    status: "revoked",
    message: "Credit sharing revoked successfully.",
    revokedAt: new Date().toISOString(),
  }
}

function PayloadPanel({
  title,
  payload,
}: {
  title: string
  payload: object | null
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
          <p className="text-sm text-muted-foreground">
            Response will appear here.
          </p>
        )}
      </div>
    </div>
  )
}

export function RevokeCreditLine() {
  const [clientBmid, setClientBmid] = React.useState("")
  const [creditLineSource, setCreditLineSource] =
    React.useState<CreditLineSource>("default")
  const [customCreditLineId, setCustomCreditLineId] = React.useState(
    DEFAULT_CREDIT_LINE_ID
  )
  const [hasFetchedSharing, setHasFetchedSharing] = React.useState(false)
  const [sharingPayload, setSharingPayload] = React.useState<object | null>(
    null
  )
  const [revokePayload, setRevokePayload] = React.useState<object | null>(null)

  const creditLineId =
    creditLineSource === "default" ? DEFAULT_CREDIT_LINE_ID : customCreditLineId

  const handleGetCreditSharingId = () => {
    const payload = getSampleSharingPayload(clientBmid, creditLineId)
    setSharingPayload(payload)
    setRevokePayload(null)
    setHasFetchedSharing(true)
  }

  const handleRevokeCreditSharing = () => {
    if (!sharingPayload || !("creditSharingId" in sharingPayload)) {
      return
    }
    setRevokePayload(
      getSampleRevokePayload(String(sharingPayload.creditSharingId))
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-4 md:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Revoke Credit Sharing
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Input the Client BMID, fetch the Credit Sharing ID, then revoke if
            needed. The credit line uses the default unless you switch to a
            custom value.
          </p>
        </div>

        <Card className="surface-elevated">
          <CardContent className="space-y-6 pt-6">
            <Field>
              <FieldLabel htmlFor="client-bmid">Client BMID</FieldLabel>
              <Input
                id="client-bmid"
                value={clientBmid}
                onChange={(event) => setClientBmid(event.target.value)}
                placeholder="1234"
              />
            </Field>

            <div className="space-y-4 rounded-lg border border-border/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold">Credit Line Source</h2>
                <Tabs
                  value={creditLineSource}
                  onValueChange={(value) =>
                    setCreditLineSource(value as CreditLineSource)
                  }
                >
                  <TabsList className="h-auto w-full sm:w-auto">
                    <TabsTrigger
                      value="default"
                      className="px-2 text-[0.625rem] uppercase"
                    >
                      Use default (recommended)
                    </TabsTrigger>
                    <TabsTrigger
                      value="custom"
                      className="px-2 text-[0.625rem] uppercase"
                    >
                      Use custom
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {creditLineSource === "default" ? (
                <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                  <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p>
                    Using default credit line ID. You usually don&apos;t need to
                    change this.
                  </p>
                </div>
              ) : null}

              <Field>
                <FieldLabel htmlFor="credit-line-id">Credit Line ID</FieldLabel>
                <Input
                  id="credit-line-id"
                  value={creditLineId}
                  onChange={(event) => setCustomCreditLineId(event.target.value)}
                  readOnly={creditLineSource === "default"}
                  className={cn(
                    creditLineSource === "default" && "bg-muted/50"
                  )}
                />
                <FieldDescription>
                  {creditLineSource === "default"
                    ? "Read-only. Switch to \"Use custom\" to change."
                    : "Enter a custom credit line ID."}
                </FieldDescription>
              </Field>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                className="uppercase"
                onClick={handleGetCreditSharingId}
              >
                Get credit sharing ID
              </Button>
              <Button
                type="button"
                className="uppercase"
                disabled={!hasFetchedSharing}
                onClick={handleRevokeCreditSharing}
              >
                Revoke credit sharing
              </Button>
            </div>
          </CardContent>
        </Card>

        {hasFetchedSharing ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <PayloadPanel
              title="Credit Sharing ID — Response payload"
              payload={sharingPayload}
            />
            <PayloadPanel
              title="Revoke Credit Sharing — Response payload"
              payload={revokePayload}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
