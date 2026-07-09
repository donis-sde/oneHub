import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Command } from "cmdk"
import { SearchIcon } from "lucide-react"

import { mainNavGroups, topLevelNav } from "@/config/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const runCommand = React.useCallback(
    (path: string) => {
      setOpen(false)
      navigate(path)
    },
    [navigate],
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
        </DialogHeader>
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:size-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3">
          <div className="flex items-center border-b px-3">
            <SearchIcon className="text-muted-foreground mr-2 size-4 shrink-0" />
            <Command.Input
              placeholder="Search pages and tools..."
              className="placeholder:text-muted-foreground flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none"
            />
          </div>
          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group heading="Main">
              {topLevelNav.map((item) => (
                <Command.Item
                  key={item.path}
                  value={item.title}
                  onSelect={() => runCommand(item.path)}
                  className="aria-selected:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm"
                >
                  <item.icon className="size-4" />
                  {item.title}
                </Command.Item>
              ))}
            </Command.Group>
            {mainNavGroups.map((group) => (
              <Command.Group key={group.title} heading={group.title}>
                {group.items.map((item) => (
                  <Command.Item
                    key={item.path}
                    value={`${group.title} ${item.title}`}
                    onSelect={() => runCommand(item.path)}
                    className="aria-selected:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm"
                  >
                    <item.icon className="size-4" />
                    {item.title}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
