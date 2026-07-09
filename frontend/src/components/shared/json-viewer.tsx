import * as React from "react"

import { cn } from "@/lib/utils"

export function JsonViewer({
  data,
  className,
}: {
  data: unknown
  className?: string
}) {
  const formatted = React.useMemo(() => {
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }, [data])

  return (
    <pre
      className={cn(
        "bg-muted/50 max-h-[480px] overflow-auto rounded-lg border p-4 font-mono text-xs leading-relaxed",
        className,
      )}
    >
      {formatted}
    </pre>
  )
}
