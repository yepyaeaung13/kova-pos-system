import { Text, View } from "nsh";

const sizes = { sm: 24, md: 32, lg: 40 } as const;

export function Avatar(props: {
  initials: string;
  size?: "sm" | "md" | "lg";
  tone?: "plum" | "secondary" | "tertiary" | "amber" | "neutral";
  class?: string;
}) {
  const px = sizes[props.size ?? "md"];
  const tone = {
    plum: "bg-plum-container text-on-plum-container",
    secondary: "bg-secondary-container text-on-secondary-container",
    tertiary: "bg-tertiary-container text-on-tertiary-container",
    amber: "bg-amber-container text-on-amber-container",
    neutral: "bg-surface-container text-on-surface-variant",
  }[props.tone ?? "plum"];
  return (
    <View
      class={
        "items-center justify-center rounded-full " +
        tone +
        (props.class ? " " + props.class : "")
      }
      style={{ width: px, height: px }}
    >
      <Text
        class={
          props.size === "sm"
            ? "font-label text-label-sm"
            : "font-label text-label-md"
        }
      >
        {props.initials}
      </Text>
    </View>
  );
}

export function Toggle(props: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <View
      role="switch"
      onPress={() => props.onChange(!props.checked)}
      disabled={props.disabled}
      accessibilityLabel={props.label}
      accessibilityState={{ checked: props.checked }}
      class={
        "h-5 w-9 flex-row items-center rounded-full px-0.5 " +
        (props.checked ? "justify-end bg-primary" : "justify-start bg-surface-container-high") +
        (props.disabled ? " opacity-40" : "")
      }
    >
      <View class="h-4 w-4 rounded-full bg-surface-container-lowest" />
    </View>
  );
}

/** A radio-style choice row used in checkout and settings. */
export function ChoiceRow(props: {
  label: string;
  hint?: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
  class?: string;
}) {
  return (
    <View
      role="button"
      onPress={props.onPress}
      accessibilityState={{ selected: props.selected }}
      class={
        "flex-row items-center gap-3 rounded border px-3 py-2.5 " +
        (props.selected
          ? "border-primary-container bg-surface-variant"
          : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low") +
        (props.class ? " " + props.class : "")
      }
    >
      <View
        class={
          "h-4 w-4 items-center justify-center rounded-full border-2 " +
          (props.selected ? "border-primary" : "border-outline-variant")
        }
      >
        <If when={props.selected}>
          <View class="h-2 w-2 rounded-full bg-primary" />
        </If>
      </View>
      <View class="flex-1 gap-0.5">
        <Text class="font-label text-label-lg text-on-surface">{props.label}</Text>
        <If when={props.hint}>
          {(text) => (
            <Text class="font-body text-body-sm text-outline">{text()}</Text>
          )}
        </If>
      </View>
    </View>
  );
}
