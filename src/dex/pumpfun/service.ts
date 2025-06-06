import { Connection } from '@solana/web3.js';
import { PumpFunService } from './index';

// Global PumpFun service instance
let pumpFunServiceInstance: PumpFunService | undefined = undefined;

/**
 * Get or create the global PumpFun service instance
 */
export function getPumpFunService(connection?: Connection): PumpFunService {
  if (!pumpFunServiceInstance) {
    if (!connection) {
      // Create connection if not provided
      const rpcUrl = process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
      connection = new Connection(rpcUrl, 'confirmed');
    }
    pumpFunServiceInstance = new PumpFunService(connection);
  }
  return pumpFunServiceInstance;
}

/**
 * Start the global PumpFun monitoring service
 */
export async function startPumpFunMonitoring(connection?: Connection): Promise<void> {
  const service = getPumpFunService(connection);
  await service.startMonitoring();
}

/**
 * Stop the global PumpFun monitoring service
 */
export async function stopPumpFunMonitoring(): Promise<void> {
  if (pumpFunServiceInstance) {
    await pumpFunServiceInstance.stopMonitoring();
  }
}

/**
 * Destroy the global PumpFun service instance
 */
export async function destroyPumpFunService(): Promise<void> {
  if (pumpFunServiceInstance) {
    await pumpFunServiceInstance.destroy();
    pumpFunServiceInstance = undefined;
  }
} 