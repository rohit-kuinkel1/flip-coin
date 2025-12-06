/**
 * Configuration options for timing entropy collection.
 */
export interface TimingEntropyOptions {
  /**
   * Number of timing samples to collect.
   * More samples = more entropy but longer collection time.
   * Default: 256 (yields approximately 256 bits of entropy)
   */
  sampleCount?: number;

  /**
   * Maximum time allowed for collection in milliseconds.
   * Collection stops early if this timeout is exceeded.
   * Default: 200ms
   */
  timeoutMs?: number;
}
