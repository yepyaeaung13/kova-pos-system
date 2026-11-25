import { Text, View, type JSX } from "nsh";

/** The frame of a table: header row plus scrolling body. */
export function TableWrap(props: { children?: JSX.Element; class?: string }) {
  return (
    <View
      class={
        "overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest " +
        (props.class ?? "")
      }
    >
      {props.children}
    </View>
  );
}

export function Head(props: { children?: JSX.Element; class?: string }) {
  return (
    <View
      class={
        "flex-row items-center gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-2.5 " +
        (props.class ?? "")
      }
    >
      {props.children}
    </View>
  );
}

export function HeadCell(props: {
  label: string;
  flex?: number;
  w?: number;
  align?: "left" | "right" | "center";
  class?: string;
}) {
  return (
    <View
      class={
        "justify-center " +
        (props.align === "right"
          ? "items-end"
          : props.align === "center"
            ? "items-center"
            : "items-start") +
        (props.class ? " " + props.class : "")
      }
      style={{ flex: props.flex ?? 1, width: props.w }}
    >
      <Text class="font-label text-label-sm uppercase tracking-label text-outline">
        {props.label}
      </Text>
    </View>
  );
}

export function Row(props: {
  children?: JSX.Element;
  onPress?: () => void;
  selected?: boolean;
  class?: string;
}) {
  return (
    <View
      onPress={props.onPress}
      role={props.onPress ? "button" : undefined}
      class={
        "flex-row items-center gap-3 border-b border-outline-variant/60 px-4 py-2.5 " +
        (props.selected
          ? "bg-surface-variant"
          : props.onPress
            ? "hover:bg-surface-container-low"
            : "") +
        (props.class ? " " + props.class : "")
      }
    >
      {props.children}
    </View>
  );
}

export function Cell(props: {
  children?: JSX.Element;
  flex?: number;
  w?: number;
  align?: "left" | "right" | "center";
  class?: string;
}) {
  return (
    <View
      class={
        "justify-center " +
        (props.align === "right"
          ? "items-end"
          : props.align === "center"
            ? "items-center"
            : "items-start") +
        (props.class ? " " + props.class : "")
      }
      style={{ flex: props.flex ?? 1, width: props.w }}
    >
      {props.children}
    </View>
  );
}

export function TextCell(props: {
  text: string;
  flex?: number;
  w?: number;
  align?: "left" | "right" | "center";
  strong?: boolean;
  muted?: boolean;
  mono?: boolean;
  class?: string;
}) {
  return (
    <Cell flex={props.flex} w={props.w} align={props.align} class={props.class}>
      <Text
        class={
          "tabular-nums " +
          (props.strong
            ? "font-label text-label-lg text-on-surface"
            : props.muted
              ? "font-body text-body-md text-on-surface-variant"
              : "font-body text-body-md text-on-surface")
        }
      >
        {props.text}
      </Text>
    </Cell>
  );
}
