import { Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { CardHeader, Eyebrow, InfoRow, StatTile } from "../../ui/Card";
import { StatusPill } from "../../ui/Badge";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { bankLines } from "../../data/ops";
import {
  bankLineId,
  initDb,
  loadBankBalance,
  loadBankLines,
  setBankLineMatched,
  type BankLineRow,
} from "../../db/repo";
import { money } from "../../format";

interface BankLineView {
  id: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  suggestion: string;
  matched: boolean;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `Nov 25` from a stored statement date. */
function lineDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return months[date.getMonth()] + " " + date.getDate();
}

function fromRow(row: BankLineRow): BankLineView {
  return {
    id: row.id,
    date: lineDate(row.statement_date),
    description: row.description,
    reference: row.reference,
    amount: Number(row.amount_cents) / 100,
    suggestion: row.suggestion,
    matched: Number(row.matched) === 1,
  };
}

/** Opening balance that ties the design's six statement lines to the GL balance. */
const OPENING_BALANCE = 26140.75;

export function ReconciliationScreen() {
  const lines = signal<BankLineView[]>(
    bankLines.map((line) => ({
      id: bankLineId(line.reference),
      date: line.date,
      description: line.description,
      reference: line.reference,
      amount: line.amount,
      suggestion: line.suggestion,
      matched: line.matched,
    })),
  );
  const book = signal(28410.75);
  const notice = signal("");

  void initDb()
    .then((ready) => {
      if (!ready) return;
      return Promise.all([loadBankLines(), loadBankBalance()]);
    })
    .then((result) => {
      if (!result) return;
      const [rows, balance] = result;
      if (rows.length > 0) lines.set(rows.map(fromRow));
      if (balance !== null) book.set(balance / 100);
    })
    .catch(() => undefined);

  const toggle = (index: number) => {
    const line = lines()[index];
    if (!line) return;
    const matched = !line.matched;
    lines.update((list) =>
      list.map((row, i) => (i === index ? { ...row, matched } : row)),
    );
    notice.set("");
    void setBankLineMatched({
      id: line.id,
      matched,
      entryNo: matched ? line.suggestion : null,
    }).catch((error) => {
      console.log("bank line match not written to sqlite: " + (error?.message ?? error));
    });
  };

  const autoMatch = () => {
    const pending = lines().filter((line) => !line.matched);
    if (pending.length === 0) {
      notice.set("Every statement line is already matched.");
      return;
    }
    lines.update((list) =>
      list.map((line) => (line.matched ? line : { ...line, matched: true })),
    );
    notice.set(
      "Auto-match applied to " + pending.length + (pending.length === 1 ? " line." : " lines."),
    );
    for (const line of pending) {
      void setBankLineMatched({
        id: line.id,
        matched: true,
        entryNo: line.suggestion,
      }).catch((error) => {
        console.log("bank line match not written to sqlite: " + (error?.message ?? error));
      });
    }
  };

  const finish = () => {
    const unmatched = lines().filter((line) => !line.matched).length;
    notice.set(
      unmatched === 0
        ? "Bank reconciliation closed · " + money(closing()) + " cleared."
        : unmatched + (unmatched === 1 ? " line still needs a match." : " lines still need a match."),
    );
  };

  const matchedValue = () =>
    lines().filter((line) => line.matched).reduce((sum, line) => sum + Math.abs(line.amount), 0);
  const unmatched = () => lines().filter((line) => !line.matched);
  const unmatchedValue = () =>
    unmatched().reduce((sum, line) => sum + Math.abs(line.amount), 0);
  const moneyIn = () =>
    lines().filter((line) => line.amount > 0).reduce((sum, line) => sum + line.amount, 0);
  const moneyOut = () =>
    lines().filter((line) => line.amount < 0).reduce((sum, line) => sum + Math.abs(line.amount), 0);
  const closing = () => OPENING_BALANCE + moneyIn() - moneyOut();
  const difference = () => book() - closing();

  return (
    <Screen
      scroll={false}
      title="Bank reconciliation"
      subtitle="Meezan current · statement 1–25 November 2026"
      actions={
        <>
          <Button label="Import statement" icon="upload_file" />
          <Button label="Auto-match" icon="auto_awesome" variant="primary" onPress={autoMatch} />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile label="Statement balance" value={money(closing())} hint="bank feed · 3 min ago" icon="account_balance" />
        <StatTile label="Book balance" value={money(book())} hint="GL · 1010" icon="menu_book" tone="info" />
        <StatTile
          label="Matched"
          value={String(lines().filter((line) => line.matched).length)}
          hint={"of " + lines().length + " lines"}
          icon="check_circle"
          tone="success"
        />
        <StatTile label="Unmatched value" value={money(unmatchedValue())} hint="needs a reviewer" icon="report" tone="warn" />
      </View>

      <If when={notice() !== ""}>
        <View class="flex-row items-center gap-2 rounded border border-tertiary/30 bg-tertiary-container px-3 py-2">
          <Icon name="info" size={16} color="#2F5372" />
          <Text class="font-body text-body-sm text-on-tertiary-container">{notice()}</Text>
        </View>
      </If>

      <View class="flex-row gap-4 min-h-0 flex-1">
        <TableWrap class="flex-1 min-h-0">
          <Scroll class="flex-1">
            <Head>
              <HeadCell label="Date" flex={0.7} />
              <HeadCell label="Description" flex={2.2} />
              <HeadCell label="Reference" flex={1.2} />
              <HeadCell label="Amount" flex={1} align="right" />
              <HeadCell label="Suggestion" flex={1.6} />
              <HeadCell label="Match" flex={1} />
            </Head>
            <Each of={lines()}>
              {(line, index) => (
                <Row class={line().matched ? "" : "bg-amber-container/30"}>
                  <TextCell text={line().date} flex={0.7} muted />
                  <Cell flex={2.2}>
                    <View class="gap-0 min-w-0">
                      <Text class="font-body text-body-md text-on-surface truncate">{line().description}</Text>
                    </View>
                  </Cell>
                  <TextCell text={line().reference} flex={1.2} mono muted />
                  <Cell flex={1} align="right">
                    <Text
                      class={
                        "font-label text-label-md tabular-nums " +
                        (line().amount < 0 ? "text-on-surface" : "text-secondary")
                      }
                    >
                      {line().amount < 0 ? "−" : "+"}{money(Math.abs(line().amount))}
                    </Text>
                  </Cell>
                  <Cell flex={1.6}>
                    <Text class="font-body text-body-sm text-on-surface-variant truncate">{line().suggestion}</Text>
                  </Cell>
                  <Cell flex={1}>
                    <View
                      role="button"
                      accessibilityLabel={"Match " + line().reference}
                      onPress={() => toggle(index())}
                      class={
                        "flex-row items-center gap-1.5 self-start rounded-full border px-2 py-0.5 " +
                        (line().matched
                          ? "border-secondary/20 bg-secondary-container"
                          : "border-outline-variant bg-surface-container-low")
                      }
                    >
                      <Icon name={line().matched ? "check" : "sync"} size={12} />
                      <Text class="font-label text-label-sm text-on-surface">
                        {line().matched ? "Matched" : "Match"}
                      </Text>
                    </View>
                  </Cell>
                </Row>
              )}
            </Each>
          </Scroll>
          <View class="flex-row items-center justify-between border-t border-outline-variant bg-surface-container-low px-4 py-2.5">
            <Text class="font-body text-body-sm text-outline">
              Matched value {money(matchedValue())} · unmatched {money(unmatchedValue())}
            </Text>
            <StatusPill
              label={unmatched().length === 0 ? "Reconciled" : unmatched().length + " open"}
              tone={unmatched().length === 0 ? "success" : "warn"}
            />
          </View>
        </TableWrap>

        <Scroll class="min-h-0" style={{ width: 330 }}>
          <View class="gap-3">
            <View class="gap-2.5 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
              <CardHeader title="Statement summary" hint="1–25 November" />
              <InfoRow label="Opening balance" value={money(OPENING_BALANCE)} />
              <InfoRow label="Money in" value={money(moneyIn())} />
              <InfoRow label="Money out" value={"−" + money(moneyOut())} />
              <View class="border-t border-outline-variant pt-2">
                <InfoRow label="Closing balance" value={money(closing())} strong />
              </View>
              <InfoRow
                label="Difference"
                value={(difference() < 0 ? "−" : "") + money(Math.abs(difference()))}
              />
            </View>

            <View class="gap-2 rounded-md border border-tertiary/20 bg-tertiary-container p-4">
              <View class="flex-row items-center gap-2">
                <Icon name="auto_awesome" size={16} color="#2F5372" />
                <Text class="font-title text-title-md text-on-tertiary-container">Auto-match ready</Text>
              </View>
              <Text class="font-body text-body-sm text-on-tertiary-container">
                {unmatched().length === 0
                  ? "Every statement line is matched against the ledger."
                  : unmatched().length +
                    (unmatched().length === 1 ? " line has" : " lines have") +
                    " a ledger suggestion. Apply them together, then clear the rest by hand."}
              </Text>
            </View>

            <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-low p-4">
              <Eyebrow label="Why it matters" />
              <Text class="font-body text-body-sm text-on-surface-variant">
                Unmatched card settlements are the usual cause of a drawer that looks
                short at shift close. Clear them before the Z-report.
              </Text>
              <Button
                label="Finish reconciliation"
                size="sm"
                variant="primary"
                icon="check"
                onPress={finish}
              />
            </View>
          </View>
        </Scroll>
      </View>
    </Screen>
  );
}
