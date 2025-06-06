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
- **`src/dex/raydium-launchlab/raydium-launchlab.graphql`** - Raydium Launchlab token monitoring
- **`src/dex/trenches/trenches.graphql`** - Unified token creation subscriptions with Union types

### TypeScript Definitions
- **`src/types/graphql.d.ts`** - TypeScript declarations for `.graphql` file imports
- **`src/utils/graphql-loader.ts`** - Custom loader for importing GraphQL schema files

## Resolver Organization

### Domain-Specific Resolvers
- **`src/dex/pumpfun/pumpfun.resolver.ts`** - Real-time PumpFun token monitoring with subscription lifecycle management
- **`src/dex/raydium-launchlab/raydium-launchlab.resolver.ts`** - Real-time Raydium Launchlab token monitoring
- **`src/dex/trenches/trenches.resolver.ts`** - Unified token creation subscriptions with Union type resolution
- **`src/dex/orca/orca.resolver.ts`** - Orca market queries with proper type safety
- **`src/dex/raydium/raydium.resolver.ts`** - Raydium market queries optimized
- **`src/dex/meteora/meteora.resolver.ts`** - Meteora market queries with slippage handling
- **`src/markets/market.resolver.ts`** - Unified market aggregation with Union type resolution

## Key Optimizations

### Production-Ready Features
- **Pure GraphQL Schemas**: Uses `.graphql` files for proper IDE support and syntax validation
- **Union Type Architecture**: Flexible schema supporting multiple token types with `__resolveType`
- **Optimized Resolvers**: Removed redundant code and improved type safety
- **Efficient Constructor Patterns**: Removed unused parameters (e.g., unnecessary `rpcEndpoint`)
- **Smart Resource Management**: Automatic monitoring lifecycle for all platforms with subscription counting
- **Error Resilience**: Graceful failure handling with parallel DEX queries and monitoring services
- **Type Safety**: Strict TypeScript interfaces for all resolver parameters
- **Consistent Patterns**: Unified logging and error handling across all services

### Performance Improvements
- **Parallel Execution**: All DEX market queries run simultaneously
- **Memory Efficiency**: Cached GraphQL document parsing with `graphql-tag`
- **Minimal Bundle Size**: Removed unused imports and redundant code
- **Lazy Loading**: Token monitoring only starts when subscriptions are active
- **Zero Code Duplication**: Union types reuse existing interfaces completely
- **Efficient Subscriptions**: Single subscription handles multiple platforms

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

### Union Type Schema Development
```graphql
# Example: Token creation union type
union TrenchesTokenUnion = PumpFunToken | RaydiumLaunchlabToken

type TrenchesTokenEvent {
  type: String!
  dex: String!
  token: TrenchesTokenUnion!
  timestamp: String!
  txSignature: String!
}

type Subscription {
  trenchesNewTokens: TrenchesTokenEvent!
}
```

### Union Type Resolver Implementation
```typescript
// Union type resolver with __resolveType
export const trenchesResolvers = {
  TrenchesTokenUnion: {
    __resolveType(obj: any) {
      if (obj.__tokenType === 'PUMPFUN') {
        return 'PumpFunToken';
      }
      if (obj.__tokenType === 'RAYDIUM_LAUNCHLAB') {
        return 'RaydiumLaunchlabToken';
      }
      return null;
    },
  },
  Subscription: {
    trenchesNewTokens: {
      subscribe: () => pubsub.asyncIterator(['TRENCHES_NEW_TOKEN']),
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
│   ├── pumpfun/
│   │   ├── pumpfun.graphql   # PumpFun schema
│   │   └── pumpfun.resolver.ts
│   ├── raydium-launchlab/
│   │   ├── raydium-launchlab.graphql  # Raydium Launchlab schema
│   │   └── raydium-launchlab.resolver.ts
│   └── trenches/
│       ├── trenches.graphql  # Unified token subscriptions
│       └── trenches.resolver.ts
├── markets/
│   ├── market.graphql        # Market operations
│   └── market.resolver.ts    # Market aggregation
├── types/
│   └── graphql.d.ts          # TypeScript declarations
└── utils/
    └── graphql-loader.ts     # Schema loader utility
```

This architecture provides a scalable, maintainable, and production-ready GraphQL implementation that follows industry best practices while maintaining excellent developer experience. The Union type system enables flexible token type support while maintaining zero code duplication and consistent interfaces across all platforms. 