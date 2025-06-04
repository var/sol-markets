import { OrcaMarket } from './index';
import { TokenPair } from '../common/types';

interface OrcaMarketArgs {
  tokenAMint: string;
  tokenBMint: string;
  slippageBps?: number;
  minLiquidity?: number;
}

export const orcaResolvers = {
  Query: {
    async orcaMarkets(_: unknown, { tokenAMint, tokenBMint, minLiquidity = 0 }: OrcaMarketArgs) {
      const tokenPair: TokenPair = { tokenAMint, tokenBMint };
      const orcaMarket = new OrcaMarket(minLiquidity);
      return orcaMarket.getMarkets(tokenPair);
    },
  },
}; 