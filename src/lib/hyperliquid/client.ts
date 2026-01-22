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

  // Construct URL: https://stats-data.hyperliquid.xyz/Mainnet/builder_fills/0x.../2025-11-01.csv.lz4
  const url = `${CONFIG.HYPERLIQUID_BASE_URL}/${builderAddress}/${date}.csv.lz4`;

  console.log(`Fetching fills from: ${url}`);

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      console.log(`No data found for ${date} (404)`);
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get response as array buffer
    const arrayBuffer = await response.arrayBuffer();
    const compressedBuffer = Buffer.from(arrayBuffer);

    console.log(`Downloaded ${compressedBuffer.length} bytes (compressed)`);

    // Decompress LZ4
    const csvContent = await decompressLz4ToString(compressedBuffer);

    console.log(`Decompressed to ${csvContent.length} bytes`);

    return csvContent;
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      console.log(`No data found for ${date}`);
      return null;
    }

    console.error(`Failed to fetch fills for ${date}:`, error);
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
