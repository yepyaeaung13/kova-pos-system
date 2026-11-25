// Kova ERP — Chip component (Stitch design system)
import { View } from "nsh";
import { radius, spacing } from "../design/tokens";

interface StitchChipProps {
  variant?: "filter" | "status" | "input" | "action";
  status?: "new" | "preparing" | "ready" | "completed" | "warning" | "error";
  pressed?: boolean;
  onPress?: () => void;
  children?: any;
  class?: string;
}

const CHIP_BASE = `inline-flex items-center gap-xs rounded-full px-md py-xs text-label-md`;

const VARIANT_STYLES: Record<string, string> = {
  filter: `bg-surface-container-lowest border border-outline-variant text-on-surface active:bg-on-surface active:text-surface-container-lowest`,
  status: `bg-surface-container-lowest border border-outline-variant text-on-surface`,
  input: `bg-surface-container-lowest border border-outline-variant text-on-surface`,
  action: `bg-surface-container-lowest border border-outline-variant text-on-surface active:bg-surface-container`,
} as const;

const STATUS_COLORS: Record<string, string> = {
  new: `bg-secondary-container text-on-secondary-container`,
  preparing: `bg-tertiary-container text-on-tertiary-container`,
  ready: `bg-secondary-container text-on-secondary-container`,
  completed: `bg-secondary-container text-on-secondary-container`,
  warning: `bg-amber-container text-on-amber-container`,
  error: `bg-error-container text-on-error-container`,
} as const;

export function StitchChip({
  variant = "filter",
  status,
  pressed = false,
  onPress,
  children,
  class: className,
}: StitchChipProps) {
  const statusClass = status ? STATUS_COLORS[status] : "";
  return (
    <View
      onPress={onPress}
      class={[CHIP_BASE, VARIANT_STYLES[variant], statusClass, pressed ? "bg-on-surface text-surface-container-lowest" : "", className].filter(Boolean).join(" ")}
    >
      {children}
    </View>
  );
}
