export interface WalletVolume {
  userAddress: string;
  totalVolume: number;
  rank: number;
}

export interface WalletDetails {
  userAddress: string;
  totalVolume: number;
  tradeCount: number;
  firstTradeDate: string;
  lastTradeDate: string;
  avgTradeSize: number;
}
