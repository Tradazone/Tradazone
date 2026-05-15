-- ============================================================
-- Tradazone — initial schema  (v2, simplified for Supabase dashboard)
-- Paste the entire file into SQL Editor → Run
-- ============================================================

-- ── Nonces (used during wallet auth challenge) ──────────────

CREATE TABLE IF NOT EXISTS public.auth_nonces (
  address     TEXT        PRIMARY KEY,
  nonce       TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Users (merchant profile) ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT        UNIQUE NOT NULL,
  wallet_type    TEXT        DEFAULT 'starknet',
  name           TEXT        DEFAULT '',
  email          TEXT        DEFAULT '',
  phone          TEXT        DEFAULT '',
  company        TEXT        DEFAULT '',
  address        TEXT        DEFAULT '',
  description    TEXT        DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (
    wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  );

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (
    wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  );

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (
    wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  );

-- ── Customers ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.customers (
  id            TEXT        PRIMARY KEY,
  user_wallet   TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  email         TEXT        DEFAULT '',
  phone         TEXT        DEFAULT '',
  company       TEXT        DEFAULT '',
  address       TEXT        DEFAULT '',
  description   TEXT        DEFAULT '',
  total_spent   TEXT        DEFAULT '0',
  currency      TEXT        DEFAULT 'STRK',
  invoice_count INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_all_own" ON public.customers
  FOR ALL USING (
    user_wallet = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  );

-- ── Items ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.items (
  id          TEXT        PRIMARY KEY,
  user_wallet TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT        DEFAULT '',
  type        TEXT        DEFAULT 'service',
  price       TEXT        NOT NULL DEFAULT '0',
  currency    TEXT        DEFAULT 'USD',
  unit        TEXT        DEFAULT 'unit',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items_all_own" ON public.items
  FOR ALL USING (
    user_wallet = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  );

-- ── Invoices ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoices (
  id              TEXT        PRIMARY KEY,
  user_wallet     TEXT        NOT NULL,
  customer_id     TEXT,
  customer        TEXT        DEFAULT '',
  amount          TEXT        DEFAULT '0',
  currency        TEXT        DEFAULT 'STRK',
  status          TEXT        DEFAULT 'pending',
  due_date        TEXT,
  items           JSONB       DEFAULT '[]'::jsonb,
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  email_status    TEXT        DEFAULT 'pending',
  payment_address TEXT        DEFAULT '',
  tx_hash         TEXT        DEFAULT '',
  tx_network      TEXT        DEFAULT '',
  tx_amount       TEXT        DEFAULT '',
  tx_currency     TEXT        DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_all_own" ON public.invoices
  FOR ALL USING (
    user_wallet = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  );

-- ── Checkouts ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.checkouts (
  id           TEXT        PRIMARY KEY,
  user_wallet  TEXT        NOT NULL,
  title        TEXT        NOT NULL,
  description  TEXT        DEFAULT '',
  amount       TEXT        NOT NULL DEFAULT '0',
  currency     TEXT        DEFAULT 'STRK',
  status       TEXT        DEFAULT 'active',
  payment_link TEXT        DEFAULT '',
  views        INTEGER     DEFAULT 0,
  payments     INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.checkouts ENABLE ROW LEVEL SECURITY;

-- Merchants can manage their own checkouts
CREATE POLICY "checkouts_all_own" ON public.checkouts
  FOR ALL USING (
    user_wallet = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  );

-- Anyone can read a checkout (for the public /pay/:id page)
CREATE POLICY "checkouts_public_read" ON public.checkouts
  FOR SELECT USING (true);

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS customers_user_wallet_idx ON public.customers (user_wallet);
CREATE INDEX IF NOT EXISTS items_user_wallet_idx     ON public.items     (user_wallet);
CREATE INDEX IF NOT EXISTS invoices_user_wallet_idx  ON public.invoices  (user_wallet);
CREATE INDEX IF NOT EXISTS checkouts_user_wallet_idx ON public.checkouts (user_wallet);
CREATE INDEX IF NOT EXISTS invoices_status_idx       ON public.invoices  (status);
CREATE INDEX IF NOT EXISTS checkouts_status_idx      ON public.checkouts (status);
