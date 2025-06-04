import { TokenPair, PriceMarket } from './types';

export abstract class MarketProvider<T extends PriceMarket> {
    protected dexName: string;

    constructor(dexName: string) {
        this.dexName = dexName;
    }

    /**
     * Get the name of this DEX
     */
    get name(): string {
        return this.dexName;
    }

    /**
     * Get markets for a token pair from this DEX
     * @param pair The token pair to get markets for
     * @returns Array of price markets, sorted by preference (e.g., liquidity)
     */
    abstract getMarkets(pair: TokenPair): Promise<T[]>;

    protected createBaseMarket(
        price: number,
        poolAddress?: string,
    ): Omit<PriceMarket, 'dex'> {
        return {
            price,
            timestamp: Date.now(),
            poolAddress,
        };
    }
} 