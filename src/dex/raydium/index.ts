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

      // Use environment variable for API URL
      const baseUrl = process.env.RAYDIUM_API_URL || 'https://api-v3.raydium.io/pools/info/mint';
      const url = `${baseUrl}?mint1=${pair.tokenAMint}&mint2=${pair.tokenBMint}&poolType=all&poolSortField=default&sortType=desc&pageSize=1000&page=1`;
      
      console.log(`[Raydium] Querying: ${url}`);

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
      
      console.log(`[Raydium] Received ${pools.length} pools from V3 API`);

      if (pools.length === 0) {
        return [];
      }

      const markets: RaydiumMarketResult[] = [];

      for (const pool of pools) {
        try {
          const tvl = parseFloat(pool.tvl || '0');
          const volume24h = parseFloat(pool.day?.volume || '0');
          const fee24h = parseFloat(pool.day?.volumeFee || '0');
          
          // Apply minimum liquidity filter (using TVL as liquidity metric)
          if (tvl < this.minLiquidity) {
            console.log(`[Raydium] Pool ${pool.id} has TVL ${tvl} below minimum ${this.minLiquidity}, skipping`);
            continue;
          }
          
          // Get price from the pool - V3 API provides price directly
          const price = parseFloat(pool.price || '0');
          
          // Skip pools with invalid numeric values
          if (isNaN(price) || isNaN(tvl) || price <= 0) {
            console.log(`[Raydium] Pool ${pool.id} has invalid numeric values, skipping`);
            continue;
          }
          
          // V3 API price is for the pair as provided, check if we need to invert
          // Compare the first mint in the pool with tokenAMint to determine direction
          const poolMintA = pool.mintA?.address || pool.mintA;
          const isTokenAFirst = poolMintA === pair.tokenAMint;
          const finalPrice = isTokenAFirst ? price : (price > 0 ? 1 / price : 0);

          markets.push({
            dex: 'Raydium',
            price: finalPrice,
            poolAddress: pool.id,
            timestamp: Date.now(),
            liquidity: tvl,
            volume_24h: volume24h,
            fee_24h: fee24h
          });
        } catch (poolError) {
          console.error(`[Raydium] Error processing pool ${pool.id}:`, poolError);
          continue;
        }
      }

      // Sort by liquidity (TVL) descending
      markets.sort((a, b) => b.liquidity - a.liquidity);

      console.log(`[Raydium] Found ${markets.length} valid markets with TVL >= ${this.minLiquidity}`);
      return markets;
    } catch (error) {
      console.error('[Raydium] Error fetching or processing markets:', error);
      return [];
    }
  }
}

export * from './types'; 