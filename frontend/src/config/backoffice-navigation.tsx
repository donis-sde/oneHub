import type { LucideIcon } from "lucide-react"
import {
  ActivityIcon,
  AppWindowIcon,
  ArchiveIcon,
  BanIcon,
  BarChart3Icon,
  Building2Icon,
  CalculatorIcon,
  CreditCardIcon,
  DatabaseIcon,
  EraserIcon,
  FileTextIcon,
  KeyRoundIcon,
  LinkIcon,
  PhoneIcon,
  RefreshCwIcon,
  ServerIcon,
  TerminalIcon,
  UserPlusIcon,
  UserRoundXIcon,
  WrenchIcon,
} from "lucide-react"

export type NavLinkItem = {
  title: string
  url: string
  icon: LucideIcon
}

export type NavCollapsibleGroup = {
  title: string
  icon: LucideIcon
  items: NavLinkItem[]
  defaultOpen?: boolean
}

export type BackofficeNavigation = {
  sectionLabel: string
  groups: NavCollapsibleGroup[]
  links: NavLinkItem[]
}

export const backofficeNavigation: BackofficeNavigation = {
  sectionLabel: "Support",
  groups: [
    {
      title: "WABA Tools",
      icon: PhoneIcon,
      defaultOpen: true,
      items: [
        { title: "Access to WABA", url: "#access-to-waba", icon: KeyRoundIcon },
        {
          title: "Get Phone from WABA",
          url: "#get-phone-from-waba",
          icon: PhoneIcon,
        },
        {
          title: "Get BMID from WABA",
          url: "#get-bmid-from-waba",
          icon: Building2Icon,
        },
        {
          title: "Revoke Credit Line",
          url: "#revoke-credit-line",
          icon: CreditCardIcon,
        },
        {
          title: "Subscribed Apps",
          url: "#subscribed-apps",
          icon: AppWindowIcon,
        },
      ],
    },
    {
      title: "WATI Internal Tools",
      icon: WrenchIcon,
      defaultOpen: true,
      items: [
        { title: "Client Status", url: "#client-status", icon: ActivityIcon },
        {
          title: "Create External Admin tenants",
          url: "#create-external-admin-tenants",
          icon: UserPlusIcon,
        },
        {
          title: "Register/Deregister",
          url: "#register-deregister",
          icon: FileTextIcon,
        },
        {
          title: "Manual Connection",
          url: "#manual-connection",
          icon: LinkIcon,
        },
        { title: "Coex Sync", url: "#coex-sync", icon: RefreshCwIcon },
        {
          title: "Clean Cache: For the WATI account",
          url: "#clean-cache",
          icon: EraserIcon,
        },
        {
          title: "Stop Broadcasts Retries",
          url: "#stop-broadcast-retries",
          icon: BanIcon,
        },
        { title: "Onboarding fix", url: "#onboarding-fix", icon: WrenchIcon },
      ],
    },
    {
      title: "Deprecated features",
      icon: ArchiveIcon,
      defaultOpen: false,
      items: [
        {
          title: "Delete Contacts",
          url: "#delete-contacts",
          icon: UserRoundXIcon,
        },
        { title: "Stop Broadcast", url: "#stop-broadcast", icon: BanIcon },
        {
          title: "Usage calculator",
          url: "#usage-calculator",
          icon: CalculatorIcon,
        },
        { title: "Local Storage", url: "#local-storage", icon: DatabaseIcon },
        { title: "API Explorer", url: "#api-explorer", icon: TerminalIcon },
        { title: "Generate FRT", url: "#generate-frt", icon: FileTextIcon },
      ],
    },
  ],
  links: [
    { title: "Data studio", url: "#data-studio", icon: BarChart3Icon },
    { title: "MCP Server", url: "#mcp-server", icon: ServerIcon },
  ],
}