-- Development chart of accounts matching the desktop client and event postings.

INSERT INTO acc_accounts (id, code, name, type, balance_cents) VALUES
  ('acct_1000', '1000', 'Cash on hand', 'Asset', 482050),
  ('acct_1010', '1010', 'Bank · Meezan current', 'Asset', 2841075),
  ('acct_1020', '1020', 'Card settlements receivable', 'Asset', 326020),
  ('acct_1200', '1200', 'Inventory', 'Asset', 1842060),
  ('acct_1300', '1300', 'Inventory received', 'Asset', 0),
  ('acct_1500', '1500', 'Equipment', 'Asset', 4250000),
  ('acct_2000', '2000', 'Accounts payable', 'Liability', 558050),
  ('acct_2100', '2100', 'Sales tax payable', 'Liability', 214030),
  ('acct_2110', '2110', 'Input tax receivable', 'Asset', 0),
  ('acct_2200', '2200', 'Payroll payable', 'Liability', 890000),
  ('acct_3000', '3000', 'Owner''s equity', 'Equity', 5000000),
  ('acct_4000', '4000', 'Sales · food & beverage', 'Revenue', 8642040),
  ('acct_4100', '4100', 'Sales · merchandise', 'Revenue', 624000),
  ('acct_5000', '5000', 'Cost of goods sold', 'Expense', 2489020),
  ('acct_5100', '5100', 'Rent', 'Expense', 1200000),
  ('acct_5200', '5200', 'Salaries & wages', 'Expense', 1840000),
  ('acct_5300', '5300', 'Utilities', 'Expense', 326080),
  ('acct_5400', '5400', 'Waste & spoilage', 'Expense', 74260)
ON CONFLICT (code) DO NOTHING;
