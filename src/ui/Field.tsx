import { Text, View, type JSX } from "nsh";
import { Input } from "nsh/base";
import { Icon } from "./Icon";

/** The search field of the workspace header. */
export function SearchField(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  class?: string;
  onScan?: () => void;
}) {
  return (
    <View
      class={
        "flex-1 flex-row items-center gap-2 rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 " +
        (props.class ?? "")
      }
    >
      <Icon name="search" size={20} color="#6B5752" />
      <Input
        value={props.value}
        onChange={(e) => props.onChange(e.value)}
        placeholder={props.placeholder ?? "Search menu or scan a barcode..."}
        accessibilityLabel={props.placeholder ?? "Search"}
        class="flex-1 font-body text-body-md text-on-surface"
        style={{ padding: 0 }}
      />
      <If when={props.onScan}>
        <View
          role="button"
          onPress={props.onScan}
          accessibilityLabel="Scan barcode"
          class="rounded-sm p-0.5 hover:bg-surface-container active:bg-surface-container-high"
        >
          <Icon name="qr_code_scanner" size={20} color="#6B5752" />
        </View>
      </If>
    </View>
  );
}

/** A labelled field frame for forms. */
export function Field(props: {
  label: string;
  hint?: string;
  children?: JSX.Element;
  class?: string;
}) {
  return (
    <View class={"gap-1.5 " + (props.class ?? "")}>
      <Text class="font-label text-label-md text-on-surface-variant">
        {props.label}
      </Text>
      {props.children}
      <If when={props.hint}>
        {(text) => (
          <Text class="font-body text-body-sm text-outline">{text()}</Text>
        )}
      </If>
    </View>
  );
}

/** A boxed text field. */
export function TextBox(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: string;
  masked?: boolean;
  class?: string;
}) {
  return (
    <View
      class={
        "flex-row items-center gap-2 rounded border border-outline-variant bg-surface-container-lowest px-3 py-2.5 " +
        (props.class ?? "")
      }
    >
      <If when={props.icon}>
        {(name) => <Icon name={name()} size={18} color="#6B5752" />}
      </If>
      <Input
        value={props.value}
        onChange={(e) => props.onChange(e.value)}
        placeholder={props.placeholder}
        masked={props.masked}
        accessibilityLabel={props.placeholder}
        class="flex-1 font-body text-body-md text-on-surface"
        style={{ padding: 0 }}
      />
    </View>
  );
}

/** A two-or-more way segmented switch, e.g. Dine-in / Takeaway / Delivery. */
export function Segmented<T extends string>(props: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  class?: string;
}) {
  return (
    <View
      class={
        "flex-row gap-1 rounded-sm bg-surface-container p-1 " +
        (props.class ?? "")
      }
    >
      <Each of={props.options}>
        {(option) => (
          <View
            role="button"
            onPress={() => props.onChange(option())}
            class={
              "flex-1 items-center justify-center rounded-sm px-3 py-1.5 " +
              (props.value === option()
                ? "bg-surface-container-lowest"
                : "hover:bg-surface-container-high")
            }
          >
            <Text
              class={
                "font-label text-label-md " +
                (props.value === option() ? "text-on-surface" : "text-on-surface-variant")
              }
            >
              {option()}
            </Text>
          </View>
        )}
      </Each>
    </View>
  );
}
