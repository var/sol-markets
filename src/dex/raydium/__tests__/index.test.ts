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
                json: jest.fn().mockResolvedValue({
                    data: {
                        data: []
                    }
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await raydiumMarket.getMarkets(mockPair);
            expect(markets).toEqual([]);
        });

        it('should return markets with correct data', async () => {
            const mockPoolData = {
                data: {
                    data: [
                        {
                            id: 'test-pool-id',
                            mintA: { address: 'So11111111111111111111111111111111111111112' },
                            mintB: { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
                            price: '158.5',
                            tvl: '2000000',
                            day: {
                                volume: '5000000',
                                volumeFee: '10000'
                            }
                        }
                    ]
                }
            };

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

        it('should use correct V3 API URL with server-side filtering', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    data: {
                        data: []
                    }
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            await raydiumMarket.getMarkets(mockPair);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('https://api-v3.raydium.io/pools/info/mint?mint1=So11111111111111111111111111111111111111112&mint2=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                expect.any(Object)
            );
        });

        it('should handle inverted token pairs correctly', async () => {
            const mockPoolData = {
                data: {
                    data: [
                        {
                            id: 'inverted-pool',
                            mintA: { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // USDC first
                            mintB: { address: 'So11111111111111111111111111111111111111112' }, // SOL second
                            price: '0.0063', // USDC/SOL price
                            tvl: '1000000',
                            day: {
                                volume: '2000000',
                                volumeFee: '5000'
                            }
                        }
                    ]
                }
            };

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockPoolData)
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await raydiumMarket.getMarkets(mockPair);

            expect(markets).toHaveLength(1);
            // Price should be inverted since tokenA (SOL) is not the first mint in this pool
            expect(markets[0].price).toBeCloseTo(1 / 0.0063, 5);
        });

        it('should sort markets by TVL descending', async () => {
            const mockPoolData = {
                data: {
                    data: [
                        {
                            id: 'pool-1',
                            mintA: { address: 'So11111111111111111111111111111111111111112' },
                            mintB: { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
                            price: '158.5',
                            tvl: '1000000',
                            day: {
                                volume: '2000000',
                                volumeFee: '5000'
                            }
                        },
                        {
                            id: 'pool-2',
                            mintA: { address: 'So11111111111111111111111111111111111111112' },
                            mintB: { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
                            price: '158.6',
                            tvl: '3000000',
                            day: {
                                volume: '4000000',
                                volumeFee: '8000'
                            }
                        }
                    ]
                }
            };

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockPoolData)
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await raydiumMarket.getMarkets(mockPair);

            expect(markets).toHaveLength(2);
            expect(markets[0].liquidity).toBe(3000000); // Higher TVL first
            expect(markets[1].liquidity).toBe(1000000);
        });

        it('should apply minimum liquidity filter', async () => {
            const raydiumMarketWithMinLiquidity = new RaydiumMarket(2500000);
            
            const mockPoolData = {
                data: {
                    data: [
                        {
                            id: 'low-tvl-pool',
                            mintA: { address: 'So11111111111111111111111111111111111111112' },
                            mintB: { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
                            price: '158.5',
                            tvl: '1000000', // Below minimum
                            day: {
                                volume: '2000000',
                                volumeFee: '5000'
                            }
                        },
                        {
                            id: 'high-tvl-pool',
                            mintA: { address: 'So11111111111111111111111111111111111111112' },
                            mintB: { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
                            price: '158.6',
                            tvl: '5000000', // Above minimum
                            day: {
                                volume: '4000000',
                                volumeFee: '8000'
                            }
                        }
                    ]
                }
            };

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockPoolData)
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await raydiumMarketWithMinLiquidity.getMarkets(mockPair);

            expect(markets).toHaveLength(1);
            expect(markets[0].poolAddress).toBe('high-tvl-pool');
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
            const mockPoolData = {
                data: {
                    data: [
                        {
                            id: 'valid-pool',
                            mintA: { address: 'So11111111111111111111111111111111111111112' },
                            mintB: { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
                            price: '158.5',
                            tvl: '2000000',
                            day: {
                                volume: '5000000',
                                volumeFee: '10000'
                            }
                        },
                        {
                            // Invalid pool data - missing required fields
                            id: 'invalid-pool',
                            mintA: { address: 'So11111111111111111111111111111111111111112' },
                            mintB: { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }
                            // Missing price, tvl, etc.
                        }
                    ]
                }
            };

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockPoolData)
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await raydiumMarket.getMarkets(mockPair);

            // Only the valid pool should be returned, invalid pool filtered out
            expect(markets).toHaveLength(1);
            expect(markets[0].poolAddress).toBe('valid-pool');
        });
    });
}); 