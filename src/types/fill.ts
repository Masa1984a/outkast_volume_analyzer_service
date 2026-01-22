export interface Fill {
  id?: bigint;
  transactionTime: Date;
  dateStr: string;
  userAddress: string;
  coin: string;
  side: 'Bid' | 'Ask';
  px: number;
  sz: number;
  volumeUsd?: number;
  crossed: boolean;
  specialTradeType?: string;
  tif?: string;
  isTrigger: boolean;
  counterparty?: string;
  closedPnl?: number;
  twapId?: bigint;
  builderFee?: number;
  rawDataJson?: Record<string, any>;
  dataHash: string;
  createdAt?: Date;
}

export interface FillCSVRow {
  time: string;
  user: string;
  coin: string;
  side: string;
  px: string;
  sz: string;
  crossed: string;
  specialTradeType?: string;
  tif?: string;
  isTrigger: string;
  counterparty?: string;
  closedPnl?: string;
  twapId?: string;
  builderFee?: string;
}

export interface DailyVolume {
  dateStr: string;
  volumeUsd: number;
}

export interface UserDailyVolume {
  userAddress: string;
  dateStr: string;
  volumeUsd: number;
}
