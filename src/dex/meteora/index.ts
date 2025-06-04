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
      
      // Fetch all pools from Meteora API
      const url = process.env.METEORA_API_URL || 'https://dlmm-api.meteora.ag/pair/all';
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
      
      const allPools = await response.json();
      
      if (!Array.isArray(allPools)) {
        throw new Error('Invalid API response format from Meteora');
      }
      
      console.log(`[Meteora] Received ${allPools.length} pools from API`);
      
      // Filter pools for our token pair
      const relevantPools = allPools.filter((pool: any) => {
        const mintX = pool.mint_x?.toLowerCase();
        const mintY = pool.mint_y?.toLowerCase();
        const tokenA = tokenAMint.toLowerCase();
        const tokenB = tokenBMint.toLowerCase();
        
        return (
          (mintX === tokenA && mintY === tokenB) ||
          (mintX === tokenB && mintY === tokenA)
        );
      });
      
      console.log(`[Meteora] Found ${relevantPools.length} pools for token pair`);
      
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
            base_fee: pool.base_fee,
            mint_x: pool.mint_x,
            mint_y: pool.mint_y
          });
          
          const liquidity = parseFloat(pool.liquidity || '0');
          const currentPrice = parseFloat(pool.current_price || '0');
          const binStep = parseInt(pool.bin_step || '0');
          const baseFee = pool.base_fee !== undefined ? parseFloat(pool.base_fee) : null;
          
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
            baseFeePercentage: baseFee !== null ? baseFee * 100 : null // Convert to percentage only if baseFee exists
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