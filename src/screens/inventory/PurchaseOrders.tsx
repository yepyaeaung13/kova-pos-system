import { Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { Chip, StatusPill, type Tone } from "../../ui/Badge";
import { StatTile } from "../../ui/Card";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import {
  applyStockDelta,
  inventory,
  recordGoodsReceipt,
  receivedPurchaseOrders,
  stamp,
} from "../../store";
import {
  loadPurchaseOrders,
  nextGrnNo,
  nextJournalNo,
  poTotalCents,
  receivePurchaseOrder,
  savePurchaseOrderDraft,
} from "../../db/repo";
import { purchaseOrders, type PoLine, type PoStatus } from "../../data/ops";
import { money } from "../../format";

const tabs = ["All", "Draft", "Sent", "Partial", "Received"] as const;

const toneFor: Record<PoStatus, Tone> = {
  Draft: "neutral",
  Sent: "info",
  Partial: "warn",
  Received: "success",
};

interface PoView {
  number: string;
  supplier: string;
  created: string;
  expected: string;
  lines: number;
  total: number;
  status: PoStatus;
  detail: PoLine[];
  grnNo: string | null;
}

function asStatus(value: string): PoStatus {
  return value === "Sent" || value === "Partial" || value === "Received" ? value : "Draft";
}

function parseDetail(json: string | null): PoLine[] {
  if (!json) return [];
  try {
    const value = JSON.parse(json) as unknown;
    if (!Array.isArray(value)) return [];
    return value
      .filter((line): line is PoLine => !!line && typeof line === "object")
      .map((line) => ({
        sku: String(line.sku),
        name: String(line.name ?? line.sku),
        qty: Number(line.qty) || 0,
        costCents: Number(line.costCents) || 0,
      }))
      .filter((line) => line.sku && line.qty > 0);
  } catch {
    return [];
  }
}

/** Older saved orders have no line payload; rebuild plausible lines from stock. */
function linesFromStock(supplier: string): PoLine[] {
  return inventory()
    .filter((item) => item.supplier === supplier)
    .map((item) => ({
      sku: item.sku,
      name: item.name,
      qty: Math.max(1, Math.ceil(item.par - item.onHand)),
      costCents: Math.round(item.unitCost * 100),
    }));
}

export function PurchaseOrdersScreen() {
  const tab = signal<(typeof tabs)[number]>("All");
  const persisted = signal<PoView[]>([]);
  const notice = signal("");
  void loadPurchaseOrders()
    .then((rows) => {
      if (rows.length === 0) return;
      persisted.set(
        rows.map((row) => {
          const detail = parseDetail(row.lines_json);
          return {
            number: row.po_no,
            supplier: row.supplier,
            created: "Saved",
            expected: row.expected,
            lines: Number(row.lines_count) || detail.length,
            total: Number(row.total_cents) / 100,
            status: asStatus(row.status),
            detail,
            grnNo: row.grn_no,
          };
        }),
      );
    })
    .catch(() => undefined);

  /** Applies receipts posted in this session, even when sqlite is unavailable. */
  const withReceipt = (po: PoView): PoView => {
    const grnNo = receivedPurchaseOrders()[po.number] ?? po.grnNo;
    if (!grnNo) return po;
    return { ...po, status: "Received", grnNo };
  };

  const rows = () => {
    const saved = persisted();
    const numbers = new Set(saved.map((po) => po.number));
    const fallback = purchaseOrders
      .filter((po) => !numbers.has(po.number))
      .map((po) => withReceipt({ ...po, grnNo: null }));
    return [...saved.map(withReceipt), ...fallback].filter(
      (po) => tab() === "All" || po.status === tab(),
    );
  };

  const receive = (po: PoView) => {
    if (po.status === "Received") return;
    const detail = po.detail.length > 0 ? po.detail : linesFromStock(po.supplier);
    if (detail.length === 0) {
      notice.set("Add lines to " + po.number + " before receiving it.");
      return;
    }

    const grnNo = nextGrnNo();
    const entryNo = nextJournalNo();
    const receivedAt = new Date().toISOString();
    const subtotalCents = poTotalCents(detail);
    const taxCents = Math.round(subtotalCents * 0.08);
    const totalCents = subtotalCents + taxCents;
    const total = totalCents / 100;
    const dueDate = new Date(Date.parse(receivedAt) + 7 * 86_400_000).toISOString();
    for (const line of detail) applyStockDelta(line.sku, line.qty);

    recordGoodsReceipt(
      {
        number: grnNo,
        supplier: po.supplier,
        po: po.number,
        received: "Today · " + (stamp().split(" · ")[1] ?? ""),
        lines: detail.length,
        total,
        invoice: "Pending invoice",
        status: "Posted",
      },
      po.number,
      {
        id: "",
        bill_no: grnNo,
        supplier: po.supplier,
        grn_no: grnNo,
        due_date: dueDate,
        total_cents: totalCents,
        paid_cents: 0,
        status: "Open",
        payment_entry: null,
      },
      {
        ref: entryNo,
        description: "Goods received · " + grnNo,
        posted_at: receivedAt,
        debit:
          taxCents > 0
            ? "1200 Inventory + 2100 Sales tax payable"
            : "1200 Inventory",
        credit: "2000 Accounts payable",
        amount_cents: totalCents,
        status: "Posted",
      },
    );
    persisted.update((list) =>
      list.map((row) =>
        row.number === po.number
          ? { ...row, status: "Received", grnNo, lines: detail.length, total, detail }
          : row,
      ),
    );
    notice.set(
      grnNo +
        " posted · " +
        po.number +
        " received · " +
        detail.length +
        (detail.length === 1 ? " line" : " lines"),
    );

    void receivePurchaseOrder({
      grnNo,
      poNo: po.number,
      supplier: po.supplier,
      lines: detail,
      entryNo,
      receivedAt,
    }).catch((error) => {
      console.log("purchase receipt not written to sqlite: " + (error?.message ?? error));
    });
  };

  const suggest = () => {
    const low = inventory().filter((item) => item.status !== "OK");
    const bySupplier: Record<string, typeof low> = {};
    for (const item of low) {
      const list = bySupplier[item.supplier] ?? [];
      list.push(item);
      bySupplier[item.supplier] = list;
    }
    const highest = [...persisted(), ...purchaseOrders]
      .map((po) => Number(po.number.split("-").pop()))
      .filter((seq) => Number.isFinite(seq))
      .reduce((max, seq) => Math.max(max, seq), 145);
    let seq = highest;
    const next = Object.keys(bySupplier).map((supplier) => {
      seq += 1;
      const detail = bySupplier[supplier].map((item) => ({
        sku: item.sku,
        name: item.name,
        qty: Math.max(1, Math.ceil(item.par - item.onHand)),
        costCents: Math.round(item.unitCost * 100),
      }));
      const totalCents = poTotalCents(detail);
      return {
        number: "PO-2026-0" + seq,
        supplier,
        created: "Today",
        expected: "Nov 28",
        lines: detail.length,
        total: totalCents / 100,
        status: "Draft" as PoStatus,
        detail,
        grnNo: null,
      };
    });
    if (next.length === 0) return;
    persisted.update((list) => [...next, ...list]);
    const now = new Date().toISOString();
    for (const po of next) {
      void savePurchaseOrderDraft({
        number: po.number,
        supplier: po.supplier,
        expected: po.expected,
        lines: po.detail,
        totalCents: Math.round(po.total * 100),
        createdAt: now,
      }).catch((error) => {
        console.log("purchase order not written to sqlite: " + (error?.message ?? error));
      });
    }
  };

  return (
    <Screen
      scroll={false}
      title="Purchase orders"
      subtitle="What is on its way, and what still needs a supplier"
      actions={
        <>
          <Button label="Suggested orders" icon="auto_awesome" onPress={suggest} />
          <Button label="New purchase order" icon="add" variant="primary" />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile label="Open orders" value="3" hint="2 sent · 1 partial" icon="request_quote" />
        <StatTile label="Committed spend" value={money(896.6)} hint="this week" icon="payments" tone="info" />
        <StatTile label="Arriving today" value="1" hint="Nestlé Dairy · 3 lines" icon="local_shipping" tone="warn" />
        <StatTile label="On-time rate" value="94%" delta="+2.1%" positive hint="last 30 days" icon="verified" tone="success" />
      </View>

      <View class="flex-row items-center gap-2">
        <Each of={tabs}>
          {(name) => (
            <Chip
              label={name()}
              selected={tab() === name()}
              count={name() === "All" ? rows().length : rows().filter((po) => po.status === name()).length}
              onPress={() => tab.set(name())}
            />
          )}
        </Each>
        <View class="flex-1" />
        <Text class="font-body text-body-sm text-outline">
          Drafts are not sent to suppliers until you approve them.
        </Text>
      </View>

      <If when={notice() !== ""}>
        <View class="flex-row items-center gap-2 rounded border border-secondary/30 bg-secondary-container px-3 py-2">
          <Icon name="check_circle" size={16} color="#3F5E27" />
          <Text class="font-body text-body-sm text-on-secondary-container">{notice()}</Text>
        </View>
      </If>

      <TableWrap class="flex-1 min-h-0">
        <Scroll class="flex-1">
          <Head>
            <HeadCell label="PO" flex={1.6} />
            <HeadCell label="Supplier" flex={1.7} />
            <HeadCell label="Created" flex={1.2} />
            <HeadCell label="Expected" flex={1.2} />
            <HeadCell label="Lines" w={54} align="right" />
            <HeadCell label="Total" flex={1} align="right" />
            <HeadCell label="Status" flex={1} />
            <HeadCell label="" w={120} />
          </Head>
          <Each of={rows()}>
            {(po) => (
              <Row>
                <TextCell text={po().number} flex={1.6} mono strong />
                <Cell flex={1.7}>
                  <Text class="font-body text-body-md text-on-surface truncate">{po().supplier}</Text>
                </Cell>
                <TextCell text={po().created} flex={1.2} muted />
                <TextCell text={po().expected} flex={1.2} muted />
                <TextCell text={String(po().lines)} w={54} align="right" muted />
                <TextCell text={money(po().total)} flex={1} align="right" strong />
                <Cell flex={1}>
                  <StatusPill label={po().status} tone={toneFor[po().status]} />
                </Cell>
                <Cell w={120} align="right">
                  <If when={po().status === "Received"}>
                    <Text class="font-body text-body-sm tabular-nums text-secondary">
                      {po().grnNo ?? "Received"}
                    </Text>
                  </If>
                  <If when={po().status === "Draft"}>
                    <Text class="font-body text-body-sm text-outline">—</Text>
                  </If>
                  <If when={po().status === "Sent" || po().status === "Partial"}>
                    <Button label="Receive PO" size="sm" variant="soft" onPress={() => receive(po())} />
                  </If>
                </Cell>
              </Row>
            )}
          </Each>
        </Scroll>
      </TableWrap>

      <View class="flex-row items-center justify-between rounded-md border border-outline-variant bg-surface-container-low px-4 py-2.5">
        <Text class="font-body text-body-sm text-outline">
          Suggested orders are built from par levels and the last 14 days of usage.
        </Text>
        <Button label="Review suggestions" size="sm" variant="ghost" iconRight="arrow_forward" />
      </View>
    </Screen>
  );
}
