import { PubSub } from 'graphql-subscriptions';
import { getRaydiumLaunchlabService } from './service';

const pubsub = new PubSub();
const RAYDIUM_LAUNCHLAB_EVENTS = 'RAYDIUM_LAUNCHLAB_EVENTS';

let activeSubscriptionCount = 0;
let raydiumLaunchlabEventListener: ((event: any) => void) | null = null;

async function startMonitoringIfNeeded(): Promise<void> {
  if (activeSubscriptionCount === 0) {
    console.log('[GraphQL] Starting Raydium Launchlab monitoring due to new subscription');
    const raydiumLaunchlabService = getRaydiumLaunchlabService();
    
    if (!raydiumLaunchlabEventListener) {
      raydiumLaunchlabEventListener = (event) => {
        pubsub.publish(RAYDIUM_LAUNCHLAB_EVENTS, { 
          newRaydiumLaunchlabToken: event
        });
      };
      raydiumLaunchlabService.on('tokenCreated', raydiumLaunchlabEventListener);
    }
    
    await raydiumLaunchlabService.startMonitoring();
  }
  activeSubscriptionCount++;
  console.log(`[GraphQL] Active Raydium Launchlab subscriptions: ${activeSubscriptionCount}`);
}

async function stopMonitoringIfNeeded(): Promise<void> {
  activeSubscriptionCount--;
  console.log(`[GraphQL] Active Raydium Launchlab subscriptions: ${activeSubscriptionCount}`);
  
  if (activeSubscriptionCount === 0) {
    console.log('[GraphQL] Stopping Raydium Launchlab monitoring - no active subscriptions');
    const raydiumLaunchlabService = getRaydiumLaunchlabService();
    await raydiumLaunchlabService.stopMonitoring();
    
    if (raydiumLaunchlabEventListener) {
      raydiumLaunchlabService.off('tokenCreated', raydiumLaunchlabEventListener);
      raydiumLaunchlabEventListener = null;
    }
  }
}

function createSubscription() {
  return {
    subscribe: async () => {
      await startMonitoringIfNeeded();
      
      const asyncIterator = pubsub.asyncIterableIterator(RAYDIUM_LAUNCHLAB_EVENTS);
      const originalReturn = asyncIterator.return?.bind(asyncIterator);
      
      asyncIterator.return = async () => {
        await stopMonitoringIfNeeded();
        return originalReturn ? originalReturn() : { value: undefined, done: true };
      };
      
      return asyncIterator;
    },
  };
}

export const raydiumLaunchlabResolvers = {
  Query: {
    async raydiumLaunchlabMonitoringStatus() {
      const service = getRaydiumLaunchlabService();
      return {
        isActive: service.isActive(),
        message: service.isActive() 
          ? `Raydium Launchlab monitoring is active (${activeSubscriptionCount} active subscriptions)` 
          : 'Raydium Launchlab monitoring is not active - no subscriptions'
      };
    },
  },

  Subscription: {
    newRaydiumLaunchlabToken: createSubscription(),
  },
};

export { pubsub }; 