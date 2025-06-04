export interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  creator: string;
  bondingCurveKey?: string;
  createdTimestamp: number;
}

export interface PumpFunTokenEvent {
  type: 'token_created';
  token: PumpFunToken;
  timestamp: number;
  txSignature?: string;
} 