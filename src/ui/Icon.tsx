import { Text, type TextStyle } from "nsh";
import { ICON_FONT } from "../fonts";

/**
 * A Material Symbols glyph. The font is a ligature font: the text is the
 * icon's name and the shaping engine swaps it for one glyph.
 */
export function Icon(props: {
  name: string;
  size?: number;
  color?: string;
  class?: string;
}) {
  const size = props.size ?? 20;
  const style: TextStyle = {
    fontFamily: ICON_FONT,
    fontSize: size,
    lineHeight: size,
  };
  if (props.color) style.color = props.color;
  return (
    <Text class={props.class} style={style}>
      {props.name}
    </Text>
  );
}
