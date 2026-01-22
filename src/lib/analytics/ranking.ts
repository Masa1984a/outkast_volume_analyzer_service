import { getTopWallets, getWalletStats, getTotalStats } from '@/lib/db/queries';
import { CONFIG } from '@/lib/constants/config';

export interface RankingData {
  address: string;
  volume: number;
  rank: number;
  percentage: number;
}

export interface StatsData {
  totalVolume: number;
  totalTrades: number;
  uniqueWallets: number;
  avgDailyVolume: number;
  topWallets: RankingData[];
  customWalletStats?: RankingData;
}

/**
 * Calculate rankings and statistics
 */
export async function calculateRankings(
  fromDate: string,
  toDate: string,
  customWallet?: string
): Promise<StatsData> {
  // Get top wallets
  const topWalletsData = await getTopWallets(
    fromDate,
    toDate,
    CONFIG.TOP_WALLETS_COUNT
  );

  // Get total stats
  const totalStats = await getTotalStats(fromDate, toDate);

  const totalVolume = Number(totalStats.totalVolume || 0);
  const totalTrades = Number(totalStats.totalTrades || 0);
  const uniqueWallets = Number(totalStats.uniqueWallets || 0);
  const tradingDays = Number(totalStats.tradingDays || 1);
  const avgDailyVolume = totalVolume / tradingDays;

  // Format top wallets
  const topWallets: RankingData[] = topWalletsData.map((wallet) => ({
    address: wallet.userAddress,
    volume: Number(wallet.totalVolume),
    rank: Number(wallet.rank),
    percentage: totalVolume > 0 ? (Number(wallet.totalVolume) / totalVolume) * 100 : 0,
  }));

  // Get custom wallet stats if provided
  let customWalletStats: RankingData | undefined;

  if (customWallet) {
    const walletStats = await getWalletStats(
      customWallet.toLowerCase(),
      fromDate,
      toDate
    );

    if (walletStats) {
      customWalletStats = {
        address: walletStats.userAddress,
        volume: Number(walletStats.totalVolume),
        rank: Number(walletStats.rank),
        percentage: totalVolume > 0 ? (Number(walletStats.totalVolume) / totalVolume) * 100 : 0,
      };
    }
  }

  return {
    totalVolume,
    totalTrades,
    uniqueWallets,
    avgDailyVolume,
    topWallets,
    customWalletStats,
  };
}
