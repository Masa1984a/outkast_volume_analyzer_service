export interface DateRange {
  from: string;
  to: string;
}

export interface VolumeDataPoint {
  date: string;
  [userAddress: string]: number | string;
}

export interface DataAPIResponse {
  volumeData: VolumeDataPoint[];
  topWallets: string[];
  customWallet?: string;
}

export interface StatsAPIResponse {
  totalVolume: number;
  totalTrades: number;
  uniqueWallets: number;
  avgDailyVolume: number;
  topWallets: {
    address: string;
    volume: number;
    rank: number;
  }[];
  customWalletStats?: {
    address: string;
    volume: number;
    rank: number;
  };
}

export interface SyncStatus {
  id?: number;
  lastSyncedDate: Date;
  lastSyncStartedAt?: Date;
  lastSyncCompletedAt?: Date;
  lastSyncStatus?: 'success' | 'failed' | 'running';
  errorMessage?: string;
  updatedAt?: Date;
}
