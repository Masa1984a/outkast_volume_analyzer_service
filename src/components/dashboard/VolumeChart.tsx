'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getChartColors } from '@/lib/constants/colors';
import { VolumeDataPoint } from '@/types/api';
import { useTheme } from '@/components/theme-provider';

interface VolumeChartProps {
  data: VolumeDataPoint[];
  topWallets: string[];
  customWallet?: string;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatValue(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  } else {
    return `$${value.toFixed(0)}`;
  }
}

export function VolumeChart({ data, topWallets, customWallet }: VolumeChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = getChartColors(isDark);

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.gridLines} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: isDark ? '#E5E7EB' : '#374151' }}
            angle={-45}
            textAnchor="end"
            height={80}
            stroke={isDark ? '#E5E7EB' : '#374151'}
          />
          {/* Left Y-axis for volume */}
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12, fill: isDark ? '#E5E7EB' : '#374151' }}
            tickFormatter={formatValue}
            label={{ value: 'Volume (USD)', angle: -90, position: 'insideLeft', fill: isDark ? '#E5E7EB' : '#374151' }}
            stroke={isDark ? '#E5E7EB' : '#374151'}
          />
          {/* Right Y-axis for unique wallets */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12, fill: isDark ? '#E5E7EB' : '#374151' }}
            label={{ value: 'Unique Wallets', angle: 90, position: 'insideRight', fill: isDark ? '#E5E7EB' : '#374151' }}
            stroke={isDark ? '#E5E7EB' : '#374151'}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'uniqueWallets') {
                return [value, 'Unique Wallets'];
              }
              return [formatValue(value), name];
            }}
            contentStyle={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
              borderRadius: '6px',
            }}
            labelStyle={{ color: isDark ? '#E5E7EB' : '#111827' }}
            itemStyle={{ color: isDark ? '#E5E7EB' : '#374151' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: isDark ? '#E5E7EB' : '#374151' }}
            formatter={(value, entry: any) => {
              if (value === 'uniqueWallets') {
                return 'Unique Wallets';
              }
              if (value === 'custom' && customWallet) {
                return `Custom: ${formatAddress(customWallet)}`;
              }
              if (value.startsWith('top')) {
                const index = parseInt(value.replace('top', '')) - 1;
                if (topWallets[index]) {
                  return `#${index + 1}: ${formatAddress(topWallets[index])}`;
                }
              }
              if (value === 'others') {
                return 'Others';
              }
              return value;
            }}
          />

          {/* Top 5 wallets */}
          <Bar yAxisId="left" dataKey="top1" stackId="a" fill={colors.top1} />
          <Bar yAxisId="left" dataKey="top2" stackId="a" fill={colors.top2} />
          <Bar yAxisId="left" dataKey="top3" stackId="a" fill={colors.top3} />
          <Bar yAxisId="left" dataKey="top4" stackId="a" fill={colors.top4} />
          <Bar yAxisId="left" dataKey="top5" stackId="a" fill={colors.top5} />

          {/* Custom wallet if not in top 5 */}
          {customWallet && <Bar yAxisId="left" dataKey="custom" stackId="a" fill={colors.custom} />}

          {/* Others */}
          <Bar yAxisId="left" dataKey="others" stackId="a" fill={colors.others} />

          {/* Unique wallets line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="uniqueWallets"
            stroke={colors.uniqueWallets}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
