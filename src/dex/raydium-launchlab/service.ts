import { Connection } from '@solana/web3.js';
import { RaydiumLaunchlabService } from './index';

// Global Raydium Launchlab service instance
let raydiumLaunchlabServiceInstance: RaydiumLaunchlabService | undefined = undefined;

/**
 * Get or create the global Raydium Launchlab service instance
 */
export function getRaydiumLaunchlabService(connection?: Connection): RaydiumLaunchlabService {
  if (!raydiumLaunchlabServiceInstance) {
    if (!connection) {
      // Create connection if not provided
      const rpcUrl = process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
      connection = new Connection(rpcUrl, 'confirmed');
    }
    raydiumLaunchlabServiceInstance = new RaydiumLaunchlabService(connection);
  }
  return raydiumLaunchlabServiceInstance;
}

/**
 * Start the global Raydium Launchlab monitoring service
 */
export async function startRaydiumLaunchlabMonitoring(connection?: Connection): Promise<void> {
  const service = getRaydiumLaunchlabService(connection);
  await service.startMonitoring();
}

/**
 * Stop the global Raydium Launchlab monitoring service
 */
export async function stopRaydiumLaunchlabMonitoring(): Promise<void> {
  if (raydiumLaunchlabServiceInstance) {
    await raydiumLaunchlabServiceInstance.stopMonitoring();
  }
}

/**
 * Destroy the global Raydium Launchlab service instance
 */
export async function destroyRaydiumLaunchlabService(): Promise<void> {
  if (raydiumLaunchlabServiceInstance) {
    await raydiumLaunchlabServiceInstance.destroy();
    raydiumLaunchlabServiceInstance = undefined;
  }
} 