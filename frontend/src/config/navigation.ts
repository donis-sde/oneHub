import type { LucideIcon } from "lucide-react"
import {
  ActivityIcon,
  ScrollTextIcon,
  AppWindowIcon,
  ArchiveIcon,
  BanIcon,
  BarChart3Icon,
  BotIcon,
  Building2Icon,
  CalculatorIcon,
  CalendarClockIcon,
  CreditCardIcon,
  DatabaseIcon,
  EraserIcon,
  FileTextIcon,
  IdCardIcon,
  KeyRoundIcon,
  LinkIcon,
  PhoneIcon,
  RefreshCwIcon,
  ServerIcon,
  SettingsIcon,
  ShieldIcon,
  SparklesIcon,
  TerminalIcon,
  UserPlusIcon,
  UserRoundCogIcon,
  UserRoundXIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  path: string
  icon: LucideIcon
  description?: string
}

export interface NavGroup {
  title: string
  icon: LucideIcon
  items: NavItem[]
  defaultOpen?: boolean
}

export const mainNavGroups: NavGroup[] = [
  {
    title: "WABA Tools",
    icon: PhoneIcon,
    defaultOpen: true,
    items: [
      { title: "Access to WABA", path: "/tools/access-to-waba", icon: KeyRoundIcon },
      { title: "Get Phone from WABA", path: "/tools/waba/phone-numbers", icon: PhoneIcon },
      { title: "Get BMID from WABA", path: "/tools/waba/business-id", icon: Building2Icon },
      { title: "Revoke Credit Line", path: "/tools/waba/revoke-credit", icon: CreditCardIcon },
      { title: "Subscribed Apps", path: "/tools/waba/subscribed-apps", icon: AppWindowIcon },
      { title: "Register Number", path: "/tools/waba/register", icon: PhoneIcon },
      { title: "Request OTP", path: "/tools/waba/request-code", icon: PhoneIcon },
      { title: "Verify OTP", path: "/tools/waba/verify-code", icon: PhoneIcon },
      { title: "Coex Sync", path: "/tools/waba/coex-sync", icon: RefreshCwIcon },
      { title: "Local Storage", path: "/tools/waba/local-storage", icon: DatabaseIcon },
    ],
  },
  {
    title: "Astra Tools",
    icon: BotIcon,
    defaultOpen: true,
    items: [
      {
        title: "Create Admin User",
        path: "/tools/astra/create-admin-user",
        icon: UserPlusIcon,
      },
      {
        title: "Extend Trial",
        path: "/tools/astra/extend-trial",
        icon: CalendarClockIcon,
      },
      {
        title: "Change Ownership",
        path: "/tools/astra/change-ownership",
        icon: UserRoundCogIcon,
      },
      {
        title: "Astra Account Details",
        path: "/tools/astra/account-details",
        icon: IdCardIcon,
      },
      {
        title: "Get AI Usage",
        path: "/tools/astra/get-ai-usage",
        icon: SparklesIcon,
      },
      {
        title: "Databases",
        path: "/tools/astra/databases",
        icon: DatabaseIcon,
      },
    ],
  },
  {
    title: "WATI Internal Tools",
    icon: WrenchIcon,
    defaultOpen: true,
    items: [
      { title: "Client Status", path: "/tools/client-status", icon: ActivityIcon },
      { title: "Create External Admin", path: "/tools/create-ext-admin", icon: UserPlusIcon },
      { title: "Create External Admin (EU)", path: "/tools/create-ext-admin-eu", icon: UserPlusIcon },
      { title: "Register Cloud API", path: "/tools/register-cloud-api", icon: FileTextIcon },
      { title: "Onboarding Fix", path: "/tools/onboarding-fix", icon: WrenchIcon },
      { title: "Clean Cache", path: "/tools/clean-cache", icon: EraserIcon },
      { title: "Stop Broadcast Retries", path: "/tools/stop-broadcast-retries", icon: BanIcon },
      { title: "Stop Broadcast", path: "/tools/stop-broadcast", icon: BanIcon },
      { title: "Manage Subscription", path: "/tools/manage-subscription", icon: SettingsIcon },
      { title: "MPS Management", path: "/tools/mps-management", icon: ServerIcon },
      { title: "PRM Gateway", path: "/prm-gateway", icon: LinkIcon },
      { title: "FRT Report", path: "/tools/frt", icon: FileTextIcon },
      { title: "API Explorer", path: "/tools/api-explorer", icon: TerminalIcon },
      { title: "Delete Contacts", path: "/tools/delete-contacts", icon: UserRoundXIcon },
      { title: "Delete HubSpot Mappings", path: "/tools/delete-hubspot", icon: UserRoundXIcon },
    ],
  },
  {
    title: "Data & Admin",
    icon: DatabaseIcon,
    defaultOpen: true,
    items: [
      { title: "Tenants", path: "/data/tenants", icon: Building2Icon },
      { title: "Settings", path: "/data/settings", icon: SettingsIcon },
      { title: "Partners", path: "/data/partners", icon: UsersIcon },
      { title: "Admin Users", path: "/data/admin-users", icon: UsersIcon },
      { title: "Cross Collection", path: "/data/cross-collection", icon: DatabaseIcon },
      { title: "Feature Access", path: "/admin/feature-access", icon: ShieldIcon },
      { title: "Activity Log", path: "/admin/activity-log", icon: ScrollTextIcon },
      { title: "Partnership Transactions", path: "/partnership/transactions", icon: BarChart3Icon },
      { title: "Affiliate Dashboard", path: "/affiliate", icon: BarChart3Icon },
    ],
  },
  {
    title: "Deprecated",
    icon: ArchiveIcon,
    defaultOpen: false,
    items: [
      { title: "Usage Calculator", path: "/tools/usage-calculator", icon: CalculatorIcon },
      { title: "Backoffice Logs", path: "/logs", icon: FileTextIcon },
    ],
  },
]

export const topLevelNav: NavItem[] = [
  { title: "Home", path: "/", icon: BarChart3Icon },
]

/** Shown in the site header (next to Home), not in the sidebar */
export const headerNav: NavItem[] = [
  { title: "Profile", path: "/profile", icon: UsersIcon },
  { title: "Settings", path: "/settings", icon: SettingsIcon },
]

export const databaseCollections = {
  tenants: {
    label: "Tenants",
    database: "wati-tenants",
    collection: "Tenants",
    envKeys: ["NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION"],
  },
  settings: {
    label: "Settings",
    database: "wati-tenants",
    collection: "Settings",
  },
  partners: {
    label: "Partners",
    database: "Partners",
    collection: "Partners",
  },
  adminUsers: {
    label: "Admin Users",
    database: "wati-admin",
    collection: "AdminUsers",
  },
} as const
