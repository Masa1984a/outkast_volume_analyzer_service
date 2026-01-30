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
  originalDataHash: string;       // 元データのハッシュ（枝番を除く）
  sequenceNumber: number;         // 枝番（1, 2, 3...）
  dataHash?: string;              // 下位互換のため残す（後で削除可能）
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
