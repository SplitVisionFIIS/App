-- SplitVision esquema v1
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(20) NOT NULL,
  email varchar(255) NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_username_lower ON users (lower(username));
CREATE UNIQUE INDEX users_email_lower ON users (lower(email));
ALTER TABLE users ADD CONSTRAINT users_username_format CHECK (username ~ '^[A-Za-z0-9_]{3,20}$');

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE login_attempts (
  id bigserial PRIMARY KEY,
  identifier text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_lookup ON login_attempts (identifier, attempted_at);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(60) NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_name_check CHECK (length(btrim(name)) >= 1 AND length(name) <= 60)
);

CREATE TABLE event_participants (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES users(id),
  status varchar(20) NOT NULL,
  description varchar(200),
  total_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  tip_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  image_path text,
  image_hash text,
  fail_reason varchar(300),
  split_mode varchar(20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT receipts_status_check CHECK (status IN ('CARGADO','PROCESANDO','EXTRAÍDO','CONFIRMADO','FALLIDO')),
  CONSTRAINT receipts_split_mode_check CHECK (split_mode IS NULL OR split_mode IN ('EQUITATIVE','BY_ITEM')),
  CONSTRAINT receipts_totals_check CHECK (total_cents >= 0 AND tax_cents >= 0 AND tip_cents >= 0 AND discount_cents >= 0)
);
CREATE UNIQUE INDEX receipts_event_image_hash ON receipts (event_id, image_hash) WHERE image_hash IS NOT NULL;
CREATE INDEX receipts_event_idx ON receipts (event_id, created_at DESC);
CREATE INDEX receipts_payer_idx ON receipts (payer_id, status);

CREATE TABLE receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  position integer NOT NULL,
  description varchar(200) NOT NULL,
  quantity integer NOT NULL,
  unit_price_cents integer NOT NULL,
  CONSTRAINT receipt_items_desc_check CHECK (length(btrim(description)) >= 1),
  CONSTRAINT receipt_items_qty_check CHECK (quantity >= 1),
  CONSTRAINT receipt_items_price_check CHECK (unit_price_cents > 0)
);
CREATE INDEX receipt_items_receipt_idx ON receipt_items (receipt_id, position);

CREATE TABLE receipt_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  status varchar(12) NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_owner text,
  lease_expires_at timestamptz,
  correlation_id text NOT NULL,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT receipt_jobs_status_check CHECK (status IN ('PENDING','RUNNING','DONE','FAILED'))
);
CREATE UNIQUE INDEX receipt_jobs_one_active ON receipt_jobs (receipt_id) WHERE status IN ('PENDING','RUNNING');
CREATE INDEX receipt_jobs_claim_idx ON receipt_jobs (next_attempt_at) WHERE status = 'PENDING';

CREATE TABLE split_participants (
  receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (receipt_id, user_id)
);

CREATE TABLE item_assignments (
  receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES receipt_items(id) ON DELETE CASCADE,
  unit_index integer NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id),
  PRIMARY KEY (item_id, unit_index),
  CONSTRAINT item_assignments_unit_check CHECK (unit_index >= 1)
);
CREATE INDEX item_assignments_receipt_idx ON item_assignments (receipt_id);

CREATE TABLE debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES receipts(id),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  debtor_id uuid NOT NULL REFERENCES users(id),
  creditor_id uuid NOT NULL REFERENCES users(id),
  amount_cents integer NOT NULL,
  confirmed_cents integer NOT NULL DEFAULT 0,
  reserved_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT debts_amount_check CHECK (amount_cents > 0),
  CONSTRAINT debts_balances_check CHECK (confirmed_cents >= 0 AND reserved_cents >= 0 AND confirmed_cents + reserved_cents <= amount_cents),
  CONSTRAINT debts_parties_check CHECK (debtor_id <> creditor_id),
  CONSTRAINT debts_one_per_participant UNIQUE (receipt_id, debtor_id)
);
CREATE INDEX debts_debtor_idx ON debts (debtor_id);
CREATE INDEX debts_creditor_idx ON debts (creditor_id);
CREATE INDEX debts_event_idx ON debts (event_id);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id uuid NOT NULL REFERENCES debts(id),
  payer_id uuid NOT NULL REFERENCES users(id),
  amount_cents integer NOT NULL,
  method varchar(20) NOT NULL,
  reference varchar(50),
  evidence_path text,
  status varchar(12) NOT NULL,
  reject_reason varchar(200),
  idempotency_key varchar(120) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT payments_amount_check CHECK (amount_cents > 0),
  CONSTRAINT payments_status_check CHECK (status IN ('PENDIENTE','CONFIRMADO','RECHAZADO','CANCELADO')),
  CONSTRAINT payments_method_check CHECK (method IN ('EFECTIVO','YAPE','PLIN','TRANSFERENCIA','OTRO')),
  CONSTRAINT payments_reference_check CHECK (reference IS NULL OR reference ~ '^[A-Za-z0-9]{1,50}$')
);
CREATE UNIQUE INDEX payments_idempotent ON payments (debt_id, idempotency_key);
CREATE INDEX payments_status_idx ON payments (status);
CREATE INDEX payments_payer_idx ON payments (payer_id, status);

CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid,
  operation text NOT NULL,
  resource text,
  result text NOT NULL,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_operation_idx ON audit_logs (operation, created_at DESC);
