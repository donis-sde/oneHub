import * as React from "react"

export interface ThemeCustomization {
  primaryColor: string
  accentColor: string
  sidebarColor: string
  fontFamily: string
  borderRadius: string
}

export type ThemeMode = "light" | "dark"

type ModeOverrides = {
  light: Partial<ThemeCustomization>
  dark: Partial<ThemeCustomization>
}

const STORAGE_KEY = "onehub-theme-customization-v2"
const LEGACY_KEYS = ["onehub-theme-customization"]
const STYLE_EL_ID = "onehub-custom-theme"

// CSS variables that customization is allowed to override.
const CSS_VAR_MAP: Record<keyof ThemeCustomization, string> = {
  primaryColor: "--primary",
  accentColor: "--accent",
  sidebarColor: "--sidebar",
  fontFamily: "--font-sans",
  borderRadius: "--radius",
}

// Display-only defaults (never force-applied to the DOM).
export const defaultCustomization: Record<ThemeMode, ThemeCustomization> = {
  light: {
    primaryColor: "oklch(0.52 0.14 162)",
    accentColor: "oklch(0.93 0.04 170)",
    sidebarColor: "oklch(0.975 0.008 195)",
    fontFamily: "'Outfit Variable', sans-serif",
    borderRadius: "0.75rem",
  },
  dark: {
    primaryColor: "oklch(0.72 0.16 162)",
    accentColor: "oklch(0.28 0.04 200)",
    sidebarColor: "oklch(0.12 0.03 240)",
    fontFamily: "'Outfit Variable', sans-serif",
    borderRadius: "0.75rem",
  },
}

interface ThemeCustomizationContextValue {
  mode: ThemeMode
  customization: ThemeCustomization
  overrides: Partial<ThemeCustomization>
  updateCustomization: (patch: Partial<ThemeCustomization>) => void
  resetCustomization: () => void
}

const ThemeCustomizationContext =
  React.createContext<ThemeCustomizationContextValue | undefined>(undefined)

function getResolvedMode(): ThemeMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

// Remove any inline CSS variables that older versions may have left stuck on
// the root element (these override class-based themes and break dark mode).
function clearStuckInlineVars() {
  const root = document.documentElement
  Object.values(CSS_VAR_MAP).forEach((cssVar) => root.style.removeProperty(cssVar))
}

function buildCssRules(all: ModeOverrides): string {
  const rule = (selector: string, overrides: Partial<ThemeCustomization>) => {
    const decls = (Object.keys(CSS_VAR_MAP) as (keyof ThemeCustomization)[])
      .filter((key) => overrides[key])
      .map((key) => `  ${CSS_VAR_MAP[key]}: ${overrides[key]};`)
      .join("\n")
    return decls ? `${selector} {\n${decls}\n}` : ""
  }

  return [rule(":root.light", all.light), rule(":root.dark", all.dark)]
    .filter(Boolean)
    .join("\n\n")
}

function applyOverrideStyles(all: ModeOverrides) {
  let styleEl = document.getElementById(STYLE_EL_ID) as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement("style")
    styleEl.id = STYLE_EL_ID
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = buildCssRules(all)
}

function loadOverrides(): ModeOverrides {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ModeOverrides>
      return { light: parsed.light ?? {}, dark: parsed.dark ?? {} }
    }
  } catch {
    // ignore malformed storage
  }
  return { light: {}, dark: {} }
}

export function ThemeCustomizationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [allOverrides, setAllOverrides] = React.useState<ModeOverrides>(loadOverrides)
  const [mode, setMode] = React.useState<ThemeMode>(() =>
    typeof document !== "undefined" ? getResolvedMode() : "light",
  )

  // One-time cleanup of stuck inline vars + legacy storage.
  React.useEffect(() => {
    clearStuckInlineVars()
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key))
  }, [])

  // Track resolved light/dark mode by observing the root class list.
  React.useEffect(() => {
    const observer = new MutationObserver(() => setMode(getResolvedMode()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    setMode(getResolvedMode())
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    applyOverrideStyles(allOverrides)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allOverrides))
  }, [allOverrides])

  const updateCustomization = React.useCallback(
    (patch: Partial<ThemeCustomization>) => {
      setAllOverrides((prev) => ({ ...prev, [mode]: { ...prev[mode], ...patch } }))
    },
    [mode],
  )

  const resetCustomization = React.useCallback(() => {
    setAllOverrides((prev) => ({ ...prev, [mode]: {} }))
  }, [mode])

  const customization = React.useMemo(
    () => ({ ...defaultCustomization[mode], ...allOverrides[mode] }),
    [allOverrides, mode],
  )

  const value = React.useMemo(
    () => ({
      mode,
      customization,
      overrides: allOverrides[mode],
      updateCustomization,
      resetCustomization,
    }),
    [mode, customization, allOverrides, updateCustomization, resetCustomization],
  )

  return (
    <ThemeCustomizationContext.Provider value={value}>
      {children}
    </ThemeCustomizationContext.Provider>
  )
}

export function useThemeCustomization() {
  const context = React.useContext(ThemeCustomizationContext)
  if (!context) {
    throw new Error("useThemeCustomization must be used within ThemeCustomizationProvider")
  }
  return context
}
