import { apiGet, apiPatch, apiPost } from "@/lib/api-client"
import type { FeatureAccessControl } from "@/types/auth"

export const featureAccessService = {
  list: () => apiGet<FeatureAccessControl[]>("/api/featureAccessControl"),

  create: (body: FeatureAccessControl) =>
    apiPost<{ message: string }>("/api/featureAccessControl", body),

  getByRole: (role: string) =>
    apiGet<FeatureAccessControl>(`/api/featureAccessControl/${role}`),

  updateRole: (role: string, body: { features: FeatureAccessControl["features"] }) =>
    apiPatch<{ message: string }>(`/api/featureAccessControl/${role}`, body),
}
