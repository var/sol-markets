import { config } from 'dotenv';
import { createGraphQLServer } from './graphql/server';
import { stopPumpFunMonitoring } from './dex/pumpfun/service';
import { stopRaydiumLaunchlabMonitoring } from './dex/raydium-launchlab/service';

// Load environment variables first
config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

async function startServer(): Promise<void> {
  try {
    const { app, httpServer } = await createGraphQLServer();

    console.log('🔧 Initializing services...');
    
    await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
    
    console.log(`🚀 Server ready at http://localhost:${PORT}/`);
    console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log('🎯 PumpFun and Raydium Launchlab monitoring starts automatically when subscriptions connect');
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(): Promise<void> {
  console.log('\n🛑 Shutting down server...');
  try {
    await stopPumpFunMonitoring();
    await stopRaydiumLaunchlabMonitoring();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

startServer(); 