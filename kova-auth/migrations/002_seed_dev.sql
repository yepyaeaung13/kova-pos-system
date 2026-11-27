-- Development-only identity matching the desktop client defaults.
-- Password: counter-demo · PIN: 2468 · Device: term_gul_01

INSERT INTO tenants (id, name, gst_bps)
VALUES ('tenant_gulberg', 'Gulberg Café', 1600)
ON CONFLICT (id) DO NOTHING;

INSERT INTO branches (id, tenant_id, name, code)
VALUES ('branch_gulberg', 'tenant_gulberg', 'Gulberg Café', 'GUL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO terminals (id, tenant_id, branch_id, device_id, doc_prefix)
VALUES ('term_gul_01', 'tenant_gulberg', 'branch_gulberg', 'term_gul_01', 'GUL-T01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, tenant_id, branch_id, email, full_name, role, password_hash, pin_hash, active)
VALUES (
  'cashier_sara',
  'tenant_gulberg',
  'branch_gulberg',
  'sara@kova.pk',
  'Sara Khan',
  'Owner',
  '$argon2id$v=19$m=65536,t=3,p=4$YOI71Y78zlxY3qW4MJPWSg$ufgDO4y31jO/Cuezg+gbJhM6LF60NmQyPs3674b9cOI',
  '$argon2id$v=19$m=65536,t=3,p=4$NE90v1vyhz+OqgKVt0VXHw$U/jydRmkSIKjxlQxzxJlcQv34hSeJiSFsTzDgEZ8mmw',
  TRUE
)
ON CONFLICT (id) DO NOTHING;
