import { Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { CardHeader, Eyebrow, InfoRow, StatTile } from "../../ui/Card";
import { ProgressBar } from "../../ui/Charts";
import { StatusPill, type Tone } from "../../ui/Badge";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { loadSuppliers, type Supplier } from "../../db/repo";
import { suppliers as supplierFixtures } from "../../data/ops";
import { money } from "../../format";

const toneFor: Record<Supplier["audit"], Tone> = {
  Verified: "success",
  Due: "warn",
  Overdue: "error",
};

export function SuppliersScreen() {
  const supplierList = signal<Supplier[]>([...supplierFixtures]);
  void loadSuppliers().then((rows) => supplierList.set(rows)).catch(() => undefined);

  const payable = () => supplierList().reduce((sum, supplier) => sum + supplier.payable, 0);

  return (
    <Screen
      scroll={false}
      title="Suppliers & audits"
      subtitle="Who delivers what, and how they have performed"
      actions={
        <>
          <Button label="Audit checklist" icon="fact_check" />
          <Button label="Add supplier" icon="add" variant="primary" />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile label="Active suppliers" value={String(supplierList().length)} hint="40 SKUs covered" icon="local_shipping" />
        <StatTile label="Payable" value={money(payable())} hint="across 4 open bills" icon="request_quote" tone="warn" />
        <StatTile label="On-time delivery" value="94%" delta="+2.1%" positive hint="last 30 days" icon="schedule" tone="success" />
        <StatTile label="Audits overdue" value="1" hint="Bar Essentials" icon="gpp_maybe" tone="plum" />
      </View>

      <View class="flex-1 flex-row gap-4 min-h-0">
        <TableWrap class="flex-1 min-h-0">
          <Scroll class="flex-1">
            <Head>
              <HeadCell label="Supplier" flex={2.2} />
              <HeadCell label="Contact" flex={1.8} />
              <HeadCell label="Lead" w={56} align="right" />
              <HeadCell label="Rating" flex={1.4} />
              <HeadCell label="SKUs" w={52} align="right" />
              <HeadCell label="Payable" flex={1} align="right" />
              <HeadCell label="Last delivery" flex={1.2} />
              <HeadCell label="Audit" flex={1.1} />
            </Head>
            <Each of={supplierList()}>
              {(supplier) => (
                <Row>
                  <Cell flex={2.2}>
                    <View class="flex-row items-center gap-2 min-w-0">
                      <View class="h-7 w-7 items-center justify-center rounded-sm bg-surface-container">
                        <Icon name="storefront" size={14} />
                      </View>
                      <View class="flex-1 gap-0 min-w-0">
                        <Text class="font-label text-label-md text-on-surface truncate">{supplier().name}</Text>
                        <Text class="font-body text-body-sm text-outline truncate">{supplier().phone}</Text>
                      </View>
                    </View>
                  </Cell>
                  <Cell flex={1.8}>
                    <Text class="font-body text-body-md text-on-surface-variant truncate">{supplier().contact_name}</Text>
                  </Cell>
                  <TextCell text={supplier().lead_days + "d"} w={56} align="right" muted />
                  <Cell flex={1.4}>
                    <View class="w-full gap-1">
                      <Text class="font-label text-label-sm tabular-nums text-on-surface">
                        {supplier().rating.toFixed(1)} / 5
                      </Text>
                      <ProgressBar value={supplier().rating / 5} height={4} color="#3F5727" />
                    </View>
                  </Cell>
                  <TextCell text={String(supplier().items)} w={52} align="right" muted />
                  <Cell flex={1} align="right">
                    <Text
                      class={
                        "font-label text-label-md tabular-nums " +
                        (supplier().payable > 0 ? "text-on-surface" : "text-outline")
                      }
                    >
                      {supplier().payable > 0 ? money(supplier().payable) : "-"}
                    </Text>
                  </Cell>
                  <TextCell text={supplier().last_delivery} flex={1.2} muted />
                  <Cell flex={1.1}>
                    <StatusPill label={supplier().audit} tone={toneFor[supplier().audit as Supplier["audit"]]} />
                  </Cell>
                </Row>
              )}
            </Each>
          </Scroll>
        </TableWrap>

        <View class="gap-3" style={{ width: 330 }}>
          <View class="gap-2.5 rounded-md border border-error/20 bg-error-container p-4">
            <View class="flex-row items-center gap-2">
              <Icon name="gpp_maybe" size={18} color="#BA1A1A" />
              <Text class="font-title text-title-md text-on-error-container">Audit overdue</Text>
            </View>
            <Text class="font-body text-body-sm text-on-error-container">
              Bar Essentials has not had a food-safety audit in 14 months. Its last
              two deliveries arrived a day late.
            </Text>
            <Button label="Book audit" size="sm" variant="danger" />
          </View>

          <View class="gap-2.5 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Scorecard" hint="This month" />
            <InfoRow label="Deliveries" value="42" />
            <InfoRow label="On time" value="39 · 94%" />
            <InfoRow label="Short lines" value="3" />
            <InfoRow label="Returns" value="1 · EcoPack" />
            <InfoRow label="Avg lead time" value="3.2 days" />
          </View>

          <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-low p-4">
            <Eyebrow label="Before you approve" />
            <Text class="font-body text-body-sm text-on-surface-variant">
              Every new supplier needs a tax number, a bank letter and a signed
              food-safety declaration on file.
            </Text>
            <Button label="Open documents" size="sm" variant="ghost" iconRight="arrow_forward" />
          </View>
        </View>
      </View>
    </Screen>
  );
}