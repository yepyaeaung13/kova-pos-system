import { Scroll, Text, View } from "nsh";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { StatusPill, type Tone } from "../../ui/Badge";
import { StatTile } from "../../ui/Card";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { navigate, recentAdjustments } from "../../store";
import { adjustments } from "../../data/ops";
import { money } from "../../format";

export function AdjustmentsScreen() {
  const rows = () => [...recentAdjustments(), ...adjustments];
  const posted = () => rows().filter((row) => row.status === "Posted").length;

  return (
    <Screen
      scroll={false}
      title="Stock adjustments"
      subtitle="Waste, expiry and count corrections — every write-off keeps a reason"
      actions={
        <>
          <Button label="Export" icon="download" />
          <Button label="New adjustment" icon="add" variant="primary" onPress={() => navigate("new-adjustment")} />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile label="Posted today" value={String(posted())} hint="waste + count" icon="tune" />
        <StatTile label="Waste value" value={money(51.2)} hint="this week" icon="delete_sweep" tone="warn" />
        <StatTile label="Count gains" value={money(26.1)} hint="found stock" icon="add_circle" tone="success" />
        <StatTile label="Approval needed" value="1" hint="ADJ-0058 · draft" icon="pending_actions" tone="info" />
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
          <Each of={rows()}>
            {(row) => (
              <Row onPress={() => navigate("new-adjustment")}>
                <TextCell text={row().number} flex={1.6} mono strong />
                <Cell flex={1.3}>
                  <Text class="font-body text-body-md text-on-surface">{row().reason}</Text>
                </Cell>
                <TextCell text={String(row().items)} w={54} align="right" muted />
                <Cell flex={1} align="right">
                  <Text
                    class={
                      "font-label text-label-md tabular-nums " +
                      (row().value < 0 ? "text-error" : "text-secondary")
                    }
                  >
                    {row().value < 0 ? "−" : "+"}{money(Math.abs(row().value))}
                  </Text>
                </Cell>
                <Cell flex={1.4}>
                  <Text class="font-body text-body-md text-on-surface-variant">{row().by}</Text>
                </Cell>
                <Cell flex={1.8}>
                  <Text class="font-body text-body-md text-on-surface-variant">{row().date}</Text>
                </Cell>
                <Cell flex={1}>
                  <StatusPill
                    label={row().status}
                    tone={(row().status === "Posted" ? "success" : "warn") as Tone}
                  />
                </Cell>
              </Row>
            )}
          </Each>
        </Scroll>
      </TableWrap>

      <View class="flex-row items-center justify-between rounded-md border border-outline-variant bg-surface-container-low px-4 py-2.5">
        <Text class="font-body text-body-sm text-outline">
          Adjustments post to waste & spoilage in the ledger; gains post against inventory.
        </Text>
        <Button label="Waste report" size="sm" variant="ghost" onPress={() => navigate("overview")} />
      </View>
    </Screen>
  );
}
