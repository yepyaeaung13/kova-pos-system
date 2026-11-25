import { Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { Chip, StatusPill } from "../../ui/Badge";
import { StatTile } from "../../ui/Card";
import { Drawer } from "../../ui/Drawer";
import { Field, TextBox } from "../../ui/Field";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { recentJournal, recordJournalEntry, postedDrafts, markJournalPosted } from "../../store";
import { accounts, journal, type Account, type JournalEntry } from "../../data/ops";
import {
  initDb,
  loadAccounts,
  loadJournal,
  nextJournalNo,
  postDraftJournalEntry,
  postJournalEntry,
  saveJournalDraft,
} from "../../db/repo";
import { journalFromRow, mergeJournal } from "../../journal";
import { money } from "../../format";

const tabs = ["All", "Posted", "Draft"] as const;

export function JournalScreen() {
  const tab = signal<(typeof tabs)[number]>("All");
  const persisted = signal<JournalEntry[]>([]);
  const books = signal<Account[]>(accounts);
  const formOpen = signal(false);
  const debitCode = signal("1200");
  const creditCode = signal("1010");
  const amountText = signal("");
  const memo = signal("");
  const formError = signal("");
  const notice = signal("");

  void initDb()
    .then((ready) => (ready ? Promise.all([loadJournal(), loadAccounts()]) : undefined))
    .then((result) => {
      if (!result) return;
      const [journalRows, accountRows] = result;
      if (journalRows.length > 0) persisted.set(journalRows.map(journalFromRow));
      if (accountRows.length > 0) {
        books.set(
          accountRows.map((row) => ({
            code: row.code,
            name: row.name,
            type: row.type as Account["type"],
            balance: Number(row.balance_cents) / 100,
          })),
        );
      }
    })
    .catch(() => undefined);

  const all = () => {
    const overrides = postedDrafts();
    return mergeJournal(persisted(), recentJournal().map(journalFromRow), journal).map(
      (entry) => (overrides[entry.ref] ? { ...entry, status: "Posted" } : entry),
    );
  };

  const rows = () => all().filter((entry) => tab() === "All" || entry.status === tab());
  const posted = () =>
    all()
      .filter((entry) => entry.status === "Posted")
      .reduce((sum, entry) => sum + entry.amount, 0);

  const accountByCode = (code: string) => books().find((account) => account.code === code);
  const labelFor = (code: string) => {
    const account = accountByCode(code);
    return account ? account.code + " " + account.name : code;
  };

  const openForm = () => {
    debitCode.set("1200");
    creditCode.set("1010");
    amountText.set("");
    memo.set("");
    formError.set("");
    notice.set("");
    formOpen.set(true);
  };

  const submit = (asDraft: boolean) => {
    const amount = Math.round(Number(amountText().replace(/[^0-9.]/g, "")) * 100);
    const debit = accountByCode(debitCode());
    const credit = accountByCode(creditCode());
    if (!debit || !credit) {
      formError.set("Pick a debit and a credit account.");
      return;
    }
    if (debit.code === credit.code) {
      formError.set("Debit and credit must be different accounts.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      formError.set("Enter an amount greater than zero.");
      return;
    }

    const entryNo = nextJournalNo();
    const postedAt = new Date().toISOString();
    const description = memo().trim() || "Manual journal entry";
    recordJournalEntry({
      ref: entryNo,
      description,
      posted_at: postedAt,
      debit: debit.code + " " + debit.name,
      credit: credit.code + " " + credit.name,
      amount_cents: amount,
      status: asDraft ? "Draft" : "Posted",
    });

    if (asDraft) {
      void saveJournalDraft({
        entryNo,
        memo: description,
        debitCode: debit.code,
        creditCode: credit.code,
        amountCents: amount,
        postedAt,
      }).catch((error) => {
        console.log("journal draft not written to sqlite: " + (error?.message ?? error));
      });
      notice.set("Draft saved · " + entryNo);
    } else {
      void postJournalEntry({
        entryNo,
        memo: description,
        debitCode: debit.code,
        creditCode: credit.code,
        amountCents: amount,
        postedAt,
      }).catch((error) => {
        console.log("journal entry not written to sqlite: " + (error?.message ?? error));
      });
      notice.set("Journal entry posted · " + entryNo + " · " + money(amount / 100));
    }

    formOpen.set(false);
  };

  const postDraft = (ref: string) => {
    markJournalPosted(ref);
    notice.set("Journal entry posted · " + ref);
    void postDraftJournalEntry(ref).catch((error) => {
      console.log("journal draft not posted in sqlite: " + (error?.message ?? error));
    });
  };

  const postFirstDraft = () => {
    const draft = all().find((entry) => entry.status === "Draft");
    if (draft) postDraft(draft.ref);
  };

  return (
    <Screen
      scroll={false}
      title="General journal"
      subtitle="Every double entry, newest first — auto-posted or manual"
      actions={
        <>
          <Button label="Import entries" icon="upload_file" />
          <Button label="New entry" icon="add" variant="primary" onPress={openForm} />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile label="Entries this month" value={String(all().length + 412)} hint="register auto-posts" icon="menu_book" />
        <StatTile label="Posted value" value={money(posted())} hint="visible window" icon="check_circle" tone="success" />
        <StatTile
          label="Drafts"
          value={String(all().filter((entry) => entry.status === "Draft").length)}
          hint="needs a reviewer"
          icon="edit_note"
          tone="warn"
        />
        <StatTile label="Ledger balance" value="Balanced" hint="debits = credits" icon="balance" tone="info" />
      </View>

      <View class="flex-row items-center gap-2">
        <Each of={tabs}>
          {(name) => (
            <Chip
              label={name()}
              selected={tab() === name()}
              count={name() === "All" ? all().length : all().filter((entry) => entry.status === name()).length}
              onPress={() => tab.set(name())}
            />
          )}
        </Each>
        <View class="flex-1" />
        <View class="flex-row items-center gap-1.5 rounded border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5">
          <Text class="font-label text-label-sm text-on-surface-variant">Nov 2026 · all sources</Text>
        </View>
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
            <HeadCell label="Date" flex={0.8} />
            <HeadCell label="Reference" flex={1.4} />
            <HeadCell label="Description" flex={2.4} />
            <HeadCell label="Debit" flex={1.7} />
            <HeadCell label="Credit" flex={1.7} />
            <HeadCell label="Amount" flex={1} align="right" />
            <HeadCell label="Status" flex={0.9} />
            <HeadCell label="" w={70} />
          </Head>
          <Each of={rows()}>
            {(entry) => (
              <Row>
                <TextCell text={entry().date} flex={0.8} muted />
                <TextCell text={entry().ref} flex={1.4} mono muted />
                <Cell flex={2.4}>
                  <Text class="font-body text-body-md text-on-surface truncate">{entry().description}</Text>
                </Cell>
                <Cell flex={1.7}>
                  <Text class="font-body text-body-md text-on-surface-variant truncate">{entry().debit}</Text>
                </Cell>
                <Cell flex={1.7}>
                  <Text class="font-body text-body-md text-on-surface-variant truncate">{entry().credit}</Text>
                </Cell>
                <TextCell text={money(entry().amount)} flex={1} align="right" strong />
                <Cell flex={0.9}>
                  <StatusPill label={entry().status} tone={entry().status === "Posted" ? "success" : "warn"} />
                </Cell>
                <Cell w={70} align="right">
                  <If when={entry().status === "Draft"}>
                    <Button
                      label="Post"
                      size="sm"
                      variant="soft"
                      a11yLabel={"Post " + entry().ref}
                      onPress={() => postDraft(entry().ref)}
                    />
                  </If>
                </Cell>
              </Row>
            )}
          </Each>
        </Scroll>
      </TableWrap>

      <View class="flex-row items-center justify-between rounded-md border border-outline-variant bg-surface-container-low px-4 py-2.5">
        <Text class="font-body text-body-sm text-outline">
          Register sales post two entries: revenue, and tax payable. Card settlements post when the bank confirms.
        </Text>
        <View class="flex-row items-center gap-2">
          <Button label="Post draft" size="sm" variant="soft" icon="check" onPress={postFirstDraft} />
          <Button label="Export GL" size="sm" variant="ghost" icon="download" />
        </View>
      </View>

      <If when={formOpen()}>
        <Drawer
          title="New journal entry"
          subtitle="Pick the debit and credit accounts; they must balance"
          width={560}
          onClose={() => formOpen.set(false)}
        >
          <View class="flex-1 min-h-0">
            <Scroll class="flex-1">
              <View class="gap-4 p-4">
                <View class="flex-row gap-2 rounded-md border border-outline-variant bg-surface-container-low p-3">
                  <View class="flex-1 gap-0 min-w-0">
                    <Text class="font-label text-label-sm uppercase tracking-label text-outline">Debit</Text>
                    <Text class="font-label text-label-md text-on-surface truncate">{labelFor(debitCode())}</Text>
                  </View>
                  <View class="flex-1 gap-0 min-w-0">
                    <Text class="font-label text-label-sm uppercase tracking-label text-outline">Credit</Text>
                    <Text class="font-label text-label-md text-on-surface truncate">{labelFor(creditCode())}</Text>
                  </View>
                </View>

                <View class="flex-row gap-3">
                  <Field label="Amount" class="flex-1">
                    <TextBox
                      value={amountText()}
                      onChange={(value) => amountText.set(value)}
                      placeholder="Amount"
                    />
                  </Field>
                  <Field label="Description" class="flex-1">
                    <TextBox
                      value={memo()}
                      onChange={(value) => memo.set(value)}
                      placeholder="Description"
                    />
                  </Field>
                </View>

                <View class="gap-1">
                  <View class="flex-row items-center gap-2 border-b border-outline-variant pb-1.5">
                    <Text class="flex-1 font-label text-label-sm uppercase tracking-label text-outline">
                      Account
                    </Text>
                    <Text class="w-8 text-center font-label text-label-sm text-outline">Dr</Text>
                    <Text class="w-8 text-center font-label text-label-sm text-outline">Cr</Text>
                  </View>
                  <Each of={books()}>
                    {(account) => (
                      <View class="flex-row items-center gap-2 border-b border-outline-variant/60 px-1 py-1.5">
                        <View class="flex-1 gap-0 min-w-0">
                          <Text class="font-label text-label-md text-on-surface truncate">
                            {account().code + " " + account().name}
                          </Text>
                          <Text class="font-body text-body-sm text-outline">{account().type}</Text>
                        </View>
                        <View
                          role="button"
                          accessibilityLabel={"Debit " + account().code}
                          onPress={() => debitCode.set(account().code)}
                          class={
                            "h-7 w-8 items-center justify-center rounded-sm border " +
                            (debitCode() === account().code
                              ? "border-primary bg-primary"
                              : "border-outline-variant bg-surface-container-lowest")
                          }
                        >
                          <Text
                            class={
                              "font-label text-label-sm " +
                              (debitCode() === account().code ? "text-on-primary" : "text-on-surface-variant")
                            }
                          >
                            D
                          </Text>
                        </View>
                        <View
                          role="button"
                          accessibilityLabel={"Credit " + account().code}
                          onPress={() => creditCode.set(account().code)}
                          class={
                            "h-7 w-8 items-center justify-center rounded-sm border " +
                            (creditCode() === account().code
                              ? "border-secondary bg-secondary"
                              : "border-outline-variant bg-surface-container-lowest")
                          }
                        >
                          <Text
                            class={
                              "font-label text-label-sm " +
                              (creditCode() === account().code ? "text-on-secondary" : "text-on-surface-variant")
                            }
                          >
                            C
                          </Text>
                        </View>
                      </View>
                    )}
                  </Each>
                </View>

                <If when={formError() !== ""}>
                  <Text class="font-body text-body-sm text-error">{formError()}</Text>
                </If>
              </View>
            </Scroll>

            <View class="flex-row gap-2 border-t border-outline-variant p-4">
              <Button label="Cancel" grow onPress={() => formOpen.set(false)} />
              <Button
                label="Post entry"
                a11yLabel="Post entry"
                variant="primary"
                grow
                onPress={() => submit(false)}
              />
              <Button label="Save draft" a11yLabel="Save draft" grow onPress={() => submit(true)} />
            </View>
          </View>
        </Drawer>
      </If>
    </Screen>
  );
}
