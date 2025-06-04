import { PubSub } from 'graphql-subscriptions';
import { getPumpFunService } from './service';

const pubsub = new PubSub();
const PUMPFUN_EVENTS = 'PUMPFUN_EVENTS';

let activeSubscriptionCount = 0;
let pumpFunEventListener: ((event: any) => void) | null = null;

async function startMonitoringIfNeeded(): Promise<void> {
  if (activeSubscriptionCount === 0) {
    console.log('[GraphQL] Starting PumpFun monitoring due to new subscription');
    const pumpFunService = getPumpFunService();
    
    if (!pumpFunEventListener) {
      pumpFunEventListener = (event) => {
        pubsub.publish(PUMPFUN_EVENTS, { 
          newPumpFunToken: event
        });
      };
      pumpFunService.on('tokenCreated', pumpFunEventListener);
    }
    
    await pumpFunService.startMonitoring();
  }
  activeSubscriptionCount++;
  console.log(`[GraphQL] Active PumpFun subscriptions: ${activeSubscriptionCount}`);
}

async function stopMonitoringIfNeeded(): Promise<void> {
  activeSubscriptionCount--;
  console.log(`[GraphQL] Active PumpFun subscriptions: ${activeSubscriptionCount}`);
  
  if (activeSubscriptionCount === 0) {
    console.log('[GraphQL] Stopping PumpFun monitoring - no active subscriptions');
    const pumpFunService = getPumpFunService();
    await pumpFunService.stopMonitoring();
    
    if (pumpFunEventListener) {
      pumpFunService.off('tokenCreated', pumpFunEventListener);
      pumpFunEventListener = null;
    }
  }
}

function createSubscription() {
  return {
    subscribe: async () => {
      await startMonitoringIfNeeded();
      
      const asyncIterator = pubsub.asyncIterableIterator(PUMPFUN_EVENTS);
      const originalReturn = asyncIterator.return?.bind(asyncIterator);
      
      asyncIterator.return = async () => {
        await stopMonitoringIfNeeded();
        return originalReturn ? originalReturn() : { value: undefined, done: true };
      };
      
      return asyncIterator;
    },
  };
}

export const pumpFunResolvers = {
  Query: {
    async pumpFunMonitoringStatus() {
      const service = getPumpFunService();
      return {
        isActive: service.isActive(),
        message: service.isActive() 
          ? `PumpFun monitoring is active (${activeSubscriptionCount} active subscriptions)` 
          : 'PumpFun monitoring is not active - no subscriptions'
      };
    },
  },

  Subscription: {
    newPumpFunToken: createSubscription(),
  },
};

export { pubsub }; 