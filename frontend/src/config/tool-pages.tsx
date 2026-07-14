import type { ComponentType } from "react"

import { CreateExternalAdminTenants } from "@/components/tools/create-external-admin-tenants"
import { RevokeCreditLine } from "@/components/tools/revoke-credit-line"
import { StopBroadcastRetries } from "@/components/tools/stop-broadcast-retries"

export const toolPagesByHash: Record<string, ComponentType> = {
  "#create-external-admin-tenants": CreateExternalAdminTenants,
  "#stop-broadcast-retries": StopBroadcastRetries,
  "#revoke-credit-line": RevokeCreditLine,
}

export function resolveToolPage(hash: string) {
  return toolPagesByHash[hash]
}
