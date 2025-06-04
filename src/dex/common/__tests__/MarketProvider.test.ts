import { MarketProvider } from '../MarketProvider';
import { PriceMarket, TokenPair } from '../types';

// Create a concrete implementation for testing
class TestMarketProvider extends MarketProvider<PriceMarket> {
    async getMarkets(pair: TokenPair): Promise<PriceMarket[]> {
        const baseMarket = this.createBaseMarket(100.5, 'test-pool');
        return [{
            ...baseMarket,
            dex: this.dexName
        }];
    }
}

describe('MarketProvider', () => {
    let provider: TestMarketProvider;

    beforeEach(() => {
        provider = new TestMarketProvider('TestDex');
    });

    describe('constructor', () => {
        it('should initialize with dexName', () => {
            expect(provider.name).toBe('TestDex');
        });
    });

    describe('createBaseMarket', () => {
        it('should create base market with all properties', () => {
            const price = 100.5;
            const poolAddress = 'test-pool-address';
            
            const market = provider['createBaseMarket'](price, poolAddress);
            
            expect(market.price).toBe(price);
            expect(market.poolAddress).toBe(poolAddress);
            expect(typeof market.timestamp).toBe('number');
            expect(market.timestamp).toBeCloseTo(Date.now(), -2);
        });

        it('should create base market without poolAddress', () => {
            const price = 50.25;
            
            const market = provider['createBaseMarket'](price);
            
            expect(market.price).toBe(price);
            expect(market.poolAddress).toBeUndefined();
            expect(typeof market.timestamp).toBe('number');
        });
    });

    describe('getMarkets', () => {
        it('should be implemented by subclass', async () => {
            const pair: TokenPair = {
                tokenAMint: 'So11111111111111111111111111111111111111112',
                tokenBMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
            };

            const markets = await provider.getMarkets(pair);
            
            expect(Array.isArray(markets)).toBe(true);
            expect(markets.length).toBe(1);
            expect(markets[0].dex).toBe('TestDex');
            expect(markets[0].price).toBe(100.5);
        });
    });
}); 