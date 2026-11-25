import { Scroll, signal, Text, View } from "nsh";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { StatusPill, type Tone } from "../../ui/Badge";
import { StatTile } from "../../ui/Card";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { navigate, recentGrns } from "../../store";
import { grns, type Grn, type GrnStatus } from "../../data/ops";
import { loadGrns, type GrnRow } from "../../db/repo";
import { money } from "../../format";

const toneFor: Record<GrnStatus, Tone> = {
  Posted: "success",
  Draft: "warn",
  Disputed: "error",
};

/** `Today · 2:35 PM`, `Nov 22 · 11:05 AM` — matches the fixture copy. */
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function receivedLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time =
    (date.getHours() % 12 === 0 ? 12 : date.getHours() % 12) +
    ":" +
    String(date.getMinutes()).padStart(2, "0") +
    " " +
    (date.getHours() < 12 ? "AM" : "PM");
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today · " + time;
  return months[date.getMonth()] + " " + date.getDate() + " · " + time;
}

function fromRow(row: GrnRow): Grn {
  return {
    number: row.number,
    supplier: row.supplier,
    po: row.po_no ? row.po_no : "—",
    received: receivedLabel(row.received_date),
    lines: Number(row.lines),
    total: Number(row.total_cents) / 100,
    invoice: row.invoice_no,
    status: "Posted",
  };
}

export function GrnHistoryScreen() {
  const persisted = signal<Grn[]>([]);
  void loadGrns()
    .then((rows) => {
      if (rows.length === 0) return;
      persisted.set(rows.map(fromRow));
    })
    .catch(() => undefined);

  /** Session receipts first, then sqlite, then the design fixtures. */
  const rows = () => {
    const merged: Grn[] = [];
    const seen = new Set<string>();
    for (const grn of [...recentGrns(), ...persisted(), ...grns]) {
      if (seen.has(grn.number)) continue;
      seen.add(grn.number);
      merged.push(grn);
    }
    return merged;
  };

  return (
    <Screen
      scroll={false}
      title="Goods received"
      subtitle="Every delivery captured against a purchase order"
      actions={
        <>
          <Button label="Export" icon="download" />
          <Button label="Receive goods" icon="add" variant="primary" onPress={() => navigate("purchases")} />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile label="Received this week" value="5" hint="4 suppliers" icon="local_shipping" />
        <StatTile label="Value received" value={money(2230.5)} delta="+8.4%" positive hint="vs last week" icon="payments" tone="success" />
        <StatTile label="Disputed" value="1" hint="GRN-0116 · short delivery" icon="report" tone="warn" />
        <StatTile label="Invoice match" value="96%" hint="3-way match accuracy" icon="verified" tone="info" />
      </View>

      <TableWrap class="flex-1 min-h-0">
        <Scroll class="flex-1">
          <Head>
            <HeadCell label="GRN" flex={1.7} />
            <HeadCell label="Supplier" flex={1.6} />
            <HeadCell label="Purchase order" flex={1.6} />
            <HeadCell label="Received" flex={1.8} />
            <HeadCell label="Supplier invoice" flex={1.4} />
            <HeadCell label="Lines" w={54} align="right" />
            <HeadCell label="Total" flex={1} align="right" />
            <HeadCell label="Status" flex={1} />
          </Head>
          <Each of={rows()}>
            {(grn) => (
              <Row
                onPress={() => navigate("purchases")}
                class={grn().status === "Disputed" ? "bg-error-container/40" : ""}
              >
                <TextCell text={grn().number} flex={1.7} mono strong />
                <Cell flex={1.6}>
                  <Text class="font-body text-body-md text-on-surface truncate">{grn().supplier}</Text>
                </Cell>
                <TextCell text={grn().po} flex={1.6} mono muted />
                <Cell flex={1.8}>
                  <Text class="font-body text-body-md text-on-surface-variant">{grn().received}</Text>
                </Cell>
                <TextCell text={grn().invoice} flex={1.4} mono muted />
                <TextCell text={String(grn().lines)} w={54} align="right" muted />
                <TextCell text={money(grn().total)} flex={1} align="right" strong />
                <Cell flex={1}>
                  <StatusPill label={grn().status} tone={toneFor[grn().status]} />
                </Cell>
              </Row>
            )}
          </Each>
        </Scroll>
      </TableWrap>

      <View class="flex-row items-center justify-between rounded-md border border-outline-variant bg-surface-container-low px-4 py-2.5">
        <Text class="font-body text-body-sm text-outline">
          Receiving posts inventory, updates moving-average cost and records the supplier bill.
        </Text>
        <View class="flex-row items-center gap-2">
          <Button label="Purchase orders" size="sm" variant="ghost" onPress={() => navigate("purchase-orders")} />
          <Button label="Suppliers" size="sm" variant="ghost" onPress={() => navigate("suppliers")} />
        </View>
      </View>
    </Screen>
  );
}
