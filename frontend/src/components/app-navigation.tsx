import { Link, useLocation } from "react-router-dom"
import { ChevronRightIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { mainNavGroups } from "@/config/navigation"
import { SidebarToolsSearch } from "@/components/sidebar-tools-search"

function NavLinkButton({
  to,
  icon: Icon,
  label,
  isActive,
  tooltip,
  onNavigate,
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive: boolean
  tooltip?: string
  onNavigate?: () => void
}) {
  return (
    <SidebarMenuButton
      render={<Link to={to} onClick={onNavigate} />}
      tooltip={tooltip ?? label}
      isActive={isActive}
    >
      <Icon />
      <span>{label}</span>
    </SidebarMenuButton>
  )
}

export function AppNavigation() {
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar()
  const location = useLocation()
  const isCollapsed = state === "collapsed"

  const closeSidebar = () => {
    if (isMobile) {
      setOpenMobile(false)
    } else {
      setOpen(false)
    }
  }

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)

  return (
    <>
      <SidebarToolsSearch onNavigate={closeSidebar} />

      {mainNavGroups.map((group) => {
        const GroupIcon = group.icon
        const groupActive = group.items.some((item) => isActive(item.path))

        if (isCollapsed) {
          return (
            <SidebarGroup key={group.title}>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <NavLinkButton
                      to={item.path}
                      icon={item.icon}
                      label={item.title}
                      isActive={isActive(item.path)}
                      onNavigate={closeSidebar}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )
        }

        return (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-sidebar-foreground/60 px-2 text-[0.65rem] font-semibold tracking-widest uppercase">
              {group.title}
            </SidebarGroupLabel>
            <SidebarMenu>
              <Collapsible
                defaultOpen={group.defaultOpen || groupActive}
                className="group/collapsible"
                render={<SidebarMenuItem />}
              >
                <CollapsibleTrigger
                  render={
                    <SidebarMenuButton tooltip={group.title} isActive={groupActive} />
                  }
                >
                  <GroupIcon />
                  <span>{group.title}</span>
                  <ChevronRightIcon className="ml-auto size-4 transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {group.items.map((item) => (
                      <SidebarMenuSubItem key={item.path}>
                        <SidebarMenuSubButton
                          render={<Link to={item.path} onClick={closeSidebar} />}
                          isActive={isActive(item.path)}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        )
      })}
    </>
  )
}
