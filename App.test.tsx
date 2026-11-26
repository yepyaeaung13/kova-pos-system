import { expect, open, test } from "nsh/test";

/** Case-insensitive screen assertion: `textTransform` changes what renders. */
function has(app: { texts(): string[] }, text: string): boolean {
  const all = app.texts().join(" \u0001 ").toLowerCase();
  return all.includes(text.toLowerCase());
}

/**
 * Desktop smoke test: every workspace screen mounts and shows its own
 * content, and the register → checkout → invoice path keeps the ticket.
 */
test("the desktop shell renders every screen", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  // Register
  expect(has(app, "Order #1049")).toBe(true);
  expect(has(app, "Café Latte")).toBe(true);
  expect(has(app, "Popular right now")).toBe(true);

  await app.press("Dashboard");
  expect(has(app, "Gross sales")).toBe(true);
  expect(has(app, "Payment mix")).toBe(true);

  await app.press("Orders");
  expect(has(app, "Kitchen queue")).toBe(true);

  await app.press("Sale");
  expect(has(app, "Gross taken")).toBe(true);

  await app.press("Products");
  expect(has(app, "Menu items")).toBe(true);

  await app.press("Customers");
  expect(has(app, "Stamp card")).toBe(true);

  await app.press("Reports");
  expect(has(app, "Drawer reconciliation")).toBe(true);

  await app.press("Settings");
  expect(has(app, "Branch & terminal")).toBe(true);
  await app.press("Save changes");
  expect(has(app, "Saved")).toBe(true);

  // Inventory
  await app.press("INV");
  expect(has(app, "Stock value")).toBe(true);

  await app.press("Stock items");
  expect(has(app, "SKUs tracked")).toBe(true);

  await app.press("Recipes & BOM");
  expect(has(app, "Recipes costed")).toBe(true);

  await app.press("Goods received");
  expect(has(app, "Received this week")).toBe(true);

  await app.press("Purchase orders >> nth=0");
  expect(has(app, "Open orders")).toBe(true);

  await app.press("Adjustments");
  expect(has(app, "Posted today")).toBe(true);

  await app.press("Transfers");
  expect(has(app, "In transit")).toBe(true);

  await app.press("Suppliers & audits");
  expect(has(app, "Active suppliers")).toBe(true);

  // Accounting
  await app.press("ACC");
  expect(has(app, "Profit & loss")).toBe(true);

  await app.press("Chart of accounts >> nth=0");
  expect(has(app, "Trial balance")).toBe(true);

  await app.press("General journal");
  expect(has(app, "Entries this month")).toBe(true);

  await app.press("Expenses >> nth=0");
  expect(has(app, "Spent this month")).toBe(true);

  await app.press("Vendor payables");
  expect(has(app, "Total payable")).toBe(true);

  await app.press("Bank reconciliation >> nth=0");
  expect(has(app, "Statement balance")).toBe(true);

  await app.press("P&L & tax >> nth=0");
  expect(has(app, "GST position")).toBe(true);
});

test("a sale moves from the register to the invoice", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("Charge $17.11");
  expect(has(app, "Checkout")).toBe(true);
  expect(has(app, "Cash received")).toBe(true);

  await app.press("Complete sale · $17.11");
  expect(has(app, "Sale invoice (A4)")).toBe(true);
  expect(has(app, "Tax invoice")).toBe(true);
  expect(has(app, "INV-GUL-T01-0135")).toBe(true);
});

test("signing out shows the full-window clock-in screen", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("label:Switch cashier");
  expect(has(app, "Clock in")).toBe(true);
  expect(has(app, "Open the register")).toBe(true);
  expect(has(app, "Gulberg Café · GUL-T01")).toBe(true);

  await app.press("Open the register");
  expect(has(app, "Order #1049")).toBe(true);
});

test("modifiers, editing a line and the customer picker", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  // A coffee opens its options; oat milk is a paid modifier.
  await app.press("label:Add Cappuccino");
  expect(has(app, "Add to order")).toBe(true);
  await app.press("Oat milk");
  await app.press("Add to order");
  expect(has(app, "Oat milk")).toBe(true);

  // The existing latte line can be edited in place.
  await app.press("label:Edit Café Latte");
  expect(has(app, "Update line")).toBe(true);
  await app.press("Large 16 oz");
  expect(has(app, "+$0.60")).toBe(true);
  await app.press("Update line");
  expect(has(app, "Large 16 oz")).toBe(true);

  // Attaching a walk-in clears loyalty from the ticket.
  await app.press("label:Choose customer");
  expect(has(app, "Attach a customer")).toBe(true);
  await app.press("label:Walk-in guest");
  expect(has(app, "Walk-in guest")).toBe(true);
  expect(has(app, "Add a member to earn points")).toBe(true);
});

test("a manual invoice saves and prints", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("Sale");
  await app.press("New invoice");
  expect(has(app, "New sale invoice")).toBe(true);
  expect(has(app, "Sale items (3)")).toBe(true);
  expect(has(app, "Grand total")).toBe(true);

  await app.press("Save & print A4");
  expect(has(app, "Sale invoice (A4)")).toBe(true);
  expect(has(app, "Zainab Studio (Catering)")).toBe(true);
  expect(has(app, "On account") || has(app, "paid in full")).toBe(true);
});

test("holding and resuming a ticket", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("label:Hold order");
  expect(has(app, "Tap a menu item to start the order.")).toBe(true);
  expect(has(app, "1 held")).toBe(true);

  await app.press("label:Open held orders");
  expect(has(app, "Held orders")).toBe(true);
  await app.press("Resume");
  expect(has(app, "Charge $17.11")).toBe(true);
});

test("the discount editor applies a new rate", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("label:Edit discount");
  expect(has(app, "Apply discount")).toBe(true);
  await app.press("15%");
  await app.press("Apply discount");
  expect(has(app, "15% off")).toBe(true);
});

test("a sale is refunded from its drawer", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("Sale");
  await app.press("INV-GUL-T01-0134");
  expect(has(app, "Subtotal")).toBe(true);

  await app.press("Refund");
  expect(has(app, "Manager approval")).toBe(true);

  // Wrong PIN is rejected, then the manager PIN goes through.
  for (const digit of ["1", "1", "1", "1"]) await app.press("label:PIN " + digit);
  await app.press("Approve");
  expect(has(app, "Incorrect PIN")).toBe(true);

  for (const digit of ["2", "4", "6", "8"]) await app.press("label:PIN " + digit);
  await app.press("Approve");
  expect(has(app, "Confirm refund · $12.20")).toBe(true);

  await app.press("Confirm refund · $12.20");
  expect(has(app, "Refunded $12.20")).toBe(true);
  expect(has(app, "Refunded")).toBe(true);
});

test("a ticket drawer advances and reprints", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("Orders");
  await app.press("label:Open ticket 1049");
  expect(has(app, "Ticket timeline")).toBe(true);
  expect(has(app, "Table 4")).toBe(true);

  await app.press("Advance · Start preparing");
  expect(has(app, "Preparing")).toBe(true);

  await app.press("Reprint ticket");
  expect(has(app, "kitchen printer")).toBe(true);
});

test("a tip is added at checkout and printed on the invoice", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("Charge $17.11");
  await app.press("15%");
  expect(has(app, "Add tip")).toBe(true);
  expect(has(app, "Complete sale · $19.49")).toBe(true);

  await app.press("Complete sale · $19.49");
  expect(has(app, "Sale invoice (A4)")).toBe(true);
  expect(has(app, "Tip")).toBe(true);
  expect(has(app, "$19.49")).toBe(true);
});

test("a ticket can be split onto a held ticket", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("label:Split bill");
  expect(has(app, "Split ticket")).toBe(true);
  await app.press("label:Split Café Latte");
  await app.press("Split off 1 item");

  expect(has(app, "1 held")).toBe(true);
  expect(has(app, "Charge $8.36")).toBe(true);
});

test("the receipt preview prints the last invoice", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("Charge $17.11");
  await app.press("Complete sale · $17.11");
  await app.press("Receipt");
  expect(has(app, "Receipt preview")).toBe(true);
  expect(has(app, "Thank you")).toBe(true);
  expect(has(app, "TOTAL")).toBe(true);

  await app.press("Print receipt");
  expect(has(app, "Queued for the EPSON")).toBe(true);
});

test("a split payment takes two tenders", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("Charge $17.11");
  await app.press("Split bill");
  expect(has(app, "Add payment")).toBe(true);

  await app.press("5");
  await app.press("0");
  await app.press("0");
  await app.press("Add payment");
  expect(has(app, "$12.11")).toBe(true);

  await app.press("Remaining $12.11");
  await app.press("label:Tender Cash");
  await app.press("Add payment");
  expect(has(app, "$0.00")).toBe(true);

  await app.press("Complete sale · $17.11");
  expect(has(app, "Sale invoice (A4)")).toBe(true);
  expect(has(app, "Split")).toBe(true);
});

test("the floor plan seats a walk-in", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("Tables");
  expect(has(app, "Floor plan")).toBe(true);
  expect(has(app, "Table 7")).toBe(true);

  await app.press("Table 7");
  expect(has(app, "Popular right now")).toBe(true);
  expect(has(app, "Table 7")).toBe(true);
});

test("an occupied table can ask for the bill", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("Tables");
  await app.press("Table 1");
  expect(has(app, "Open ticket on register")).toBe(true);

  await app.press("Request bill");
  expect(has(app, "Needs bill")).toBe(true);
});

test("the product editor updates the register", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("Products");
  await app.press("Edit Café Latte");
  expect(has(app, "Save changes")).toBe(true);

  await app.press("Increase price");
  await app.press("Save changes");
  expect(has(app, "$4.75")).toBe(true);

  await app.press("Dashboard");
  await app.press("New sale");
  expect(has(app, "$4.75")).toBe(true);
});

test("a new menu item can be created", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("Products");
  await app.press("New item");
  expect(has(app, "Create item")).toBe(true);
  await app.press("Create item");
  expect(has(app, "New item")).toBe(true);
});

test("voiding a ticket needs a manager PIN", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("Orders");
  await app.press("label:Open ticket 1049");
  await app.press("Void ticket");
  expect(has(app, "Manager approval")).toBe(true);

  for (const digit of ["2", "4", "6", "8"]) await app.press("label:PIN " + digit);
  await app.press("Approve");
  expect(has(app, "#1049")).toBe(false);
});

test("a stock item drawer shows its ledger and par controls", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("INV");
  await app.press("Stock items");
  await app.press("Open Espresso beans · House blend");
  expect(has(app, "Stock ledger")).toBe(true);
  expect(has(app, "Save par & cost")).toBe(true);
  expect(has(app, "Adjust stock")).toBe(true);
});

test("suppliers are loaded from sqlite", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("INV");
  await app.press("Stock items");
  await app.press("Recipes & BOM");
  await app.press("Goods received");
  await app.press("Purchase orders >> nth=0");
  await app.press("Adjustments");
  await app.press("Transfers");
  await app.press("Suppliers & audits");
  expect(has(app, "Active suppliers")).toBe(true);
  expect(has(app, "Café Imports")).toBe(true);
});

test("a stock adjustment is posted and listed", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("INV");
  await app.press("Stock items");
  await app.press("Open Oat milk · barista");
  await app.press("Adjust stock");
  expect(has(app, "New stock adjustment")).toBe(true);

  await app.press("Post adjustment >> nth=0");
  expect(has(app, "Posted today")).toBe(true);
  expect(has(app, "ADJ-2026-0062")).toBe(true);
});

test("receiving a purchase order posts a GRN", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("INV");
  await app.press("Purchase orders >> nth=0");
  expect(has(app, "Open orders")).toBe(true);

  // PO-2026-0145 is the first sent order; receiving it refreshes the row.
  await app.press("Receive PO >> nth=0");
  expect(has(app, "GRN-2026-0119")).toBe(true);
  expect(has(app, "PO-2026-0145 received")).toBe(true);
  expect(has(app, "Received")).toBe(true);

  // The same receipt is listed in goods received history.
  await app.press("Goods received");
  expect(has(app, "GRN-2026-0119")).toBe(true);
  expect(has(app, "EcoPack")).toBe(true);
  expect(has(app, "PO-2026-0145")).toBe(true);
});

test("a receipt posts a vendor bill and a balanced journal entry", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("INV");
  await app.press("Purchase orders >> nth=0");
  await app.press("Receive PO >> nth=0");
  expect(has(app, "GRN-2026-0119")).toBe(true);

  // The supplier bill lands in payables.
  await app.press("ACC");
  await app.press("Vendor payables");
  expect(has(app, "GRN-2026-0119")).toBe(true);
  expect(has(app, "EcoPack")).toBe(true);

  // And the receipt's double entry is in the journal.
  await app.press("General journal");
  expect(has(app, "JE-2026-0419")).toBe(true);
  expect(has(app, "Goods received · GRN-2026-0119")).toBe(true);
  expect(has(app, "1200 Inventory + 2100 Sales tax payable")).toBe(true);
  expect(has(app, "2000 Accounts payable")).toBe(true);
});

test("a vendor bill is paid through manager approval", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("INV");
  await app.press("Purchase orders >> nth=0");
  await app.press("Receive PO >> nth=0");
  await app.press("ACC");
  await app.press("Vendor payables");
  expect(has(app, "GRN-2026-0119")).toBe(true);

  // Paying the receipt's bill asks for the manager PIN.
  await app.press("label:Pay GRN-2026-0119");
  expect(has(app, "Approve supplier payment")).toBe(true);
  for (const digit of ["2", "4", "6", "8"]) await app.press("label:PIN " + digit);
  await app.press("Approve");
  expect(has(app, "Paid")).toBe(true);
  expect(has(app, "JE-2026-0420")).toBe(true);

  // The payment posts AP → bank.
  await app.press("General journal");
  expect(has(app, "Paid GRN-2026-0119 · EcoPack")).toBe(true);
  expect(has(app, "2000 Accounts payable")).toBe(true);
  expect(has(app, "1010 Bank · Meezan current")).toBe(true);
});

test("a pay run settles every selected bill", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("ACC");
  await app.press("Vendor payables");
  expect(has(app, "Total payable")).toBe(true);
  expect(has(app, "5 open bills")).toBe(true);

  // Every open bill starts selected.
  await app.press("Start pay run");
  expect(has(app, "Choose the bills to settle in this run")).toBe(true);
  expect(has(app, "5 selected")).toBe(true);
  expect(has(app, "$2,230.50")).toBe(true);

  await app.press("label:Post pay run");
  expect(has(app, "Approve pay run")).toBe(true);
  for (const digit of ["2", "4", "6", "8"]) await app.press("label:PIN " + digit);
  await app.press("Approve");

  expect(has(app, "Pay run posted · 5 bills · $2,230.50")).toBe(true);
  expect(has(app, "0 open bills")).toBe(true);
  expect(has(app, "Paid")).toBe(true);

  // One AP → bank entry per bill.
  await app.press("General journal");
  expect(has(app, "Paid INV-77410 · Café Imports")).toBe(true);
  expect(has(app, "JE-2026-0419")).toBe(true);
  expect(has(app, "1010 Bank · Meezan current")).toBe(true);
});

test("matching statement lines reconciles the bank", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("ACC");
  await app.press("Bank reconciliation >> nth=0");
  expect(has(app, "Statement balance")).toBe(true);
  expect(has(app, "of 6 lines")).toBe(true);
  expect(has(app, "3 open")).toBe(true);

  // Match one by hand, then let auto-match clear the rest.
  await app.press("label:Match LESCO-9921");
  expect(has(app, "2 open")).toBe(true);
  await app.press("Auto-match");
  expect(has(app, "Auto-match applied to 2 lines.")).toBe(true);
  expect(has(app, "Reconciled")).toBe(true);

  await app.press("Finish reconciliation");
  expect(has(app, "Bank reconciliation closed · $28,410.75 cleared.")).toBe(true);
});

test("a new expense posts to the ledger", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("ACC");
  await app.press("Expenses >> nth=0");
  expect(has(app, "Spent this month")).toBe(true);

  await app.press("New expense");
  expect(has(app, "Record an expense")).toBe(true);
  await app.type("label:Vendor name", "Metro Cash & Carry");
  await app.type("label:Amount", "120");
  await app.press("label:Category Utilities");
  await app.press("label:Method Cash");
  await app.press("label:Post expense");

  expect(has(app, "Expense posted · $120.00 · JE-2026-0419")).toBe(true);
  expect(has(app, "Metro Cash & Carry")).toBe(true);

  // Coded to 5300 and paid from cash.
  await app.press("General journal");
  expect(has(app, "Expense · Metro Cash & Carry")).toBe(true);
  expect(has(app, "5300 Utilities")).toBe(true);
  expect(has(app, "1000 Cash on hand")).toBe(true);
});

test("P&L and tax read the posted account balances", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("ACC");
  await app.press("P&L & tax >> nth=0");
  expect(has(app, "GST position")).toBe(true);
  expect(has(app, "$92,660.40")).toBe(true); // 4000 + 4100
  expect(has(app, "$6,240.00")).toBe(true); // merchandise, from 4100
  expect(has(app, "$33,366.80")).toBe(true); // net profit from the balances
  expect(has(app, "$2,140.90")).toBe(true); // opening GST position
});

test("the accounting overview follows receipts and the journal", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("INV");
  await app.press("Purchase orders >> nth=0");
  await app.press("Receive PO >> nth=0");
  await app.press("ACC");

  // The receipt's bill is due, its journal entry is recent, and the
  // reconciliation checklist reflects the matched statement lines.
  expect(has(app, "GRN-2026-0119")).toBe(true);
  expect(has(app, "Goods received · GRN-2026-0119")).toBe(true);
  expect(has(app, "3 of 6")).toBe(true);
});

test("a manual journal entry posts and balances", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("ACC");
  await app.press("General journal");
  await app.press("New entry");
  expect(has(app, "New journal entry")).toBe(true);

  await app.type("label:Debit 1200", "250");
  await app.type("label:Credit 1010", "250");
  await app.type("label:Description", "Stock correction");
  expect(has(app, "Balanced")).toBe(true);
  await app.press("label:Post entry");

  expect(has(app, "Journal entry posted · JE-2026-0419 · $250.00")).toBe(true);
  expect(has(app, "Stock correction")).toBe(true);
  expect(has(app, "1200 Inventory")).toBe(true);
  expect(has(app, "1010 Bank · Meezan current")).toBe(true);
});

test("a multi-line journal entry splits one credit across debits", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("ACC");
  await app.press("General journal");
  await app.press("New entry");

  // Two debits split a single bank credit; the drawer must call it balanced.
  await app.type("label:Debit 1000", "60");
  await app.type("label:Debit 1020", "40");
  await app.type("label:Credit 1010", "100");
  await app.type("label:Description", "Cash and card split");
  expect(has(app, "Balanced")).toBe(true);

  await app.press("label:Post entry");
  const posted = app.texts().find((text) => text.startsWith("Journal entry posted · ")) ?? "";
  expect(posted.includes("$100.00")).toBe(true);
  expect(has(app, "Cash and card split")).toBe(true);
  expect(has(app, "1000 Cash on hand + 1020 Card settlements receivable")).toBe(true);
  expect(has(app, "1010 Bank · Meezan current")).toBe(true);
});

test("a draft can be edited after it is saved", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("ACC");
  await app.press("General journal");
  await app.press("New entry");
  await app.type("label:Debit 1200", "100");
  await app.type("label:Credit 1010", "100");
  await app.type("label:Description", "Original description");
  await app.press("label:Save draft");
  const saved = app.texts().find((text) => text.startsWith("Draft saved · ")) ?? "";
  const draftRef = saved.slice("Draft saved · ".length);
  expect(has(app, "Draft saved · " + draftRef)).toBe(true);

  // Reopen the draft from its row and change the memo and amounts.
  await app.press("label:Edit " + draftRef);
  await app.wait(800);
  await app.type("label:Debit 1200", "150");
  await app.type("label:Credit 1010", "150");
  await app.type("label:Description", "Edited description");
  await app.press("label:Save draft");
  expect(has(app, "Draft updated · " + draftRef)).toBe(true);
  expect(has(app, "Edited description")).toBe(true);

  // Post the amended draft - the ref stays the same (JE-2026-0419).
  await app.press("label:Post " + draftRef);
  expect(has(app, "Journal entry posted · " + draftRef)).toBe(true);
  expect(has(app, "Edited description")).toBe(true);
});

test("a journal draft is saved and then posted", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("ACC");
  await app.press("General journal");
  await app.press("New entry");
  await app.type("label:Debit 1200", "180");
  await app.type("label:Credit 1010", "180");
  await app.type("label:Description", "Month-end accrual");
  await app.press("label:Save draft");

  expect(has(app, "Draft saved · JE-2026-04")).toBe(true);
  expect(has(app, "Month-end accrual")).toBe(true);

  // Posting the draft from its row clears it from the draft queue.
  const saved = app.texts().find((text) => text.startsWith("Draft saved · ")) ?? "";
  const ref = saved.slice("Draft saved · ".length);
  await app.press("label:Post " + ref);
  expect(has(app, "Journal entry posted · " + ref)).toBe(true);
  expect(has(app, "Draft saved · " + ref)).toBe(false);
});

test("a draft can be discarded and a posted entry reversed", async () => {
  const app = await open("./App.tsx", { width: 1440, height: 900, platform: "windows" });

  await app.press("ACC");
  await app.press("General journal");

  // Save a draft, then discard it from its row.
  await app.press("New entry");
  await app.type("label:Debit 1200", "75");
  await app.type("label:Credit 1010", "75");
  await app.type("label:Description", "Temp accrual");
  await app.press("label:Save draft");
  const saved = app.texts().find((text) => text.startsWith("Draft saved · ")) ?? "";
  const draftRef = saved.slice("Draft saved · ".length);
  await app.press("label:Discard " + draftRef);
  expect(has(app, "Draft discarded · " + draftRef)).toBe(true);
  expect(has(app, "Temp accrual")).toBe(false);

  // Post a fresh entry, then reverse it with a mirror entry.
  await app.press("New entry");
  await app.type("label:Debit 1200", "40");
  await app.type("label:Credit 1010", "40");
  await app.type("label:Description", "Misfiled purchase");
  await app.press("label:Post entry");
  const posted = app.texts().find((text) => text.startsWith("Journal entry posted · ")) ?? "";
  const postedRef = posted.slice("Journal entry posted · ".length).split(" · ")[0];
  await app.press("label:Reverse " + postedRef);
  expect(has(app, "Reversal posted · JE-2026-")).toBe(true);
  expect(has(app, "Reversal of " + postedRef)).toBe(true);
});
