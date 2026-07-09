import { apiGet, apiPost } from "@/lib/api-client"

export const prmGatewayService = {
  partners: (params?: Record<string, string | number | undefined>) =>
    apiGet<{ result: Record<string, unknown>[]; total: number; page: number; limit: number }>(
      "/api/prmGateway/partners",
      params,
    ),

  createPartner: (body: Record<string, unknown>) =>
    apiPost<{ result: string }>("/api/prmGateway/createPartner", body),

  updatePartner: (body: Record<string, unknown>) =>
    apiPost<{ result: string }>("/api/prmGateway/updatePartner", body),

  deletePartner: (body: { id: string }) =>
    apiPost<{ result: string }>("/api/prmGateway/deletePartner", body),

  customers: (params: Record<string, string | number | undefined>) =>
    apiGet<{ result: Record<string, unknown>[]; total: number; page: number; limit: number }>(
      "/api/prmGateway/customers",
      params,
    ),

  createCustomer: (body: Record<string, unknown>) =>
    apiPost<{ result: string }>("/api/prmGateway/createCustomer", body),

  updateCustomer: (body: Record<string, unknown>) =>
    apiPost<{ result: string }>("/api/prmGateway/updateCustomer", body),

  deleteCustomer: (body: { id: string }) =>
    apiPost<{ result: string }>("/api/prmGateway/deleteCustomer", body),

  subscriptions: (params: Record<string, string | number | undefined>) =>
    apiGet<{ result: Record<string, unknown>[]; total: number; page: number; limit: number }>(
      "/api/prmGateway/subscriptions",
      params,
    ),

  forceSyncPartner: (partner_id: string) =>
    apiGet<{ result: string }>("/api/prmGateway/forceSyncPartner", { partner_id }),

  forceSyncCustomer: (customer_id: string) =>
    apiGet<{ result: string }>("/api/prmGateway/forceSyncCustomer", { customer_id }),
}
