import { Text, View, type JSX, type ViewStyle } from "nsh";
import { Icon } from "./Icon";

/** A paper card on the workspace. */
export function Card(props: {
  children?: JSX.Element;
  class?: string;
  style?: ViewStyle;
  onPress?: () => void;
  interactive?: boolean;
}) {
  const base =
    "bg-surface-container-lowest border border-outline-variant rounded-md" +
    (props.interactive
      ? " hover:border-outline active:bg-surface-container-low"
      : "");
  return (
    <View
      onPress={props.onPress}
      role={props.onPress ? "button" : undefined}
      class={base + (props.class ? " " + props.class : "")}
      style={props.style}
    >
      {props.children}
    </View>
  );
}

/** Fraunces title at the top of a screen, with optional actions on the right. */
export function PageHeader(props: {
  title: string;
  subtitle?: string;
  children?: JSX.Element;
  class?: string;
}) {
  return (
    <View class={"flex-row items-end justify-between gap-4 " + (props.class ?? "")}>
      <View class="gap-1 min-w-0">
        <Text class="font-headline text-headline-lg text-on-surface tracking-headline">
          {props.title}
        </Text>
        <If when={props.subtitle}>
          {(text) => (
            <Text class="font-body text-body-md text-on-surface-variant">
              {text()}
            </Text>
          )}
        </If>
      </View>
      <View class="flex-row items-center gap-2 shrink-0">{props.children}</View>
    </View>
  );
}

/** A small uppercase label above a group of content. */
export function Eyebrow(props: {label: string; class?: string }) {
  return (
    <Text
      class={
        "font-label text-label-sm uppercase tracking-label text-outline " +
        (props.class ?? "")
      }
    >
      {props.label}
    </Text>
  );
}

/** A card header: title on the left, an action or filter on the right. */
export function CardHeader(props: {
  title: string;
  hint?: string;
  children?: JSX.Element;
  class?: string;
}) {
  return (
    <View
      class={
        "flex-row items-center justify-between gap-3 " + (props.class ?? "")
      }
    >
      <View class="gap-0.5 min-w-0">
        <Text class="font-title text-title-md text-on-surface">{props.title}</Text>
        <If when={props.hint}>
          {(text) => (
            <Text class="font-body text-body-sm text-outline">{text()}</Text>
          )}
        </If>
      </View>
      <View class="flex-row items-center gap-2">{props.children}</View>
    </View>
  );
}

/** A label / value line, for detail cards. */
export function InfoRow(props: {
  label: string;
  value: string;
  strong?: boolean;
  class?: string;
}) {
  return (
    <View
      class={
        "flex-row items-center justify-between gap-3 " + (props.class ?? "")
      }
    >
      <Text class="font-body text-body-md text-on-surface-variant">
        {props.label}
      </Text>
      <Text
        class={
          "font-label tabular-nums " +
          (props.strong
            ? "text-title-md font-semibold text-on-surface"
            : "text-body-md text-on-surface")
        }
      >
        {props.value}
      </Text>
    </View>
  );
}

/** A KPI tile: label, big number, and a delta with an arrow. */
export function StatTile(props: {
  label: string;
  value: string;
  hint?: string;
  delta?: string;
  positive?: boolean;
  icon?: string;
  tone?: "neutral" | "success" | "info" | "warn" | "plum";
  class?: string;
}) {
  const iconBg = {
    neutral: "bg-surface-container text-on-surface-variant",
    success: "bg-secondary-container text-on-secondary-container",
    info: "bg-tertiary-container text-on-tertiary-container",
    warn: "bg-amber-container text-on-amber-container",
    plum: "bg-plum-container text-on-plum-container",
  }[props.tone ?? "neutral"];
  return (
    <View
      class={
        "flex-1 gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4 " +
        (props.class ?? "")
      }
    >
      <View class="flex-row items-center justify-between">
        <Text class="font-label text-label-md uppercase tracking-label text-outline">
          {props.label}
        </Text>
        <If when={props.icon}>
          <View class={"h-8 w-8 items-center justify-center rounded-sm " + iconBg}>
            <If when={props.icon}>{(name) => <Icon name={name()} size={17} />}</If>
          </View>
        </If>
      </View>
      <Text class="font-headline text-headline-lg text-on-surface tabular-nums tracking-headline">
        {props.value}
      </Text>
      <View class="flex-row items-center gap-2">
        <If when={props.delta}>
          {(text) => (
            <View
              class={
                "flex-row items-center gap-0.5 rounded-full px-1.5 py-0.5 " +
                (props.positive
                  ? "bg-secondary-container text-on-secondary-container"
                  : "bg-error-container text-on-error-container")
              }
            >
              <Icon
                name={props.positive ? "trending_up" : "trending_down"}
                size={13}
              />
              <Text class="font-label text-label-sm tabular-nums">{text()}</Text>
            </View>
          )}
        </If>
        <If when={props.hint}>
          {(text) => (
            <Text class="font-body text-body-sm text-outline">{text()}</Text>
          )}
        </If>
      </View>
    </View>
  );
}
