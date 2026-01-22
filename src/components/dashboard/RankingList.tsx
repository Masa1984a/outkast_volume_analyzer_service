'use client';

import { useState } from 'react';
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

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function CopyButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1.5 rounded hover:bg-muted transition-colors"
      title="Copy address"
    >
      {copied ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green-500"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
    </button>
  );
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
                    <div className="font-mono text-sm font-medium flex items-center">
                      {truncateAddress(customWalletStats.address)}
                      <CopyButton address={customWalletStats.address} />
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
                <div className="font-mono text-sm flex items-center">
                  {truncateAddress(wallet.address)}
                  <CopyButton address={wallet.address} />
                </div>
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
