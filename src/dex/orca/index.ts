import { MarketProvider } from '../common/MarketProvider';
import { TokenPair } from '../common/types';
import { OrcaMarketResult, WhirlpoolResponse, WhirlpoolData } from './types';
import fetch from 'node-fetch';

/**
 * Orca DEX market provider
 */
export class OrcaMarket extends MarketProvider<OrcaMarketResult> {
  private minLiquidity: number;

  constructor(minLiquidity: number = 0) {
    super('Orca');
    this.minLiquidity = minLiquidity;
  }

  async getMarkets(pair: TokenPair): Promise<OrcaMarketResult[]> {
    const { tokenAMint, tokenBMint } = pair;

    try {
      console.log(`[Orca] Fetching markets for ${tokenAMint} / ${tokenBMint}`);

      // Build query parameters for server-side filtering
      const baseUrl = process.env.ORCA_API_URL || 'https://api.orca.so/v2/solana/pools';
      
      // Build URL manually to avoid encoding issues - add minTvl parameter
      let url = `${baseUrl}?tokensBothOf=${tokenAMint},${tokenBMint}&size=50`;
      
      // Add minimum TVL filter if specified
      if (this.minLiquidity > 0) {
        url += `&minTvl=${this.minLiquidity}`;
      }

      console.log(`[Orca] Querying: ${url}`);
      
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

      const data: WhirlpoolResponse = await response.json();
      console.log(`[Orca] Received ${data.data?.length || 0} pools from API`);

      if (!data.data || data.data.length === 0) {
        console.log('[Orca] No pools found for this token pair');
        return [];
      }

      // Convert to standardized format - minimal processing needed since server did the filtering
      const markets: OrcaMarketResult[] = [];
      
      for (const pool of data.data) {
        const price = parseFloat(pool.price);
        const tvl = parseFloat(pool.tvlUsdc);
        const volume24h = parseFloat(pool.stats?.['24h']?.volume || '0');
        
        // Basic validation
        if (price <= 0) {
          console.log(`[Orca] Pool ${pool.address} has invalid price (${pool.price}), skipping`);
          continue;
        }
        
        markets.push({
          dex: 'Orca',
          price,
          poolAddress: pool.address,
          timestamp: Date.now(),
          tvl,
          fee: pool.feeRate,
          volume24h,
          tokenA: pool.tokenA,
          tokenB: pool.tokenB
        });
      }

      console.log(`[Orca] Found ${markets.length} valid pools`);
      return markets;
    } catch (error) {
      console.error('[Orca] Error fetching or processing markets:', error);
      return [];
    }
  }
}

export * from './types'; 