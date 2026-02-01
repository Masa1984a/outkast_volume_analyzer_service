import { Fill } from '@/types/fill';
import { upsertFills } from '@/lib/db/queries';

/**
 * Batch size for database upserts
 * Reduced to 10 to avoid timeout issues with large SQL statements
 */
const BATCH_SIZE = 10;

/**
 * Upsert fills in batches to avoid overwhelming the database
 */
export async function batchUpsertFills(fills: Fill[], date?: string): Promise<number> {
  if (fills.length === 0) {
    return 0;
  }

  const datePrefix = date ? `[${date}] ` : '';
  const totalBatches = Math.ceil(fills.length / BATCH_SIZE);

  console.log(`${datePrefix}Upserting ${fills.length} fills in ${totalBatches} batch(es) of ${BATCH_SIZE}...`);

  let totalInserted = 0;

  for (let i = 0; i < fills.length; i += BATCH_SIZE) {
    const batch = fills.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      await upsertFills(batch);
      totalInserted += batch.length;
      console.log(`${datePrefix}Upserted batch ${batchNum}/${totalBatches}: ${batch.length} fills`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`${datePrefix}Error upserting batch ${batchNum}/${totalBatches}: ${errorMsg}`);
      throw error;
    }
  }

  console.log(`${datePrefix}DB upsert completed: ${totalInserted} fills`);

  return totalInserted;
}

/**
 * Process and upsert fills from CSV content
 */
export async function processFillsFromCSV(
  csvContent: string,
  date: string,
  parser: (csvContent: string, date: string) => Promise<Fill[]>
): Promise<number> {
  console.log(`[${date}] Processing fills...`);

  // Parse CSV
  const fills = await parser(csvContent, date);

  if (fills.length === 0) {
    console.log(`[${date}] No fills found in CSV`);
    return 0;
  }

  // Upsert to database
  const inserted = await batchUpsertFills(fills, date);

  return inserted;
}
