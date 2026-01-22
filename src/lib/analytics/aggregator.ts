import {
  getUserDailyVolume,
  getTopWallets,
  getWalletStats,
} from '@/lib/db/queries';
import { VolumeDataPoint } from '@/types/api';
import { CONFIG } from '@/lib/constants/config';

export interface AggregatedVolumeData {
  volumeData: VolumeDataPoint[];
  topWallets: string[];
  customWallet?: string;
}

/**
 * Aggregate volume data for chart display
 * Returns daily volume grouped by top wallets + others
 */
export async function aggregateVolumeData(
  fromDate: string,
  toDate: string,
  customWallet?: string
): Promise<AggregatedVolumeData> {
  // Get top wallets
  const topWalletsData = await getTopWallets(
    fromDate,
    toDate,
    CONFIG.TOP_WALLETS_COUNT
  );

  const topWallets = topWalletsData.map((w) => w.userAddress);

  // Check if custom wallet is in top wallets
  const isCustomInTop = customWallet
    ? topWallets.includes(customWallet.toLowerCase())
    : false;

  // Get all user daily volumes
  const userDailyVolumes = await getUserDailyVolume(fromDate, toDate);

  // Create map: date -> { wallet -> volume }
  const dateVolumeMap = new Map<string, Map<string, number>>();

  for (const record of userDailyVolumes) {
    const { dateStr, userAddress, volumeUsd } = record;

    if (!dateVolumeMap.has(dateStr)) {
      dateVolumeMap.set(dateStr, new Map());
    }

    const dayMap = dateVolumeMap.get(dateStr)!;
    dayMap.set(userAddress, Number(volumeUsd));
  }

  // Transform to chart data format
  const volumeData: VolumeDataPoint[] = [];

  // Generate all dates in range
  const dates = generateDateRange(fromDate, toDate);

  for (const date of dates) {
    const dayMap = dateVolumeMap.get(date) || new Map();

    const dataPoint: VolumeDataPoint = {
      date,
    };

    // Add top wallets
    for (let i = 0; i < topWallets.length; i++) {
      const wallet = topWallets[i];
      dataPoint[`top${i + 1}`] = dayMap.get(wallet) || 0;
    }

    // Add custom wallet if provided and not in top
    if (customWallet && !isCustomInTop) {
      const customLower = customWallet.toLowerCase();
      dataPoint['custom'] = dayMap.get(customLower) || 0;
    }

    // Calculate "others" volume
    let othersVolume = 0;
    for (const [wallet, volume] of dayMap.entries()) {
      const isTop = topWallets.includes(wallet);
      const isCustom = customWallet?.toLowerCase() === wallet;

      if (!isTop && !isCustom) {
        othersVolume += volume;
      }
    }

    dataPoint['others'] = othersVolume;

    volumeData.push(dataPoint);
  }

  return {
    volumeData,
    topWallets,
    customWallet: customWallet && !isCustomInTop ? customWallet : undefined,
  };
}

/**
 * Generate array of dates between start and end (inclusive)
 */
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}
