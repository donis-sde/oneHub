import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

function getSampleSubscribedAppsPayload(wabaId: string) {
  return {
    wabaId: wabaId || "1234567890",
    data: [
      {
        whatsapp_business_api_data: {
          id: "wati-app-id",
          name: "WATI",
          link: "https://www.facebook.com/games/?app_id=wati-app-id",
        },
      },
    ],
    fetchedAt: new Date().toISOString(),
  }
}

function getSampleSubscribeAppPayload(wabaId: string) {
  return {
    wabaId: wabaId || "1234567890",
    success: true,
    message: "WATI app subscribed to WABA successfully.",
    subscribedAt: new Date().toISOString(),
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
            Response will appear here...
          </p>
        )}
      </div>
    </div>
  )
}

export function SubscribedApps() {
  const [wabaId, setWabaId] = React.useState("")
  const [getPayload, setGetPayload] = React.useState<object | null>(null)
  const [subscribePayload, setSubscribePayload] = React.useState<object | null>(
    null
  )

  const handleGetSubscribedApps = () => {
    setGetPayload(getSampleSubscribedAppsPayload(wabaId.trim()))
  }

  const handleSubscribeApp = () => {
    setSubscribePayload(getSampleSubscribeAppPayload(wabaId.trim()))
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-4 md:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Subscribed Apps
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Fetch the apps currently subscribed to a WABA, or subscribe the WATI
            app to a WABA.
          </p>
        </div>

        <div className="space-y-4">
          <Input
            id="waba-id"
            value={wabaId}
            onChange={(event) => setWabaId(event.target.value)}
            placeholder="WABA ID"
            aria-label="WABA ID"
          />

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="uppercase"
              onClick={handleGetSubscribedApps}
            >
              Get Subscribed Apps
            </Button>
            <Button
              type="button"
              className="uppercase"
              onClick={handleSubscribeApp}
            >
              Subscribe App
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-6 lg:grid-cols-2">
          <PayloadPanel
            title="Get Subscribed Apps — Response"
            payload={getPayload}
          />
          <PayloadPanel
            title="Subscribe App — Response"
            payload={subscribePayload}
          />
        </div>
      </div>
    </div>
  )
}
