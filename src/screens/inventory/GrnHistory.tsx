import { Overlay, Scroll, signal, Text, View, type ViewRef } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { StatusPill, type Tone } from "../../ui/Badge";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { navigate, recentGrns } from "../../store";
import { grns, type Grn, type GrnStatus } from "../../data/ops";
import { loadGrns, type GrnRow } from "../../db/repo";
import { money } from "../../format";

const filters = ["All", "Posted", "Draft", "Disputed"] as const;

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
  const filter = signal<(typeof filters)[number]>("All");
  const filterOpen = signal(false);
  const filterAnchor = signal<ViewRef | null>(null);
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

  const filtered = () =>
    rows().filter((grn) => filter() === "All" || grn.status === filter());

  return (
    <View class="flex-1 flex-col gap-3 p-4 min-h-0">
      <View class="flex-row items-center justify-between gap-3">
        <View class="gap-0.5">
          <Text class="font-headline text-headline-lg text-on-surface">Goods received</Text>
          <Text class="font-body text-body-sm text-outline">
            Every delivery captured against a purchase order
          </Text>
        </View>
        <View class="flex-row items-center gap-2">
          <Button label="Export" icon="download" />
          <Button label="Receive goods" icon="add" variant="primary" onPress={() => navigate("purchases")} />
        </View>
      </View>

      <View class="flex-row flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2">
        <Text class="font-body text-body-sm text-on-surface-variant">Received this week 5</Text>
        <Text class="font-body text-body-sm text-on-surface-variant">
          Value received {money(2230.5)}
        </Text>
        <Text class="font-body text-body-sm text-on-surface-variant">Disputed 1</Text>
        <Text class="font-body text-body-sm text-on-surface-variant">Invoice match 96%</Text>
      </View>

      <View class="flex-row items-center gap-3">
        <Text class="font-label text-label-sm uppercase tracking-label text-outline">Status</Text>
        <View class="w-36">
          <View
            ref={(node) => filterAnchor.set(node)}
            role="button"
            accessibilityLabel="Filter status"
            onPress={() => filterOpen.set(!filterOpen())}
            class="h-8 flex-row items-center justify-between rounded-md border border-outline-variant bg-surface-container-lowest px-3"
          >
            <Text class="font-body text-body-sm text-on-surface">{filter()}</Text>
            <Icon name="expand_more" size={16} color="#6B5752" />
          </View>
          <If when={filterOpen()}>
            <Overlay
              anchor={filterAnchor()}
              placement="bottom"
              align="start"
              offset={4}
              onPressOutside={() => filterOpen.set(false)}
            >
              <View class="w-36 rounded-md border border-outline-variant bg-surface-container-lowest p-1">
                <Each of={filters}>
                  {(name) => (
                    <View
                      role="button"
                      accessibilityLabel={"Filter by " + name()}
                      onPress={() => {
                        filter.set(name());
                        filterOpen.set(false);
                      }}
                      class={
                        "flex-row items-center justify-between gap-2 rounded-sm px-2 py-1.5 " +
                        (filter() === name()
                          ? "bg-surface-variant"
                          : "hover:bg-surface-container-low")
                      }
                    >
                      <Text class="font-body text-body-sm text-on-surface">{name()}</Text>
                      <Text class="font-label text-label-sm tabular-nums text-outline">
                        {name() === "All"
                          ? rows().length
                          : rows().filter((grn) => grn.status === name()).length}
                      </Text>
                    </View>
                  )}
                </Each>
              </View>
            </Overlay>
          </If>
        </View>
        <Text class="font-body text-body-sm text-outline">
          Showing {filtered().length} of {rows().length} receipts
        </Text>
        <View class="flex-1" />
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
          <Each of={filtered()}>
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

      <View class="flex-row items-center justify-between rounded-md border border-outline-variant bg-surface-container-low px-3 py-1.5">
        <Text class="font-body text-body-sm text-outline">
          Receiving posts inventory, updates moving-average cost and records the supplier bill.
        </Text>
        <View class="flex-row items-center gap-2">
          <Button label="Purchase orders" size="sm" variant="ghost" onPress={() => navigate("purchase-orders")} />
          <Button label="Suppliers" size="sm" variant="ghost" onPress={() => navigate("suppliers")} />
        </View>
      </View>
    </View>
  );
}
