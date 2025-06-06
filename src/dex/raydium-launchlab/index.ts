import { EventEmitter } from 'events';
import { Connection, PublicKey } from '@solana/web3.js';
import { BorshCoder } from '@project-serum/anchor';


// Import the IDL
import launchlabIdl from './launchlab-idl.json';

// Raydium Launchlab program ID
const RAYDIUM_LAUNCHLAB_PROGRAM_ID = new PublicKey('LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj');

// Initialize instruction discriminator (first 8 bytes)
const INITIALIZE_DISCRIMINATOR = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);

export interface RaydiumLaunchlabToken {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  creator: string;
  bondingCurveKey?: string;
  createdTimestamp: number;
}

export interface RaydiumLaunchlabTokenEvent {
  type: 'token_created';
  token: RaydiumLaunchlabToken;
  timestamp: number;
  txSignature?: string;
}

export class RaydiumLaunchlabService extends EventEmitter {
  private readonly connection: Connection;
  private isMonitoring = false;
  private subscriptionId: number | undefined = undefined;
  private readonly coder: BorshCoder | undefined;

  constructor(connection: Connection) {
    super();
    this.connection = connection;
    
    // Initialize the BorshCoder with a minimal IDL just for instruction parsing
    try {
      this.coder = new BorshCoder({
        version: "0.1.0",
        name: "raydium_launchpad",
        instructions: [
          {
            name: "initialize",
            accounts: [],
            args: [
              {
                name: "baseMintParam",
                type: {
                  defined: "MintParams"
                }
              }
            ]
          }
        ],
        types: [
          {
            name: "MintParams",
            type: {
              kind: "struct",
              fields: [
                { name: "decimals", type: "u8" },
                { name: "name", type: "string" },
                { name: "symbol", type: "string" },
                { name: "uri", type: "string" }
              ]
            }
          }
        ]
      } as any);
    } catch (error) {
      this.coder = undefined;
    }
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('[RaydiumLaunchlab] Already monitoring for new tokens');
      return;
    }

    try {
      console.log('[RaydiumLaunchlab] Starting token creation monitoring...');
      this.isMonitoring = true;

      this.subscriptionId = this.connection.onLogs(
        RAYDIUM_LAUNCHLAB_PROGRAM_ID,
        async (logs, context) => {
          await this.handleLogs(logs);
        },
        'confirmed'
      );

      console.log(`[RaydiumLaunchlab] Monitoring active (ID: ${this.subscriptionId})`);
    } catch (error) {
      console.error('[RaydiumLaunchlab] Error starting monitoring:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    console.log('[RaydiumLaunchlab] Stopping monitoring...');
    this.isMonitoring = false;
    
    if (this.subscriptionId !== undefined) {
      await this.connection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = undefined;
    }
  }

  private async handleLogs(logs: any): Promise<void> {
    try {
      // Check if this is a token creation (Initialize instruction)
      if (!this.isTokenCreation(logs.logs)) {
        return;
      }

      // Extract token data using IDL parsing
      const token = await this.extractTokenDataWithIDL(logs.signature);
      if (token) {
        console.log(`[RaydiumLaunchlab] 🎉 New token created: ${token.name} (${token.symbol})`);
        
        const tokenEvent: RaydiumLaunchlabTokenEvent = {
          type: 'token_created',
          token,
          timestamp: Date.now(),
          txSignature: logs.signature
        };
        
        this.emit('newToken', tokenEvent);
        this.emit('tokenCreated', tokenEvent);
      }
    } catch (error) {
      console.error('[RaydiumLaunchlab] Error handling logs:', error);
    }
  }

  private isTokenCreation(logs: string[]): boolean {
    // Look for the specific pattern that indicates token creation:
    // Program invoke [1] followed by Instruction: Initialize
    for (let i = 0; i < logs.length - 1; i++) {
      const currentLog = logs[i];
      const nextLog = logs[i + 1];
      
      if (currentLog.includes(`Program ${RAYDIUM_LAUNCHLAB_PROGRAM_ID.toString()} invoke [1]`)) {
        if (nextLog.includes('Program log: Instruction: Initialize')) {
          return true;
        }
      }
    }
    
    return false;
  }

  private async extractTokenDataWithIDL(signature: string): Promise<RaydiumLaunchlabToken | null> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) return null;

      // Get account keys
      const message = tx.transaction.message;
      let accountKeys: PublicKey[] = [];
      
      if ('staticAccountKeys' in message) {
        accountKeys = message.staticAccountKeys;
      } else if ('accountKeys' in message) {
        accountKeys = (message as any).accountKeys;
      }

      if (accountKeys.length < 8) {

        return null;
      }

      // Find the Initialize instruction
      const instructions = 'compiledInstructions' in message 
        ? message.compiledInstructions 
        : (message as any).instructions;

      const initializeInstruction = instructions.find((ix: any) => {
        const programId = accountKeys[ix.programIdIndex];
        if (!programId.equals(RAYDIUM_LAUNCHLAB_PROGRAM_ID)) return false;
        
        // Check if instruction data starts with Initialize discriminator
        const data = Buffer.from(ix.data);
        return data.subarray(0, 8).equals(INITIALIZE_DISCRIMINATOR);
      });

      if (!initializeInstruction) {

        return null;
      }

      // Parse instruction data
      const instructionData = Buffer.from(initializeInstruction.data);
      const argsData = instructionData.subarray(8); // Skip discriminator



       // Try to parse using the BorshCoder
       let tokenMetadata: any = null;
       
       if (this.coder) {
         try {
           const decoded = this.coder.instruction.decode(instructionData);

           
           if (decoded && (decoded as any).data && (decoded as any).data.baseMintParam) {
             tokenMetadata = (decoded as any).data.baseMintParam;
           }
         } catch (error: any) {

         }
       }

       // Extract accounts based on IDL structure
       const creator = accountKeys[6].toBase58();
       const baseMint = accountKeys[1].toBase58();
       
       // Extract pool state (bonding curve equivalent)
       const poolState = accountKeys.length > 4 ? accountKeys[4].toBase58() : undefined;

       if (tokenMetadata) {

         

         
         return {
           mint: baseMint,
           name: tokenMetadata.name || 'Unknown Token',
           symbol: tokenMetadata.symbol || 'UNKNOWN',
           description: `New token launched on Raydium Launchlab`,
           image: tokenMetadata.uri || undefined,
           creator: creator,
           bondingCurveKey: poolState,
           createdTimestamp: Math.floor(Date.now() / 1000)
         };
       } else {
         // Fallback to basic parsing
         return {
           mint: baseMint,
           name: `Launchlab Token ${baseMint.slice(0, 8)}`,
           symbol: `LL${baseMint.slice(-4)}`,
           description: `New token launched on Raydium Launchlab`,
           image: undefined,
           creator: creator,
           bondingCurveKey: poolState,
           createdTimestamp: Math.floor(Date.now() / 1000)
         };
       }

    } catch (error) {
      console.error('[RaydiumLaunchlab] Error extracting token data with IDL:', error);
      
      // Fallback to basic extraction
      return this.extractTokenDataBasic(signature);
    }
  }

  private async extractTokenDataBasic(signature: string): Promise<RaydiumLaunchlabToken | null> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) return null;

      // Get account keys
      const message = tx.transaction.message;
      let accountKeys: PublicKey[] = [];
      
      if ('staticAccountKeys' in message) {
        accountKeys = message.staticAccountKeys;
      } else if ('accountKeys' in message) {
        accountKeys = (message as any).accountKeys;
      }

      if (accountKeys.length < 8) return null;

      // Extract accounts based on IDL structure
      const creator = accountKeys[6].toBase58();
      const baseMint = accountKeys[1].toBase58();
      const poolState = accountKeys.length > 4 ? accountKeys[4].toBase58() : undefined;

      return {
        mint: baseMint,
        name: `Launchlab Token ${baseMint.slice(0, 8)}`,
        symbol: `LL${baseMint.slice(-4)}`,
        description: `New token launched on Raydium Launchlab`,
        image: undefined,
        creator: creator,
        bondingCurveKey: poolState,
        createdTimestamp: Math.floor(Date.now() / 1000)
      };

    } catch (error) {
      console.error('[RaydiumLaunchlab] Error with basic extraction:', error);
      return null;
    }
  }

  isActive(): boolean {
    return this.isMonitoring;
  }



  async destroy(): Promise<void> {
    await this.stopMonitoring();
    this.removeAllListeners();
  }
}

export * from './types'; 