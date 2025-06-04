export interface TokenPair {
  tokenAMint: string;
  tokenBMint: string;
}

// Base interface for all market results
export interface PriceMarket {
  dex: string;
  price: number;
  timestamp: number;
  poolAddress?: string;
}

export interface PriceResult {
  pair: TokenPair;
  markets: PriceMarket[];
  timestamp: number;
  executionTime: number;
} 