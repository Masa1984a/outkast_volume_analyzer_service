-- Rollback Migration: Remove sequence number support
-- Created: 2026-01-31
-- Purpose: Restore original schema if migration needs to be reverted

BEGIN;

-- Step 1: Drop new constraint
ALTER TABLE fills
  DROP CONSTRAINT IF EXISTS fills_original_data_hash_sequence_number_key;

-- Step 2: Drop new index
DROP INDEX IF EXISTS idx_fills_original_data_hash;

-- Step 3: Drop new columns
ALTER TABLE fills
  DROP COLUMN IF EXISTS sequence_number,
  DROP COLUMN IF EXISTS original_data_hash;

-- Step 4: Restore data_hash NOT NULL constraint
ALTER TABLE fills
  ALTER COLUMN data_hash SET NOT NULL;

-- Step 5: Restore original unique constraint
ALTER TABLE fills
  ADD CONSTRAINT fills_data_hash_key UNIQUE (data_hash);

COMMIT;

-- Verification query (commented out, run manually if needed)
-- SELECT COUNT(*) as total_records FROM fills;
