// Kova ERP — Stitch Design System Tokens
// Source: docs/stitch_cross_platform_pos_system_design.zip / kova_pos_design_system.md
// These are the canonical design tokens for the desktop app.

// ── Colors ──────────────────────────────────────────────────────────────
export const colors = {
  // Primary — Terracotta Rust
  primary: "#932C10",
  "on-primary": "#FFFFFF",
  "primary-container": "#B44326",
  "on-primary-container": "#FFE2DB",

  // Secondary — Olive Green
  secondary: "#3F5E27",
  "on-secondary": "#FFFFFF",
  "secondary-container": "#EAF3E4",
  "on-secondary-container": "#2A4417",

  // Tertiary — Slate Blue
  tertiary: "#2F5372",
  "on-tertiary": "#FFFFFF",
  "tertiary-container": "#EAF1F7",
  "on-tertiary-container": "#16334B",

  // Error
  error: "#BA1A1A",
  "on-error": "#FFFFFF",
  "error-container": "#FCECEB",
  "on-error-container": "#7A1010",

  // Amber
  amber: "#7E5700",
  "on-amber": "#FFFFFF",
  "amber-container": "#FBF3E0",
  "on-amber-container": "#4A3200",

  // Plum
  plum: "#75376A",
  "on-plum": "#FFFFFF",
  "plum-container": "#F5ECF3",
  "on-plum-container": "#471D40",

  // Surfaces — Quiet Paper
  background: "#FAF9F6",
  "on-background": "#1F1B16",
  surface: "#FAF9F6",
  "surface-dim": "#E5E2DA",
  "surface-bright": "#FFFFFF",
  "surface-container-lowest": "#FFFFFF",
  "surface-container-low": "#F5F3EE",
  "surface-container": "#EFEDE7",
  "surface-container-high": "#E8E5DE",
  "surface-container-highest": "#E0DDD5",
  "on-surface": "#1F1B16",
  "surface-variant": "#F7EDE9",
  "on-surface-variant": "#58423C",

  // Outlines
  outline: "#6B5752",
  "outline-variant": "#E0DDD5",

  // Inverse
  "inverse-surface": "#2C2824",
  "inverse-on-surface": "#FAF9F6",
  "inverse-primary": "#FFB4A2",
} as const;

// ── Spacing ─────────────────────────────────────────────────────────────
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
} as const;

// ── Border radius ───────────────────────────────────────────────────────
export const radius = {
  sm: "6px",
  DEFAULT: "10px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  full: "9999px",
} as const;

// ── Typography tokens ───────────────────────────────────────────────────
export const typography = {
  // Fraunces — display / headline
  "display-lg": { fontSize: "36px", lineHeight: "42px", letterSpacing: "-0.5px", fontWeight: "600" as const, fontFamily: "Fraunces" as const },
  "headline-lg": { fontSize: "26px", lineHeight: "32px", letterSpacing: "-0.25px", fontWeight: "600" as const, fontFamily: "Fraunces" as const },
  "headline-md": { fontSize: "20px", lineHeight: "26px", letterSpacing: "-0.15px", fontWeight: "600" as const, fontFamily: "Fraunces" as const },
  // Work Sans — title / body / label
  "title-lg": { fontSize: "18px", lineHeight: "24px", letterSpacing: "0px", fontWeight: "600" as const, fontFamily: "Work Sans" as const },
  "title-md": { fontSize: "15px", lineHeight: "20px", letterSpacing: "0px", fontWeight: "600" as const, fontFamily: "Work Sans" as const },
  "body-md": { fontSize: "14px", lineHeight: "20px", letterSpacing: "0px", fontWeight: "400" as const, fontFamily: "Work Sans" as const },
  "body-sm": { fontSize: "12px", lineHeight: "16px", letterSpacing: "0.1px", fontWeight: "400" as const, fontFamily: "Work Sans" as const },
  "label-lg": { fontSize: "14px", lineHeight: "20px", letterSpacing: "0.1px", fontWeight: "600" as const, fontFamily: "Work Sans" as const },
  "label-md": { fontSize: "12px", lineHeight: "16px", letterSpacing: "0.2px", fontWeight: "500" as const, fontFamily: "Work Sans" as const },
  "label-sm": { fontSize: "12px", lineHeight: "14px", letterSpacing: "0.3px", fontWeight: "600" as const, fontFamily: "Work Sans" as const },
} as const;

// ── Helper: convert a color token to a Tailwind arbitrary-value class ───
export function colorClass(token: keyof typeof colors, prefix: "bg" | "text" | "border"): string {
  return `${prefix}-[${colors[token]}]`;
}

// ── Helper: typography class string ─────────────────────────────────────
export function typeClass(token: keyof typeof typography): string {
  const t = typography[token];
  return [
    `text-[${t.fontSize}]`,
    `leading-[${t.lineHeight}]`,
    `tracking-[${t.letterSpacing}]`,
    `font-${t.fontWeight}`,
    `font-[${t.fontFamily}]`,
  ].join(" ");
}
