'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { WalletInput } from '@/components/dashboard/WalletInput';
import { StatsSummary } from '@/components/dashboard/StatsSummary';
import { VolumeChart } from '@/components/dashboard/VolumeChart';
import { RankingList } from '@/components/dashboard/RankingList';
import { ReferralSection } from '@/components/dashboard/ReferralSection';

function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export default function Home() {
  // Filter inputs (temporary, not yet applied)
  const [inputFromDate, setInputFromDate] = useState('2026-01-01');
  const [inputToDate, setInputToDate] = useState(getTodayString());
  const [inputWallet, setInputWallet] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  // Applied filters (used for API calls)
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState(getTodayString());
  const [customWallet, setCustomWallet] = useState('');

  const [volumeData, setVolumeData] = useState<any>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  const fetchData = useCallback(async (overrides?: { from?: string; to?: string; wallet?: string }) => {
    setLoading(true);
    setError(null);

    try {
      // Use overrides if provided, otherwise use current state
      const finalFrom = overrides?.from ?? fromDate;
      const finalTo = overrides?.to ?? toDate;
      const finalWallet = overrides?.wallet ?? customWallet;

      // Build query params
      const params = new URLSearchParams({
        from: finalFrom,
        to: finalTo,
      });

      if (finalWallet) {
        params.set('wallet', finalWallet);
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
  }, [fromDate, toDate, customWallet]);

  // Fetch sync status
  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync-status');
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchData();
    fetchSyncStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    setDateError(null);

    // Validate date range
    if (new Date(inputFromDate) > new Date(inputToDate)) {
      setDateError('From date must be before or equal to To date');
      return;
    }

    // Update applied filters
    setFromDate(inputFromDate);
    setToDate(inputToDate);
    setCustomWallet(inputWallet);

    // Fetch data with new filters
    fetchData({ from: inputFromDate, to: inputToDate, wallet: inputWallet });
  };

  const handleClearWallet = () => {
    setInputWallet('');
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
            <DateRangeFilter
              fromDate={inputFromDate}
              toDate={inputToDate}
              onFromDateChange={setInputFromDate}
              onToDateChange={setInputToDate}
              error={dateError}
            />
            <WalletInput
              wallet={inputWallet}
              onWalletChange={setInputWallet}
              onClear={handleClearWallet}
            />
            <div className="pt-2">
              <Button onClick={handleApplyFilters} className="w-full sm:w-auto">
                Apply Filters
              </Button>
            </div>
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

      {/* Referral Section */}
      <ReferralSection />

      {/* Footer */}
      <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground space-y-2">
        <p>
          Data from Hyperliquid OUTKAST Builder •{' '}
          Updates every 4 hours via Vercel Cron
        </p>
        {syncStatus?.lastSyncCompletedAt && (
          <p>
            Last sync completed: {new Date(syncStatus.lastSyncCompletedAt).toISOString().replace('T', ' ').substring(0, 19)} UTC
          </p>
        )}
        <p>
          Note: Trade data from Hyperliquid may be delayed by 1-2 days due to API limitations
        </p>
      </div>
    </main>
  );
}
