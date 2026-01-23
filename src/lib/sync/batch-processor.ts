import { CONFIG } from '@/lib/constants/config';
import { fetchBuilderFills } from '@/lib/hyperliquid/client';
import { parseBuilderFillsCSV } from '@/lib/hyperliquid/parser';
import { processFillsFromCSV } from './upsert-handler';
import { getSyncStatus, updateSyncStatus } from '@/lib/db/queries';
import { calculateSyncDateRange, getYesterdayUTC } from './date-calculator';

export interface SyncResult {
  success: boolean;
  totalDates: number;
  processedDates: number;
  totalFills: number;
  errors: string[];
  startDate?: string;
  endDate?: string;
}

/**
 * Main batch processor for syncing fills
 * Called by the cron job every 4 hours
 */
export async function syncBuilderFills(): Promise<SyncResult> {
  const startTime = new Date();
  console.log(`\n=== Starting sync at ${startTime.toISOString()} ===`);

  const result: SyncResult = {
    success: false,
    totalDates: 0,
    processedDates: 0,
    totalFills: 0,
    errors: [],
  };

  try {
    // Update sync status to 'running'
    await updateSyncStatus({
      lastSyncStartedAt: startTime,
      lastSyncStatus: 'running',
    });

    // Get last sync status
    const syncStatus = await getSyncStatus();

    if (!syncStatus) {
      throw new Error('Sync status not found in database');
    }

    console.log(`Last synced date: ${syncStatus.lastSyncedDate}`);

    // Calculate date range to sync
    const { dates, startDate, endDate } = calculateSyncDateRange(
      new Date(syncStatus.lastSyncedDate)
    );

    result.totalDates = dates.length;
    result.startDate = startDate;
    result.endDate = endDate;

    if (dates.length === 0) {
      console.log('No new dates to sync');
      await updateSyncStatus({
        lastSyncCompletedAt: new Date(),
        lastSyncStatus: 'success',
      });
      result.success = true;
      return result;
    }

    console.log(`Syncing ${dates.length} dates from ${startDate} to ${endDate}`);

    // Process each date
    for (const date of dates) {
      const dateStartTime = Date.now();
      try {
        console.log(`\n[${date}] 📥 Starting data fetch...`);

        // Fetch CSV
        const csvContent = await fetchBuilderFills({
          builderAddress: CONFIG.BUILDER_ADDRESS,
          date,
        });

        if (!csvContent) {
          const elapsed = Date.now() - dateStartTime;
          console.log(`[${date}] ℹ️  No data available (404) - Elapsed: ${elapsed}ms`);
          continue;
        }

        // Process and insert
        const inserted = await processFillsFromCSV(
          csvContent,
          date,
          parseBuilderFillsCSV
        );

        result.totalFills += inserted;
        result.processedDates++;

        const elapsed = Date.now() - dateStartTime;
        console.log(`[${date}] ✅ SUCCESS - Inserted: ${inserted} fills - Elapsed: ${elapsed}ms`);
      } catch (error) {
        const elapsed = Date.now() - dateStartTime;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[${date}] ❌ ERROR - ${errorMsg} - Elapsed: ${elapsed}ms`);
        result.errors.push(`${date}: ${errorMsg}`);
      }
    }

    // Update sync status to 'success'
    const yesterday = getYesterdayUTC();
    await updateSyncStatus({
      lastSyncedDate: new Date(yesterday),
      lastSyncCompletedAt: new Date(),
      lastSyncStatus: 'success',
      errorMessage: result.errors.length > 0 ? result.errors.join('; ') : undefined,
    });

    result.success = true;

    console.log('\n=== Sync Summary ===');
    console.log(`Dates processed: ${result.processedDates}/${result.totalDates}`);
    console.log(`Total fills: ${result.totalFills}`);
    console.log(`Errors: ${result.errors.length}`);

    return result;
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);

    console.error('Sync failed:', errorMsg);

    result.errors.push(errorMsg);

    // Update sync status to 'failed'
    await updateSyncStatus({
      lastSyncCompletedAt: new Date(),
      lastSyncStatus: 'failed',
      errorMessage: errorMsg,
    });

    return result;
  }
}
