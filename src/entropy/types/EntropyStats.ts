import type { EntropyLevel } from './EntropyLevel';

/**
 * Statistics about entropy collection.
 */
export interface EntropyStats {
  /**
   * Total estimated entropy bits collected.
   */
  totalBits: number;

  /**
   * Time spent collecting entropy in milliseconds.
   */
  collectionTimeMs: number;

  /**
   * Which sources contributed to the pool.
   */
  sourcesUsed: string[];

  /**
   * The entropy level that was requested.
   */
  level: EntropyLevel;
}
