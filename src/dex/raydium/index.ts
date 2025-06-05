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
      const baseUrl = process.env.RAYDIUM_API_URL || 'https://api-v3.raydium.io/pools/info/mint';
      const url = `${baseUrl}?mint1=${pair.tokenAMint}&mint2=${pair.tokenBMint}&poolType=all&poolSortField=default&sortType=desc&pageSize=1000&page=1`;

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

      const apiResponse = await response.json();
      const pools = apiResponse.data?.data || [];

      if (pools.length === 0) {
        return [];
      }

      // Process pools to markets
      const markets = this.processPoolsToMarkets(pools, pair);

      // Sort by liquidity (TVL) descending
      return markets.sort((a, b) => b.liquidity - a.liquidity);
      
    } catch (error) {
      console.error('[Raydium] Error fetching or processing markets:', error);
      return [];
    }
  }

  private processPoolsToMarkets(pools: any[], pair: TokenPair): RaydiumMarketResult[] {
    const markets: RaydiumMarketResult[] = [];

    for (const pool of pools) {
      try {
        const market = this.processPool(pool, pair);
        if (market) {
          markets.push(market);
        }
      } catch (poolError) {
        console.error(`[Raydium] Error processing pool ${pool.id}:`, poolError);
        continue;
      }
    }

    return markets;
  }

  private processPool(pool: any, pair: TokenPair): RaydiumMarketResult | null {
    const tvl = parseFloat(pool.tvl || '0');
    const volume24h = parseFloat(pool.day?.volume || '0');
    const fee24h = parseFloat(pool.day?.volumeFee || '0');
    
    // Apply minimum liquidity filter (using TVL as liquidity metric)
    if (tvl < this.minLiquidity) {
      return null;
    }
    
    // Get price from the pool - V3 API provides price directly
    const price = parseFloat(pool.price || '0');
    
    // Skip pools with invalid numeric values
    if (isNaN(price) || isNaN(tvl) || price <= 0) {
      return null;
    }
    
    // V3 API price is for the pair as provided, check if we need to invert
    // Compare the first mint in the pool with tokenAMint to determine direction
    const poolMintA = pool.mintA?.address || pool.mintA;
    const isTokenAFirst = poolMintA === pair.tokenAMint;
    const finalPrice = isTokenAFirst ? price : (price > 0 ? 1 / price : 0);

    return {
      dex: 'Raydium',
      price: finalPrice,
      poolAddress: pool.id,
      timestamp: Date.now(),
      liquidity: tvl,
      volume_24h: volume24h,
      fee_24h: fee24h
    };
  }
}

export * from './types';