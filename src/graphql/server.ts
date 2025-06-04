import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createServer } from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import express from 'express';
import cors from 'cors';
import { typeDefs } from './typeDefs';
import { resolvers } from './resolvers';

interface MyContext {
  token?: string;
}

export async function createGraphQLServer() {
  const app = express();
  const httpServer = createServer(app);

  // Create the schema, which will be used separately by ApolloServer and
  // the WebSocket server.
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Creating the subscription server
  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
    },
    {
      server: httpServer,
      path: '/graphql',
    }
  );

  const server = new ApolloServer<MyContext>({
    schema,
    plugins: [
      // Proper shutdown for the HTTP server.
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Proper shutdown for the WebSocket server.
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }: { req: express.Request }) => ({ 
        token: req.headers.token as string 
      }),
    }),
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Streamlined root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Solana Markets GraphQL API',
      version: '1.0.0',
      endpoints: {
        graphql: '/graphql',
        websocket: `ws://localhost:${process.env.PORT || 4000}/graphql`,
        health: '/health'
      },
      features: {
        markets: 'Multi-DEX token price aggregation (Orca, Raydium, Meteora)',
        pumpfun: 'Real-time on-chain token creation monitoring',
        subscriptions: 'WebSocket subscriptions for live events'
      }
    });
  });

  return { app, httpServer, server };
}