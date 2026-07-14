/**
 * Platform-wide demo users (`@clare.ai`).
 * Password for all: Wati@123
 * These are used across Access to WABA, Admin Users, login demos, etc.
 */

export type PlatformUserRole =
  | "admin"
  | "engineer"
  | "operator"
  | "readonly"

export interface PlatformUser {
  /** Stable dummy user ID used across the platform */
  userId: string
  name: string
  email: string
  /** Shared demo password for all seeded users */
  password: string
  /** Backend Role enum value */
  role: PlatformUserRole
  /** Display tag for Access to WABA and UI badges */
  tag: "ADMIN" | "OPERATOR" | "ANALYST" | "SUPPORT"
  status: "active" | "pending"
  businessId: string
}

export const PLATFORM_DEMO_PASSWORD = "Wati@123"

export const PLATFORM_USERS: PlatformUser[] = [
  {
    userId: "USR-CLARE-0001",
    name: "Ava Chen",
    email: "ava.chen@clare.ai",
    password: PLATFORM_DEMO_PASSWORD,
    role: "admin",
    tag: "ADMIN",
    status: "active",
    businessId: "biz_clare_001",
  },
  {
    userId: "USR-CLARE-0002",
    name: "Ben Ortiz",
    email: "ben.ortiz@clare.ai",
    password: PLATFORM_DEMO_PASSWORD,
    role: "operator",
    tag: "OPERATOR",
    status: "active",
    businessId: "biz_clare_001",
  },
  {
    userId: "USR-CLARE-0003",
    name: "Chloe Patel",
    email: "chloe.patel@clare.ai",
    password: PLATFORM_DEMO_PASSWORD,
    role: "readonly",
    tag: "ANALYST",
    status: "active",
    businessId: "biz_clare_002",
  },
  {
    userId: "USR-CLARE-0004",
    name: "Diego Morales",
    email: "diego.morales@clare.ai",
    password: PLATFORM_DEMO_PASSWORD,
    role: "engineer",
    tag: "SUPPORT",
    status: "active",
    businessId: "biz_clare_002",
  },
  {
    userId: "USR-CLARE-0005",
    name: "Elena Rossi",
    email: "elena.rossi@clare.ai",
    password: PLATFORM_DEMO_PASSWORD,
    role: "admin",
    tag: "ADMIN",
    status: "pending",
    businessId: "biz_clare_003",
  },
  {
    userId: "USR-CLARE-0006",
    name: "Farah Khan",
    email: "farah.khan@clare.ai",
    password: PLATFORM_DEMO_PASSWORD,
    role: "operator",
    tag: "OPERATOR",
    status: "active",
    businessId: "biz_clare_003",
  },
  {
    userId: "USR-CLARE-0007",
    name: "Gabriel Okonkwo",
    email: "gabriel.okonkwo@clare.ai",
    password: PLATFORM_DEMO_PASSWORD,
    role: "readonly",
    tag: "ANALYST",
    status: "active",
    businessId: "biz_clare_001",
  },
  {
    userId: "USR-CLARE-0008",
    name: "Hana Suzuki",
    email: "hana.suzuki@clare.ai",
    password: PLATFORM_DEMO_PASSWORD,
    role: "engineer",
    tag: "SUPPORT",
    status: "pending",
    businessId: "biz_clare_002",
  },
  {
    userId: "USR-CLARE-0009",
    name: "Isaac Kim",
    email: "isaac.kim@clare.ai",
    password: PLATFORM_DEMO_PASSWORD,
    role: "operator",
    tag: "OPERATOR",
    status: "active",
    businessId: "biz_clare_003",
  },
  {
    userId: "USR-CLARE-0010",
    name: "Julia Santos",
    email: "julia.santos@clare.ai",
    password: PLATFORM_DEMO_PASSWORD,
    role: "admin",
    tag: "ADMIN",
    status: "active",
    businessId: "biz_clare_001",
  },
]

/** @deprecated Use PLATFORM_USERS — kept for Access to WABA compatibility */
export const DUMMY_ACCESS_TO_WABA_USERS = PLATFORM_USERS.map((u) => ({
  id: u.userId,
  name: u.name,
  email: u.email,
  role: u.tag,
  status: u.status,
  businessId: u.businessId,
}))

export function findPlatformUserByEmail(email: string): PlatformUser | undefined {
  return PLATFORM_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  )
}

export function findPlatformUserById(userId: string): PlatformUser | undefined {
  return PLATFORM_USERS.find((u) => u.userId === userId)
}
