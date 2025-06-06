import { mergeResolvers } from '@graphql-tools/merge';
import { marketResolvers } from '../markets/market.resolver';
import { orcaResolvers } from '../dex/orca/orca.resolver';
import { raydiumResolvers } from '../dex/raydium/raydium.resolver';
import { meteoraResolvers } from '../dex/meteora/meteora.resolver';
import { pumpFunResolvers } from '../dex/pumpfun/pumpfun.resolver';
import { raydiumLaunchlabResolvers } from '../dex/raydium-launchlab/raydium-launchlab.resolver';
import { trenchesResolvers } from '../dex/trenches/trenches.resolver';

// Combine all resolvers from different domains
export const resolvers = mergeResolvers([
  marketResolvers,
  orcaResolvers,
  raydiumResolvers,
  meteoraResolvers,
  pumpFunResolvers,
  raydiumLaunchlabResolvers,
  trenchesResolvers,
]);

// Re-export pubsub from PumpFun for backward compatibility
export { pubsub } from '../dex/pumpfun/pumpfun.resolver'; 