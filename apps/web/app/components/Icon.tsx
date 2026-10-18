import { cn } from "@workspace/ui/lib/utils"

/**
 * Material Symbols ligature names available in the subsetted webfont shipped at
 * `apps/web/app/fonts/MaterialSymbolsOutlined.woff2` (5.4 kB, 35 icons).
 *
 * Keep this list in sync with the font subset — see `app/fonts/README.md` for
 * the regeneration steps. A name that is not in the font renders as its literal
 * text, so mistakes are visible rather than silent.
 */
export const iconNames = [
  "add",
  "arrow_forward",
  "block",
  "bolt",
  "check",
  "check_circle",
  "close",
  "code",
  "content_copy",
  "copy_all",
  "delete_forever",
  "done_all",
  "enhanced_encryption",
  "fingerprint",
  "forum",
  "gpp_maybe",
  "key",
  "lock",
  "manage_search",
  "memory",
  "menu_book",
  "monitor_heart",
  "network_check",
  "open_in_new",
  "play_arrow",
  "rocket_launch",
  "schema",
  "search",
  "send",
  "settings",
  "shield_locked",
  "speed",
  "sync",
  "terminal",
  "trending_flat",
  "tune",
  "unfold_more",
  "verified_user",
  "visibility",
  "visibility_off",
] as const

export type IconName = (typeof iconNames)[number]

type IconProps = {
  name: IconName
  className?: string
}

/**
 * Renders a Material Symbols icon by ligature name. Decorative by default —
 * icons next to a text label are announced twice otherwise.
 */
export function Icon({ name, className }: IconProps) {
  return (
    <span aria-hidden className={cn("material-symbols-outlined", className)}>
      {name}
    </span>
  )
}