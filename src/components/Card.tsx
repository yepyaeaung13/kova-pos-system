// Kova ERP — Card component (Stitch design system)
import { View } from "nsh";
import { radius, spacing } from "../design/tokens";

interface StitchCardProps {
  variant?: "elevated" | "action" | "interactive" | "interactive-2";
  padding?: "xs" | "sm" | "md" | "lg";
  class?: string;
  children?: any;
}

const CARD_STYLES: Record<string, string> = {
  elevated: `bg-surface-container-lowest border border-outline-variant rounded-${radius.md}`,
  action: `bg-surface-container-lowest border-2 border-primary-container rounded-${radius.md}`,
  interactive: `bg-surface-container-lowest border border-outline-variant rounded-${radius.md} hover:bg-surface-container transition-colors duration-100 ease-out`,
  "interactive-2": `bg-surface-container-low border border-outline-variant rounded-${radius.md} hover:bg-surface-container-high transition-colors duration-100 ease-out`,
} as const;

const PADDING_STYLES: Record<string, string> = {
  xs: `p-xs`,
  sm: `p-sm`,
  md: `p-md`,
  lg: `p-lg`,
} as const;

export function StitchCard({
  variant = "elevated",
  padding = "md",
  class: className,
  children,
}: StitchCardProps) {
  return (
    <View class={[CARD_STYLES[variant], PADDING_STYLES[padding], className].filter(Boolean).join(" ")}>
      {children}
    </View>
  );
}
