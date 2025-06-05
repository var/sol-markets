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
      const baseUrl = process.env.ORCA_API_URL || 'https://api.orca.so/v2/solana/pools';
      
      // Build URL with server-side filtering parameters
      let url = `${baseUrl}?tokensBothOf=${tokenAMint},${tokenBMint}&size=50`;
      
      // Add minimum TVL filter if specified
      if (this.minLiquidity > 0) {
        url += `&minTvl=${this.minLiquidity}`;
      }
      
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

      if (!data.data || data.data.length === 0) {
        return [];
      }

      // Convert pools to standardized market format
      return this.processPoolsToMarkets(data.data);
      
    } catch (error) {
      console.error('[Orca] Error fetching or processing markets:', error);
      return [];
    }
  }

  private processPoolsToMarkets(pools: WhirlpoolData[]): OrcaMarketResult[] {
    const markets: OrcaMarketResult[] = [];
    
    for (const pool of pools) {
      const market = this.processPool(pool);
      if (market) {
        markets.push(market);
      }
    }
    
    return markets;
  }

  private processPool(pool: WhirlpoolData): OrcaMarketResult | null {
    const price = parseFloat(pool.price);
    const tvl = parseFloat(pool.tvlUsdc);
    const volume24h = parseFloat(pool.stats?.['24h']?.volume || '0');
    
    // Basic validation
    if (price <= 0) {
      return null;
    }
    
    return {
      dex: 'Orca',
      price,
      poolAddress: pool.address,
      timestamp: Date.now(),
      tvl,
      fee: pool.feeRate,
      volume24h,
      tokenA: pool.tokenA,
      tokenB: pool.tokenB
    };
  }
}

export * from './types'; 