import { Loader2Icon } from "lucide-react"

export function PageLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3">
      <Loader2Icon className="text-primary size-8 animate-spin" aria-hidden />
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  )
}
