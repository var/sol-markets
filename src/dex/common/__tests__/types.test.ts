import { TokenPair, PriceMarket, PriceResult } from '../types';

describe('Common Types', () => {
    describe('TokenPair', () => {
        it('should have correct structure', () => {
            const pair: TokenPair = {
                tokenAMint: 'So11111111111111111111111111111111111111112',
                tokenBMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
            };

            expect(pair.tokenAMint).toBe('So11111111111111111111111111111111111111112');
            expect(pair.tokenBMint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        });
    });

    describe('PriceMarket', () => {
        it('should have correct structure', () => {
            const market: PriceMarket = {
                dex: 'TestDex',
                price: 100.5,
                timestamp: Date.now(),
                poolAddress: 'test-pool-address'
            };

            expect(market.dex).toBe('TestDex');
            expect(market.price).toBe(100.5);
            expect(typeof market.timestamp).toBe('number');
            expect(market.poolAddress).toBe('test-pool-address');
        });

        it('should allow optional poolAddress', () => {
            const market: PriceMarket = {
                dex: 'TestDex',
                price: 100.5,
                timestamp: Date.now()
            };

            expect(market.poolAddress).toBeUndefined();
        });
    });

    describe('PriceResult', () => {
        it('should have correct structure', () => {
            const result: PriceResult = {
                pair: {
                    tokenAMint: 'So11111111111111111111111111111111111111112',
                    tokenBMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
                },
                markets: [
                    {
                        dex: 'TestDex',
                        price: 100.5,
                        timestamp: Date.now(),
                        poolAddress: 'test-pool'
                    }
                ],
                timestamp: Date.now(),
                executionTime: 1500
            };

            expect(Array.isArray(result.markets)).toBe(true);
            expect(typeof result.timestamp).toBe('number');
            expect(typeof result.executionTime).toBe('number');
        });
    });
}); 