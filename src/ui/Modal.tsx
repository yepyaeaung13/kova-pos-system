import { View, type JSX } from "nsh";

/** A dimmed, centered panel over the current screen. */
export function Modal(props: {
  onClose: () => void;
  width?: number;
  height?: number | `${number}%`;
  children?: JSX.Element;
}) {
  return (
    <View
      class="items-center justify-center"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <View
        role="button"
        accessibilityLabel="Close"
        onPress={props.onClose}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#1F1B1673",
        }}
      />
      <View
        class="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest"
        style={{ width: props.width ?? 520, height: props.height ?? "86%" }}
      >
        {props.children}
      </View>
    </View>
  );
}
