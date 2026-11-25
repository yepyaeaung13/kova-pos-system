/**
 * Kova design tokens — the "Quiet Paper" system.
 *
 * Every value here mirrors a Tailwind color declared in `nsh.json`, so class
 * names (`bg-surface-container-low`, `text-on-surface-variant`, …) and canvas
 * drawings stay in sync. Canvas cannot read classes, hence this map.
 */
export const palette = {
  primary: "#932C10",
  onPrimary: "#FFFFFF",
  primaryContainer: "#B44326",
  onPrimaryContainer: "#FFE2DB",

  secondary: "#3F5E27",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#EAF3E4",
  onSecondaryContainer: "#2A4417",

  tertiary: "#2F5372",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#EAF1F7",
  onTertiaryContainer: "#16334B",

  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#FCECEB",
  onErrorContainer: "#7A1010",

  amber: "#7E5700",
  amberContainer: "#FBF3E0",
  onAmberContainer: "#4A3200",

  plum: "#75376A",
  onPlum: "#FFFFFF",
  plumContainer: "#F5ECF3",
  onPlumContainer: "#471D40",

  background: "#FAF9F6",
  onBackground: "#1F1B16",

  surface: "#FAF9F6",
  surfaceDim: "#E5E2DA",
  surfaceBright: "#FFFFFF",
  surfaceLowest: "#FFFFFF",
  surfaceLow: "#F5F3EE",
  surfaceContainer: "#EFEDE7",
  surfaceHigh: "#E8E5DE",
  surfaceHighest: "#E0DDD5",
  onSurface: "#1F1B16",
  surfaceVariant: "#F7EDE9",
  onSurfaceVariant: "#58423C",

  outline: "#6B5752",
  outlineVariant: "#E0DDD5",
  inverseSurface: "#2C2824",
  inverseOnSurface: "#FAF9F6",
  inversePrimary: "#FFB4A2",
} as const;

/** The chart ramp, in the order the design uses it. */
export const chartColors = [
  palette.primaryContainer,
  palette.secondary,
  palette.tertiary,
  palette.amber,
  palette.plum,
] as const;

export const radius = {
  sm: 6,
  base: 10,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/**
 * The design's spacing names, in points. The reference screens write
 * `p-lg`, `gap-xl`; NSH's spacing step is 4pt, so these are the class
 * numbers to translate them to: `p-lg` → `p-4`, `gap-xl` → `gap-6`.
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
} as const;
