import { signal, Text, View } from "nsh";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { managerPin } from "../store";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

/** A four-digit manager PIN gate for sensitive actions. */
export function ApprovalModal(props: {
  title: string;
  detail?: string;
  onClose: () => void;
  onApprove: () => void;
}) {
  const pin = signal("");
  const error = signal("");

  const press = (key: string) => {
    error.set("");
    if (key === "back") {
      pin.update((value) => value.slice(0, -1));
      return;
    }
    if (pin().length >= 4) return;
    pin.update((value) => value + key);
  };

  const submit = () => {
    if (pin().length !== 4) return;
    if (pin() === managerPin()) {
      props.onApprove();
      return;
    }
    pin.set("");
    error.set("Incorrect PIN — try again.");
  };

  return (
    <Modal onClose={props.onClose} width={380} height={470}>
      <View class="gap-1 border-b border-outline-variant p-4">
        <View class="flex-row items-center justify-between">
          <View class="flex-row items-center gap-2">
            <View class="h-8 w-8 items-center justify-center rounded-sm bg-surface-container">
              <Icon name="lock" size={16} />
            </View>
            <View class="gap-0">
              <Text class="font-title text-title-md text-on-surface">{props.title}</Text>
              <Text class="font-body text-body-sm text-outline">Manager approval</Text>
            </View>
          </View>
          <View
            role="button"
            accessibilityLabel="Close approval"
            onPress={props.onClose}
            class="h-8 w-8 items-center justify-center rounded-sm border border-outline-variant"
          >
            <Icon name="close" size={16} />
          </View>
        </View>
      </View>

      <View class="flex-1 items-center justify-center gap-4 p-4">
        <If when={props.detail}>
          {(text) => (
            <Text class="text-center font-body text-body-sm text-on-surface-variant">
              {text()}
            </Text>
          )}
        </If>

        <View class="flex-row gap-2.5">
          {[0, 1, 2, 3].map((index) => (
            <View
              class={
                "h-11 w-10 items-center justify-center rounded border-2 " +
                (pin().length > index
                  ? "border-primary-container bg-surface-variant"
                  : "border-outline-variant bg-surface-container-lowest")
              }
            >
              <If when={pin().length > index}>
                <View class="h-2.5 w-2.5 rounded-full bg-on-surface" />
              </If>
            </View>
          ))}
        </View>

        <If when={error() !== ""}>
          <Text class="font-body text-body-sm text-error">{error()}</Text>
        </If>

        <View class="gap-1.5" style={{ width: 240 }}>
          {[0, 1, 2, 3].map((row) => (
            <View class="flex-row gap-1.5">
              {keys.slice(row * 3, row * 3 + 3).map((key) => (
                <View
                  role={key === "" ? undefined : "button"}
                  accessibilityLabel={key === "" ? undefined : "PIN " + key}
                  onPress={() => press(key)}
                  class="h-10 flex-1 items-center justify-center rounded border border-outline-variant bg-surface-container-low hover:bg-surface-container"
                >
                  <If
                    when={key === "back"}
                    else={
                      <Text class="font-title text-title-md tabular-nums text-on-surface">
                        {key}
                      </Text>
                    }
                  >
                    <Icon name="backspace" size={16} />
                  </If>
                </View>
              ))}
            </View>
          ))}
        </View>

        <Text class="font-body text-body-sm text-outline">
          Demo PIN: {managerPin()}
        </Text>
      </View>

      <View class="flex-row items-center gap-2 border-t border-outline-variant p-4">
        <Button label="Cancel" grow onPress={props.onClose} />
        <Button
          label="Approve"
          icon="check"
          variant="primary"
          grow
          disabled={pin().length !== 4}
          onPress={submit}
        />
      </View>
    </Modal>
  );
}
