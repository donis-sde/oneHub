import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  emptyMessage?: string
  id?: string
  disabled?: boolean
  className?: string
}

/**
 * Editable combobox: type freely or pick from the dropdown.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select or type...",
  emptyMessage = "No matches",
  id,
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const filtered = React.useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (opt) =>
        opt.value.toLowerCase().includes(q) ||
        opt.label.toLowerCase().includes(q) ||
        (opt.description?.toLowerCase().includes(q) ?? false),
    )
  }, [options, value])

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex gap-1">
        <Input
          id={id}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={disabled}
          aria-label="Toggle options"
          onClick={() => setOpen((prev) => !prev)}
        >
          <ChevronsUpDownIcon className="size-4 opacity-60" />
        </Button>
      </div>

      {open ? (
        <div
          role="listbox"
          className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border p-1 shadow-md"
        >
          {filtered.length === 0 ? (
            <p className="text-muted-foreground px-2 py-1.5 text-sm">{emptyMessage}</p>
          ) : (
            filtered.map((opt) => {
              const selected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "hover:bg-accent hover:text-accent-foreground flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                    selected && "bg-accent/60",
                  )}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      selected ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{opt.label}</span>
                    {opt.description ? (
                      <span className="text-muted-foreground block text-xs">
                        {opt.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}
