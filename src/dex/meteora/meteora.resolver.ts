import { MeteoraMarket } from './index';
import { TokenPair } from '../common/types';

interface MeteoraMarketArgs {
  tokenAMint: string;
  tokenBMint: string;
  slippageBps?: number;
  minLiquidity?: number;
}

export const meteoraResolvers = {
  Query: {
    async meteoraMarkets(_: unknown, { tokenAMint, tokenBMint, slippageBps = 50, minLiquidity = 0 }: MeteoraMarketArgs) {
      const tokenPair: TokenPair = { tokenAMint, tokenBMint };
      const meteoraMarket = new MeteoraMarket(minLiquidity, slippageBps);
      return meteoraMarket.getMarkets(tokenPair);
    },
  },
}; 