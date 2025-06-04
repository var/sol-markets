# GraphQL Architecture

This document describes the production-ready GraphQL architecture following domain-driven design principles with pure GraphQL schemas and optimized performance.

## Overview

The GraphQL resolvers and type definitions are organized into domain-specific modules with pure `.graphql` files, ensuring maintainability, proper syntax highlighting, IDE support, and separation of concerns.

## Architecture Structure

### Entry Points
- **`src/graphql/resolvers.ts`** - Merges all domain-specific resolvers using `@graphql-tools/merge`
- **`src/graphql/typeDefs.ts`** - Loads and merges all pure `.graphql` schema files
- **`src/graphql/server.ts`** - Production-ready GraphQL server with WebSocket subscriptions

### Schema Files (Pure GraphQL)
- **`src/graphql/base.graphql`** - Base Query and Subscription types
- **`src/dex/common/types.graphql`** - Shared interfaces, types, and enums
- **`src/markets/market.graphql`** - General market operations
- **`src/dex/orca/orca.graphql`** - Orca-specific schemas
- **`src/dex/raydium/raydium.graphql`** - Raydium-specific schemas  
- **`src/dex/meteora/meteora.graphql`** - Meteora-specific schemas
- **`src/dex/pumpfun/pumpfun.graphql`** - PumpFun subscriptions and queries

### TypeScript Definitions
- **`src/types/graphql.d.ts`** - TypeScript declarations for `.graphql` file imports
- **`src/utils/graphql-loader.ts`** - Custom loader for importing GraphQL schema files

## Resolver Organization

### Domain-Specific Resolvers
- **`src/dex/pumpfun/pumpfun.resolver.ts`** - Real-time token monitoring with subscription lifecycle management
- **`src/dex/orca/orca.resolver.ts`** - Orca market queries with proper type safety
- **`src/dex/raydium/raydium.resolver.ts`** - Raydium market queries optimized
- **`src/dex/meteora/meteora.resolver.ts`** - Meteora market queries with slippage handling
- **`src/markets/market.resolver.ts`** - Unified market aggregation with Union type resolution

## Key Optimizations

### Production-Ready Features
- **Pure GraphQL Schemas**: Uses `.graphql` files for proper IDE support and syntax validation
- **Optimized Resolvers**: Removed redundant code and improved type safety
- **Efficient Constructor Patterns**: Removed unused parameters (e.g., unnecessary `rpcEndpoint`)
- **Smart Resource Management**: Automatic PumpFun monitoring lifecycle with subscription counting
- **Error Resilience**: Graceful failure handling with parallel DEX queries
- **Type Safety**: Strict TypeScript interfaces for all resolver parameters

### Performance Improvements
- **Parallel Execution**: All DEX market queries run simultaneously
- **Memory Efficiency**: Cached GraphQL document parsing with `graphql-tag`
- **Minimal Bundle Size**: Removed unused imports and redundant code
- **Lazy Loading**: PumpFun monitoring only starts when subscriptions are active

## Benefits

### Developer Experience
- **GraphQL IDE Support**: Full syntax highlighting and validation in `.graphql` files
- **Type Safety**: Complete TypeScript integration with proper type checking
- **Domain Separation**: Each DEX team can work independently on their schemas
- **Clean Architecture**: Clear separation between schema definition and resolver logic
- **Easy Testing**: Domain-specific resolvers are easily unit tested

### Performance Benefits
- **Schema Validation**: Build-time validation of GraphQL schemas
- **Optimized Queries**: Automatic query optimization and caching
- **Resource Efficiency**: Smart subscription management and parallel processing
- **Production Ready**: Optimized for production deployment with minimal overhead

## Usage Examples

### Pure GraphQL Schema Development
```graphql
# Example: Adding a new field to Orca schema
extend type Query {
  orcaPoolDetails(poolAddress: String!): OrcaPoolDetails
}

type OrcaPoolDetails {
  address: String!
  liquidity: Float!
  volume24h: Float!
  fees: PoolFees!
}
```

### Resolver Implementation
```typescript
// Corresponding resolver with optimized patterns
export const orcaResolvers = {
  Query: {
    async orcaPoolDetails(_: unknown, { poolAddress }: { poolAddress: string }) {
      const orcaService = new OrcaMarket(0);
      return orcaService.getPoolDetails(poolAddress);
    },
  },
};
```

## File Organization

```
src/
├── graphql/
│   ├── base.graphql           # Base types
│   ├── resolvers.ts           # Resolver entry point
│   ├── typeDefs.ts           # Schema entry point
│   └── server.ts             # GraphQL server
├── dex/
│   ├── common/
│   │   └── types.graphql     # Shared interfaces
│   ├── orca/
│   │   ├── orca.graphql      # Orca schema
│   │   └── orca.resolver.ts  # Orca resolvers
│   ├── raydium/
│   │   ├── raydium.graphql   # Raydium schema  
│   │   └── raydium.resolver.ts
│   ├── meteora/
│   │   ├── meteora.graphql   # Meteora schema
│   │   └── meteora.resolver.ts
│   └── pumpfun/
│       ├── pumpfun.graphql   # PumpFun schema
│       └── pumpfun.resolver.ts
├── markets/
│   ├── market.graphql        # Market operations
│   └── market.resolver.ts    # Market aggregation
├── types/
│   └── graphql.d.ts          # TypeScript declarations
└── utils/
    └── graphql-loader.ts     # Schema loader utility
```

This architecture provides a scalable, maintainable, and production-ready GraphQL implementation that follows industry best practices while maintaining excellent developer experience. 