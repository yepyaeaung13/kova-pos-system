import { Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button, IconButton } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { Chip, StatusPill } from "../../ui/Badge";
import { StatTile } from "../../ui/Card";
import { Drawer } from "../../ui/Drawer";
import { Field, TextBox } from "../../ui/Field";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import {
  amendJournalEntry,
  discardedJournal,
  discardJournalEntry,
  draftLines,
  forgetDraftLines,
  markJournalPosted,
  postedDrafts,
  recentJournal,
  recordJournalEntry,
  rememberDraftLines,
} from "../../store";
import { accounts, journal, type Account, type JournalEntry } from "../../data/ops";
import {
  discardJournalDraft,
  initDb,
  loadAccounts,
  loadJournal,
  loadJournalLines,
  nextJournalNo,
  postDraftJournalEntry,
  postJournalEntry,
  reverseJournalEntry,
  saveJournalDraft,
  updateJournalDraft,
  type JournalLineInput,
} from "../../db/repo";
import { journalFromRow, mergeJournal } from "../../journal";
import { money } from "../../format";

const tabs = ["All", "Posted", "Draft"] as const;

export function JournalScreen() {
  const tab = signal<(typeof tabs)[number]>("All");
  const persisted = signal<JournalEntry[]>([]);
  const books = signal<Account[]>(accounts);
  const formOpen = signal(false);
  const editingRef = signal<string | null>(null);
  const amounts = signal<Record<string, { debit: string; credit: string }>>({});
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
    const discarded = discardedJournal();
    return mergeJournal(persisted(), recentJournal().map(journalFromRow), journal)
      .filter((entry) => !discarded[entry.ref])
      .map((entry) => (overrides[entry.ref] ? { ...entry, status: "Posted" } : entry));
  };

  const rows = () => all().filter((entry) => tab() === "All" || entry.status === tab());
  const posted = () =>
    all()
      .filter((entry) => entry.status === "Posted")
      .reduce((sum, entry) => sum + entry.amount, 0);

  /** Parses a typed amount into cents; blank or junk reads as zero. */
  const parseCents = (text: string) => {
    const value = Math.round(Number(text.replace(/[^0-9.]/g, "")) * 100);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };

  const amountOf = (code: string, side: "debit" | "credit") => {
    const entry = amounts()[code];
    if (!entry) return "";
    return side === "debit" ? entry.debit : entry.credit;
  };

  const setAmount = (code: string, side: "debit" | "credit", value: string) => {
    amounts.update((map) => {
      const current = map[code] ?? { debit: "", credit: "" };
      return { ...map, [code]: { ...current, [side]: value } };
    });
  };

  /** Every account with a typed amount, as a journal line. */
  const formLines = () =>
    books()
      .map((account) => ({
        accountCode: account.code,
        accountName: account.name,
        debitCents: parseCents(amountOf(account.code, "debit")),
        creditCents: parseCents(amountOf(account.code, "credit")),
      }))
      .filter((line) => line.debitCents > 0 || line.creditCents > 0);

  const debitTotal = () => formLines().reduce((sum, line) => sum + line.debitCents, 0);
  const creditTotal = () => formLines().reduce((sum, line) => sum + line.creditCents, 0);
  const difference = () => debitTotal() - creditTotal();
  const balanced = () => debitTotal() > 0 && difference() === 0;

  const openForm = () => {
    amounts.set({});
    memo.set("");
    formError.set("");
    notice.set("");
    editingRef.set(null);
    formOpen.set(true);
  };

  /** Turns structured lines into grid cell text. */
  const fillAmounts = (lines: JournalLineInput[]) => {
    const next: Record<string, { debit: string; credit: string }> = {};
    for (const line of lines) {
      next[line.accountCode] = {
        debit: line.debitCents > 0 ? (line.debitCents / 100).toFixed(2) : "",
        credit: line.creditCents > 0 ? (line.creditCents / 100).toFixed(2) : "",
      };
    }
    amounts.set(next);
  };

  const editDraft = (ref: string) => {
    const entry = all().find((item) => item.ref === ref);
    amounts.set({});
    memo.set(entry ? entry.description : "");
    formError.set("");
    notice.set("");
    editingRef.set(ref);
    formOpen.set(true);

    const remember = draftLines()[ref];
    if (remember && remember.length > 0) {
      fillAmounts(remember);
      return;
    }
    void loadJournalLines(ref)
      .then((lines) => {
        if (editingRef() === ref && formOpen()) fillAmounts(lines);
      })
      .catch(() => undefined);
  };

  /** Keeps the persisted and session copies in step after an edit. */
  const applyEdit = (
    ref: string,
    status: "Draft" | "Posted",
    total: number,
    description: string,
    debit: string,
    credit: string,
  ) => {
    persisted.update((list) =>
      list.map((entry) =>
        entry.ref === ref
          ? { ...entry, status, amount: total / 100, description, debit, credit }
          : entry,
      ),
    );
    amendJournalEntry(ref, {
      status,
      amount_cents: total,
      description,
      debit,
      credit,
    });
  };

  const submit = (asDraft: boolean) => {
    const lines = formLines();
    if (!lines.some((line) => line.debitCents > 0) || !lines.some((line) => line.creditCents > 0)) {
      formError.set("Add at least one debit line and one credit line.");
      return;
    }
    if (lines.some((line) => line.debitCents > 0 && line.creditCents > 0)) {
      formError.set("An account can only be on one side of an entry.");
      return;
    }
    if (!balanced()) {
      formError.set("Debits and credits must balance.");
      return;
    }

    const total = debitTotal();
    const postedAt = new Date().toISOString();
    const description = memo().trim() || "Manual journal entry";
    const names = (side: "debit" | "credit") =>
      lines
        .filter((line) => (side === "debit" ? line.debitCents : line.creditCents) > 0)
        .map((line) => line.accountCode + " " + line.accountName)
        .join(" + ");

    const editing = editingRef();
    const entryNo = editing ?? nextJournalNo();
    const entry = {
      entryNo,
      memo: description,
      lines: lines.map((line) => ({
        accountCode: line.accountCode,
        debitCents: line.debitCents,
        creditCents: line.creditCents,
      })),
      postedAt,
    };

    if (editing) {
      rememberDraftLines(editing, entry.lines);
      applyEdit(editing, asDraft ? "Draft" : "Posted", total, description, names("debit"), names("credit"));
      if (asDraft) {
        void updateJournalDraft(entry).catch((error) => {
          console.log("journal draft not updated in sqlite: " + (error?.message ?? error));
        });
        notice.set("Draft updated · " + editing);
      } else {
        markJournalPosted(editing);
        void updateJournalDraft(entry)
          .then(() => postDraftJournalEntry(editing))
          .catch((error) => {
            console.log("journal draft not posted in sqlite: " + (error?.message ?? error));
          });
        notice.set("Journal entry posted · " + editing + " · " + money(total / 100));
      }
      editingRef.set(null);
      formOpen.set(false);
      return;
    }

    recordJournalEntry({
      ref: entryNo,
      description,
      posted_at: postedAt,
      debit: names("debit"),
      credit: names("credit"),
      amount_cents: total,
      status: asDraft ? "Draft" : "Posted",
    });

    if (asDraft) {
      rememberDraftLines(entryNo, entry.lines);
      void saveJournalDraft(entry).catch((error) => {
        console.log("journal draft not written to sqlite: " + (error?.message ?? error));
      });
      notice.set("Draft saved · " + entryNo);
    } else {
      void postJournalEntry(entry).catch((error) => {
        console.log("journal entry not written to sqlite: " + (error?.message ?? error));
      });
      notice.set("Journal entry posted · " + entryNo + " · " + money(total / 100));
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

  const discardDraft = (ref: string) => {
    discardJournalEntry(ref);
    forgetDraftLines(ref);
    notice.set("Draft discarded · " + ref);
    void discardJournalDraft(ref).catch((error) => {
      console.log("journal draft not discarded in sqlite: " + (error?.message ?? error));
    });
  };

  const reverseEntry = (ref: string) => {
    const original = all().find((entry) => entry.ref === ref);
    if (!original) return;
    const reversalNo = nextJournalNo();
    const postedAt = new Date().toISOString();
    recordJournalEntry({
      ref: reversalNo,
      description: "Reversal of " + ref,
      posted_at: postedAt,
      debit: original.credit,
      credit: original.debit,
      amount_cents: Math.round(original.amount * 100),
      status: "Posted",
    });
    notice.set("Reversal posted · " + reversalNo + " · " + money(original.amount));
    void reverseJournalEntry({ entryNo: ref, reversalNo, postedAt }).catch((error) => {
      console.log("journal reversal not written to sqlite: " + (error?.message ?? error));
    });
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
            <HeadCell label="" w={120} />
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
                <Cell w={120} align="right">
                  <View class="flex-row items-center justify-end gap-1">
                    <If when={entry().status === "Draft"}>
                      <Button
                        label="Post"
                        size="sm"
                        variant="soft"
                        a11yLabel={"Post " + entry().ref}
                        onPress={() => postDraft(entry().ref)}
                      />
                      <IconButton
                        icon="edit"
                        size={28}
                        variant="ghost"
                        label={"Edit " + entry().ref}
                        onPress={() => editDraft(entry().ref)}
                      />
                      <IconButton
                        icon="delete"
                        size={28}
                        variant="ghost"
                        label={"Discard " + entry().ref}
                        onPress={() => discardDraft(entry().ref)}
                      />
                    </If>
                    <If when={entry().status === "Posted"}>
                      <IconButton
                        icon="undo"
                        size={28}
                        variant="ghost"
                        label={"Reverse " + entry().ref}
                        onPress={() => reverseEntry(entry().ref)}
                      />
                    </If>
                  </View>
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
          subtitle="Add debit and credit lines; they must balance"
          width={620}
          onClose={() => formOpen.set(false)}
        >
          <View class="flex-1 min-h-0">
            <Scroll class="flex-1">
              <View class="gap-4 p-4">
                <Field label="Description">
                  <TextBox
                    value={memo()}
                    onChange={(value) => memo.set(value)}
                    placeholder="Description"
                  />
                </Field>

                <View class="flex-row items-center gap-3 rounded-md border border-outline-variant bg-surface-container-low p-3">
                  <View class="flex-1 gap-0">
                    <Text class="font-label text-label-sm uppercase tracking-label text-outline">Debits</Text>
                    <Text class="font-label text-label-md tabular-nums text-on-surface">
                      {money(debitTotal() / 100)}
                    </Text>
                  </View>
                  <View class="flex-1 gap-0">
                    <Text class="font-label text-label-sm uppercase tracking-label text-outline">Credits</Text>
                    <Text class="font-label text-label-md tabular-nums text-on-surface">
                      {money(creditTotal() / 100)}
                    </Text>
                  </View>
                  <View class="flex-1 gap-0">
                    <Text class="font-label text-label-sm uppercase tracking-label text-outline">Difference</Text>
                    <Text
                      class={
                        "font-label text-label-md tabular-nums " +
                        (difference() === 0 ? "text-on-surface" : "text-error")
                      }
                    >
                      {money(Math.abs(difference()) / 100)}
                    </Text>
                  </View>
                  <StatusPill label={balanced() ? "Balanced" : "Unbalanced"} tone={balanced() ? "success" : "warn"} />
                </View>

                <View class="gap-1">
                  <View class="flex-row items-center gap-2 border-b border-outline-variant pb-1.5">
                    <Text class="flex-1 font-label text-label-sm uppercase tracking-label text-outline">
                      Account
                    </Text>
                    <Text class="w-32 text-center font-label text-label-sm text-outline">Debit</Text>
                    <Text class="w-32 text-center font-label text-label-sm text-outline">Credit</Text>
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
                        <TextBox
                          value={amountOf(account().code, "debit")}
                          onChange={(value) => setAmount(account().code, "debit", value)}
                          placeholder="0.00"
                          a11yLabel={"Debit " + account().code}
                          class="w-32"
                        />
                        <TextBox
                          value={amountOf(account().code, "credit")}
                          onChange={(value) => setAmount(account().code, "credit", value)}
                          placeholder="0.00"
                          a11yLabel={"Credit " + account().code}
                          class="w-32"
                        />
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
                disabled={!balanced()}
                onPress={() => submit(false)}
              />
              <Button
                label="Save draft"
                a11yLabel="Save draft"
                grow
                disabled={!balanced()}
                onPress={() => submit(true)}
              />
            </View>
          </View>
        </Drawer>
      </If>
    </Screen>
  );
}
