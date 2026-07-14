import * as React from "react"
import { Link } from "react-router-dom"
import { SearchIcon, XIcon } from "lucide-react"

import { mainNavGroups, type NavItem } from "@/config/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const searchableTools: (NavItem & { group: string })[] = mainNavGroups.flatMap(
  (group) =>
    group.items.map((item) => ({
      ...item,
      group: group.title,
    })),
)

export function SidebarToolsSearch({
  onNavigate,
}: {
  onNavigate?: () => void
}) {
  const { state, setOpen, isMobile } = useSidebar()
  const isCollapsed = state === "collapsed" && !isMobile
  const [query, setQuery] = React.useState("")
  const [focused, setFocused] = React.useState(false)
  const [pendingFocus, setPendingFocus] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!isCollapsed && pendingFocus) {
      inputRef.current?.focus()
      setPendingFocus(false)
    }
  }, [isCollapsed, pendingFocus])

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return searchableTools.filter(
      (tool) =>
        tool.title.toLowerCase().includes(q) ||
        tool.group.toLowerCase().includes(q),
    )
  }, [query])

  const showResults = focused && query.trim().length > 0

  const clearSearch = () => {
    setQuery("")
    inputRef.current?.focus()
  }

  if (isCollapsed) {
    return (
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Search tools"
              onClick={() => {
                setPendingFocus(true)
                setOpen(true)
              }}
            >
              <SearchIcon />
              <span>Search</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup className="relative">
      <SidebarGroupLabel className="text-sidebar-foreground/60 px-2 text-[0.65rem] font-semibold tracking-widest uppercase">
        Search
      </SidebarGroupLabel>
      <SidebarGroupContent className="px-2">
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <SidebarInput
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              window.setTimeout(() => setFocused(false), 150)
            }}
            placeholder="Search tools..."
            className="h-9 pr-8 pl-8"
            aria-label="Search tools by name"
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearSearch}
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>

        {showResults ? (
          <div
            className={cn(
              "bg-popover text-popover-foreground absolute inset-x-2 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border shadow-md",
            )}
          >
            {results.length === 0 ? (
              <p className="text-muted-foreground px-3 py-2 text-xs">
                No tools match “{query.trim()}”
              </p>
            ) : (
              <ul className="p-1">
                {results.map((tool) => (
                  <li key={tool.path}>
                    <Link
                      to={tool.path}
                      onClick={() => {
                        setQuery("")
                        setFocused(false)
                        onNavigate?.()
                      }}
                      className="hover:bg-accent hover:text-accent-foreground flex items-start gap-2 rounded-sm px-2 py-1.5 text-sm"
                    >
                      <tool.icon className="mt-0.5 size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {tool.title}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {tool.group}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
