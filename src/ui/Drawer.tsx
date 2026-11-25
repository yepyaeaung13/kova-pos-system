import { Text, View, type JSX } from "nsh";
import { Icon } from "./Icon";

/** A right-hand drawer over the current screen. */
export function Drawer(props: {
  onClose: () => void;
  width?: number;
  title: string;
  subtitle?: string;
  children?: JSX.Element;
}) {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <View
        role="button"
        accessibilityLabel="Close drawer"
        onPress={props.onClose}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#1F1B1640",
        }}
      />
      <View
        class="flex-col border-l border-outline-variant bg-surface-container-lowest"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: props.width ?? 460,
        }}
      >
        <View class="flex-row items-start justify-between gap-3 border-b border-outline-variant p-4">
          <View class="flex-1 gap-0.5 min-w-0">
            <Text class="font-headline text-headline-md text-on-surface truncate">
              {props.title}
            </Text>
            <If when={props.subtitle}>
              {(text) => (
                <Text class="font-body text-body-sm text-outline">{text()}</Text>
              )}
            </If>
          </View>
          <View
            role="button"
            accessibilityLabel="Close drawer"
            onPress={props.onClose}
            class="h-8 w-8 items-center justify-center rounded-sm border border-outline-variant"
          >
            <Icon name="close" size={16} />
          </View>
        </View>
        {props.children}
      </View>
    </View>
  );
}
