import { Text, View } from "nsh";
import { Icon } from "./Icon";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "soft"
  | "danger"
  | "dark";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-primary border border-primary text-on-primary hover:bg-primary-container active:bg-[#7C2410]",
  secondary:
    "bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low active:bg-surface-container",
  ghost:
    "bg-transparent border border-transparent text-on-surface-variant hover:bg-surface-container active:bg-surface-container-high",
  soft: "bg-primary/8 border border-primary/15 text-primary hover:bg-primary/12 active:bg-primary/18",
  danger:
    "bg-error-container border border-error/20 text-on-error-container hover:bg-[#F8DDDB] active:bg-[#F5CFCC]",
  dark: "bg-inverse-surface border border-inverse-surface text-inverse-on-surface hover:bg-[#3A3530] active:bg-[#221F1C]",
};

const sizeClass = {
  sm: "h-8 px-3 gap-1.5 rounded-sm",
  md: "h-10 px-4 gap-2 rounded",
  lg: "h-11 px-5 gap-2 rounded",
} as const;

const labelSize = {
  sm: "text-label-md",
  md: "text-label-lg",
  lg: "text-label-lg",
} as const;

export function Button(props: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: string;
  iconRight?: string;
  class?: string;
  disabled?: boolean;
  grow?: boolean;
  a11yLabel?: string;
}) {
  const variant = props.variant ?? "secondary";
  const size = props.size ?? "md";
  return (
    <View
      role="button"
      onPress={props.onPress}
      disabled={props.disabled}
      accessibilityLabel={props.a11yLabel}
      class={
        "flex-row items-center justify-center whitespace-nowrap font-label disabled:opacity-40 " +
        sizeClass[size] +
        " " +
        variantClass[variant] +
        (props.grow ? " flex-1" : "") +
        (props.class ? " " + props.class : "")
      }
    >
      <If when={props.icon}>
        {(name) => <Icon name={name()} size={size === "sm" ? 16 : 18} />}
      </If>
      <Text class={"font-label font-semibold " + labelSize[size]}>{props.label}</Text>
      <If when={props.iconRight}>
        {(name) => <Icon name={name()} size={size === "sm" ? 16 : 18} />}
      </If>
    </View>
  );
}

export function IconButton(props: {
  icon: string;
  onPress?: () => void;
  size?: number;
  variant?: ButtonVariant;
  class?: string;
  disabled?: boolean;
  label?: string;
}) {
  const variant = props.variant ?? "secondary";
  const box = props.size ?? 40;
  return (
    <View
      role="button"
      onPress={props.onPress}
      disabled={props.disabled}
      accessibilityLabel={props.label}
      class={
        "items-center justify-center rounded disabled:opacity-40 " +
        variantClass[variant] +
        (props.class ? " " + props.class : "")
      }
      style={{ width: box, height: box }}
    >
      <Icon name={props.icon} size={Math.round(box * 0.5)} />
    </View>
  );
}
