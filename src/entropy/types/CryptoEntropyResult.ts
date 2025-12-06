/**
 * The result of collecting entropy from the crypto source.
 */
export interface CryptoEntropyResult {
  /**
   * Random bytes from the OS CSPRNG.
   */
  bytes: Uint8Array;

  /**
   * Estimated bits of entropy in the collected bytes.
   * For crypto.getRandomValues(), we assume full entropy (8 bits per byte).
   */
  estimatedBits: number;

  /**
   * Time taken to collect the entropy in milliseconds.
   */
  collectionTimeMs: number;
}
