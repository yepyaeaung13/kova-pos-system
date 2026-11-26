import { Overlay, signal, Scroll, Text, View, type ViewRef } from "nsh";
import { navigate, recentAdjustments } from "../../store";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { StatusPill } from "../../ui/Badge";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { loadAdjustments } from "../../db/repo";
import { adjustments as adjustmentData, type Adjustment } from "../../data/ops";
import { money } from "../../format";

const filters = ["All", "Posted", "Draft"] as const;

export function AdjustmentsScreen() {
  const filter = signal<(typeof filters)[number]>("All");
  const filterOpen = signal(false);
  const filterAnchor = signal<ViewRef | null>(null);
  const persisted = signal<Adjustment[]>([]);
  void loadAdjustments()
    .then((rows) => {
      if (rows.length === 0) return;
      persisted.set(
        rows.map((row) => ({
          ...row,
          reason: row.reason as Adjustment["reason"],
          status: "Posted" as const,
          items: row.items ?? 1,
        })),
      );
    })
    .catch(() => undefined);

  /** Session adjustments first, then sqlite, then the design fixtures. */
  const rows = () => {
    const merged: Adjustment[] = [];
    const seen = new Set<string>();
    for (const adj of [...recentAdjustments(), ...persisted(), ...adjustmentData]) {
      if (seen.has(adj.adj_no)) continue;
      seen.add(adj.adj_no);
      merged.push(adj);
    }
    return merged;
  };

  const posted = () => rows().filter((a: Adjustment) => a.status === "Posted").length;
  const filtered = () =>
    rows().filter((row) => filter() === "All" || row.status === filter());

  return (
    <View class="flex-1 flex-col gap-3 p-4 min-h-0">
      <View class="flex-row items-center justify-between gap-3">
        <View class="gap-0.5">
          <Text class="font-headline text-headline-lg text-on-surface">Stock adjustments</Text>
          <Text class="font-body text-body-sm text-outline">
            Waste, expiry and count corrections — every write-off keeps a reason
          </Text>
        </View>
        <View class="flex-row items-center gap-2">
          <Button label="Export" icon="download" />
          <Button label="New adjustment" icon="add" variant="primary" onPress={() => navigate("new-adjustment")} />
        </View>
      </View>

      <View class="flex-row flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2">
        <Text class="font-body text-body-sm text-on-surface-variant">Posted today {posted()}</Text>
        <Text class="font-body text-body-sm text-on-surface-variant">Waste value {money(51.2)}</Text>
        <Text class="font-body text-body-sm text-on-surface-variant">Count gains {money(26.1)}</Text>
        <Text class="font-body text-body-sm text-on-surface-variant">Approval needed 1</Text>
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
                          : rows().filter((row) => row.status === name()).length}
                      </Text>
                    </View>
                  )}
                </Each>
              </View>
            </Overlay>
          </If>
        </View>
        <Text class="font-body text-body-sm text-outline">
          Showing {filtered().length} of {rows().length} adjustments
        </Text>
        <View class="flex-1" />
      </View>

      <TableWrap class="flex-1 min-h-0">
        <Scroll class="flex-1">
          <Head>
            <HeadCell label="Adjustment" flex={1.6} />
            <HeadCell label="Reason" flex={1.3} />
            <HeadCell label="Items" w={54} align="right" />
            <HeadCell label="Value" flex={1} align="right" />
            <HeadCell label="By" flex={1.4} />
            <HeadCell label="When" flex={1.8} />
            <HeadCell label="Status" flex={1} />
          </Head>
          <Each of={filtered()}>
            {(row) => (
              <Row onPress={() => navigate("new-adjustment")}>
                <TextCell text={row().adj_no} flex={1.6} mono strong />
                <Cell flex={1.3}>
                  <Text class="font-body text-body-md text-on-surface">{row().reason}</Text>
                </Cell>
                <TextCell text={String(row().items)} w={54} align="right" muted />
                <Cell flex={1} align="right">
                  <Text
                    class={
                      "font-label text-label-md tabular-nums " +
                      (row().delta_qty < 0 ? "text-error" : "text-secondary")
                    }
                  >
                    {row().delta_qty < 0 ? "−" : "+"}{money(Math.abs(row().delta_qty))}
                  </Text>
                </Cell>
                <Cell flex={1.4}>
                  <Text class="font-body text-body-md text-on-surface">{row().branch_id}</Text>
                </Cell>
                <Cell flex={1.8}>
                  <Text class="font-body text-body-md text-on-surface-variant">{row().created_at}</Text>
                </Cell>
                <Cell flex={1}>
                  <StatusPill label={row().status} tone={row().status === "Posted" ? "success" : "warn"} />
                </Cell>
              </Row>
            )}
          </Each>
        </Scroll>
      </TableWrap>
    </View>
  );
}