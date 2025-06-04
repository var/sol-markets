// Mock crypto for Solana
import * as nodeCrypto from 'crypto';
Object.defineProperty(globalThis, 'crypto', {
    value: {
        subtle: {
            digest: async (algorithm: string, data: ArrayBuffer) => {
                const hash = nodeCrypto.createHash(algorithm.toLowerCase().replace('-', ''));
                hash.update(Buffer.from(data));
                return hash.digest();
            }
        }
    }
});

// Mock fetch for Node.js environment
import { Response } from 'node-fetch';
const nodeFetch = require('node-fetch');

// @ts-ignore
global.fetch = async function fetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
    return nodeFetch(url, init);
};

// Set default environment variables for tests if not already set
if (process.env.NODE_ENV === 'test') {
    process.env.RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
    process.env.RAYDIUM_API_URL = process.env.RAYDIUM_API_URL || 'https://api.raydium.io/v2/main/pairs';
    process.env.METEORA_API_URL = process.env.METEORA_API_URL || 'https://dlmm-api.meteora.ag/pair/all';
    process.env.ORCA_API_URL = process.env.ORCA_API_URL || 'https://api.orca.so/v2/solana/pools';
} 