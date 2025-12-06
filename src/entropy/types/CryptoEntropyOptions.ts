/**
 * Configuration options for crypto entropy collection.
 */
export interface CryptoEntropyOptions {
  /**
   * Number of bytes to request.
   * Default: 32 (256 bits, matching SHA-256 output)
   */
  byteCount?: number;

  /**
   * Maximum time allowed for collection in milliseconds.
   * Collection fails if this timeout is exceeded.
   * Default: 100ms (crypto.getRandomValues is typically instant)
   */
  timeoutMs?: number;
}
