import { apiGet, apiPost } from "@/lib/api-client"

export const wabaService = {
  getPhoneNumbers: (wabaId: string) =>
    apiGet<{ phoneNumbers: Record<string, unknown>[] }>("/api/waba/phoneNumbers", { wabaId }),

  register: (body: { phoneNumber: string; pinCode: string }) =>
    apiPost<{ success: boolean; message: string }>("/api/waba/register", body),

  requestCode: (body: {
    phoneNumberId: string
    codeMethod: "SMS" | "VOICE"
    language: string
  }) => apiPost<{ success: boolean; message: string }>("/api/waba/requestCode", body),

  verifyCode: (body: { phoneNumberId: string; code: string }) =>
    apiPost<{ success: boolean; message: string }>("/api/waba/verifyCode", body),

  getCreditLines: (businessId: string) =>
    apiGet<{ creditLines: Record<string, unknown>[] }>("/api/waba/getCreditLines", { businessId }),

  getBusinessIdFromWaba: (wabaId: string) =>
    apiGet<{ bmid: string; name: string }>("/api/waba/getBusinessIdFromWaba", { wabaId }),

  getSubscribedApps: (wabaId: string) =>
    apiGet<{ subscribedApps: Record<string, unknown> }>("/api/waba/subscribedApps", { wabaId }),

  subscribeApps: (body: { wabaId: string }) =>
    apiPost<{ result: Record<string, unknown> }>("/api/waba/subscribedApps", body),

  coexSync: (body: { phoneNumberId: string; syncType: "smb_app_state_sync" | "history" }) =>
    apiPost<Record<string, unknown>>("/api/waba/coexSync", body),

  localStorageSettings: (body: {
    phoneNumberId: string
    action: "enable" | "disable"
    countryCode?: string
  }) => apiPost<{ success: boolean; raw: Record<string, unknown> }>("/api/waba/localStorageSettings", body),

  revokeCreditLine: (params: { wabaId: string; creditLineId: string }) =>
    apiGet<{ success: boolean }>("/api/waba/revokeCreditLine", params),

  getAllocationConfig: (params: { creditLineId: string; clientBusinessId: string }) =>
    apiGet<{ allocationConfigId: string; raw: Record<string, unknown> }>(
      "/api/waba/getAllocationConfig",
      params,
    ),

  revokeCreditSharing: (params: { allocationConfigId: string }) =>
    apiGet<{ success: boolean; raw: Record<string, unknown> }>(
      "/api/waba/revokeCreditSharing",
      params,
    ),

  getOwnerBusinessInfo: (params?: Record<string, string>) =>
    apiGet<Record<string, unknown>>("/api/waba/getOwnerBusinessInfo", params),
}

export const accessToWabaService = {
  getUsers: () => apiGet<Record<string, unknown>>("/api/accessToWABA/getUsers"),

  assignUser: (body: { wabaId: string; userId: string }) =>
    apiPost<Record<string, unknown>>("/api/accessToWABA/assignUser", body),
}
