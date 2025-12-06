import type { EntropyLevel } from './EntropyLevel';
import type { TimingEntropyOptions } from './TimingEntropyOptions';
import type { CryptoEntropyOptions } from './CryptoEntropyOptions';

/**
 * Options for entropy collection.
 */
export interface EntropyPoolOptions {
  /**
   * Entropy quality level.
   * Default: 'standard'
   */
  level?: EntropyLevel;

  /**
   * Number of output bytes to generate.
   * Default: 64 (enough for physics initial conditions)
   */
  outputBytes?: number;

  /**
   * Override timeout for timing source.
   */
  timingOptions?: TimingEntropyOptions;

  /**
   * Override timeout for crypto source.
   */
  cryptoOptions?: CryptoEntropyOptions;
}
