import { RaydiumMarket } from './index';
import { TokenPair } from '../common/types';

interface RaydiumMarketArgs {
  tokenAMint: string;
  tokenBMint: string;
  slippageBps?: number;
  minLiquidity?: number;
}

export const raydiumResolvers = {
  Query: {
    async raydiumMarkets(_: unknown, { tokenAMint, tokenBMint, minLiquidity = 0 }: RaydiumMarketArgs) {
      const tokenPair: TokenPair = { tokenAMint, tokenBMint };
      const raydiumMarket = new RaydiumMarket(minLiquidity);
      return raydiumMarket.getMarkets(tokenPair);
    },
  },
}; 