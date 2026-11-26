import { Overlay, Scroll, signal, Text, View, type ViewRef } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { StatusPill, type Tone } from "../../ui/Badge";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { loadTransfers, type Transfer } from "../../db/repo";
import { money } from "../../format";

const filters = ["All", "In transit", "Received", "Draft"] as const;

const toneFor: Record<Transfer["status"], Tone> = {
  "In transit": "warn",
  Received: "success",
  Draft: "neutral",
};

export function TransfersScreen() {
  const transfers = signal<Transfer[]>([]);
  const filter = signal<(typeof filters)[number]>("All");
  const filterOpen = signal(false);
  const filterAnchor = signal<ViewRef | null>(null);

  void loadTransfers().then((rows) => transfers.set(rows)).catch(() => undefined);

  const inTransit = transfers().filter((t) => t.status === "In transit").length;
  const receivedThisWeek = transfers().filter((t) => t.status === "Received").length;
  const valueMoved = transfers()
    .filter((t) => t.status !== "Draft")
    .reduce((sum, t) => sum + t.value_cents, 0);
  const branches = new Set(transfers().map((t) => t.from_branch)).size;
  const filtered = () =>
    transfers().filter((row) => filter() === "All" || row.status === filter());

  return (
    <View class="flex-1 flex-col gap-3 p-4 min-h-0">
      <View class="flex-row items-center justify-between gap-3">
        <View class="gap-0.5">
          <Text class="font-headline text-headline-lg text-on-surface">Branch transfers</Text>
          <Text class="font-body text-body-sm text-outline">
            Move stock between kitchens without losing the trail
          </Text>
        </View>
        <View class="flex-row items-center gap-2">
          <Button label="Scan transfer" icon="qr_code_scanner" />
          <Button label="New transfer" icon="add" variant="primary" />
        </View>
      </View>

      <View class="flex-row flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2">
        <Text class="font-body text-body-sm text-on-surface-variant">In transit {inTransit}</Text>
        <Text class="font-body text-body-sm text-on-surface-variant">
          Received this week {receivedThisWeek}
        </Text>
        <Text class="font-body text-body-sm text-on-surface-variant">
          Value moved {money(valueMoved / 100)}
        </Text>
        <Text class="font-body text-body-sm text-on-surface-variant">Branches {branches}</Text>
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
                          ? transfers().length
                          : transfers().filter((row) => row.status === name()).length}
                      </Text>
                    </View>
                  )}
                </Each>
              </View>
            </Overlay>
          </If>
        </View>
        <Text class="font-body text-body-sm text-outline">
          Showing {filtered().length} of {transfers().length} transfers
        </Text>
        <View class="flex-1" />
      </View>

      <TableWrap class="flex-1 min-h-0">
        <Scroll class="flex-1">
          <Head>
            <HeadCell label="Transfer" flex={1.6} />
            <HeadCell label="From" flex={1.5} />
            <HeadCell label="To" flex={1.5} />
            <HeadCell label="Items" w={54} align="right" />
            <HeadCell label="Value" flex={1} align="right" />
            <HeadCell label="Sent" flex={1.8} />
            <HeadCell label="Status" flex={1.1} />
            <HeadCell label="" w={86} />
          </Head>
          <Each of={filtered()}>
            {(row) => (
              <Row>
                <TextCell text={row().transfer_no} flex={1.6} mono strong />
                <Cell flex={1.5}>
                  <Text class="font-body text-body-md text-on-surface truncate">{row().from_branch}</Text>
                </Cell>
                <Cell flex={1.5}>
                  <Text class="font-body text-body-md text-on-surface truncate">{row().to_branch}</Text>
                </Cell>
                <TextCell text={String(row().items_qty)} w={54} align="right" muted />
                <TextCell text={money(row().value_cents / 100)} flex={1} align="right" strong />
                <Cell flex={1.8}>
                  <Text class="font-body text-body-md text-on-surface-variant">{row().sent_at}</Text>
                </Cell>
                <Cell flex={1.1}>
                  <StatusPill label={row().status} tone={toneFor[row().status]} />
                </Cell>
                <Cell w={86} align="right">
                  <If
                    when={row().status === "In transit"}
                    else={<Text class="font-body text-body-sm text-outline">—</Text>}
                  >
                    <Button label="Receive" size="sm" variant="soft" />
                  </If>
                </Cell>
              </Row>
            )}
          </Each>
        </Scroll>
      </TableWrap>
    </View>
  );
}