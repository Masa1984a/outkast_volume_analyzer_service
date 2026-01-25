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
  totalVolumeChange?: number;
  totalTradesChange?: number;
  uniqueWalletsChange?: number;
  avgDailyVolumeChange?: number;
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

  // Get total stats for current period
  const totalStats = await getTotalStats(fromDate, toDate);

  const totalVolume = Number(totalStats.totalVolume || 0);
  const totalTrades = Number(totalStats.totalTrades || 0);
  const uniqueWallets = Number(totalStats.uniqueWallets || 0);
  const tradingDays = Number(totalStats.tradingDays || 1);
  const avgDailyVolume = totalVolume / tradingDays;

  // Calculate previous period stats (From to To-1day) for comparison
  let totalVolumeChange: number | undefined;
  let totalTradesChange: number | undefined;
  let uniqueWalletsChange: number | undefined;
  let avgDailyVolumeChange: number | undefined;

  const toDateObj = new Date(toDate);
  const prevToDate = new Date(toDateObj);
  prevToDate.setDate(prevToDate.getDate() - 1);
  const prevToDateStr = prevToDate.toISOString().split('T')[0];

  // Only calculate changes if there's at least 2 days of data
  if (new Date(fromDate) < new Date(prevToDateStr)) {
    const prevStats = await getTotalStats(fromDate, prevToDateStr);
    const prevTotalVolume = Number(prevStats.totalVolume || 0);
    const prevTotalTrades = Number(prevStats.totalTrades || 0);
    const prevUniqueWallets = Number(prevStats.uniqueWallets || 0);
    const prevTradingDays = Number(prevStats.tradingDays || 1);
    const prevAvgDailyVolume = prevTotalVolume / prevTradingDays;

    totalVolumeChange = totalVolume - prevTotalVolume;
    totalTradesChange = totalTrades - prevTotalTrades;
    uniqueWalletsChange = uniqueWallets - prevUniqueWallets;
    avgDailyVolumeChange = avgDailyVolume - prevAvgDailyVolume;
  }

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
    totalVolumeChange,
    totalTradesChange,
    uniqueWalletsChange,
    avgDailyVolumeChange,
    topWallets,
    customWalletStats,
  };
}
