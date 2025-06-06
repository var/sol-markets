export interface RaydiumLaunchlabToken {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  creator: string;
  bondingCurveKey?: string;
  createdTimestamp: number;
}

export interface RaydiumLaunchlabTokenEvent {
  type: 'token_created';
  token: RaydiumLaunchlabToken;
  timestamp: number;
  txSignature?: string;
} 