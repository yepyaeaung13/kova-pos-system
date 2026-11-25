import { Text, View } from "nsh";

export type Tone = "neutral" | "success" | "info" | "warn" | "plum" | "error";

const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-container text-on-surface-variant border-outline-variant",
  success:
    "bg-secondary-container text-on-secondary-container border-secondary/15",
  info: "bg-tertiary-container text-on-tertiary-container border-tertiary/15",
  warn: "bg-amber-container text-on-amber-container border-amber/15",
  plum: "bg-plum-container text-on-plum-container border-plum/15",
  error: "bg-error-container text-on-error-container border-error/15",
};

const dotClass: Record<Tone, string> = {
  neutral: "bg-outline",
  success: "bg-secondary",
  info: "bg-tertiary",
  warn: "bg-amber",
  plum: "bg-plum",
  error: "bg-error",
};

/** A small status label with a leading dot — `New`, `Preparing`, `Overdue`. */
export function StatusPill(props: { label: string; tone?: Tone; class?: string }) {
  const tone = props.tone ?? "neutral";
  return (
    <View
      class={
        "flex-row items-center gap-1.5 rounded-full border px-2 py-0.5 " +
        toneClass[tone] +
        (props.class ? " " + props.class : "")
      }
    >
      <View class={"h-1.5 w-1.5 rounded-full " + dotClass[tone]} />
      <Text class="font-label text-label-sm">{props.label}</Text>
    </View>
  );
}

/** A count or label badge without a dot. */
export function Badge(props: {
  label: string;
  tone?: Tone;
  class?: string;
  strong?: boolean;
}) {
  const tone = props.tone ?? "neutral";
  return (
    <View
      class={
        "items-center justify-center rounded-full px-1.5 py-0.5 " +
        toneClass[tone] +
        (props.strong ? " border" : " border border-transparent") +
        (props.class ? " " + props.class : "")
      }
    >
      <Text class="font-label text-label-sm tabular-nums">{props.label}</Text>
    </View>
  );
}

/** A filter chip; the selected one is inked instead of outlined. */
export function Chip(props: {
  label: string;
  count?: number;
  selected?: boolean;
  onPress?: () => void;
  class?: string;
  a11yLabel?: string;
}) {
  return (
    <View
      role="button"
      onPress={props.onPress}
      accessibilityLabel={props.a11yLabel}
      accessibilityState={{ selected: props.selected }}
      class={
        "flex-row items-center gap-2 rounded-full px-3 py-2 font-label text-label-md " +
        (props.selected
          ? "bg-on-surface text-surface-container-lowest"
          : "bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container") +
        (props.class ? " " + props.class : "")
      }
    >
      <Text
        class={
          "font-label text-label-md " +
          (props.selected ? "text-surface-container-lowest" : "text-on-surface")
        }
      >
        {props.label}
      </Text>
      <If when={props.count !== undefined}>
        <View
          class={
            "rounded-full px-1.5 " +
            (props.selected
              ? "bg-inverse-surface text-inverse-on-surface"
              : "text-outline")
          }
        >
          <Text class="font-label text-label-sm tabular-nums">{props.count ?? 0}</Text>
        </View>
      </If>
    </View>
  );
}
