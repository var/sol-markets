import { EventEmitter } from 'events';
import { Connection, PublicKey } from '@solana/web3.js';
import { Idl, BorshCoder } from '@project-serum/anchor';
import { PumpFunToken } from './types';
import pumpIdl from './pump-fun-idl.json';

// PumpFun program ID 
const PUMPFUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

export class PumpFunService extends EventEmitter {
  private connection: Connection;
  private coder: BorshCoder;
  private isMonitoring: boolean = false;
  private subscriptionId: number | null = null;

  constructor(connection: Connection) {
    super();
    this.connection = connection;
    this.coder = new BorshCoder(pumpIdl as Idl);
  }

  /**
   * Start monitoring for new PumpFun token creation events
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('[PumpFun] Already monitoring for new tokens');
      return;
    }

    try {
      console.log('[PumpFun] Starting token creation monitoring...');
      this.isMonitoring = true;

      this.subscriptionId = this.connection.onLogs(
        PUMPFUN_PROGRAM_ID,
        (logs, context) => {
          const signature = logs.signature;
          
          for (const log of logs.logs) {
            if (log.startsWith('Program data:')) {
              const dataBase64 = log.split(' ')[2];
              
              try {
                const event = this.coder.events.decode(dataBase64);
                if (event && event.name === 'CreateEvent') {
                  console.log(`[PumpFun] 🎉 New token created: ${event.data.name} (${event.data.symbol})`);
                  this.processCreateEvent(event.data, signature);
                }
              } catch (error) {
                // Silently ignore decode errors - most events won't be CreateEvent
              }
            }
          }
        },
        'confirmed'
      );

      console.log(`[PumpFun] Monitoring active (ID: ${this.subscriptionId})`);
      
    } catch (error) {
      console.error('[PumpFun] Error starting monitoring:', error);
      this.isMonitoring = false;
    }
  }

  /**
   * Stop monitoring for new tokens
   */
  public async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    console.log('[PumpFun] Stopping monitoring...');
    this.isMonitoring = false;

    if (this.subscriptionId !== null) {
      try {
        await this.connection.removeOnLogsListener(this.subscriptionId);
      } catch (error) {
        console.error('[PumpFun] Error removing subscription:', error);
      }
      this.subscriptionId = null;
    }
  }

  /**
   * Get monitoring status
   */
  public isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Process a CreateEvent to extract token details
   */
  private processCreateEvent(eventData: any, signature: string): void {
    try {
      if (!eventData || !eventData.mint) {
        return;
      }

      const tokenData: PumpFunToken = {
        mint: eventData.mint.toString(),
        name: eventData.name || 'Unknown Token',
        symbol: eventData.symbol || 'UNKNOWN',
        description: eventData.description || `New token created on PumpFun`,
        image: eventData.uri || null,
        creator: eventData.user ? eventData.user.toString() : 'Unknown',
        bondingCurveKey: eventData.bondingCurve ? eventData.bondingCurve.toString() : null,
        createdTimestamp: Math.floor(Date.now() / 1000)
      };

      const tokenEvent = {
        type: 'token_created' as const,
        token: tokenData,
        timestamp: Date.now(),
        txSignature: signature
      };

      this.emit('newToken', tokenEvent);
      this.emit('tokenCreated', tokenEvent);

    } catch (error) {
      console.error(`[PumpFun] Error processing CreateEvent:`, error);
    }
  }

  /**
   * Clean up resources
   */
  public async destroy(): Promise<void> {
    await this.stopMonitoring();
    this.removeAllListeners();
  }
}

export * from './types'; 