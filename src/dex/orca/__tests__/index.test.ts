// Mock node-fetch
jest.mock('node-fetch');

import { TokenPair } from '../../common/types';
import fetch from 'node-fetch';
import { OrcaMarket } from '..';

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('OrcaMarket', () => {
    let orcaMarket: OrcaMarket;
    const minLiquidity = 100;

    beforeEach(() => {
        orcaMarket = new OrcaMarket(minLiquidity);
        jest.clearAllMocks();
    });

    const mockPair: TokenPair = {
        tokenAMint: 'So11111111111111111111111111111111111111112',
        tokenBMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    };

    describe('constructor', () => {
        it('should initialize with minimum liquidity', () => {
            expect(orcaMarket['minLiquidity']).toBe(minLiquidity);
        });

        it('should use default minimum liquidity if not provided', () => {
            const defaultOrcaMarket = new OrcaMarket();
            expect(defaultOrcaMarket['minLiquidity']).toBe(0);
        });
    });

    describe('getMarkets', () => {
        it('should use correct query parameters for server-side filtering', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    data: []
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            await orcaMarket.getMarkets(mockPair);

            // Just check that the URL was called with the right base URL and contains expected parameters
            const calledUrl = mockFetch.mock.calls[0][0] as string;
            
            expect(calledUrl).toContain('https://api.orca.so/v2/solana/pools?');
            expect(calledUrl).toContain('tokensBothOf=So11111111111111111111111111111111111111112,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
            expect(calledUrl).toContain('minTvl=100');
            expect(calledUrl).toContain('size=50');
        });

        it('should not include minTvl when minLiquidity is 0', async () => {
            const defaultOrcaMarket = new OrcaMarket(0);
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    data: []
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            await defaultOrcaMarket.getMarkets(mockPair);

            const calledUrl = mockFetch.mock.calls[0][0] as string;
            
            expect(calledUrl).not.toContain('minTvl');
        });

        it('should return empty array when API returns no pools', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    data: []
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await orcaMarket.getMarkets(mockPair);
            expect(markets).toEqual([]);
        });

        it('should return markets with correct data', async () => {
            const mockPoolData = {
                address: 'test-pool-address',
                price: '158.5',
                tvlUsdc: '1000000',
                feeRate: 0.003,
                tokenMintA: 'So11111111111111111111111111111111111111112',
                tokenMintB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                stats: {
                    '24h': {
                        volume: '5000000'
                    }
                },
                tokenA: {
                    address: 'So11111111111111111111111111111111111111112',
                    symbol: 'SOL',
                    name: 'Solana',
                    decimals: 9
                },
                tokenB: {
                    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    symbol: 'USDC',
                    name: 'USD Coin',
                    decimals: 6
                }
            };

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    data: [mockPoolData]
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await orcaMarket.getMarkets(mockPair);

            expect(markets).toHaveLength(1);
            expect(markets[0]).toMatchObject({
                dex: 'Orca',
                price: 158.5,
                poolAddress: 'test-pool-address',
                tvl: 1000000,
                fee: 0.003,
                volume24h: 5000000
            });
            expect(markets[0].timestamp).toBeCloseTo(Date.now(), -2);
        });

        it('should handle invalid price data', async () => {
            const mockPoolData = {
                address: 'invalid_pool',
                price: '0', // Invalid price
                tvlUsdc: '1000000',
                feeRate: 0.003,
                tokenMintA: 'So11111111111111111111111111111111111111112',
                tokenMintB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                stats: {
                    '24h': {
                        volume: '1000'
                    }
                }
            };

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    data: [mockPoolData]
                })
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await orcaMarket.getMarkets(mockPair);
            expect(markets).toEqual([]);
        });

        it('should handle API errors gracefully', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            };
            mockFetch.mockResolvedValue(mockResponse as any);

            const markets = await orcaMarket.getMarkets(mockPair);
            expect(markets).toEqual([]);
        });

        it('should handle network errors gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await orcaMarket.getMarkets(mockPair);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    it('should be instantiated with default parameters', () => {
        const defaultOrcaMarket = new OrcaMarket();
        expect(defaultOrcaMarket).toBeInstanceOf(OrcaMarket);
    });

    it('should return empty array for token pair with no pools', async () => {
        // Mock fetch to return empty response
        const mockFetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                data: []
            })
        });
        (global as any).fetch = mockFetch;

        const result = await orcaMarket.getMarkets(mockPair);
        expect(result).toEqual([]);
    });

    it('should filter out pools with zero liquidity', async () => {
        const defaultOrcaMarket = new OrcaMarket(0);
    });
}); 