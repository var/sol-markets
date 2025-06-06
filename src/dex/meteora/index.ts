import { MeteoraMarketResult } from './types';
import { TokenPair } from '../common/types';
import { MarketProvider } from '../common/MarketProvider';
import fetch from 'node-fetch';

/**
 * Meteora DEX market provider
 */
export class MeteoraMarket extends MarketProvider<MeteoraMarketResult> {
  private minLiquidity: number;
  private slippageBps: number;

  constructor(minLiquidity: number = 0, slippageBps: number = 50) {
    super('Meteora');
    this.minLiquidity = minLiquidity;
    this.slippageBps = slippageBps;
  }

  async getMarkets(pair: TokenPair): Promise<MeteoraMarketResult[]> {
    try {
      const { tokenAMint, tokenBMint } = pair;
      
      const baseUrl = process.env.METEORA_API_URL || 'https://dlmm-api.meteora.ag/pair/all_by_groups';
      
      // Build query parameters for server-side filtering with both token pair combinations
      const params = new URLSearchParams();
      const tokenPair1 = `${tokenAMint}-${tokenBMint}`;
      const tokenPair2 = `${tokenBMint}-${tokenAMint}`;
      params.append('include_pool_token_pairs', `${tokenPair1},${tokenPair2}`);
      
      const url = `${baseUrl}?${params.toString()}`;
      
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
      
      // Extract pools from all groups in the response
      const relevantPools = this.extractPoolsFromResponse(apiResponse);
      
      if (relevantPools.length === 0) {
        return [];
      }
      
      // Process pools to get market data
      const markets = this.processPoolsToMarkets(relevantPools, tokenAMint, tokenBMint);
      
      // Sort markets by liquidity in descending order
      return markets.sort((a, b) => b.liquidity - a.liquidity);
      
    } catch (error) {
      console.error('[Meteora] Error fetching or processing markets:', error);
      return [];
    }
  }

  private extractPoolsFromResponse(apiResponse: any): any[] {
    const pools: any[] = [];
    
    if (apiResponse?.groups && Array.isArray(apiResponse.groups)) {
      for (const group of apiResponse.groups) {
        if (group.pairs && Array.isArray(group.pairs)) {
          pools.push(...group.pairs);
        }
      }
    }
    
    return pools;
  }

  private processPoolsToMarkets(pools: any[], tokenAMint: string, tokenBMint: string): MeteoraMarketResult[] {
    const markets: MeteoraMarketResult[] = [];
    
    for (const pool of pools) {
      try {
        const processedMarket = this.processPool(pool, tokenAMint, tokenBMint);
        if (processedMarket) {
          markets.push(processedMarket);
        }
      } catch (poolError) {
        console.error(`[Meteora] Error processing pool ${pool.address}:`, poolError);
        continue;
      }
    }
    
    return markets;
  }

  private processPool(pool: any, tokenAMint: string, tokenBMint: string): MeteoraMarketResult | null {
    const liquidity = parseFloat(pool.liquidity || '0');
    const currentPrice = parseFloat(pool.current_price || '0');
    const binStep = parseInt(pool.bin_step || '0');
    const baseFeePercentage = pool.base_fee_percentage !== undefined ? parseFloat(pool.base_fee_percentage) : undefined;
    
    // Skip pools with insufficient liquidity
    if (liquidity < this.minLiquidity) {
      return null;
    }
    
    // Handle price direction based on token order
    const finalPrice = this.calculateFinalPrice(pool, currentPrice, tokenAMint, tokenBMint);
    
    if (finalPrice <= 0) {
      return null;
    }
    
    const baseMarket = this.createBaseMarket(finalPrice, pool.address);
    return {
      ...baseMarket,
      dex: 'Meteora',
      binStep: binStep,
      liquidity: liquidity,
      baseFeePercentage: baseFeePercentage
    };
  }

  private calculateFinalPrice(pool: any, currentPrice: number, tokenAMint: string, tokenBMint: string): number {
    const mintX = pool.mint_x?.toLowerCase();
    const tokenA = tokenAMint.toLowerCase();
    
    // If tokenA is mint_y (second token), we need to invert the price
    if (mintX !== tokenA) {
      return currentPrice > 0 ? 1 / currentPrice : 0;
    }
    
    return currentPrice;
  }
}

export * from './types'; 