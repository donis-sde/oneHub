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
import type { BackofficeNavigation } from "@/config/backoffice-navigation"
import { useHashRoute } from "@/hooks/use-hash-route"
import { ChevronRightIcon } from "lucide-react"

function CollapsedBackofficeNav({
  navigation,
  activeHash,
}: {
  navigation: BackofficeNavigation
  activeHash: string
}) {
  return (
    <SidebarMenu>
      {navigation.groups.flatMap((group) =>
        group.items.map((item) => {
          const ItemIcon = item.icon
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                render={<a href={item.url} />}
                tooltip={item.title}
                isActive={activeHash === item.url}
              >
                <ItemIcon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })
      )}
      {navigation.links.map((link) => {
        const LinkIcon = link.icon
        return (
          <SidebarMenuItem key={link.title}>
            <SidebarMenuButton
              render={<a href={link.url} />}
              tooltip={link.title}
              isActive={activeHash === link.url}
            >
              <LinkIcon />
              <span>{link.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

function ExpandedBackofficeNav({
  navigation,
  activeHash,
}: {
  navigation: BackofficeNavigation
  activeHash: string
}) {
  return (
    <SidebarMenu>
      {navigation.groups.map((group) => {
        const GroupIcon = group.icon
        const groupActive = group.items.some((item) => item.url === activeHash)

        return (
          <Collapsible
            key={group.title}
            defaultOpen={group.defaultOpen || groupActive}
            className="group/collapsible"
            render={<SidebarMenuItem />}
          >
            <CollapsibleTrigger
              render={
                <SidebarMenuButton
                  tooltip={group.title}
                  isActive={groupActive}
                />
              }
            >
              <GroupIcon />
              <span>{group.title}</span>
              <ChevronRightIcon className="ml-auto size-4 transition-transform duration-200 group-data-open/collapsible:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {group.items.map((item) => {
                  const ItemIcon = item.icon
                  return (
                    <SidebarMenuSubItem key={item.title}>
                      <SidebarMenuSubButton
                        render={<a href={item.url} />}
                        isActive={activeHash === item.url}
                      >
                        <ItemIcon />
                        <span>{item.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        )
      })}

      {navigation.links.map((link) => {
        const LinkIcon = link.icon
        return (
          <SidebarMenuItem key={link.title}>
            <SidebarMenuButton
              render={<a href={link.url} />}
              tooltip={link.title}
              isActive={activeHash === link.url}
            >
              <LinkIcon />
              <span>{link.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

export function NavBackoffice({
  navigation,
}: {
  navigation: BackofficeNavigation
}) {
  const { state } = useSidebar()
  const activeHash = useHashRoute()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
        {navigation.sectionLabel}
      </SidebarGroupLabel>
      {isCollapsed ? (
        <CollapsedBackofficeNav
          navigation={navigation}
          activeHash={activeHash}
        />
      ) : (
        <ExpandedBackofficeNav
          navigation={navigation}
          activeHash={activeHash}
        />
      )}
    </SidebarGroup>
  )
}
