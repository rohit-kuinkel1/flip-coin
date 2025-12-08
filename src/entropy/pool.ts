/**
 * Entropy pool management for collecting, mixing, and dispensing randomness.
 *
 * ## Architecture Overview
 *
 * The entropy pool is the central coordinator for randomness in the simulation.
 * It uses a **stateless, one-shot collection** model where each call to
 * `collectEntropy()` performs a fresh collection cycle.
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    collectEntropy() Call                        │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                 │
 * │   ┌─────────┐  ┌─────────┐                                      │
 * │   │ Timing  │  │ Crypto  │  (+ future: quantum, audio, input)   │
 * │   │ Source  │  │ Source  │                                      │
 * │   └────┬────┘  └────┬────┘                                      │
 * │        │            │                                           │
 * │        └──────┬─────┘                                           │
 * │               ▼                                                 │
 * │        ┌─────────────┐                                          │
 * │        │   Mixer     │  (SHA-256 based)                         │
 * │        └──────┬──────┘                                          │
 * │               ▼                                                 │
 * │        ┌─────────────┐                                          │
 * │        │  Expansion  │  (counter mode for more bytes)           │
 * │        └──────┬──────┘                                          │
 * │               ▼                                                 │
 * │            Output                                               │
 * └─────────────────────────────────────────────────────────────────┘
 * ```
 *
 * **Note:** This implementation is stateless - it does NOT maintain a persistent
 * entropy buffer that accumulates over time and depletes on extraction.
 * Each `collectEntropy()` call is independent. This is simpler and sufficient
 * for the coin flip use case where each flip requests fresh entropy.
 *
 * ## Collection Strategy
 *
 * We use an accumulation loop approach with **graceful degradation**:
 * 1. Perform sweeps of ALL available entropy sources in parallel
 * 2. Each source has its own timeout (sources that fail are silently skipped)
 * 3. Accumulate entropy bits, targeting the level's targetBits goal
 * 4. Enforce minTimeMs as floor (keep collecting even if target met early)
 * 5. Enforce maxTimeMs as ceiling
 * 6. Mix all accumulated results together using SHA-256
 *
 * **Graceful Degradation:** If targetBits cannot be met within maxTimeMs,
 * we proceed with whatever entropy was collected (as long as at least one
 * source succeeded). This ensures the system works with "minimum viable
 * timer jitter" per ARCHITECTURE.md. Only if ALL sources fail do we throw.
 *
 * ## Quality Levels
 *
 * Different use cases have different entropy requirements:
 *
 * | Level    | Min Time | Target Bits | Max Time | Use Case              |
 * |----------|----------|-------------|----------|-----------------------|
 * | fast     | 100ms    | 64 bits     | 500ms    | Quick demos           |
 * | standard | 200ms    | 128 bits    | 1000ms   | Normal use            |
 * | high     | 500ms    | 256 bits    | 2000ms   | Important decisions   |
 * | paranoid | 2000ms   | 512 bits    | 5000ms   | Maximum randomness    |
 *
 * The targetBits is a **goal, not a hard requirement**. If sources are limited
 * or slow, collection proceeds with reduced entropy rather than failing.
 *
 * ## Entropy Estimation
 *
 * Each source provides an estimate of the entropy it collected.
 * These estimates are conservative (underestimate rather than overestimate).
 * The pool tracks total estimated entropy for reporting purposes.
 */

import { mixEntropy, expandEntropy } from './mixer';
import {
  collectTimingEntropy,
} from './sources/timing';
import {
  collectCryptoEntropy,
  isCryptoEntropyAvailable,
} from './sources/crypto';
import type {
  EntropyLevel,
  EntropyLevelConfig,
  CryptoEntropyOptions,
  TimingEntropyOptions,
  EntropyResult,
  EntropyPoolOptions,
  SourceResult,
} from './types';
import { EntropyCollectionFailedError } from './errors';

/**
 * Preset configurations for each entropy level.
 */
const ENTROPY_LEVEL_CONFIGS: Record<EntropyLevel, EntropyLevelConfig> = {
  fast: {
    minTimeMs: 100,
    targetBits: 64,
    maxTimeMs: 500,
  },
  standard: {
    minTimeMs: 200,
    targetBits: 128,
    maxTimeMs: 1000,
  },
  high: {
    minTimeMs: 500,
    targetBits: 256,
    maxTimeMs: 2000,
  },
  paranoid: {
    minTimeMs: 2000,
    targetBits: 512,
    maxTimeMs: 5000,
  },
};

/**
 * Collects entropy from all available sources and returns mixed output.
 *
 * This is the main entry point for the entropy system. It:
 * 1. Determines which sources are available
 * 2. Collects entropy from all sources in parallel
 * 3. Mixes the results using SHA-256
 * 4. Expands to the requested output size
 *
 * Example usage:
 * ```typescript
 * const entropy = await collectEntropy({ level: 'standard', outputBytes: 64 });
 * const byteCount = entropy.bytes.length;          /* 64 random bytes */
 * const sources = entropy.stats.sourcesUsed.join(', '); /* e.g., "crypto, timing" */
 * const collectionMs = entropy.stats.collectionTimeMs;  /* wall-clock duration */
 * ```
 *
 * @param options Collection options
 * @returns Promise resolving to EntropyResult
 */
export async function collectEntropy(
  options: EntropyPoolOptions = {}
): Promise<EntropyResult> {
  const level = options.level ?? 'standard';
  const outputBytes = options.outputBytes ?? 64;
  const config = ENTROPY_LEVEL_CONFIGS[level];

  const startTime = performance.now();

  /**
   * Accumulate entropy until we reach the target OR hit max time.
   * We keep collecting in sweeps until requirements are met.
   */
  const allResults: SourceResult[] = [];
  let totalBits = 0;

  while (true) {
    const elapsed = performance.now() - startTime;

    /**
     * Check if we've exceeded max time.
     * Only throw if we've exhausted all attempts AND have no entropy.
     * This implements graceful degradation per ARCHITECTURE.md.
     */
    if (elapsed >= config.maxTimeMs) {
      /**
       * Critical failure: no sources succeeded after exhausting time budget.
       * This should be rare since timer jitter is always available.
       */
      if (allResults.length === 0) {
        throw new EntropyCollectionFailedError(config.maxTimeMs);
      }

      /**
       * We have some entropy but didn't meet target bits.
       * Per ARCHITECTURE.md: work with whatever is available.
       * Log a warning but don't fail - graceful degradation.
       */
      if (totalBits < config.targetBits) {
        /**
         * Graceful degradation rationale:
         * - Liveness beats perfection: returning slightly less entropy is better
         *   than blocking the caller indefinitely.
         * - Minimum viable entropy is guaranteed by the timer source, so the
         *   result is still unpredictable even if the target was missed.
         *
         * Example: Target = 128 bits, collected = 96 bits when maxTimeMs hit.
         * -> We still mix and expand the 96 bits because the flip must proceed.
         * -> In production we would emit a warning metric/log to surface the
         *    entropy shortfall for operational visibility.
         */
      }
      break;
    }

    /**
     * Check if we've met both requirements:
     * 1. Collected enough entropy bits
     * 2. Spent at least the minimum time
     */
    if (totalBits >= config.targetBits && elapsed >= config.minTimeMs) {
      break;
    }

    /**
     * Perform a sweep of all sources.
     * Calculate remaining time for this sweep's timeout.
     */
    const remainingTime = config.maxTimeMs - elapsed;
    const sweepResults = await performEntropySweep(options, config, remainingTime);

    /**
     * Accumulate successful results.
     * Failed sources are silently skipped per ARCHITECTURE.md.
     */
    for (const result of sweepResults) {
      if (result.success) {
        allResults.push(result);
        totalBits += result.estimatedBits;
      }
    }

    /**
     * Small delay before next sweep to avoid busy-looping.
     * This also gives the OS entropy pool time to replenish.
     * Continue trying even if this sweep had no successes - another
     * sweep might succeed (graceful degradation principle).
     */
    if (totalBits < config.targetBits) {
      await sleep(10);
    }
  }

  /**
   * If we still haven't met minimum time, wait.
   * This ensures consistent timing behavior.
   */
  const elapsed = performance.now() - startTime;
  if (elapsed < config.minTimeMs) {
    await sleep(config.minTimeMs - elapsed);
  }

  /**
   * Mix all accumulated entropy together.
   */
  const sourceBytes = allResults.map((r) => r.bytes);
  const mixedEntropy = await mixEntropy(sourceBytes);

  /**
   * Expand the mixed entropy to the requested output size.
   */
  const expandedEntropy = await expandEntropy(mixedEntropy, outputBytes);

  const endTime = performance.now();

  /**
   * Deduplicate source names for stats (a source may have contributed multiple times).
   */
  const sourcesUsed = [...new Set(allResults.map((r) => r.name))];

  return {
    bytes: expandedEntropy,
    stats: {
      totalBits,
      collectionTimeMs: endTime - startTime,
      sourcesUsed,
      level,
    },
  };
}

/**
 * Performs a single sweep of all available entropy sources.
 *
 * Each source is queried in parallel with per-source timeouts.
 * Failed sources are silently skipped.
 *
 * @param options User-provided options
 * @param config Level-specific configuration
 * @param maxSweepTime Maximum time for this sweep (based on remaining time budget)
 * @returns Array of source results (including failed ones)
 */
async function performEntropySweep(
  options: EntropyPoolOptions,
  config: EntropyLevelConfig,
  maxSweepTime: number
): Promise<SourceResult[]> {
  const sourcePromises: Promise<SourceResult>[] = [];

  /**
   * Timing source: Always available.
   * Request enough samples to contribute meaningfully toward target.
   */
  const timingSamples = Math.max(Math.ceil(config.targetBits / 4), 64);
  const timingTimeout = Math.min(
    options.timingOptions?.timeoutMs ?? 200,
    maxSweepTime
  );

  sourcePromises.push(
    collectFromTimingSource({
      ...options.timingOptions,
      sampleCount: timingSamples,
      timeoutMs: timingTimeout,
    })
  );

  /**
   * Crypto source: Available in modern browsers and Node.js.
   */
  if (isCryptoEntropyAvailable()) {
    const cryptoBytes = Math.max(Math.ceil(config.targetBits / 8), 16);
    const cryptoTimeout = Math.min(
      options.cryptoOptions?.timeoutMs ?? 100,
      maxSweepTime
    );

    sourcePromises.push(
      collectFromCryptoSource({
        ...options.cryptoOptions,
        byteCount: cryptoBytes,
        timeoutMs: cryptoTimeout,
      })
    );
  }

  /**
   * Wait for all sources to complete (or fail).
   */
  const settledResults = await Promise.allSettled(sourcePromises);

  const results: SourceResult[] = [];
  for (const result of settledResults) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    }
  }

  return results;
}

/**
 * Collects entropy from the timing source with error handling.
 */
async function collectFromTimingSource(
  options: TimingEntropyOptions
): Promise<SourceResult> {
  try {
    const result = await collectTimingEntropy(options);
    return {
      name: 'timing',
      bytes: result.bytes,
      estimatedBits: result.estimatedBits,
      success: true,
    };
  } catch {
    return {
      name: 'timing',
      bytes: new Uint8Array(0),
      estimatedBits: 0,
      success: false,
    };
  }
}

/**
 * Collects entropy from the crypto source with error handling.
 */
async function collectFromCryptoSource(
  options: CryptoEntropyOptions
): Promise<SourceResult> {
  try {
    const result = await collectCryptoEntropy(options);
    return {
      name: 'crypto',
      bytes: result.bytes,
      estimatedBits: result.estimatedBits,
      success: true,
    };
  } catch {
    return {
      name: 'crypto',
      bytes: new Uint8Array(0),
      estimatedBits: 0,
      success: false,
    };
  }
}

/**
 * Sleeps for the specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates an entropy seed from a Uint8Array.
 *
 * This is used by the debug API to provide manual entropy seeds
 * for deterministic replay of simulations.
 *
 * @param seed The seed bytes (should be at least 32 bytes)
 * @param outputBytes Desired output length
 * @returns Promise resolving to expanded seed bytes
 */
export async function fromSeed(
  seed: Uint8Array,
  outputBytes: number = 64
): Promise<Uint8Array> {
  /**
   * Mix the seed to ensure uniform distribution.
   * This handles cases where the seed might have biased bytes.
   */
  const mixed = await mixEntropy([seed]);

  /**
   * Expand to the requested size.
   */
  return expandEntropy(mixed, outputBytes);
}
