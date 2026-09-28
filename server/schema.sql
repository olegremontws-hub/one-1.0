PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_accounts (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  phone_verified INTEGER NOT NULL DEFAULT 0,
  email_verified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_profiles (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE,
  client_type TEXT CHECK (client_type IN ('fl','ip','ul')),
  display_name TEXT,
  city TEXT,
  profile_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES auth_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id TEXT PRIMARY KEY,
  method TEXT NOT NULL CHECK (method IN ('phone','email')),
  contact TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otp_contact_created
ON otp_challenges(contact, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES auth_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_account
ON sessions(account_id, expires_at);


CREATE TABLE IF NOT EXISTS price_books (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RUB',
  status TEXT NOT NULL CHECK (status IN ('draft','active','archived')),
  rates_json TEXT NOT NULL,
  waste_rules_json TEXT NOT NULL,
  logistics_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  activated_at TEXT,
  UNIQUE(code,version)
);

CREATE INDEX IF NOT EXISTS idx_price_books_code_version
ON price_books(code, version DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_books_active_code
ON price_books(code) WHERE status='active';

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  object_type TEXT,
  object_label TEXT,
  address TEXT NOT NULL,
  area REAL,
  floor INTEGER,
  lift TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES client_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_client
ON projects(client_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  public_number INTEGER NOT NULL UNIQUE,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  work_total REAL NOT NULL DEFAULT 0,
  logistics_total REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_project
ON orders(project_id, updated_at DESC);


CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('quote','contract','act')),
  number TEXT NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','signed','cancelled')),
  title TEXT NOT NULL,
  content_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  issued_at TEXT,
  signed_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE(order_id, kind, version),
  UNIQUE(number)
);

CREATE INDEX IF NOT EXISTS idx_documents_order
ON documents(order_id, created_at DESC);


CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('advance','final','other')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','paid','cancelled')),
  amount REAL NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'RUB',
  due_at TEXT,
  paid_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_order
ON payments(order_id, created_at DESC);


CREATE TABLE IF NOT EXISTS order_revisions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE(order_id, version)
);

CREATE INDEX IF NOT EXISTS idx_order_revisions_order
ON order_revisions(order_id, version DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  actor_account_id TEXT,
  actor_role TEXT NOT NULL DEFAULT 'client',
  event_type TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_account_id) REFERENCES auth_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_events_order
ON audit_events(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  revision_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  snapshot_json TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  responded_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_order
ON approval_requests(order_id, created_at DESC);

INSERT INTO schema_meta(key,value)
VALUES ('schema_version','5')
ON CONFLICT(key) DO UPDATE SET value=excluded.value;
