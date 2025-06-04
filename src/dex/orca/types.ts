import { PriceMarket } from '../common/types';

export interface OrcaMarketResult extends PriceMarket {
    dex: string;
    poolAddress: string;
    price: number;
    tvl: number;
    fee: number;
    volume24h: number;
    timestamp: number;
    tokenA?: WhirlpoolToken;
    tokenB?: WhirlpoolToken;
}

export interface WhirlpoolToken {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
}

export interface WhirlpoolStats {
    '24h': {
        volume: string;
        fees: string;
        rewards: string | null;
        yieldOverTvl: string;
    };
}

export interface WhirlpoolData {
    address: string;
    tokenMintA: string;
    tokenMintB: string;
    tokenA: WhirlpoolToken;
    tokenB: WhirlpoolToken;
    price: string;
    tvlUsdc: string;
    feeRate: number;
    protocolFeeRate: number;
    stats: WhirlpoolStats;
}

export interface WhirlpoolResponse {
    data: WhirlpoolData[];
    meta: {
        cursor: {
            previous: string | null;
            next: string | null;
        };
    };
} 