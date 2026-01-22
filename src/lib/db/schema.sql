-- OUTKAST Volume Dashboard Database Schema

-- Table: fills (trading data)
CREATE TABLE IF NOT EXISTS fills (
  id BIGSERIAL PRIMARY KEY,
  transaction_time TIMESTAMPTZ NOT NULL,
  date_str DATE NOT NULL,
  user_address VARCHAR(42) NOT NULL,
  coin VARCHAR(20) NOT NULL,
  side VARCHAR(4) NOT NULL CHECK (side IN ('Bid', 'Ask')),
  px NUMERIC(20, 8) NOT NULL,
  sz NUMERIC(20, 8) NOT NULL,
  volume_usd NUMERIC(20, 2) GENERATED ALWAYS AS (px * sz) STORED,
  crossed BOOLEAN NOT NULL DEFAULT false,
  special_trade_type VARCHAR(50),
  tif VARCHAR(50),
  is_trigger BOOLEAN NOT NULL DEFAULT false,
  counterparty VARCHAR(42),
  closed_pnl NUMERIC(20, 8),
  twap_id BIGINT,
  builder_fee NUMERIC(20, 8),
  raw_data_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(transaction_time, user_address, coin, side, px, sz)
);

-- Indexes for fills table
CREATE INDEX IF NOT EXISTS idx_fills_date_str ON fills(date_str DESC);
CREATE INDEX IF NOT EXISTS idx_fills_user_address ON fills(user_address);
CREATE INDEX IF NOT EXISTS idx_fills_date_user ON fills(date_str DESC, user_address);
CREATE INDEX IF NOT EXISTS idx_fills_transaction_time ON fills(transaction_time DESC);

-- Table: sync_status (synchronization tracking)
CREATE TABLE IF NOT EXISTS sync_status (
  id SERIAL PRIMARY KEY,
  last_synced_date DATE NOT NULL,
  last_sync_started_at TIMESTAMPTZ,
  last_sync_completed_at TIMESTAMPTZ,
  last_sync_status VARCHAR(20) CHECK (last_sync_status IN ('success', 'failed', 'running')),
  error_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial sync status record if not exists
INSERT INTO sync_status (last_synced_date, last_sync_status, updated_at)
VALUES ('2020-01-01', 'success', NOW())
ON CONFLICT DO NOTHING;
