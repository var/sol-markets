import { TokenPair, PriceResult } from '../dex/common/types';
import { MeteoraMarketResult } from '../dex/meteora/types';
import { RaydiumMarketResult } from '../dex/raydium/types';
import { OrcaMarketResult } from '../dex/orca/types';
import { MeteoraMarket } from '../dex/meteora';
import { RaydiumMarket } from '../dex/raydium';
import { OrcaMarket } from '../dex/orca';
import { MarketProvider } from '../dex/common/MarketProvider';

export class GetMarket {
  private providers: MarketProvider<MeteoraMarketResult | RaydiumMarketResult | OrcaMarketResult>[];

  constructor(slippageBps: number = 50, minLiquidity: number = 0) {
    this.providers = [];
    
    // Initialize DEX markets based on environment variables
    const enableMeteora = process.env.ENABLE_METEORA !== 'false';
    const enableRaydium = process.env.ENABLE_RAYDIUM !== 'false';
    const enableOrca = process.env.ENABLE_ORCA !== 'false';

    if (enableMeteora) {
      this.providers.push(new MeteoraMarket(minLiquidity, slippageBps));
    }
    
    if (enableRaydium) {
      this.providers.push(new RaydiumMarket(minLiquidity));
    }
    
    if (enableOrca) {
      this.providers.push(new OrcaMarket(minLiquidity));
    }

    console.log('Initialized providers:', this.providers.map(p => p.name));
  }

  async getMarkets(pair: TokenPair): Promise<PriceResult> {
    const startTime = Date.now();
    const markets: (MeteoraMarketResult | RaydiumMarketResult | OrcaMarketResult)[] = [];

    // Get markets from all providers in parallel
    const providerMarkets = await Promise.allSettled(
      this.providers.map(provider => provider.getMarkets(pair))
    );

    // Collect results and handle errors
    providerMarkets.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        markets.push(...result.value);
      } else {
        console.error(`Error getting markets from provider ${this.providers[index].name}:`, result.reason);
      }
    });

    const endTime = Date.now();
    console.log(`Total execution time: ${endTime - startTime}ms`);

    return {
      pair,
      markets,
      timestamp: Date.now(),
      executionTime: endTime - startTime
    };
  }
} 