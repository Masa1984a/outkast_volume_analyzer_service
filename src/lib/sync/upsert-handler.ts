import { Fill } from '@/types/fill';
import { upsertFills } from '@/lib/db/queries';

/**
 * Batch size for database upserts
 */
const BATCH_SIZE = 1000;

/**
 * Upsert fills in batches to avoid overwhelming the database
 */
export async function batchUpsertFills(fills: Fill[]): Promise<number> {
  if (fills.length === 0) {
    return 0;
  }

  console.log(`Upserting ${fills.length} fills in batches of ${BATCH_SIZE}...`);

  let totalInserted = 0;

  for (let i = 0; i < fills.length; i += BATCH_SIZE) {
    const batch = fills.slice(i, i + BATCH_SIZE);

    try {
      await upsertFills(batch);
      totalInserted += batch.length;
      console.log(`Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} fills`);
    } catch (error) {
      console.error(`Error upserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
      throw error;
    }
  }

  console.log(`✅ Total upserted: ${totalInserted} fills`);

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
  console.log(`Processing fills for ${date}...`);

  // Parse CSV
  const fills = await parser(csvContent, date);

  if (fills.length === 0) {
    console.log(`No fills found for ${date}`);
    return 0;
  }

  // Upsert to database
  const inserted = await batchUpsertFills(fills);

  return inserted;
}
