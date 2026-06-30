import { cn } from "@/lib/utils"

/**
 * ShipFlow wordmark + mark. The mark is a small pipeline glyph (two nodes on a
 * rail) drawn in the inverted surface color — neutral, no accent, no emoji.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-foreground">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="text-background"
        >
          <path
            d="M3.5 8H12.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <rect x="1.6" y="6.1" width="3.8" height="3.8" rx="1" fill="currentColor" />
          <rect x="10.6" y="6.1" width="3.8" height="3.8" rx="1" fill="currentColor" />
        </svg>
      </span>
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          ShipFlow{" "}
          <span className="font-mono text-[13px] font-normal text-muted-foreground">
            AI
          </span>
        </span>
      ) : null}
    </span>
  )
}
