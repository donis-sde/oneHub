import type { ComponentType } from "react"

import { BmidPhoneFromWaba } from "@/components/tools/bmid-phone-from-waba"
import { ClientStatus } from "@/components/tools/client-status"
import { CoexSync } from "@/components/tools/coex-sync"
import { CreateExternalAdminTenants } from "@/components/tools/create-external-admin-tenants"
import { RevokeCreditLine } from "@/components/tools/revoke-credit-line"
import { StopBroadcastRetries } from "@/components/tools/stop-broadcast-retries"
import { SubscribedApps } from "@/components/tools/subscribed-apps"
import { TenantsMps } from "@/components/tools/tenants-mps"

export const toolPagesByHash: Record<string, ComponentType> = {
  "#bmid-phone-from-waba": BmidPhoneFromWaba,
  "#client-status": ClientStatus,
  "#coex-sync": CoexSync,
  "#create-external-admin-tenants": CreateExternalAdminTenants,
  "#stop-broadcast-retries": StopBroadcastRetries,
  "#revoke-credit-line": RevokeCreditLine,
  "#subscribed-apps": SubscribedApps,
  "#tenants-mps": TenantsMps,
}

export function resolveToolPage(hash: string) {
  return toolPagesByHash[hash]
}
