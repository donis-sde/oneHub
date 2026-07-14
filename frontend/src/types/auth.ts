export type UserRole =
  | "admin"
  | "engineer"
  | "operator"
  | "readonly"
  | "unverified"

export interface AdminUser {
  email: string
  role: UserRole | string
  userId?: string
  name?: string
  _id?: string
}

export interface SigninResponse {
  success: boolean
  metadata?: { adminUser: AdminUser }
  error?: string
}

export interface SignupResponse {
  success: boolean
  metadata?: { _id: string }
  error?: string
}

export interface AuthMeResponse {
  user: AdminUser | null
}

export interface AuthStatusResponse {
  success: boolean
  role: string | null
}

export type FeaturePermission = "read" | "write"

export interface FeatureAccess {
  featureName: string
  permissions: FeaturePermission[]
}

export interface FeatureAccessControl {
  role: string
  features: FeatureAccess[]
}
