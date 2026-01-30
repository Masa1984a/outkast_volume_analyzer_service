-- Migration: Add sequence number support for duplicate data handling
-- Created: 2026-01-31
-- Purpose: Allow storing complete duplicate trades with sequence numbers

BEGIN;

-- Step 1: Add new columns
ALTER TABLE fills
  ADD COLUMN original_data_hash VARCHAR(64),
  ADD COLUMN sequence_number INT NOT NULL DEFAULT 1;

-- Step 2: Populate original_data_hash from existing data_hash
UPDATE fills
SET original_data_hash = data_hash
WHERE original_data_hash IS NULL;

-- Step 3: Make original_data_hash NOT NULL
ALTER TABLE fills
  ALTER COLUMN original_data_hash SET NOT NULL;

-- Step 4: Drop old unique constraint on data_hash
ALTER TABLE fills
  DROP CONSTRAINT IF EXISTS fills_data_hash_key;

-- Step 5: Add new unique constraint on (original_data_hash, sequence_number)
ALTER TABLE fills
  ADD CONSTRAINT fills_original_data_hash_sequence_number_key
  UNIQUE (original_data_hash, sequence_number);

-- Step 6: Create index on original_data_hash for better query performance
CREATE INDEX IF NOT EXISTS idx_fills_original_data_hash
  ON fills(original_data_hash);

-- Step 7: Make data_hash nullable (for backward compatibility, will be removed later)
ALTER TABLE fills
  ALTER COLUMN data_hash DROP NOT NULL;

COMMIT;

-- Verification queries (commented out, run manually if needed)
-- SELECT COUNT(*) as total_records FROM fills;
-- SELECT COUNT(DISTINCT original_data_hash) as unique_data FROM fills;
-- SELECT sequence_number, COUNT(*) FROM fills GROUP BY sequence_number;
