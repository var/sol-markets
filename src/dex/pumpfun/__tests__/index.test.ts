// Mock Solana dependencies first before any imports
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn(),
  PublicKey: jest.fn().mockImplementation((key: string) => ({
    toString: () => key,
    toBase58: () => key,
    toBuffer: () => Buffer.from(key),
    equals: jest.fn()
  }))
}));

jest.mock('@project-serum/anchor', () => ({
  BorshCoder: jest.fn()
}));

import { Connection, PublicKey } from '@solana/web3.js';
import { BorshCoder } from '@project-serum/anchor';
import { PumpFunService } from '..';

describe('PumpFunService', () => {
  let pumpFunService: PumpFunService;
  let mockConnection: any;
  let mockCoder: any;
  let mockSubscriptionId: number;

  beforeEach(() => {
    mockSubscriptionId = 12345;
    
    // Mock Connection
    mockConnection = {
      onLogs: jest.fn().mockReturnValue(mockSubscriptionId),
      removeOnLogsListener: jest.fn().mockResolvedValue(undefined),
    };

    // Mock BorshCoder
    mockCoder = {
      events: {
        decode: jest.fn()
      }
    };

    // Setup constructor mocks
    (Connection as jest.Mock).mockImplementation(() => mockConnection);
    (BorshCoder as jest.Mock).mockImplementation(() => mockCoder);

    pumpFunService = new PumpFunService(mockConnection);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await pumpFunService.destroy();
  });

  describe('constructor', () => {
    it('should initialize with connection and coder', () => {
      expect(pumpFunService.isActive()).toBe(false);
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start monitoring successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await pumpFunService.startMonitoring();
      
      expect(pumpFunService.isActive()).toBe(true);
      expect(mockConnection.onLogs).toHaveBeenCalledWith(
        expect.anything(), // PUMPFUN_PROGRAM_ID
        expect.any(Function),
        'confirmed'
      );
      expect(consoleSpy).toHaveBeenCalledWith('[PumpFun] Starting token creation monitoring...');
      
      consoleSpy.mockRestore();
    });

    it('should not start monitoring if already active', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await pumpFunService.startMonitoring();
      await pumpFunService.startMonitoring(); // Second call
      
      expect(consoleSpy).toHaveBeenCalledWith('[PumpFun] Already monitoring for new tokens');
      expect(mockConnection.onLogs).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
    });

    it('should stop monitoring successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await pumpFunService.startMonitoring();
      await pumpFunService.stopMonitoring();
      
      expect(pumpFunService.isActive()).toBe(false);
      expect(mockConnection.removeOnLogsListener).toHaveBeenCalledWith(mockSubscriptionId);
      expect(consoleSpy).toHaveBeenCalledWith('[PumpFun] Stopping monitoring...');
      
      consoleSpy.mockRestore();
    });

    it('should handle monitoring start errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockConnection.onLogs.mockImplementation(() => {
        throw new Error('Connection error');
      });

      await pumpFunService.startMonitoring();
      
      expect(pumpFunService.isActive()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[PumpFun] Error starting monitoring:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('event processing', () => {
    it('should process CreateEvent successfully', async () => {
      const mockCreateEvent = {
        name: 'CreateEvent',
        data: {
          name: 'Test Token',
          symbol: 'TEST',
          uri: 'https://example.com/metadata.json',
          mint: { toString: () => 'TokenMint111111111111111111111111111111111' },
          bondingCurve: { toString: () => 'BondingCurve11111111111111111111111111111' },
          user: { toString: () => 'User111111111111111111111111111111111111' }
        }
      };

      mockCoder.events.decode.mockReturnValue(mockCreateEvent);

      const mockLogs = {
        signature: 'test-signature-123',
        logs: ['Program data: SGVsbG8gV29ybGQ='],
        err: undefined
      };

      await pumpFunService.startMonitoring();
      
      const tokenCreatedPromise = new Promise((resolve) => {
        pumpFunService.on('tokenCreated', resolve);
      });

      const logCallback = mockConnection.onLogs.mock.calls[0][1];
      logCallback(mockLogs, { slot: 12345 });

      const event = await tokenCreatedPromise as any;
      
      expect(event.type).toBe('token_created');
      expect(event.token.mint).toBe('TokenMint111111111111111111111111111111111');
      expect(event.token.name).toBe('Test Token');
      expect(event.token.symbol).toBe('TEST');
      expect(event.token.image).toBe('https://example.com/metadata.json');
      expect(event.token.creator).toBe('User111111111111111111111111111111111111');
      expect(event.txSignature).toBe('test-signature-123');
    });

    it('should ignore non-CreateEvent events', async () => {
      const mockTradeEvent = {
        name: 'TradeEvent',
        data: { /* trade data */ }
      };

      mockCoder.events.decode.mockReturnValue(mockTradeEvent);

      const mockLogs = {
        signature: 'trade-signature',
        logs: ['Program data: dHJhZGVkYXRh'],
        err: undefined
      };

      await pumpFunService.startMonitoring();
      
      const eventSpy = jest.fn();
      pumpFunService.on('tokenCreated', eventSpy);

      const logCallback = mockConnection.onLogs.mock.calls[0][1];
      logCallback(mockLogs, { slot: 12345 });

      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('should ignore decode errors silently', async () => {
      mockCoder.events.decode.mockImplementation(() => {
        throw new Error('Decode failed');
      });

      const mockLogs = {
        signature: 'invalid-signature',
        logs: ['Program data: aW52YWxpZA=='],
        err: undefined
      };

      await pumpFunService.startMonitoring();
      
      const eventSpy = jest.fn();
      pumpFunService.on('tokenCreated', eventSpy);

      const logCallback = mockConnection.onLogs.mock.calls[0][1];
      
      expect(() => logCallback(mockLogs, { slot: 12345 })).not.toThrow();
      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('should ignore logs without Program data', async () => {
      const mockLogs = {
        signature: 'no-data-signature',
        logs: [
          'Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P invoke [1]',
          'Program log: some other log',
          'Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P success'
        ],
        err: undefined
      };

      await pumpFunService.startMonitoring();
      
      const eventSpy = jest.fn();
      pumpFunService.on('tokenCreated', eventSpy);

      const logCallback = mockConnection.onLogs.mock.calls[0][1];
      logCallback(mockLogs, { slot: 12345 });

      expect(mockCoder.events.decode).not.toHaveBeenCalled();
      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('should handle CreateEvent with minimal data', async () => {
      const mockCreateEvent = {
        name: 'CreateEvent',
        data: {
          mint: { toString: () => 'MinimalToken1111111111111111111111111111' }
        }
      };

      mockCoder.events.decode.mockReturnValue(mockCreateEvent);

      const mockLogs = {
        signature: 'minimal-signature',
        logs: ['Program data: bWluaW1hbA=='],
        err: undefined
      };

      await pumpFunService.startMonitoring();
      
      const tokenCreatedPromise = new Promise((resolve) => {
        pumpFunService.on('tokenCreated', resolve);
      });

      const logCallback = mockConnection.onLogs.mock.calls[0][1];
      logCallback(mockLogs, { slot: 12345 });

      const event = await tokenCreatedPromise as any;
      
      expect(event.token.mint).toBe('MinimalToken1111111111111111111111111111');
      expect(event.token.name).toBe('Unknown Token');
      expect(event.token.symbol).toBe('UNKNOWN');
      expect(event.token.creator).toBe('Unknown');
      expect(event.token.image).toBeUndefined();
      expect(event.token.bondingCurveKey).toBeUndefined();
    });

    it('should log token creation with proper formatting', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockCreateEvent = {
        name: 'CreateEvent',
        data: {
          name: 'Logged Token',
          symbol: 'LOG',
          mint: { toString: () => 'LoggedToken111111111111111111111111111111' }
        }
      };

      mockCoder.events.decode.mockReturnValue(mockCreateEvent);

      const mockLogs = {
        signature: 'logged-signature',
        logs: ['Program data: bG9nZ2Vk'],
        err: undefined
      };

      await pumpFunService.startMonitoring();
      
      const logCallback = mockConnection.onLogs.mock.calls[0][1];
      logCallback(mockLogs, { slot: 12345 });

      expect(consoleSpy).toHaveBeenCalledWith('[PumpFun] 🎉 New token created: Logged Token (LOG)');
      
      consoleSpy.mockRestore();
    });
  });

  describe('destroy', () => {
    it('should clean up resources and remove listeners', async () => {
      await pumpFunService.startMonitoring();
      
      const removeAllListenersSpy = jest.spyOn(pumpFunService, 'removeAllListeners');
      
      await pumpFunService.destroy();
      
      expect(pumpFunService.isActive()).toBe(false);
      expect(mockConnection.removeOnLogsListener).toHaveBeenCalled();
      expect(removeAllListenersSpy).toHaveBeenCalled();
    });
  });
}); 