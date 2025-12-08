/**
 * flip-coin Public API
 *
 * This is the main entry point for the library.
 */

export { flipCoin } from './simulation/controller';

export type { FlipOptions } from './types/flip-options';
export type { FlipResult } from './types/flip-result';
export type { CoinConfig } from './types/coin-config';
export type { TossProfile } from './types/toss-profile';
export type { EntropyLevel } from './types/entropy-level';

export { SimulationTimeoutError } from './simulation/errors/simulation-timeout-error';
export { EdgeRetryExhaustedError } from './simulation/errors/edge-retry-exhausted-error';

export { BaseError } from './common/errors/BaseError';
