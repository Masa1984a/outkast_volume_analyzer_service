'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { WalletInput } from '@/components/dashboard/WalletInput';
import { StatsSummary } from '@/components/dashboard/StatsSummary';
import { VolumeChart } from '@/components/dashboard/VolumeChart';
import { RankingList } from '@/components/dashboard/RankingList';

export default function Home() {
  const [fromDate, setFromDate] = useState('2025-11-01');
  const [toDate, setToDate] = useState('2025-11-30');
  const [customWallet, setCustomWallet] = useState('');

  const [volumeData, setVolumeData] = useState<any>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
      });

      if (customWallet) {
        params.set('wallet', customWallet);
      }

      // Fetch volume data and stats in parallel
      const [volumeRes, statsRes] = await Promise.all([
        fetch(`/api/data?${params.toString()}`),
        fetch(`/api/stats?${params.toString()}`),
      ]);

      if (!volumeRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const volumeJson = await volumeRes.json();
      const statsJson = await statsRes.json();

      setVolumeData(volumeJson);
      setStatsData(statsJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const handleDateChange = (from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
    setTimeout(fetchData, 100);
  };

  const handleWalletChange = (wallet: string) => {
    setCustomWallet(wallet);
    setTimeout(fetchData, 100);
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-background">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">OUTKAST Volume Dashboard</h1>
        <p className="text-muted-foreground">
          Hyperliquid OUTKAST Builder trading volume analytics
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DateRangeFilter onDateChange={handleDateChange} />
            <WalletInput onWalletChange={handleWalletChange} />
          </CardContent>
        </Card>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading data...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <p className="text-destructive">Error: {error}</p>
        </div>
      )}

      {/* Dashboard content */}
      {!loading && !error && statsData && volumeData && (
        <div className="space-y-8">
          {/* Stats Summary */}
          <StatsSummary
            totalVolume={statsData.totalVolume}
            totalTrades={statsData.totalTrades}
            uniqueWallets={statsData.uniqueWallets}
            avgDailyVolume={statsData.avgDailyVolume}
          />

          {/* Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Volume by Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <VolumeChart
                data={volumeData.volumeData}
                topWallets={volumeData.topWallets}
                customWallet={volumeData.customWallet}
              />
            </CardContent>
          </Card>

          {/* Rankings */}
          <RankingList
            topWallets={statsData.topWallets}
            customWalletStats={statsData.customWalletStats}
          />
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>
          Data from Hyperliquid OUTKAST Builder •{' '}
          Updates every 4 hours via Vercel Cron
        </p>
      </div>
    </main>
  );
}
