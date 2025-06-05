// Mock node-fetch
jest.mock('node-fetch');

import { TokenPair } from '../../common/types';
import fetch from 'node-fetch';
import { MeteoraMarket } from '..';

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('MeteoraMarket', () => {
    let meteoraMarket: MeteoraMarket;
    const minLiquidity = 100;
    const slippageBps = 50;

    beforeEach(() => {
        meteoraMarket = new MeteoraMarket(minLiquidity, slippageBps);
        jest.clearAllMocks();
    });

    const mockPair: TokenPair = {
        tokenAMint: 'So11111111111111111111111111111111111111112',
        tokenBMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    };

    describe('constructor', () => {
        it('should initialize with parameters', () => {
            expect(meteoraMarket['minLiquidity']).toBe(minLiquidity);
            expect(meteoraMarket['slippageBps']).toBe(slippageBps);
        });

        it('should use default parameters if not provided', () => {
            const defaultMeteoraMarket = new MeteoraMarket();
            expect(defaultMeteoraMarket['minLiquidity']).toBe(0);
            expect(defaultMeteoraMarket['slippageBps']).toBe(50);
        });
    });

    describe('getMarkets', () => {
        it('should return empty array when no matching pools found', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    groups: [],
                    total: 0
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await meteoraMarket.getMarkets(mockPair);
            expect(markets).toEqual([]);
        });

        it('should return markets with correct data', async () => {
            const mockPoolData = [
                {
                    address: 'test-pool-address',
                    mint_x: 'So11111111111111111111111111111111111111112',
                    mint_y: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    current_price: '158.5',
                    liquidity: '2000',
                    bin_step: '10',
                    base_fee_percentage: '0.5'
                }
            ];

            // Mock the grouped response structure from all_by_groups endpoint
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    groups: [
                        {
                            name: 'SOL-USDC',
                            pairs: mockPoolData
                        }
                    ],
                    total: 1
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await meteoraMarket.getMarkets(mockPair);

            expect(markets).toHaveLength(1);
            expect(markets[0]).toMatchObject({
                dex: 'Meteora',
                price: 158.5,
                poolAddress: 'test-pool-address',
                binStep: 10,
                liquidity: 2000,
                baseFeePercentage: 0.5
            });
            expect(typeof markets[0].timestamp).toBe('number');
        });

        it('should handle inverted token pairs correctly', async () => {
            const mockPoolData = [
                {
                    address: 'inverted-pool',
                    mint_x: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
                    mint_y: 'So11111111111111111111111111111111111111112', // SOL
                    current_price: '0.0063', // USDC/SOL price
                    liquidity: '1000',
                    bin_step: '10',
                    base_fee_percentage: '0.5'
                }
            ];

            // Mock the grouped response structure
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    groups: [
                        {
                            name: 'SOL-USDC',
                            pairs: mockPoolData
                        }
                    ],
                    total: 1
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await meteoraMarket.getMarkets(mockPair);

            expect(markets).toHaveLength(1);
            // Price should be inverted since tokenA (SOL) is mint_y in this pool
            expect(markets[0].price).toBeCloseTo(1 / 0.0063, 5);
        });

        it('should filter pools by minimum liquidity', async () => {
            // Create a MeteoraMarket instance with explicit minimum liquidity of 100
            const meteoraMarketWithMinLiquidity = new MeteoraMarket(100, 50);
            
            const mockPoolData = [
                {
                    address: 'low-liquidity-pool',
                    mint_x: 'So11111111111111111111111111111111111111112',
                    mint_y: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    current_price: '158.5',
                    liquidity: '50', // Below minimum
                    bin_step: '10',
                    base_fee_percentage: '0.5'
                },
                {
                    address: 'high-liquidity-pool',
                    mint_x: 'So11111111111111111111111111111111111111112',
                    mint_y: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    current_price: '158.6',
                    liquidity: '2000', // Above minimum
                    bin_step: '10',
                    base_fee_percentage: '0.5'
                }
            ];

            // Mock the grouped response structure
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    groups: [
                        {
                            name: 'SOL-USDC',
                            pairs: mockPoolData
                        }
                    ],
                    total: 1
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await meteoraMarketWithMinLiquidity.getMarkets(mockPair);

            expect(markets).toHaveLength(1);
            expect(markets[0].poolAddress).toBe('high-liquidity-pool');
        });

        it('should sort markets by liquidity descending', async () => {
            const mockPoolData = [
                {
                    address: 'pool-1',
                    mint_x: 'So11111111111111111111111111111111111111112',
                    mint_y: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    current_price: '158.5',
                    liquidity: '1000',
                    bin_step: '10',
                    base_fee_percentage: '0.5'
                },
                {
                    address: 'pool-2',
                    mint_x: 'So11111111111111111111111111111111111111112',
                    mint_y: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    current_price: '158.6',
                    liquidity: '3000',
                    bin_step: '10',
                    base_fee_percentage: '0.5'
                }
            ];

            // Mock the grouped response structure
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    groups: [
                        {
                            name: 'SOL-USDC',
                            pairs: mockPoolData
                        }
                    ],
                    total: 1
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await meteoraMarket.getMarkets(mockPair);

            expect(markets).toHaveLength(2);
            expect(markets[0].liquidity).toBe(3000); // Higher liquidity first
            expect(markets[1].liquidity).toBe(1000);
        });

        it('should handle invalid price data', async () => {
            const mockPoolData = [
                {
                    address: 'invalid-pool',
                    mint_x: 'So11111111111111111111111111111111111111112',
                    mint_y: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    current_price: '0', // Invalid price
                    liquidity: '2000',
                    bin_step: '10',
                    base_fee_percentage: '0.5'
                }
            ];

            // Mock the grouped response structure
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    groups: [
                        {
                            name: 'SOL-USDC',
                            pairs: mockPoolData
                        }
                    ],
                    total: 1
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await meteoraMarket.getMarkets(mockPair);
            expect(markets).toEqual([]);
        });

        it('should handle API errors gracefully', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await meteoraMarket.getMarkets(mockPair);
            expect(markets).toEqual([]);
        });

        it('should handle network errors gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const markets = await meteoraMarket.getMarkets(mockPair);

            expect(markets).toEqual([]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should handle pool processing errors gracefully', async () => {
            const mockPoolData = [
                {
                    address: 'valid-pool',
                    mint_x: 'So11111111111111111111111111111111111111112',
                    mint_y: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    current_price: '158.5',
                    liquidity: '2000',
                    bin_step: '10',
                    base_fee_percentage: '0.5'
                },
                {
                    // Invalid pool data - missing required fields will cause parseFloat to return NaN
                    // which will result in liquidity being 0, causing it to be filtered out
                    address: 'invalid-pool',
                    mint_x: 'So11111111111111111111111111111111111111112',
                    mint_y: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
                    // Missing current_price, liquidity, etc.
                }
            ];

            // Mock the grouped response structure
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    groups: [
                        {
                            name: 'SOL-USDC',
                            pairs: mockPoolData
                        }
                    ],
                    total: 1
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await meteoraMarket.getMarkets(mockPair);

            // Only the valid pool should be returned, invalid pool filtered out by liquidity check
            expect(markets).toHaveLength(1);
            expect(markets[0].poolAddress).toBe('valid-pool');
        });

        it('should use correct API URL with server-side filtering', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    groups: [],
                    total: 0
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            await meteoraMarket.getMarkets(mockPair);

            // Verify the correct URL was called with proper query parameters
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('pair/all_by_groups'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    })
                })
            );

            // Verify the include_pool_token_pairs parameter is present
            const calledUrl = mockFetch.mock.calls[0][0] as string;
            expect(calledUrl).toContain('include_pool_token_pairs=');
            expect(calledUrl).toContain('So11111111111111111111111111111111111111112-EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
            expect(calledUrl).toContain('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v-So11111111111111111111111111111111111111112');
        });
    });
}); 