import { Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import { lastInvoice } from "../../store";
import { money } from "../../format";

const receipt = () => lastInvoice();

function Divider() {
  return <View class="h-px w-full bg-outline-variant" />;
}

/** 80mm receipt preview for the last completed invoice. */
export function ReceiptModal(props: { onClose: () => void }) {
  const printed = signal("");

  return (
    <Modal onClose={props.onClose} width={380} height="88%">
      <View class="flex-row items-center justify-between gap-2 border-b border-outline-variant px-4 py-3">
        <View class="gap-0">
          <Text class="font-title text-title-md text-on-surface">Receipt preview</Text>
          <Text class="font-body text-body-sm text-outline">80mm thermal roll</Text>
        </View>
        <View
          role="button"
          accessibilityLabel="Close receipt"
          onPress={props.onClose}
          class="h-8 w-8 items-center justify-center rounded-sm border border-outline-variant"
        >
          <Icon name="close" size={16} />
        </View>
      </View>

      <Scroll class="flex-1" contentClass="p-4">
        <View class="gap-2 rounded-sm border border-outline-variant bg-surface-bright px-4 py-5">
          <View class="items-center gap-1 pb-1">
            <Text class="font-headline text-headline-md text-on-surface">KOVA</Text>
            <Text class="font-body text-body-sm text-on-surface-variant">
              Gulberg Café · Lahore
            </Text>
            <Text class="font-body text-body-sm text-outline tabular-nums">
              NTN 7712345-6
            </Text>
          </View>

          <Divider />

          <View class="gap-0.5">
            <View class="flex-row justify-between">
              <Text class="font-label text-label-md tabular-nums text-on-surface">
                {receipt().number}
              </Text>
              <Text class="font-body text-body-sm tabular-nums text-outline">
                {receipt().issued.split(" · ")[1] ?? ""}
              </Text>
            </View>
            <Text class="font-body text-body-sm text-on-surface-variant">
              {receipt().issued.split(" · ")[0]} · {receipt().channel} · {receipt().table}
            </Text>
            <Text class="font-body text-body-sm text-outline">
              Cashier {receipt().cashier}
            </Text>
          </View>

          <Divider />

          <View class="gap-1">
            <Each of={receipt().lines}>
              {(line) => (
                <View class="gap-0">
                  <View class="flex-row justify-between gap-2">
                    <Text class="flex-1 font-label text-label-md text-on-surface">
                      {line().qty} × {line().name}
                    </Text>
                    <Text class="font-label text-label-md tabular-nums text-on-surface">
                      {money(line().price * line().qty)}
                    </Text>
                  </View>
                  <If when={line().note !== ""}>
                    <Text class="font-body text-body-sm text-outline">{line().note}</Text>
                  </If>
                </View>
              )}
            </Each>
          </View>

          <Divider />

          <View class="gap-0.5">
            <View class="flex-row justify-between">
              <Text class="font-body text-body-sm text-on-surface-variant">Subtotal</Text>
              <Text class="font-body text-body-sm tabular-nums text-on-surface">
                {money(receipt().subtotal)}
              </Text>
            </View>
            <If when={receipt().discount > 0}>
              <View class="flex-row justify-between">
                <Text class="font-body text-body-sm text-on-surface-variant">Discount</Text>
                <Text class="font-body text-body-sm tabular-nums text-on-surface">
                  −{money(receipt().discount)}
                </Text>
              </View>
            </If>
            <View class="flex-row justify-between">
              <Text class="font-body text-body-sm text-on-surface-variant">GST 8%</Text>
              <Text class="font-body text-body-sm tabular-nums text-on-surface">
                {money(receipt().tax)}
              </Text>
            </View>
            <If when={receipt().tip > 0}>
              <View class="flex-row justify-between">
                <Text class="font-body text-body-sm text-on-surface-variant">Tip</Text>
                <Text class="font-body text-body-sm tabular-nums text-on-surface">
                  {money(receipt().tip)}
                </Text>
              </View>
            </If>
            <View class="flex-row items-baseline justify-between border-t border-on-surface pt-1.5">
              <Text class="font-title text-title-md text-on-surface">TOTAL</Text>
              <Text class="font-title text-title-lg tabular-nums text-on-surface">
                {money(receipt().total)}
              </Text>
            </View>
          </View>

          <Divider />

          <View class="gap-0.5">
            <View class="flex-row justify-between">
              <Text class="font-body text-body-sm text-on-surface-variant">Paid by</Text>
              <Text class="font-label text-label-md text-on-surface">{receipt().method}</Text>
            </View>
            <If when={receipt().payments.length > 1}>
              <Each of={receipt().payments}>
                {(payment) => (
                  <View class="flex-row justify-between">
                    <Text class="font-body text-body-sm text-on-surface-variant">
                      {payment().method}
                    </Text>
                    <Text class="font-body text-body-sm tabular-nums text-on-surface">
                      {money(payment().amount)}
                    </Text>
                  </View>
                )}
              </Each>
            </If>
            <If when={receipt().method === "Cash"}>
              <View class="flex-row justify-between">
                <Text class="font-body text-body-sm text-on-surface-variant">Cash</Text>
                <Text class="font-body text-body-sm tabular-nums text-on-surface">
                  {money(receipt().tendered)}
                </Text>
              </View>
              <View class="flex-row justify-between">
                <Text class="font-body text-body-sm text-on-surface-variant">Change</Text>
                <Text class="font-body text-body-sm tabular-nums text-on-surface">
                  {money(receipt().change)}
                </Text>
              </View>
            </If>
            <If when={receipt().method === "Credit"}>
              <Text class="font-body text-body-sm text-outline">On account · net 15 days</Text>
            </If>
          </View>

          <Divider />

          <View class="items-center gap-1 py-1">
            <Text class="font-body text-body-sm text-on-surface">
              {receipt().customer === "Walk-in"
                ? "Walk-in guest"
                : receipt().customer + " · member"}
            </Text>
            <Text class="font-body text-body-sm text-outline">
              Thank you — see you at the counter.
            </Text>
            <View class="flex-row items-end gap-0.5 pt-1" style={{ height: 28 }}>
              <Each of={[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2]}>
                {(width) => (
                  <View
                    style={{ width: width(), height: 22, backgroundColor: "#1F1B16" }}
                  />
                )}
              </Each>
            </View>
            <Text class="font-body text-body-sm tabular-nums text-outline">
              {receipt().number.split("-").join(" ")}
            </Text>
          </View>
        </View>
      </Scroll>

      <View class="gap-2 border-t border-outline-variant p-4">
        <If when={printed() !== ""}>
          <Text class="text-center font-body text-body-sm text-secondary">{printed()}</Text>
        </If>
        <View class="flex-row items-center gap-2">
          <Button label="Close" grow onPress={props.onClose} />
          <Button
            label="Print receipt"
            icon="print"
            variant="primary"
            grow
            onPress={() => printed.set("Queued for the EPSON TM-T88VI.")}
          />
        </View>
        <Text class="text-center font-body text-body-sm text-outline">
          Preview only — this build has no printer bridge.
        </Text>
      </View>
    </Modal>
  );
}
