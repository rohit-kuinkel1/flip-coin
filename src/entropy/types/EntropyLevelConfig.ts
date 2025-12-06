/**
 * Configuration for each entropy level.
 */
export interface EntropyLevelConfig {
  /**
   * Minimum collection time in milliseconds.
   * Collection continues for at least this long even if entropy target is met.
   */
  minTimeMs: number;

  /**
   * Target entropy bits to collect.
   * Collection stops when this is reached (after minTimeMs).
   */
  targetBits: number;

  /**
   * Maximum collection time in milliseconds.
   * Collection stops even if target isn't reached.
   */
  maxTimeMs: number;
}
