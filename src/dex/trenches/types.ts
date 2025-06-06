import { PumpFunToken, PumpFunTokenEvent } from '../pumpfun/types';
import { RaydiumLaunchlabToken, RaydiumLaunchlabTokenEvent } from '../raydium-launchlab/types';

export type TrenchesDex = 'PUMPFUN' | 'RAYDIUM_LAUNCHLAB';

// Union type of existing token types - ready for future differences!
export type TrenchesTokenUnion = PumpFunToken | RaydiumLaunchlabToken;

// Event with dex field at event level
export interface TrenchesTokenEvent {
  type: 'token_created';
  token: TrenchesTokenUnion;  // Union of existing tokens
  dex: TrenchesDex;           // DEX field at event level to differentiate
  timestamp: number;
  txSignature?: string;
} 