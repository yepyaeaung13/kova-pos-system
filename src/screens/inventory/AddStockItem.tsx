import { signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { CardHeader, Eyebrow, InfoRow } from "../../ui/Card";
import { Field, TextBox } from "../../ui/Field";
import { Toggle } from "../../ui/Avatar";
import { navigate } from "../../store";
import { money } from "../../format";

const categories = ["Coffee", "Dairy", "Bakery", "Syrups", "Packaging", "Food"];
const units = ["kg", "L", "pcs", "btl", "pack"];

export function AddStockItemScreen() {
  const name = signal("");
  const sku = signal("BEV-0");
  const category = signal("Coffee");
  const unit = signal("kg");
  const par = signal(10);
  const opening = signal(0);
  const cost = signal(0);
  const supplier = signal("Café Imports");
  const trackExpiry = signal(false);
  const active = signal(true);

  return (
    <Screen
      scroll={false}
      title="Add stock item"
      subtitle="A new SKU becomes orderable and countable straight away"
      actions={
        <>
          <Button label="Cancel" onPress={() => navigate("stock-items")} />
          <Button label="Save item" icon="save" variant="primary" onPress={() => navigate("stock-items")} />
        </>
      }
    >
      <View class="flex-1 flex-row gap-4 min-h-0">
        <View class="flex-1 gap-4">
          <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Item details" hint="What the kitchen and the buyer see" />
            <Field label="Item name">
              <TextBox value={name()} onChange={(value) => name.set(value)} placeholder="e.g. Oat milk · barista" />
            </Field>
            <View class="flex-row gap-3">
              <View class="flex-1">
                <Field label="SKU" hint="Auto-generated, editable">
                  <TextBox value={sku()} onChange={(value) => sku.set(value)} />
                </Field>
              </View>
              <View class="flex-1">
                <Field label="Unit of measure">
                  <View class="flex-row gap-1">
                    <Each of={units}>
                      {(option) => (
                        <View
                          role="button"
                          onPress={() => unit.set(option())}
                          class={
                            "flex-1 items-center justify-center rounded-sm border py-2 " +
                            (unit() === option()
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
              </View>
            </View>
            <Field label="Category">
              <View class="flex-row gap-1.5 flex-wrap">
                <Each of={categories}>
                  {(option) => (
                    <View
                      role="button"
                      onPress={() => category.set(option())}
                      class={
                        "rounded-full border px-2.5 py-1 " +
                        (category() === option()
                          ? "border-primary-container bg-surface-variant"
                          : "border-outline-variant bg-surface-container-lowest")
                      }
                    >
                      <Text class="font-label text-label-sm text-on-surface">{option()}</Text>
                    </View>
                  )}
                </Each>
              </View>
            </Field>
            <Field label="Supplier">
              <View class="flex-row items-center justify-between rounded border border-outline-variant bg-surface-container-lowest px-3 py-2.5">
                <Text class="font-body text-body-md text-on-surface">{supplier()}</Text>
                <Icon name="expand_more" size={18} color="#6B5752" />
              </View>
            </Field>
          </View>

          <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Opening balance" hint="Optional — you can receive stock later" />
            <View class="flex-row gap-3">
              <View class="flex-1">
                <Field label="Opening quantity">
                  <TextBox value={String(opening())} onChange={(value) => opening.set(Number(value) || 0)} />
                </Field>
              </View>
              <View class="flex-1">
                <Field label="Par level" hint="Reorder point">
                  <TextBox value={String(par())} onChange={(value) => par.set(Number(value) || 0)} />
                </Field>
              </View>
              <View class="flex-1">
                <Field label="Unit cost">
                  <TextBox value={String(cost())} onChange={(value) => cost.set(Number(value) || 0)} />
                </Field>
              </View>
            </View>
            <View class="flex-row items-center justify-between gap-3 border-t border-outline-variant/60 pt-3">
              <View class="flex-1 gap-0">
                <Text class="font-body text-body-md text-on-surface">Track expiry dates</Text>
                <Text class="font-body text-body-sm text-outline">FEFO picking for perishables</Text>
              </View>
              <Toggle checked={trackExpiry()} onChange={(value) => trackExpiry.set(value)} label="Track expiry" />
            </View>
            <View class="flex-row items-center justify-between gap-3">
              <View class="flex-1 gap-0">
                <Text class="font-body text-body-md text-on-surface">Available on the menu</Text>
                <Text class="font-body text-body-sm text-outline">Unavailable items stay countable</Text>
              </View>
              <Toggle checked={active()} onChange={(value) => active.set(value)} label="Available" />
            </View>
          </View>
        </View>

        <View class="gap-3" style={{ width: 330 }}>
          <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-low p-4">
            <Eyebrow label="Preview" />
            <View class="flex-row items-center gap-2.5">
              <View class="h-11 w-11 items-center justify-center rounded bg-surface-container-lowest">
                <Icon name="inventory_2" size={20} />
              </View>
              <View class="flex-1 gap-0 min-w-0">
                <Text class="font-title text-title-md text-on-surface truncate">
                  {name() || "New stock item"}
                </Text>
                <Text class="font-body text-body-sm text-outline">
                  {sku()} · {category()} · per {unit()}
                </Text>
              </View>
            </View>
            <View class="gap-1.5 border-t border-outline-variant pt-2.5">
              <InfoRow label="Opening value" value={money(opening() * cost())} strong />
              <InfoRow label="Par level" value={par() + " " + unit()} />
              <InfoRow label="Supplier" value={supplier()} />
              <InfoRow label="Expiry tracking" value={trackExpiry() ? "On" : "Off"} />
            </View>
          </View>

          <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Why par levels matter" />
            <Text class="font-body text-body-sm text-on-surface-variant">
              When stock falls below par, the overview flags it and creates a draft
              purchase order for the supplier's next delivery day.
            </Text>
          </View>

          <View class="flex-row items-center gap-2 rounded-md border border-tertiary/20 bg-tertiary-container px-3 py-2.5">
            <Icon name="info" size={16} color="#2F5372" />
            <Text class="flex-1 font-body text-body-sm text-on-tertiary-container">
              Opening quantities post a journal entry against inventory.
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
