import { mergeTypeDefs } from '@graphql-tools/merge';
import { loadGraphQLDocument } from '../utils/graphql-loader';
import * as path from 'path';

// Load pure GraphQL schema files
const baseTypeDefs = loadGraphQLDocument(path.join(__dirname, 'base.graphql'));
const commonTypeDefs = loadGraphQLDocument(path.join(__dirname, '../dex/common/types.graphql'));
const marketTypeDefs = loadGraphQLDocument(path.join(__dirname, '../markets/market.graphql'));
const orcaTypeDefs = loadGraphQLDocument(path.join(__dirname, '../dex/orca/orca.graphql'));
const raydiumTypeDefs = loadGraphQLDocument(path.join(__dirname, '../dex/raydium/raydium.graphql'));
const meteoraTypeDefs = loadGraphQLDocument(path.join(__dirname, '../dex/meteora/meteora.graphql'));
const pumpFunTypeDefs = loadGraphQLDocument(path.join(__dirname, '../dex/pumpfun/pumpfun.graphql'));
const raydiumLaunchlabTypeDefs = loadGraphQLDocument(path.join(__dirname, '../dex/raydium-launchlab/raydium-launchlab.graphql'));
const trenchesTypeDefs = loadGraphQLDocument(path.join(__dirname, '../dex/trenches/trenches.graphql'));

// Combine all type definitions from different domains
export const typeDefs = mergeTypeDefs([
  baseTypeDefs,
  commonTypeDefs,
  marketTypeDefs,
  orcaTypeDefs,
  raydiumTypeDefs,
  meteoraTypeDefs,
  pumpFunTypeDefs,
  raydiumLaunchlabTypeDefs,
  trenchesTypeDefs,
]); 