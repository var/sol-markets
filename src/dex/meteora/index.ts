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
      
      console.log(`[Meteora] Fetching markets for ${tokenAMint} / ${tokenBMint}`);
      
      // Use environment variable for API URL with server-side filtering
      const baseUrl = process.env.METEORA_API_URL || 'https://dlmm-api.meteora.ag/pair/all_by_groups';
      
      // Build query parameters for server-side filtering
      const params = new URLSearchParams();
      // Include both possible token pair combinations
      const tokenPair1 = `${tokenAMint}-${tokenBMint}`;
      const tokenPair2 = `${tokenBMint}-${tokenAMint}`;
      params.append('include_pool_token_pairs', `${tokenPair1},${tokenPair2}`);
      
      const url = `${baseUrl}?${params.toString()}`;
      
      console.log(`[Meteora] Querying: ${url}`);
      
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
      
      // The all_by_groups endpoint returns data in the format: { groups: [{ name: string, pairs: [...] }], total: number }
      // We need to extract pools from all groups
      let relevantPools: any[] = [];
      
      if (apiResponse && apiResponse.groups && Array.isArray(apiResponse.groups)) {
        for (const group of apiResponse.groups) {
          if (group.pairs && Array.isArray(group.pairs)) {
            relevantPools.push(...group.pairs);
          }
        }
      }
      
      console.log(`[Meteora] Received ${relevantPools.length} pools from server-side filtered API`);
      
      if (relevantPools.length === 0) {
        return [];
      }
      
      // Process pools to get market data
      const markets: MeteoraMarketResult[] = [];
      
      for (const pool of relevantPools) {
        try {
          console.log('Pool details:', {
            address: pool.address,
            current_price: pool.current_price,
            liquidity: pool.liquidity,
            bin_step: pool.bin_step,
            base_fee_percentage: pool.base_fee_percentage,
            mint_x: pool.mint_x,
            mint_y: pool.mint_y
          });
          
          const liquidity = parseFloat(pool.liquidity || '0');
          const currentPrice = parseFloat(pool.current_price || '0');
          const binStep = parseInt(pool.bin_step || '0');
          const baseFeePercentage = pool.base_fee_percentage !== undefined ? parseFloat(pool.base_fee_percentage) : null;
          
          // Skip pools with insufficient liquidity
          if (liquidity < this.minLiquidity) {
            console.log(`Pool ${pool.address} has low liquidity (${liquidity} < ${this.minLiquidity}), skipping`);
            continue;
          }
          
          // Handle price direction based on token order
          const mintX = pool.mint_x?.toLowerCase();
          const tokenA = tokenAMint.toLowerCase();
          
          let finalPrice = currentPrice;
          
          // If tokenA is mint_y (second token), we need to invert the price
          if (mintX !== tokenA) {
            console.log(`Pool ${pool.address} has different token order (${pool.mint_x?.toLowerCase()}/${pool.mint_y?.toLowerCase()}) than request (${tokenA}/${tokenBMint.toLowerCase()}), inverting price`);
            finalPrice = currentPrice > 0 ? 1 / currentPrice : 0;
          }
          
          if (finalPrice <= 0) {
            console.log(`Pool ${pool.address} has invalid price (${finalPrice}), skipping`);
            continue;
          }
          
          const baseMarket = this.createBaseMarket(finalPrice, pool.address);
          markets.push({
            ...baseMarket,
            dex: 'Meteora',
            binStep: binStep,
            liquidity: liquidity,
            baseFeePercentage: baseFeePercentage // API already provides percentage value
          });
          
        } catch (poolError) {
          console.error(`[Meteora] Error processing pool ${pool.address}:`, poolError);
          continue;
        }
      }
      
      // Sort markets by liquidity in descending order
      return markets.sort((a, b) => b.liquidity - a.liquidity);
      
    } catch (error) {
      console.error('[Meteora] Error fetching or processing markets:', error);
      return [];
    }
  }
}

export * from './types'; 