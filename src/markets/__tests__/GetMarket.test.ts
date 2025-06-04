import { GetMarket } from '../index';
import { TokenPair } from '../../dex/common/types';
import { MeteoraMarket } from '../../dex/meteora';
import { RaydiumMarket } from '../../dex/raydium';
import { OrcaMarket } from '../../dex/orca';

// Mock the DEX classes
jest.mock('../../dex/meteora');
jest.mock('../../dex/raydium');
jest.mock('../../dex/orca');

const MockedMeteoraMarket = MeteoraMarket as jest.MockedClass<typeof MeteoraMarket>;
const MockedRaydiumMarket = RaydiumMarket as jest.MockedClass<typeof RaydiumMarket>;
const MockedOrcaMarket = OrcaMarket as jest.MockedClass<typeof OrcaMarket>;

describe('GetMarket', () => {
    let getMarket: GetMarket;
    const testPair: TokenPair = {
        tokenAMint: 'So11111111111111111111111111111111111111112',
        tokenBMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock console.log to reduce test output noise
        jest.spyOn(console, 'log').mockImplementation(() => {});
        
        // Reset environment variables
        process.env.ENABLE_METEORA = 'true';
        process.env.ENABLE_RAYDIUM = 'true';
        process.env.ENABLE_ORCA = 'true';
        
        // Mock the name getter for each class
        Object.defineProperty(MockedMeteoraMarket.prototype, 'name', {
            get: jest.fn(() => 'Meteora'),
            configurable: true
        });
        Object.defineProperty(MockedRaydiumMarket.prototype, 'name', {
            get: jest.fn(() => 'Raydium'),
            configurable: true
        });
        Object.defineProperty(MockedOrcaMarket.prototype, 'name', {
            get: jest.fn(() => 'Orca'),
            configurable: true
        });
        
        getMarket = new GetMarket(50, 0);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with all DEX providers enabled by default', () => {
            expect(MockedMeteoraMarket).toHaveBeenCalledWith(
                0, // minLiquidity
                50 // slippageBps
            );
            expect(MockedRaydiumMarket).toHaveBeenCalledWith(0);
            expect(MockedOrcaMarket).toHaveBeenCalledWith(0);
        });

        it('should use custom parameters when provided', () => {
            const customSlippage = 500;
            const customLiquidity = 1000;
            new GetMarket(customSlippage, customLiquidity);
            
            expect(MockedMeteoraMarket).toHaveBeenCalledWith(
                customLiquidity,
                customSlippage
            );
            expect(MockedRaydiumMarket).toHaveBeenCalledWith(
                customLiquidity
            );
            expect(MockedOrcaMarket).toHaveBeenCalledWith(
                customLiquidity
            );
        });

        it('should respect environment variable configuration', () => {
            process.env.ENABLE_METEORA = 'false';
            process.env.ENABLE_RAYDIUM = 'false';
            process.env.ENABLE_ORCA = 'false';
            
            jest.clearAllMocks();
            new GetMarket();
            
            expect(MockedMeteoraMarket).not.toHaveBeenCalled();
            expect(MockedRaydiumMarket).not.toHaveBeenCalled();
            expect(MockedOrcaMarket).not.toHaveBeenCalled();
        });
    });

    describe('getMarkets', () => {
        it('should aggregate markets from all providers', async () => {
            const meteoraMarkets = [
                { 
                    dex: 'Meteora' as const, 
                    price: 100, 
                    timestamp: Date.now(), 
                    poolAddress: 'meteora-pool',
                    binStep: 10,
                    liquidity: 1000,
                    baseFeePercentage: 0.5
                }
            ];
            const raydiumMarkets = [
                { 
                    dex: 'Raydium' as const, 
                    price: 101, 
                    timestamp: Date.now(), 
                    poolAddress: 'raydium-pool',
                    liquidity: 2000,
                    volume_24h: 5000,
                    fee_24h: 10
                }
            ];
            const orcaMarkets = [
                { 
                    dex: 'Orca', 
                    price: 102, 
                    timestamp: Date.now(), 
                    poolAddress: 'orca-pool',
                    tvl: 3000,
                    fee: 0.003,
                    volume24h: 7000
                }
            ];

            MockedMeteoraMarket.prototype.getMarkets.mockResolvedValue(meteoraMarkets);
            MockedRaydiumMarket.prototype.getMarkets.mockResolvedValue(raydiumMarkets);
            MockedOrcaMarket.prototype.getMarkets.mockResolvedValue(orcaMarkets);

            const result = await getMarket.getMarkets(testPair);

            expect(result.pair).toEqual(testPair);
            expect(result.markets).toHaveLength(3);
            expect(result.markets).toEqual(expect.arrayContaining([
                expect.objectContaining({ dex: 'Meteora', price: 100 }),
                expect.objectContaining({ dex: 'Raydium', price: 101 }),
                expect.objectContaining({ dex: 'Orca', price: 102 })
            ]));
            expect(typeof result.timestamp).toBe('number');
            expect(typeof result.executionTime).toBe('number');
        });

        it('should handle provider errors gracefully', async () => {
            const raydiumMarkets = [
                { 
                    dex: 'Raydium' as const, 
                    price: 101, 
                    timestamp: Date.now(), 
                    poolAddress: 'raydium-pool',
                    liquidity: 2000,
                    volume_24h: 5000,
                    fee_24h: 10
                }
            ];

            MockedMeteoraMarket.prototype.getMarkets.mockRejectedValue(new Error('Meteora API error'));
            MockedRaydiumMarket.prototype.getMarkets.mockResolvedValue(raydiumMarkets);
            MockedOrcaMarket.prototype.getMarkets.mockRejectedValue(new Error('Orca API error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await getMarket.getMarkets(testPair);

            expect(result.markets).toHaveLength(1);
            expect(result.markets[0]).toEqual(expect.objectContaining({ dex: 'Raydium', price: 101 }));
            expect(consoleSpy).toHaveBeenCalledTimes(2);
            
            consoleSpy.mockRestore();
        });

        it('should return empty markets array when all providers fail', async () => {
            MockedMeteoraMarket.prototype.getMarkets.mockRejectedValue(new Error('Meteora error'));
            MockedRaydiumMarket.prototype.getMarkets.mockRejectedValue(new Error('Raydium error'));
            MockedOrcaMarket.prototype.getMarkets.mockRejectedValue(new Error('Orca error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await getMarket.getMarkets(testPair);

            expect(result.markets).toHaveLength(0);
            expect(consoleSpy).toHaveBeenCalledTimes(3);
            
            consoleSpy.mockRestore();
        });
    });
}); 