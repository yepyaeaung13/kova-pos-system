-- Development catalog matching the desktop client defaults.

INSERT INTO inv_suppliers (id, name, contact_name, phone, ntn_tax_id, payment_terms) VALUES
  ('sup-1', 'Café Imports', 'Imran Sheikh', '+92 300 2211334', '', 'Net 3'),
  ('sup-2', 'Nestlé Dairy', 'Adeel Raza', '+92 321 7788990', '', 'Net 1'),
  ('sup-3', 'Golden Crumb', 'Nida Aslam', '+92 333 4455661', '', 'Net 2'),
  ('sup-4', 'Bar Essentials', 'Kamran Ali', '+92 345 1122345', '', 'Net 5'),
  ('sup-5', 'EcoPack', 'Sadaf Iqbal', '+92 302 6677889', '', 'Net 4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inv_items (id, sku, name, category, unit, reorder_level, cost_cents) VALUES
  ('BEV-001', 'BEV-001', 'Espresso beans · House blend', 'Coffee', 'kg', 12, 2450),
  ('BEV-002', 'BEV-002', 'Espresso beans · Single origin', 'Coffee', 'kg', 8, 3100),
  ('DAI-010', 'DAI-010', 'Whole milk', 'Dairy', 'L', 30, 135),
  ('DAI-011', 'DAI-011', 'Oat milk · barista', 'Dairy', 'L', 18, 280),
  ('DAI-012', 'DAI-012', 'Heavy cream', 'Dairy', 'L', 8, 340),
  ('BAK-020', 'BAK-020', 'Butter croissant dough', 'Bakery', 'kg', 6, 720),
  ('BAK-021', 'BAK-021', 'Almond paste', 'Bakery', 'kg', 4, 410),
  ('BAK-022', 'BAK-022', 'Cheesecake base', 'Bakery', 'pcs', 10, 410),
  ('SYR-030', 'SYR-030', 'Vanilla syrup', 'Syrups', 'btl', 8, 890),
  ('SYR-031', 'SYR-031', 'Dark chocolate sauce', 'Syrups', 'btl', 5, 940),
  ('PAP-040', 'PAP-040', '12 oz hot cups', 'Packaging', 'pack', 15, 710),
  ('PAP-041', 'PAP-041', '16 oz cold cups', 'Packaging', 'pack', 18, 710),
  ('FOD-050', 'FOD-050', 'Sourdough loaf', 'Food', 'pcs', 10, 390),
  ('FOD-051', 'FOD-051', 'Chicken breast', 'Food', 'kg', 10, 1120)
ON CONFLICT (id) DO NOTHING;
