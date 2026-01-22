'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHART_COLORS } from '@/lib/constants/colors';

interface RankingData {
  address: string;
  volume: number;
  rank: number;
  percentage: number;
}

interface RankingListProps {
  topWallets: RankingData[];
  customWalletStats?: RankingData;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(2)}M`;
  } else if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(2)}K`;
  } else {
    return `$${volume.toFixed(2)}`;
  }
}

function getColorForRank(rank: number): string {
  if (rank === 1) return CHART_COLORS.top1;
  if (rank === 2) return CHART_COLORS.top2;
  if (rank === 3) return CHART_COLORS.top3;
  if (rank === 4) return CHART_COLORS.top4;
  if (rank === 5) return CHART_COLORS.top5;
  return CHART_COLORS.others;
}

export function RankingList({ topWallets, customWalletStats }: RankingListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Wallets by Volume</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Custom wallet stats */}
          {customWalletStats && (
            <div
              className="p-4 rounded-lg border-2"
              style={{ borderColor: CHART_COLORS.custom, backgroundColor: `${CHART_COLORS.custom}10` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: CHART_COLORS.custom }}
                  >
                    {customWalletStats.rank}
                  </div>
                  <div>
                    <div className="font-mono text-sm font-medium">
                      {customWalletStats.address}
                    </div>
                    <div className="text-xs text-muted-foreground">Custom Wallet</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatVolume(customWalletStats.volume)}</div>
                  <div className="text-sm text-muted-foreground">
                    {customWalletStats.percentage.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top wallets */}
          {topWallets.map((wallet) => (
            <div
              key={wallet.address}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: getColorForRank(wallet.rank) }}
                >
                  {wallet.rank}
                </div>
                <div className="font-mono text-sm">{wallet.address}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatVolume(wallet.volume)}</div>
                <div className="text-sm text-muted-foreground">
                  {wallet.percentage.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
