export const CONFIG = {
  HYPERLIQUID_BASE_URL: process.env.HYPERLIQUID_BASE_URL || 'https://stats-data.hyperliquid.xyz/Mainnet/builder_fills',
  BUILDER_ADDRESS: process.env.BUILDER_ADDRESS || '0xc36f6e7dc0ab7146c11f500e146d0084254c8bf6',
  CRON_SECRET: process.env.CRON_SECRET || '',
  POSTGRES_URL: process.env.POSTGRES_URL || '',
  POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING || '',
  TOP_WALLETS_COUNT: 5,
  SYNC_INTERVAL_HOURS: 4,
} as const;
