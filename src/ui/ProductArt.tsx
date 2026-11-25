import { Text, View } from "nsh";

/**
 * The menu artwork placeholder: a warm tinted panel with the item's emoji.
 * Product photography drops in through `assets/products` without changing
 * the cards' geometry.
 */
export function ProductArt(props: {
  emoji: string;
  tint: string;
  height?: number;
  size?: number;
  dim?: boolean;
  class?: string;
}) {
  return (
    <View
      class={"items-center justify-center rounded " + (props.class ?? "")}
      style={{
        height: props.height ?? 108,
        backgroundColor: props.tint,
      }}
    >
      <Text
        class={props.dim ? "opacity-40" : "opacity-100"}
        style={{ fontSize: props.size ?? 42 }}
      >
        {props.emoji}
      </Text>
    </View>
  );
}
