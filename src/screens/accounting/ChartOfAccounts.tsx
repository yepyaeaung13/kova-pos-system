import { Scroll, signal, Text, View } from "nsh";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { Chip } from "../../ui/Badge";
import { InfoRow, StatTile } from "../../ui/Card";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { accounts, type Account, type AccountType } from "../../data/ops";
import { initDb, loadAccounts } from "../../db/repo";
import { money } from "../../format";

const types = ["All", "Asset", "Liability", "Equity", "Revenue", "Expense"] as const;

export function ChartOfAccountsScreen() {
  const filter = signal<(typeof types)[number]>("All");
  const live = signal<Account[]>(accounts);

  void initDb()
    .then((ready) => (ready ? loadAccounts() : undefined))
    .then((rows) => {
      if (!rows || rows.length === 0) return;
      live.set(
        rows.map((row) => ({
          code: row.code,
          name: row.name,
          type: row.type as Account["type"],
          balance: Number(row.balance_cents) / 100,
        })),
      );
    })
    .catch(() => undefined);

  const all = () => live();
  const rows = () => all().filter((account) => filter() === "All" || account.type === filter());

  const total = (type: AccountType) =>
    all().filter((account) => account.type === type).reduce((sum, account) => sum + account.balance, 0);

  return (
    <Screen
      scroll={false}
      title="Chart of accounts"
      subtitle="The skeleton every sale, bill and journal entry posts against"
      actions={
        <>
          <Button label="Import" icon="upload_file" />
          <Button label="New account" icon="add" variant="primary" />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile label="Accounts" value={String(all().length)} hint="5 types" icon="account_tree" />
        <StatTile label="Assets" value={money(total("Asset"))} hint="cash, bank, stock" icon="savings" tone="success" />
        <StatTile label="Liabilities" value={money(total("Liability"))} hint="payables + tax" icon="request_quote" tone="warn" />
        <StatTile label="Revenue MTD" value={money(total("Revenue"))} hint="two revenue accounts" icon="trending_up" tone="info" />
      </View>

      <View class="flex-row items-center gap-2">
        <Each of={types}>
          {(name) => (
            <Chip
              label={name()}
              selected={filter() === name()}
              count={name() === "All" ? all().length : all().filter((account) => account.type === name()).length}
              onPress={() => filter.set(name())}
            />
          )}
        </Each>
        <View class="flex-1" />
        <Text class="font-body text-body-sm text-outline">
          Debits and credits must balance before an entry can post.
        </Text>
      </View>

      <View class="flex-1 flex-row gap-4 min-h-0">
        <TableWrap class="flex-1 min-h-0">
          <Scroll class="flex-1">
            <Head>
              <HeadCell label="Code" flex={0.9} />
              <HeadCell label="Account" flex={2.8} />
              <HeadCell label="Type" flex={1.2} />
              <HeadCell label="Balance" flex={1.2} align="right" />
              <HeadCell label="" w={54} />
            </Head>
            <Each of={rows()}>
              {(account) => (
                <Row>
                  <TextCell text={account().code} flex={0.9} mono muted />
                  <Cell flex={2.8}>
                    <Text class="font-label text-label-md text-on-surface truncate">{account().name}</Text>
                  </Cell>
                  <Cell flex={1.2}>
                    <Text class="font-body text-body-md text-on-surface-variant">{account().type}</Text>
                  </Cell>
                  <TextCell text={money(account().balance)} flex={1.2} align="right" strong />
                  <Cell w={54} align="right">
                    <Text class="font-body text-body-sm text-outline">···</Text>
                  </Cell>
                </Row>
              )}
            </Each>
          </Scroll>
        </TableWrap>

        <View class="gap-3" style={{ width: 330 }}>
          <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <Text class="font-headline text-headline-md text-on-surface">Trial balance</Text>
            <InfoRow label="Total debits" value={money(total("Asset") + total("Expense"))} />
            <InfoRow label="Total credits" value={money(total("Liability") + total("Equity") + total("Revenue"))} />
            <View class="border-t border-outline-variant pt-2">
              <InfoRow
                label="Difference"
                value={money(
                  Math.abs(
                    total("Asset") + total("Expense") -
                    (total("Liability") + total("Equity") + total("Revenue")),
                  ),
                )}
                strong
              />
            </View>
            <Text class="font-body text-body-sm text-outline">
              Opening balances are seeded from the migration; the difference is the
              current period's unposted profit.
            </Text>
          </View>

          <View class="flex-1 gap-2 rounded-md border border-outline-variant bg-surface-container-low p-4">
            <Text class="font-title text-title-md text-on-surface">Account types</Text>
            <Each of={types.slice(1)}>
              {(type) => (
                <View class="flex-row items-center justify-between border-t border-outline-variant/60 pt-1.5">
                  <Text class="font-body text-body-md text-on-surface">{type()}</Text>
                  <Text class="font-label text-label-md tabular-nums text-on-surface-variant">
                    {money(total(type() as AccountType))}
                  </Text>
                </View>
              )}
            </Each>
          </View>
        </View>
      </View>
    </Screen>
  );
}
