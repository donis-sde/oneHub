import { cn } from "@/lib/utils"

export function WatiLogo({
  className,
  size = 32,
}: {
  className?: string
  size?: number
}) {
  return (
    <img
      src="/wati-logo.png"
      alt="WATI"
      width={size}
      height={size}
      className={cn("object-contain", className)}
    />
  )
}
