/**
 * The result of collecting entropy from the timing source.
 */
export interface TimingEntropyResult {
  /**
   * Raw entropy bytes collected from timer jitter.
   */
  bytes: Uint8Array;

  /**
   * Estimated bits of entropy in the collected bytes.
   * This is a conservative estimate (approximately 1 bit per sample).
   */
  estimatedBits: number;

  /**
   * Time taken to collect the entropy in milliseconds.
   */
  collectionTimeMs: number;
}
