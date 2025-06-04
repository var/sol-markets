import { RaydiumMarketResult } from './types';
import { TokenPair } from '../common/types';
import { MarketProvider } from '../common/MarketProvider';
import fetch from 'node-fetch';

/**
 * Raydium DEX market provider
 */
export class RaydiumMarket extends MarketProvider<RaydiumMarketResult> {
  private minLiquidity: number;

  constructor(minLiquidity: number = 0) {
    super('Raydium');
    this.minLiquidity = minLiquidity;
  }

  async getMarkets(pair: TokenPair): Promise<RaydiumMarketResult[]> {
    try {
      console.log(`[Raydium] Fetching markets for ${pair.tokenAMint} / ${pair.tokenBMint}`);

      // Fetch pool data from Raydium API
      const url = process.env.RAYDIUM_API_URL || 'https://api.raydium.io/v2/main/pairs';
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'sol-markets/1.0.0 (Node.js)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[Raydium] Received ${data.length} pools from API`);

      // Filter pools for the specific token pair
      const relevantPools = data.filter((pool: any) => {
        // Check if pool contains our token pair (either direction)
        return (
          (pool.baseMint === pair.tokenAMint && pool.quoteMint === pair.tokenBMint) ||
          (pool.baseMint === pair.tokenBMint && pool.quoteMint === pair.tokenAMint)
        );
      });

      console.log(`[Raydium] Found ${relevantPools.length} matching pools`);

      if (relevantPools.length === 0) {
        return [];
      }

      const markets: RaydiumMarketResult[] = [];

      for (const pool of relevantPools) {
        try {
          const liquidity = parseFloat(pool.liquidity);
          const volume24h = parseFloat(pool.volume24h || '0');
          const fee24h = parseFloat(pool.fee24h || '0');
          
          // Apply minimum liquidity filter
          if (liquidity < this.minLiquidity) {
            console.log(`[Raydium] Pool ${pool.ammId} has liquidity ${liquidity} below minimum ${this.minLiquidity}, skipping`);
            continue;
          }
          
          // Get price from the pool
          const price = parseFloat(pool.price);
          
          // Skip pools with invalid numeric values
          if (isNaN(price) || isNaN(liquidity) || price <= 0) {
            console.log(`[Raydium] Pool ${pool.ammId} has invalid numeric values, skipping`);
            continue;
          }
          
          // Raydium returns price as quote/base, so we need to invert if tokenA is the quote token
          const isTokenAQuote = pool.quoteMint === pair.tokenAMint;
          const finalPrice = isTokenAQuote ? 1 / price : price;

          markets.push({
            dex: 'Raydium',
            price: finalPrice,
            poolAddress: pool.ammId,
            timestamp: Date.now(),
            liquidity: liquidity,
            volume_24h: volume24h,
            fee_24h: fee24h
          });
        } catch (poolError) {
          console.error(`[Raydium] Error processing pool ${pool.ammId}:`, poolError);
          continue;
        }
      }

      // Sort by liquidity descending
      markets.sort((a, b) => b.liquidity - a.liquidity);

      console.log(`[Raydium] Found ${markets.length} valid markets with liquidity >= ${this.minLiquidity}`);
      return markets;
    } catch (error) {
      console.error('[Raydium] Error fetching or processing markets:', error);
      return [];
    }
  }
}

export * from './types'; 