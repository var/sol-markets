import { PubSub } from 'graphql-subscriptions';
import { getPumpFunService } from '../pumpfun/service';
import { getRaydiumLaunchlabService } from '../raydium-launchlab/service';
import { TrenchesTokenEvent } from './types';
import { PumpFunTokenEvent } from '../pumpfun/types';
import { RaydiumLaunchlabTokenEvent } from '../raydium-launchlab/types';

const pubsub = new PubSub();
const TRENCHES_EVENTS = 'TRENCHES_EVENTS';

let activeSubscriptionCount = 0;
let pumpFunEventListener: ((event: PumpFunTokenEvent) => void) | null = null;
let raydiumLaunchlabEventListener: ((event: RaydiumLaunchlabTokenEvent) => void) | null = null;

async function startMonitoringIfNeeded(): Promise<void> {
  if (activeSubscriptionCount === 0) {
    console.log('[GraphQL] Starting Trenches unified monitoring due to new subscription');
    
    const pumpFunService = getPumpFunService();
    const raydiumLaunchlabService = getRaydiumLaunchlabService();
    
    // Set up PumpFun listener
    if (!pumpFunEventListener) {
      pumpFunEventListener = (event: PumpFunTokenEvent) => {
        const trenchesEvent: TrenchesTokenEvent = {
          ...event,
          token: {
            ...event.token,
            __tokenType: 'PUMPFUN'  // Add discriminator for GraphQL union resolution
          } as any,
          dex: 'PUMPFUN'
        };
        
        pubsub.publish(TRENCHES_EVENTS, { 
          trenchesNewTokens: trenchesEvent
        });
      };
      pumpFunService.on('tokenCreated', pumpFunEventListener);
    }
    
    // Set up Raydium Launchlab listener
    if (!raydiumLaunchlabEventListener) {
      raydiumLaunchlabEventListener = (event: RaydiumLaunchlabTokenEvent) => {
        const trenchesEvent: TrenchesTokenEvent = {
          ...event,
          token: {
            ...event.token,
            __tokenType: 'RAYDIUM_LAUNCHLAB'  // Add discriminator for GraphQL union resolution
          } as any,
          dex: 'RAYDIUM_LAUNCHLAB'
        };
        
        pubsub.publish(TRENCHES_EVENTS, { 
          trenchesNewTokens: trenchesEvent
        });
      };
      raydiumLaunchlabService.on('tokenCreated', raydiumLaunchlabEventListener);
    }
    
    // Start both monitoring services
    await Promise.all([
      pumpFunService.startMonitoring(),
      raydiumLaunchlabService.startMonitoring()
    ]);
  }
  
  activeSubscriptionCount++;
  console.log(`[GraphQL] Active Trenches subscriptions: ${activeSubscriptionCount}`);
}

async function stopMonitoringIfNeeded(): Promise<void> {
  activeSubscriptionCount--;
  console.log(`[GraphQL] Active Trenches subscriptions: ${activeSubscriptionCount}`);
  
  if (activeSubscriptionCount === 0) {
    console.log('[GraphQL] Stopping Trenches unified monitoring - no active subscriptions');
    
    const pumpFunService = getPumpFunService();
    const raydiumLaunchlabService = getRaydiumLaunchlabService();
    
    // Stop both monitoring services
    await Promise.all([
      pumpFunService.stopMonitoring(),
      raydiumLaunchlabService.stopMonitoring()
    ]);
    
    // Remove event listeners
    if (pumpFunEventListener) {
      pumpFunService.off('tokenCreated', pumpFunEventListener);
      pumpFunEventListener = null;
    }
    
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
      
      const asyncIterator = pubsub.asyncIterableIterator(TRENCHES_EVENTS);
      const originalReturn = asyncIterator.return?.bind(asyncIterator);
      
      asyncIterator.return = async () => {
        await stopMonitoringIfNeeded();
        return originalReturn ? originalReturn() : { value: undefined, done: true };
      };
      
      return asyncIterator;
    },
  };
}

export const trenchesResolvers = {
  TrenchesTokenUnion: {
    __resolveType(obj: any, context: any, info: any) {
      // GraphQL passes the parent object as the fourth argument to resolvers
      // We need to access the parent TrenchesTokenEvent to get the dex field
      
      // The parent should be accessible through the info.rootValue or context
      // But let's use a simpler approach: store the type info directly on the token object
      if ((obj as any).__tokenType === 'PUMPFUN') {
        return 'PumpFunToken';
      }
      if ((obj as any).__tokenType === 'RAYDIUM_LAUNCHLAB') {
        return 'RaydiumLaunchlabToken';
      }
      
      // Default fallback
      return 'PumpFunToken';
    },
  },
  Subscription: {
    trenchesNewTokens: createSubscription(),
  },
};

export { pubsub }; 