import { CONFIG } from '@/lib/constants/config';
import { decompressLz4ToString } from './decompressor';

export interface FetchFillsOptions {
  builderAddress: string;
  date: string; // Format: YYYY-MM-DD
}

/**
 * Fetch fills CSV data from Hyperliquid API
 * Returns decompressed CSV string
 */
export async function fetchBuilderFills(
  options: FetchFillsOptions
): Promise<string | null> {
  const { builderAddress, date } = options;

  // Convert date from YYYY-MM-DD to YYYYMMDD format
  const dateFormatted = date.replace(/-/g, '');

  // Construct URL: https://stats-data.hyperliquid.xyz/Mainnet/builder_fills/0x.../20251101.csv.lz4
  const url = `${CONFIG.HYPERLIQUID_BASE_URL}/${builderAddress}/${dateFormatted}.csv.lz4`;

  console.log(`[${date}] Fetching: ${url}`);

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      console.log(`[${date}] Response: 404 Not Found - No data available`);
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    // Get response as array buffer
    const arrayBuffer = await response.arrayBuffer();
    const compressedBuffer = Buffer.from(arrayBuffer);

    console.log(`[${date}] Downloaded: ${compressedBuffer.length.toLocaleString()} bytes (compressed)`);

    // Decompress LZ4
    const csvContent = await decompressLz4ToString(compressedBuffer);

    const lines = csvContent.split('\n').length - 1; // -1 for header
    console.log(`[${date}] Decompressed: ${csvContent.length.toLocaleString()} bytes (~${lines} rows)`);

    return csvContent;
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      console.log(`[${date}] Response: 404 Not Found`);
      return null;
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${date}] Fetch failed: ${errorMsg}`);
    throw error;
  }
}

/**
 * Fetch fills for multiple dates
 */
export async function fetchBuilderFillsRange(
  builderAddress: string,
  dates: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const date of dates) {
    try {
      const csvContent = await fetchBuilderFills({ builderAddress, date });
      if (csvContent) {
        results.set(date, csvContent);
      }
    } catch (error) {
      console.error(`Error fetching ${date}:`, error);
      // Continue with next date
    }
  }

  return results;
}
