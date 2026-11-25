// Kova ERP — Button component (Stitch design system)
import { Button } from "nsh/base";
import { radius } from "../design/tokens";

interface StitchButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  children?: any;
  class?: string;
}

const VARIANT_STYLES: Record<string, string> = {
  primary: `bg-primary-container text-on-primary rounded-${radius.md} active:bg-primary`,
  secondary: `bg-secondary-container text-on-secondary-container rounded-${radius.md} active:bg-secondary`,
  outline: `border border-outline-variant text-on-surface rounded-${radius.md} bg-surface-container-lowest active:bg-surface-container`,
  ghost: `text-on-surface-variant rounded-${radius.md} bg-transparent active:bg-surface-container`,
  danger: `bg-error-container text-on-error rounded-${radius.md} active:bg-error`,
} as const;

const SIZE_STYLES: Record<string, string> = {
  sm: `px-xs py-xs text-label-sm`,
  md: `px-md py-sm text-label-md`,
  lg: `px-lg py-md text-label-lg`,
} as const;

export function StitchButton({
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
  onPress,
  children,
  class: className,
}: StitchButtonProps) {
  return (
    <Button
      disabled={disabled}
      onPress={onPress}
      class={[VARIANT_STYLES[variant], SIZE_STYLES[size], fullWidth ? "w-full" : "", className].filter(Boolean).join(" ")}
    >
      {children}
    </Button>
  );
}
