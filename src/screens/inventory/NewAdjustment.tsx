import { computed, Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { CardHeader, Eyebrow, InfoRow } from "../../ui/Card";
import { Field, TextBox } from "../../ui/Field";
import {
  adjustTarget,
  applyStockDelta,
  cashier,
  inventory,
  navigate,
  recordAdjustment,
  stamp,
} from "../../store";
import { nextAdjustmentNo, postAdjustment } from "../../db/repo";
import { money } from "../../format";

const reasons = ["Waste", "Spillage", "Expiry", "Count correction"] as const;

export function NewAdjustmentScreen() {
  const wanted = adjustTarget();
  adjustTarget.set(null);
  const preselected = Math.max(
    0,
    inventory().findIndex((item) => item.sku === wanted),
  );
  const selected = signal(preselected);
  const reason = signal<(typeof reasons)[number]>("Waste");
  const direction = signal<"out" | "in">("out");
  const quantity = signal(2);
  const note = signal("");

  const item = () => inventory()[selected()];
  const value = computed(() => Math.round(quantity() * item().unitCost * 100) / 100);
  const signed = computed(() => (direction() === "out" ? -value() : value()));

  const post = () => {
    const row = item();
    const delta = (direction() === "out" ? -1 : 1) * quantity();
    const number = nextAdjustmentNo();
    applyStockDelta(row.sku, delta);
    recordAdjustment({
      adj_no: number,
      branch_id: "BR-01",
      item_id: row.sku,
      delta_qty: delta,
      notes: note(),
      created_at: "Today · " + (stamp().split(" · ")[1] ?? ""),
      number,
      items: 1,
      reason: reason(),
      value: direction() === "out" ? -value() : value(),
      by: cashier.name,
      date: "Today · " + (stamp().split(" · ")[1] ?? ""),
      status: "Posted",
    });
    void postAdjustment({
      sku: row.sku,
      adjNo: number,
      reason: reason(),
      deltaQty: delta,
      notes: note(),
    }).catch((error) => {
      console.log("adjustment not written to sqlite: " + (error?.message ?? error));
    });
    navigate("adjustments");
  };

  return (
    <View class="flex-1 flex-col gap-3 p-4 min-h-0">
      <View class="flex-row items-center justify-between gap-3">
        <View class="gap-0.5">
          <Text class="font-headline text-headline-lg text-on-surface">New stock adjustment</Text>
          <Text class="font-body text-body-sm text-outline">
            Write off waste or correct a count — the ledger follows
          </Text>
        </View>
        <View class="flex-row items-center gap-2">
          <Button label="Cancel" onPress={post} />
          <Button label="Post adjustment" icon="check" variant="primary" onPress={post} />
        </View>
      </View>
      <View class="flex-1 flex-row gap-3 min-h-0">
        <View class="flex-1 gap-3 min-w-0">
          <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-3">
            <CardHeader title="What moved" hint="Pick the item and the reason" />

            <View class="gap-1.5">
              <Text class="font-label text-label-md text-on-surface-variant">Item</Text>
              <View class="rounded border border-outline-variant bg-surface-container-low p-1">
                <Scroll style={{ maxHeight: 110 }} contentClass="gap-0.5">
                  <Each of={inventory().slice(0, 8)}>
                    {(row, index) => (
                      <View
                        role="button"
                        onPress={() => selected.set(index())}
                        class={
                          "flex-row items-center justify-between rounded px-2.5 py-1 " +
                          (selected() === index() ? "bg-surface-variant" : "hover:bg-surface-container")
                        }
                      >
                        <View class="flex-row items-center gap-2 min-w-0">
                          <View class="h-6 w-6 items-center justify-center rounded-sm bg-surface-container-lowest">
                            <Icon name="inventory_2" size={13} />
                          </View>
                          <View class="gap-0 min-w-0">
                            <Text class="font-label text-label-md text-on-surface truncate">{row().name}</Text>
                            <Text class="font-body text-body-sm text-outline tabular-nums">
                              {row().sku} · {row().onHand} {row().unit} on hand
                            </Text>
                          </View>
                        </View>
                        <Text class="font-label text-label-sm tabular-nums text-outline">
                          {money(row().unitCost)}/{row().unit}
                        </Text>
                      </View>
                    )}
                  </Each>
                </Scroll>
              </View>
            </View>

            <Field label="Reason">
              <View class="flex-row gap-1.5">
                <Each of={reasons}>
                  {(option) => (
                    <View
                      role="button"
                      onPress={() => reason.set(option())}
                      class={
                        "flex-1 items-center rounded-sm border py-2 " +
                        (reason() === option()
                          ? "border-primary-container bg-surface-variant"
                          : "border-outline-variant bg-surface-container-low")
                      }
                    >
                      <Text class="font-label text-label-sm text-on-surface">{option()}</Text>
                    </View>
                  )}
                </Each>
              </View>
            </Field>

            <View class="flex-row gap-3">
              <View style={{ width: 220 }}>
                <Field label="Direction">
                  <View class="flex-row gap-1">
                    <View
                      role="button"
                      onPress={() => direction.set("out")}
                      class={
                        "flex-1 items-center justify-center rounded-sm border py-2 " +
                        (direction() === "out"
                          ? "border-error/30 bg-error-container"
                          : "border-outline-variant bg-surface-container-low")
                      }
                    >
                      <Text class="font-label text-label-md text-on-surface">Stock out</Text>
                    </View>
                    <View
                      role="button"
                      onPress={() => direction.set("in")}
                      class={
                        "flex-1 items-center justify-center rounded-sm border py-2 " +
                        (direction() === "in"
                          ? "border-secondary/30 bg-secondary-container"
                          : "border-outline-variant bg-surface-container-low")
                      }
                    >
                      <Text class="font-label text-label-md text-on-surface">Stock in</Text>
                    </View>
                  </View>
                </Field>
              </View>
              <View class="flex-1">
                <Field label="Quantity" hint={"in " + item().unit}>
                  <TextBox value={String(quantity())} onChange={(value) => quantity.set(Number(value) || 0)} />
                </Field>
              </View>
            </View>

            <Field label="Note" hint="Visible on the audit trail">
              <TextBox
                value={note()}
                onChange={(value) => note.set(value)}
                placeholder="e.g. dropped during the morning rush"
              />
            </Field>
          </View>

          <View class="flex-row items-center gap-2 rounded-md border border-outline-variant bg-surface-container-low p-3">
            <Icon name="history" size={16} color="#6B5752" />
            <Text class="font-body text-body-sm text-outline">
              Adjustments cannot be deleted. Post a reversing correction instead.
            </Text>
          </View>
        </View>

        <View class="gap-3" style={{ width: 330 }}>
          <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-3">
            <Eyebrow label="Impact" />
            <View class="flex-row items-center gap-2.5">
              <View class="h-10 w-10 items-center justify-center rounded bg-surface-container">
                <Icon name={direction() === "out" ? "remove" : "add"} size={20} />
              </View>
              <View class="flex-1 gap-0 min-w-0">
                <Text class="font-title text-title-md text-on-surface truncate">{item().name}</Text>
                <Text class="font-body text-body-sm text-outline">
                  {item().sku} · {reason()}
                </Text>
              </View>
            </View>
            <View class="gap-1.5 border-t border-outline-variant pt-2.5">
              <InfoRow label="Quantity" value={(direction() === "out" ? "−" : "+") + quantity() + " " + item().unit} />
              <InfoRow label="Unit cost" value={money(item().unitCost)} />
              <InfoRow label="Value" value={(signed() < 0 ? "−" : "+") + money(Math.abs(signed()))} strong />
              <InfoRow label="New on hand" value={Math.max(0, item().onHand + (direction() === "out" ? -quantity() : quantity())) + " " + item().unit} />
            </View>
          </View>

          <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-low p-3">
            <CardHeader title="Ledger entry" hint="Created when posted" />
            <View class="flex-row items-center justify-between gap-2 border-t border-outline-variant/60 pt-2">
              <Text class="font-body text-body-sm text-on-surface-variant">Dr</Text>
              <Text class="flex-1 font-body text-body-sm text-on-surface">
                {direction() === "out" ? "5400 Waste & spoilage" : "1200 Inventory"}
              </Text>
              <Text class="font-label text-label-md tabular-nums text-on-surface">{money(value())}</Text>
            </View>
            <View class="flex-row items-center justify-between gap-2">
              <Text class="font-body text-body-sm text-on-surface-variant">Cr</Text>
              <Text class="flex-1 font-body text-body-sm text-on-surface">
                {direction() === "out" ? "1200 Inventory" : "5400 Waste & spoilage"}
              </Text>
              <Text class="font-label text-label-md tabular-nums text-on-surface">{money(value())}</Text>
            </View>
          </View>

          <Button label="Post adjustment" variant="primary" icon="check" onPress={post} />
        </View>
      </View>
    </View>
  );
}
