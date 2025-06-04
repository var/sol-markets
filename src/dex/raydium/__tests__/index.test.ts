// Mock node-fetch
jest.mock('node-fetch');

import { TokenPair } from '../../common/types';
import fetch from 'node-fetch';
import { RaydiumMarket } from '..';

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('RaydiumMarket', () => {
    let raydiumMarket: RaydiumMarket;

    beforeEach(() => {
        raydiumMarket = new RaydiumMarket();
        jest.clearAllMocks();
    });

    const mockPair: TokenPair = {
        tokenAMint: 'So11111111111111111111111111111111111111112',
        tokenBMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    };

    describe('constructor', () => {
        it('should initialize with default minLiquidity', () => {
            expect(raydiumMarket['minLiquidity']).toBe(0);
        });

        it('should initialize with custom minLiquidity', () => {
            const customRaydiumMarket = new RaydiumMarket(1000);
            expect(customRaydiumMarket['minLiquidity']).toBe(1000);
        });
    });

    describe('getMarkets', () => {
        it('should return empty array when no matching pools found', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue([])
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await raydiumMarket.getMarkets(mockPair);
            expect(markets).toEqual([]);
        });

        it('should return markets with correct data', async () => {
            const mockPoolData = [
                {
                    baseMint: 'So11111111111111111111111111111111111111112',
                    quoteMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    ammId: 'test-pool-id',
                    price: '158.5',
                    liquidity: '2000000',
                    volume24h: '5000000',
                    fee24h: '10000'
                }
            ];

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockPoolData)
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await raydiumMarket.getMarkets(mockPair);

            expect(markets).toHaveLength(1);
            expect(markets[0]).toMatchObject({
                dex: 'Raydium',
                price: 158.5,
                poolAddress: 'test-pool-id',
                liquidity: 2000000,
                volume_24h: 5000000,
                fee_24h: 10000
            });
            expect(typeof markets[0].timestamp).toBe('number');
        });

        it('should handle inverted token pairs correctly', async () => {
            const mockPoolData = [
                {
                    baseMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
                    quoteMint: 'So11111111111111111111111111111111111111112', // SOL
                    ammId: 'inverted-pool',
                    price: '0.0063', // USDC/SOL price
                    liquidity: '1000000',
                    volume24h: '2000000',
                    fee24h: '5000'
                }
            ];

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockPoolData)
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await raydiumMarket.getMarkets(mockPair);

            expect(markets).toHaveLength(1);
            // Price should be inverted since tokenA (SOL) is the quote token in this pool
            expect(markets[0].price).toBeCloseTo(1 / 0.0063, 5);
        });

        it('should sort markets by liquidity descending', async () => {
            const mockPoolData = [
                {
                    baseMint: 'So11111111111111111111111111111111111111112',
                    quoteMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    ammId: 'pool-1',
                    price: '158.5',
                    liquidity: '1000000',
                    volume24h: '2000000',
                    fee24h: '5000'
                },
                {
                    baseMint: 'So11111111111111111111111111111111111111112',
                    quoteMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    ammId: 'pool-2',
                    price: '158.6',
                    liquidity: '3000000',
                    volume24h: '4000000',
                    fee24h: '8000'
                }
            ];

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockPoolData)
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await raydiumMarket.getMarkets(mockPair);

            expect(markets).toHaveLength(2);
            expect(markets[0].liquidity).toBe(3000000); // Higher liquidity first
            expect(markets[1].liquidity).toBe(1000000);
        });

        it('should handle API errors gracefully', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await raydiumMarket.getMarkets(mockPair);
            expect(markets).toEqual([]);
        });

        it('should handle network errors gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const markets = await raydiumMarket.getMarkets(mockPair);

            expect(markets).toEqual([]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should handle pool processing errors gracefully', async () => {
            const mockPoolData = [
                {
                    baseMint: 'So11111111111111111111111111111111111111112',
                    quoteMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    ammId: 'valid-pool',
                    price: '158.5',
                    liquidity: '2000000',
                    volume24h: '5000000',
                    fee24h: '10000'
                },
                {
                    // Invalid pool data - missing required fields
                    baseMint: 'So11111111111111111111111111111111111111112',
                    quoteMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    ammId: 'invalid-pool'
                    // Missing price, liquidity, etc.
                }
            ];

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockPoolData)
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const markets = await raydiumMarket.getMarkets(mockPair);

            // Only the valid pool should be returned, invalid pool filtered out
            expect(markets).toHaveLength(1);
            expect(markets[0].poolAddress).toBe('valid-pool');
            // Should log about skipping invalid pool
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[Raydium] Pool invalid-pool has invalid numeric values, skipping')
            );
            consoleSpy.mockRestore();
        });
    });
}); 