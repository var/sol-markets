# Sol Markets

A TypeScript application that fetches token pair prices from multiple Solana DEXes including Orca, Raydium, and Meteora, with real-time on-chain PumpFun token monitoring via GraphQL API.

## Features

- **Multi-DEX Support**: Fetches prices from Orca, Raydium, and Meteora
- **GraphQL API**: Modern GraphQL interface for querying token prices
- **Real-time Data**: Live price feeds from DEX APIs
- **Token Creation Monitoring**: Real-time on-chain monitoring of new token creation events
  - **PumpFun**: Full support for PumpFun token creation events
  - **Raydium Launchlab**: Complete monitoring of Raydium Launchlab token launches
  - **Unified Subscription**: Single subscription for all platforms via `trenchesNewTokens`
- **GraphQL Subscriptions**: Live WebSocket-based subscriptions for token events
- **Union Types**: Flexible GraphQL schema supporting multiple token types
- **Comprehensive Data**: Includes liquidity, volume, fees, and pool information
- **TypeScript**: Fully typed for better development experience

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sol-markets
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.sample.env` to `.env`:
   ```bash
   cp .sample.env .env
   ```
   - Edit `.env` and update the following variables:
     - `RPC_ENDPOINT`: Your Solana RPC endpoint (required for PumpFun monitoring)

## Docker Deployment

### Quick Start with Docker Compose

1. **Build and run with docker-compose:**
```bash
docker-compose up --build
```

2. **Run in detached mode:**
```bash
docker-compose up -d --build
```

3. **Stop the container:**
```bash
docker-compose down
```

### Manual Docker Build

1. **Build the Docker image:**
```bash
docker build -t sol-markets .
```

2. **Run the container:**
```bash
docker run -p 4000:4000 \
  -e RPC_ENDPOINT=https://api.mainnet-beta.solana.com \
  -e ENABLE_METEORA=true \
  -e ENABLE_RAYDIUM=true \
  -e ENABLE_ORCA=true \
  sol-markets
```

3. **Run with custom environment file:**
```bash
docker run -p 4000:4000 --env-file .env sol-markets
```

### Environment Variables for Docker

Create a `.env` file for Docker deployment:

```env
# Solana RPC Configuration - Required for on-chain PumpFun monitoring
RPC_ENDPOINT=https://api.mainnet-beta.solana.com

# DEX API URLs
RAYDIUM_API_URL=https://api-v3.raydium.io/pools/info/mint
METEORA_API_URL=https://dlmm-api.meteora.ag/pair/all_by_groups
ORCA_API_URL=https://api.orca.so/v2/solana/pools

# DEX Provider Controls
ENABLE_METEORA=true
ENABLE_RAYDIUM=true
ENABLE_ORCA=true

# Server Configuration
NODE_ENV=production
PORT=4000
```

### Docker Features

- **Multi-stage build** for optimized image size
- **Node.js 22 Alpine** base image for minimal footprint
- **Non-root user** for enhanced security
- **Health checks** for container monitoring
- **Automatic restarts** with docker-compose
- **Environment variable support** for configuration

## Environment Variables

Create a `.env` file in the root directory:

```env
# Solana RPC endpoint - Required for on-chain PumpFun monitoring
RPC_ENDPOINT=https://api.mainnet-beta.solana.com

# DEX API URLs (optional, defaults to public endpoints)
RAYDIUM_API_URL=https://api-v3.raydium.io/pools/info/mint
METEORA_API_URL=https://dlmm-api.meteora.ag/pair/all_by_groups
ORCA_API_URL=https://api.orca.so/v2/solana/pools

# DEX Configuration (optional, all enabled by default)
ENABLE_METEORA=true
ENABLE_RAYDIUM=true
ENABLE_ORCA=true

# Server Configuration
PORT=4000
```

## Usage

### GraphQL API Server

Start the GraphQL server:

```bash
npm run dev
```

The server will be available at:
- **GraphQL Endpoint**: http://localhost:4000/graphql
- **Health Check**: http://localhost:4000/health
- **API Documentation**: http://localhost:4000/

#### GraphQL Queries

**Get markets from all DEXes (default):**
```graphql
query GetAllMarkets {
  markets(
    tokenAMint: "So11111111111111111111111111111111111111112"
    tokenBMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    slippageBps: 50
    minLiquidity: 0
  ) {
    dex
    price
    timestamp
    ... on OrcaMarket {
      tvl
      fee
      volume24h
      poolAddress
      tokenA {
        address
        symbol
        name
      }
      tokenB {
        address
        symbol
        name
      }
    }
    ... on RaydiumMarket {
      liquidity
      volume_24h
      fee_24h
      poolAddress
    }
    ... on MeteoraMarket {
      binStep
      liquidity
      baseFeePercentage
      poolAddress
    }
  }
}
```

**Check PumpFun monitoring status:**
```graphql
query GetPumpFunStatus {
  pumpFunMonitoringStatus {
    isActive
    message
  }
}
```

**Get markets from specific DEXes:**
```graphql
query GetSpecificDexMarkets {
  markets(
    tokenAMint: "So11111111111111111111111111111111111111112"
    tokenBMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    dexes: [ORCA, RAYDIUM]
    slippageBps: 100
    minLiquidity: 1000
  ) {
    dex
    price
    timestamp
    ... on OrcaMarket {
      tvl
      fee
      volume24h
      poolAddress
    }
    ... on RaydiumMarket {
      liquidity
      volume_24h
      fee_24h
      poolAddress
    }
  }
}
```

**Get markets from specific DEX:**
```graphql
query GetOrcaMarkets {
  orcaMarkets(
    tokenAMint: "So11111111111111111111111111111111111111112"
    tokenBMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    slippageBps: 50
    minLiquidity: 500
  ) {
    dex
    price
    timestamp
    tvl
    fee
    volume24h
    poolAddress
  }
}
```

**Get Meteora markets with custom parameters:**
```graphql
query GetMeteoraMarkets {
  meteoraMarkets(
    tokenAMint: "So11111111111111111111111111111111111111112"
    tokenBMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    slippageBps: 25
    minLiquidity: 100
  ) {
    dex
    price
    timestamp
    binStep
    liquidity
    baseFeePercentage
    poolAddress
  }
}
```

**Available Queries:**
- `markets(tokenAMint, tokenBMint, dexes?, slippageBps?, minLiquidity?)` - Get markets from all enabled DEXes or specific DEXes
  - `dexes` parameter is optional and accepts an array of: `[ORCA, RAYDIUM, METEORA]`
  - `slippageBps` parameter is optional with default value of 50 (0.5%)
  - `minLiquidity` parameter is optional with default value of 0 (filters out pools with liquidity below this threshold)
  - If `dexes` is not provided or empty, all DEXes are queried (default behavior)
- `orcaMarkets(tokenAMint, tokenBMint, slippageBps?, minLiquidity?)` - Get markets from Orca DEX only (minLiquidity filters by TVL in USD)
- `raydiumMarkets(tokenAMint, tokenBMint, slippageBps?, minLiquidity?)` - Get markets from Raydium DEX only (minLiquidity filters by liquidity value)  
- `meteoraMarkets(tokenAMint, tokenBMint, slippageBps?, minLiquidity?)` - Get markets from Meteora DEX only (slippage affects calculations, minLiquidity filters by liquidity value)
- `pumpFunMonitoringStatus()` - Check if PumpFun on-chain monitoring is active
- `raydiumLaunchlabMonitoringStatus()` - Check if Raydium Launchlab on-chain monitoring is active

#### GraphQL Subscriptions (Real-time Events)

**Subscribe to new token creation events from all platforms (Recommended):**
```graphql
subscription TrenchesNewTokens {
  trenchesNewTokens {
    type
    dex  # PUMPFUN or RAYDIUM_LAUNCHLAB
    token {
      mint
      name
      symbol
      description
      image
      creator
      bondingCurveKey
      createdTimestamp
    }
    timestamp
    txSignature
  }
}
```

**Subscribe to PumpFun tokens only:**
```graphql
subscription NewPumpFunTokens {
  newPumpFunToken {
    type
    token {
      mint
      name
      symbol
      description
      image
      creator
      bondingCurveKey
      createdTimestamp
    }
    timestamp
    txSignature
  }
}
```

**Subscribe to Raydium Launchlab tokens only:**
```graphql
subscription NewRaydiumLaunchlabTokens {
  newRaydiumLaunchlabToken {
    type
    token {
      mint
      name
      symbol
      description
      image
      creator
      bondingCurveKey
      createdTimestamp
    }
    timestamp
    txSignature
  }
}
```

**Available Queries:**
- `markets(tokenAMint, tokenBMint, dexes?, slippageBps?, minLiquidity?)` - Get markets from all enabled DEXes or specific DEXes
  - `dexes` parameter is optional and accepts an array of: `[ORCA, RAYDIUM, METEORA]`
  - `slippageBps` parameter is optional with default value of 50 (0.5%)
  - `minLiquidity` parameter is optional with default value of 0 (filters out pools with liquidity below this threshold)
  - If `dexes` is not provided or empty, all DEXes are queried (default behavior)
- `orcaMarkets(tokenAMint, tokenBMint, slippageBps?, minLiquidity?)` - Get markets from Orca DEX only (minLiquidity filters by TVL in USD)
- `raydiumMarkets(tokenAMint, tokenBMint, slippageBps?, minLiquidity?)` - Get markets from Raydium DEX only (minLiquidity filters by liquidity value)  
- `meteoraMarkets(tokenAMint, tokenBMint, slippageBps?, minLiquidity?)` - Get markets from Meteora DEX only (slippage affects calculations, minLiquidity filters by liquidity value)
- `pumpFunMonitoringStatus()` - Check if PumpFun on-chain monitoring is active
- `raydiumLaunchlabMonitoringStatus()` - Check if Raydium Launchlab on-chain monitoring is active

**Available Subscriptions:**
- `trenchesNewTokens` - **Unified subscription** for all token creation events (PumpFun + Raydium Launchlab)
- `newPumpFunToken` - Real-time events for new PumpFun token creation (on-chain monitoring)
- `newRaydiumLaunchlabToken` - Real-time events for new Raydium Launchlab token creation (on-chain monitoring)

**Available DEX Values:**
- `ORCA` - Orca DEX
- `RAYDIUM` - Raydium DEX  
- `METEORA` - Meteora DEX

## Token Creation Monitoring

The application includes real-time monitoring of token creation events from multiple Solana launchpads directly from the blockchain:

### Supported Platforms
- **PumpFun**: Original meme coin launchpad with bonding curve mechanism
- **Raydium Launchlab**: Professional token launchpad with advanced features
- **Unified Subscription**: Single GraphQL subscription covering all platforms

### Features
- **On-Chain Event Listening**: Monitors Solana program logs for token creation transactions
- **Real-Time Subscriptions**: WebSocket-based GraphQL subscriptions for live event streaming
- **Transaction Parsing**: Extracts token metadata from on-chain transaction data
- **Union Types**: Flexible GraphQL schema supporting different token types
- **Duplicate Prevention**: Filters out duplicate transactions and events
- **Error Handling**: Robust error handling for network issues and invalid transactions

### Technical Details

**PumpFun Monitoring:**
- **Program ID**: `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`
- **Event Types**: `token_created`, `token_updated`, `token_completed`

**Raydium Launchlab Monitoring:**
- **Program ID**: `39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg`
- **Events**: Token creation and launch transactions
- **Metadata**: Comprehensive token information including images and descriptions

**Common Features:**
- **Connection**: Solana WebSocket connection for real-time monitoring
- **Data Source**: Directly from blockchain transactions (no API dependencies)
- **Logging**: Consistent monitoring logs across all platforms

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Development

Start the development server with hot reload:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Architecture

The application follows a modular architecture with domain-driven design:

- **GraphQL Server**: Apollo Server with WebSocket subscriptions
- **DEX Providers**: Modular providers for each DEX (Orca, Raydium, Meteora)
- **Token Creation Monitoring**: 
  - **PumpFun Service**: On-chain event monitoring with Anchor-based decoding
  - **Raydium Launchlab Service**: Complete token launch monitoring
  - **Trenches Resolver**: Unified subscription combining all platforms
- **Union Types**: Flexible GraphQL schema supporting multiple token types
- **Type Safety**: Full TypeScript coverage with strict typing
- **Testing**: Comprehensive test suite with Jest and mocking (61 tests)
- **Production Ready**: Docker containerization, health checks, and consistent logging

## License

MIT License