import { GetMarket } from './index';
import { OrcaMarket } from '../dex/orca';
import { RaydiumMarket } from '../dex/raydium';
import { MeteoraMarket } from '../dex/meteora';
import { TokenPair } from '../dex/common/types';

interface MarketQueryArgs {
  tokenAMint: string;
  tokenBMint: string;
  dexes?: string[];
  slippageBps?: number;
  minLiquidity?: number;
}

export const marketResolvers = {
  Query: {
    async markets(_: unknown, { tokenAMint, tokenBMint, dexes, slippageBps = 50, minLiquidity = 0 }: MarketQueryArgs) {
      const tokenPair: TokenPair = { tokenAMint, tokenBMint };
      
      if (!dexes?.length) {
        const getMarket = new GetMarket(slippageBps, minLiquidity);
        const result = await getMarket.getMarkets(tokenPair);
        return result.markets;
      }

      const promises = dexes
        .filter(dex => ['ORCA', 'RAYDIUM', 'METEORA'].includes(dex))
        .map(dex => {
          switch (dex) {
            case 'ORCA':
              return new OrcaMarket(minLiquidity).getMarkets(tokenPair);
            case 'RAYDIUM':
              return new RaydiumMarket(minLiquidity).getMarkets(tokenPair);
            case 'METEORA':
              return new MeteoraMarket(minLiquidity, slippageBps).getMarkets(tokenPair);
            default:
              return Promise.resolve([]);
          }
        });

      const results = await Promise.allSettled(promises);
      
      return results
        .filter((result): result is PromiseFulfilledResult<any[]> => 
          result.status === 'fulfilled' && Array.isArray(result.value)
        )
        .flatMap(result => result.value);
    },
  },

  Market: {
    __resolveType(obj: { dex: string }) {
      const typeMap: Record<string, string> = {
        'Orca': 'OrcaMarket',
        'Raydium': 'RaydiumMarket',
        'Meteora': 'MeteoraMarket',
      };
      return typeMap[obj.dex] || null;
    },
  },
}; 