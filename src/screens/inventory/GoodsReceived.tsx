import { Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { CardHeader, Eyebrow, InfoRow } from "../../ui/Card";
import { StatusPill } from "../../ui/Badge";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { Field } from "../../ui/Field";
import { applyStockDelta, navigate } from "../../store";
import { nextGrnNo, receiveGoods } from "../../db/repo";
import { money } from "../../format";

const lines = [
  { sku: "DAI-010", name: "Whole milk", ordered: 40, received: 40, unit: "L", cost: 1.35 },
  { sku: "DAI-011", name: "Oat milk · barista", ordered: 24, received: 18, unit: "L", cost: 2.8 },
  { sku: "DAI-012", name: "Heavy cream", ordered: 10, received: 10, unit: "L", cost: 3.4 },
  { sku: "BAK-022", name: "Cheesecake base", ordered: 12, received: 12, unit: "pcs", cost: 4.1 },
];

export function GoodsReceivedScreen() {
  const subtotal = () => lines.reduce((sum, line) => sum + line.received * line.cost, 0);
  const tax = () => Math.round(subtotal() * 0.08 * 100) / 100;

  const post = () => {
    const number = nextGrnNo();
    for (const line of lines) applyStockDelta(line.sku, line.received);
    void receiveGoods({
      grnNo: number,
      supplierId: "sup-2",
      invoiceNo: "INV-88214",
      receivedAt: new Date().toISOString(),
      lines: lines.map((line) => ({
        sku: line.sku,
        qty: line.received,
        costCents: Math.round(line.cost * 100),
      })),
    }).catch((error) => {
      console.log("grn not written to sqlite: " + (error?.message ?? error));
    });
    navigate("grn-history");
  };

  return (
    <Screen
      scroll={false}
      title="Goods received invoice"
      subtitle="GRN-2026-0119 · receiving against PO-2026-0142"
      actions={
        <>
          <Button label="Cancel" onPress={post} />
          <Button label="Post receipt" icon="check" variant="primary" onPress={post} />
        </>
      }
    >
      <View class="flex-1 flex-row gap-4 min-h-0">
        <View class="flex-1 gap-4">
          <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <View class="flex-row items-center justify-between">
              <CardHeader title="Supplier & documents" hint="Matches the delivery note" />
              <StatusPill label="2 lines short" tone="warn" />
            </View>
            <View class="flex-row gap-3">
              <View class="flex-1">
                <Field label="Supplier">
                  <View class="flex-row items-center justify-between rounded border border-outline-variant bg-surface-container-low px-3 py-2.5">
                    <Text class="font-body text-body-md text-on-surface">Nestlé Dairy</Text>
                    <Icon name="expand_more" size={18} color="#6B5752" />
                  </View>
                </Field>
              </View>
              <View class="flex-1">
                <Field label="Purchase order">
                  <View class="flex-row items-center justify-between rounded border border-outline-variant bg-surface-container-low px-3 py-2.5">
                    <Text class="font-body text-body-md tabular-nums text-on-surface">PO-2026-0142</Text>
                    <Icon name="link" size={16} color="#6B5752" />
                  </View>
                </Field>
              </View>
              <View class="flex-1">
                <Field label="Supplier invoice no.">
                  <View class="flex-row items-center justify-between rounded border border-outline-variant bg-surface-container-low px-3 py-2.5">
                    <Text class="font-body text-body-md tabular-nums text-on-surface">INV-88214</Text>
                    <Icon name="edit" size={15} color="#6B5752" />
                  </View>
                </Field>
              </View>
            </View>
            <View class="flex-row gap-3">
              <View class="flex-1">
                <Field label="Received">
                  <View class="flex-row items-center justify-between rounded border border-outline-variant bg-surface-container-low px-3 py-2.5">
                    <Text class="font-body text-body-md tabular-nums text-on-surface">25 Nov 2026 · 7:35 AM</Text>
                    <Icon name="calendar_today" size={16} color="#6B5752" />
                  </View>
                </Field>
              </View>
              <View class="flex-1">
                <Field label="Payment terms">
                  <View class="flex-row items-center justify-between rounded border border-outline-variant bg-surface-container-low px-3 py-2.5">
                    <Text class="font-body text-body-md text-on-surface">Net 7 days</Text>
                    <Icon name="expand_more" size={18} color="#6B5752" />
                  </View>
                </Field>
              </View>
            </View>
          </View>

          <TableWrap class="flex-1">
            <View class="flex-row items-center justify-between px-4 py-3">
              <CardHeader title="Received lines" hint="Ordered vs delivered" />
              <Button label="Add line" size="sm" variant="ghost" icon="add" />
            </View>
            <Head>
              <HeadCell label="SKU" flex={1} />
              <HeadCell label="Item" flex={2.4} />
              <HeadCell label="Ordered" w={70} align="right" />
              <HeadCell label="Received" w={80} align="right" />
              <HeadCell label="Unit cost" flex={1} align="right" />
              <HeadCell label="Line total" flex={1} align="right" />
            </Head>
            <Each of={lines}>
              {(line) => (
                <Row class={line().received < line().ordered ? "bg-amber-container/40" : ""}>
                  <TextCell text={line().sku} flex={1} mono muted />
                  <Cell flex={2.4}>
                    <Text class="font-body text-body-md text-on-surface">{line().name}</Text>
                  </Cell>
                  <TextCell text={line().ordered + " " + line().unit} w={70} align="right" muted />
                  <Cell w={80} align="right">
                    <View
                      class={
                        "rounded-sm border px-1.5 py-0.5 " +
                        (line().received < line().ordered
                          ? "border-amber/30 bg-amber-container"
                          : "border-outline-variant")
                      }
                    >
                      <Text class="font-label text-label-md tabular-nums text-on-surface">
                        {line().received}
                      </Text>
                    </View>
                  </Cell>
                  <TextCell text={money(line().cost)} flex={1} align="right" muted />
                  <TextCell text={money(line().received * line().cost)} flex={1} align="right" strong />
                </Row>
              )}
            </Each>
            <View class="flex-row items-center justify-between border-t border-outline-variant bg-surface-container-low px-4 py-2.5">
              <Text class="font-body text-body-sm text-outline">
                4 lines · 2 received short · backorder created for 6 L oat milk
              </Text>
              <Button label="Accept short delivery" size="sm" variant="soft" />
            </View>
          </TableWrap>
        </View>

        <View class="gap-3" style={{ width: 330 }}>
          <View class="gap-2.5 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Totals" hint="Supplier invoice values" />
            <InfoRow label={"Subtotal · " + lines.length + " lines"} value={money(subtotal())} />
            <InfoRow label="GST (8%)" value={money(tax())} />
            <InfoRow label="Freight" value={money(12)} />
            <View class="border-t border-outline-variant pt-2">
              <InfoRow label="Invoice total" value={money(subtotal() + tax() + 12)} strong />
            </View>
          </View>

          <View class="gap-2.5 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="3-way match" hint="PO · receipt · invoice" />
            <View class="flex-row items-center justify-between border-t border-outline-variant/60 pt-2">
              <Text class="font-body text-body-md text-on-surface">Ordered value</Text>
              <Text class="font-label text-label-md tabular-nums text-on-surface">{money(438.2)}</Text>
            </View>
            <View class="flex-row items-center justify-between">
              <Text class="font-body text-body-md text-on-surface">Received value</Text>
              <Text class="font-label text-label-md tabular-nums text-on-surface">{money(418.6)}</Text>
            </View>
            <View class="flex-row items-center justify-between">
              <Text class="font-body text-body-md text-on-surface">Invoiced value</Text>
              <Text class="font-label text-label-md tabular-nums text-on-surface">{money(subtotal() + tax() + 12)}</Text>
            </View>
            <View class="flex-row items-center gap-1.5 rounded border border-amber/30 bg-amber-container p-2">
              <Icon name="warning" size={15} color="#7E5700" />
              <Text class="flex-1 font-body text-body-sm text-on-amber-container">
                Invoiced 19.60 more than received — hold the difference.
              </Text>
            </View>
          </View>

          <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-low p-4">
            <Eyebrow label="On posting" />
            <Text class="font-body text-body-sm text-on-surface-variant">
              Inventory goes up by the received value, accounts payable by the invoice
              total, and the short lines stay open on the purchase order.
            </Text>
            <Button label="Post & create bill" variant="primary" icon="check" onPress={post} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
