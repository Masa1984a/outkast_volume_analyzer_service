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
import { CHART_COLORS } from '@/lib/constants/colors';
import { VolumeDataPoint } from '@/types/api';

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
  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          {/* Left Y-axis for volume */}
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12 }}
            tickFormatter={formatValue}
            label={{ value: 'Volume (USD)', angle: -90, position: 'insideLeft' }}
          />
          {/* Right Y-axis for unique wallets */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            label={{ value: 'Unique Wallets', angle: 90, position: 'insideRight' }}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'uniqueWallets') {
                return [value, 'Unique Wallets'];
              }
              return [formatValue(value), name];
            }}
            labelStyle={{ color: '#000' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
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
          <Bar yAxisId="left" dataKey="top1" stackId="a" fill={CHART_COLORS.top1} />
          <Bar yAxisId="left" dataKey="top2" stackId="a" fill={CHART_COLORS.top2} />
          <Bar yAxisId="left" dataKey="top3" stackId="a" fill={CHART_COLORS.top3} />
          <Bar yAxisId="left" dataKey="top4" stackId="a" fill={CHART_COLORS.top4} />
          <Bar yAxisId="left" dataKey="top5" stackId="a" fill={CHART_COLORS.top5} />

          {/* Custom wallet if not in top 5 */}
          {customWallet && <Bar yAxisId="left" dataKey="custom" stackId="a" fill={CHART_COLORS.custom} />}

          {/* Others */}
          <Bar yAxisId="left" dataKey="others" stackId="a" fill={CHART_COLORS.others} />

          {/* Unique wallets line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="uniqueWallets"
            stroke="#FF8042"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
