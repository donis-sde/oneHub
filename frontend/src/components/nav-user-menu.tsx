import { Link } from "react-router-dom"
import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon } from "lucide-react"

export function NavUser() {
  const { user, signout } = useAuth()
  const { isMobile } = useSidebar()

  const displayName = user?.email?.split("@")[0] ?? "User"
  const email = user?.email ?? ""

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                tooltip={displayName}
                className="aria-expanded:bg-muted"
              />
            }
          >
            <Avatar className="size-9 rounded-xl ring-2 ring-primary/10">
              <AvatarImage src="" alt={displayName} />
              <AvatarFallback className="rounded-lg">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium capitalize">{displayName}</span>
              <span className="text-muted-foreground truncate text-xs">{email}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <span className="font-medium capitalize">{displayName}</span>
                <span className="text-muted-foreground text-xs">{email}</span>
                {user?.role ? (
                  <span className="text-muted-foreground text-xs capitalize">
                    Role: {user.role}
                  </span>
                ) : null}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link to="/profile" />}>
                <UserIcon />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/settings" />}>
                <SettingsIcon />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signout()}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
