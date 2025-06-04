import { PriceMarket } from '../common/types';

export interface RaydiumMarketResult extends PriceMarket {
  dex: 'Raydium';
  poolAddress: string;
  liquidity: number;
  volume_24h: number;
  fee_24h: number;
} 