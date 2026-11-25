import { Scroll, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { StatusPill, type Tone } from "../../ui/Badge";
import { StatTile } from "../../ui/Card";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { transfers, type Transfer } from "../../data/ops";
import { money } from "../../format";

const toneFor: Record<Transfer["status"], Tone> = {
  "In transit": "warn",
  Received: "success",
  Draft: "neutral",
};

export function TransfersScreen() {
  return (
    <Screen
      scroll={false}
      title="Branch transfers"
      subtitle="Move stock between kitchens without losing the trail"
      actions={
        <>
          <Button label="Scan transfer" icon="qr_code_scanner" />
          <Button label="New transfer" icon="add" variant="primary" />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile label="In transit" value="1" hint="Gulberg → DHA Phase 5" icon="swap_horiz" tone="warn" />
        <StatTile label="Received this week" value="2" hint="all lines matched" icon="check_circle" tone="success" />
        <StatTile label="Value moved" value={money(592.8)} hint="last 7 days" icon="payments" tone="info" />
        <StatTile label="Branches" value="3" hint="Gulberg · DHA · Johar" icon="storefront" />
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
          <Each of={transfers}>
            {(row) => (
              <Row>
                <TextCell text={row().number} flex={1.6} mono strong />
                <Cell flex={1.5}>
                  <Text class="font-body text-body-md text-on-surface truncate">{row().from}</Text>
                </Cell>
                <Cell flex={1.5}>
                  <Text class="font-body text-body-md text-on-surface truncate">{row().to}</Text>
                </Cell>
                <TextCell text={String(row().items)} w={54} align="right" muted />
                <TextCell text={money(row().value)} flex={1} align="right" strong />
                <Cell flex={1.8}>
                  <Text class="font-body text-body-md text-on-surface-variant">{row().sent}</Text>
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

      <View class="flex-row gap-3">
        <Each of={[
          { name: "Gulberg Café", role: "Flagship · kitchen + counter", items: 14, icon: "storefront" },
          { name: "DHA Phase 5", role: "Café · no bakery", items: 9, icon: "store" },
          { name: "Johar Town", role: "Kiosk · delivery only", items: 6, icon: "storefront" },
        ]}>
          {(branch) => (
            <View class="flex-1 flex-row items-center gap-2.5 rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2.5">
              <View class="h-8 w-8 items-center justify-center rounded-sm bg-surface-container">
                <Icon name={branch().icon} size={16} />
              </View>
              <View class="flex-1 gap-0 min-w-0">
                <Text class="font-label text-label-md text-on-surface truncate">{branch().name}</Text>
                <Text class="font-body text-body-sm text-outline truncate">{branch().role}</Text>
              </View>
              <Text class="font-label text-label-sm tabular-nums text-outline">{branch().items} SKUs</Text>
            </View>
          )}
        </Each>
      </View>
    </Screen>
  );
}
