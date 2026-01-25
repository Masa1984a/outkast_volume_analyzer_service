'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatsSummaryProps {
  totalVolume: number;
  totalTrades: number;
  uniqueWallets: number;
  avgDailyVolume: number;
  totalVolumeChange?: number;
  totalTradesChange?: number;
  uniqueWalletsChange?: number;
  avgDailyVolumeChange?: number;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(2)}K`;
  } else {
    return `$${num.toFixed(2)}`;
  }
}

function formatChange(change: number | undefined, isVolume: boolean = false): JSX.Element | null {
  if (change === undefined) return null;

  const isPositive = change > 0;
  const isNegative = change < 0;
  const isZero = change === 0;

  const colorClass = isPositive
    ? 'text-green-600 dark:text-green-400'
    : isNegative
    ? 'text-red-600 dark:text-red-400'
    : 'text-muted-foreground';

  const prefix = isPositive ? '+' : '';
  const formattedValue = isVolume
    ? formatNumber(Math.abs(change))
    : Math.abs(change).toLocaleString();

  return (
    <div className={`text-sm font-medium ${colorClass}`}>
      {prefix}{isNegative ? '-' : ''}{formattedValue}
    </div>
  );
}

export function StatsSummary({
  totalVolume,
  totalTrades,
  uniqueWallets,
  avgDailyVolume,
  totalVolumeChange,
  totalTradesChange,
  uniqueWalletsChange,
  avgDailyVolumeChange,
}: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(totalVolume)}</div>
          {formatChange(totalVolumeChange, true)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTrades.toLocaleString()}</div>
          {formatChange(totalTradesChange)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Unique Wallets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{uniqueWallets.toLocaleString()}</div>
          {formatChange(uniqueWalletsChange)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg Daily Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(avgDailyVolume)}</div>
          {formatChange(avgDailyVolumeChange, true)}
        </CardContent>
      </Card>
    </div>
  );
}
