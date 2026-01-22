import { CONFIG } from '@/lib/constants/config';
import { fetchBuilderFills } from '@/lib/hyperliquid/client';
import { parseBuilderFillsCSV } from '@/lib/hyperliquid/parser';
import { processFillsFromCSV } from '@/lib/sync/upsert-handler';
import { sql } from '@vercel/postgres';

/**
 * Generate date range
 */
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Import CSV data for a date range
 */
async function importCSV() {
  // Get command line arguments
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npm run import-csv <start-date> <end-date>');
    console.log('Example: npm run import-csv 2025-11-01 2025-11-30');
    process.exit(1);
  }

  const [startDate, endDate] = args;

  console.log(`Importing data from ${startDate} to ${endDate}...`);
  console.log(`Builder address: ${CONFIG.BUILDER_ADDRESS}`);

  const dates = generateDateRange(startDate, endDate);
  console.log(`Total dates to process: ${dates.length}`);

  let totalFills = 0;
  let successCount = 0;
  let errorCount = 0;

  try {
    for (const date of dates) {
      try {
        console.log(`\n=== Processing ${date} ===`);

        // Fetch CSV
        const csvContent = await fetchBuilderFills({
          builderAddress: CONFIG.BUILDER_ADDRESS,
          date,
        });

        if (!csvContent) {
          console.log(`No data for ${date} (skipped)`);
          continue;
        }

        // Process and insert
        const inserted = await processFillsFromCSV(
          csvContent,
          date,
          parseBuilderFillsCSV
        );

        totalFills += inserted;
        successCount++;

        console.log(`✅ ${date}: Processed ${inserted} fills`);
      } catch (error) {
        errorCount++;
        console.error(`❌ ${date}: Failed -`, error);
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total dates processed: ${successCount}/${dates.length}`);
    console.log(`Total fills imported: ${totalFills}`);
    console.log(`Errors: ${errorCount}`);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

importCSV();
