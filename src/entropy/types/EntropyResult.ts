import type { EntropyStats } from './EntropyStats';

/**
 * Result of entropy collection.
 */
export interface EntropyResult {
  /**
   * Mixed and expanded entropy bytes ready for use.
   */
  bytes: Uint8Array;

  /**
   * Statistics about the collection process.
   */
  stats: EntropyStats;
}
