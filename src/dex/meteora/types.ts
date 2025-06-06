import { PriceMarket } from '../common/types';

export interface MeteoraMarketResult extends PriceMarket {
  dex: 'Meteora';
  binStep: number;
  liquidity: number;
  baseFeePercentage: number | undefined;
} 