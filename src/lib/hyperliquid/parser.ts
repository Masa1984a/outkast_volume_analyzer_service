import { parse } from 'csv-parse/sync';
import { Fill, FillCSVRow } from '@/types/fill';

/**
 * Parse CSV content and convert to Fill objects
 */
export function parseCSVToFills(csvContent: string, dateStr: string): Fill[] {
  try {
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as FillCSVRow[];

    // Convert to Fill objects
    const fills: Fill[] = records.map((row) => {
      // Parse time (milliseconds since epoch)
      const transactionTime = new Date(parseInt(row.time));

      // Parse boolean values
      const crossed = row.crossed === 'true' || row.crossed === 'True';
      const isTrigger = row.isTrigger === 'true' || row.isTrigger === 'True';

      const fill: Fill = {
        transactionTime,
        dateStr,
        userAddress: row.user.toLowerCase(),
        coin: row.coin,
        side: row.side as 'Bid' | 'Ask',
        px: parseFloat(row.px),
        sz: parseFloat(row.sz),
        crossed,
        isTrigger,
        specialTradeType: row.specialTradeType || undefined,
        tif: row.tif || undefined,
        counterparty: row.counterparty ? row.counterparty.toLowerCase() : undefined,
        closedPnl: row.closedPnl ? parseFloat(row.closedPnl) : undefined,
        twapId: row.twapId ? BigInt(row.twapId) : undefined,
        builderFee: row.builderFee ? parseFloat(row.builderFee) : undefined,
        rawDataJson: row,
      };

      return fill;
    });

    return fills;
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw new Error(
      `Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Parse and validate a single CSV file
 */
export async function parseBuilderFillsCSV(
  csvContent: string,
  date: string
): Promise<Fill[]> {
  console.log(`Parsing CSV for date: ${date}`);

  const fills = parseCSVToFills(csvContent, date);

  console.log(`Parsed ${fills.length} fills for ${date}`);

  return fills;
}
