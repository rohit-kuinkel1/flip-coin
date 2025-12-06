/**
 * High-resolution timer jitter entropy source.
 *
 * ## What is Timer Jitter?
 *
 * When you call `performance.now()` multiple times in rapid succession, the
 * time differences are not perfectly predictable. Tiny variations occur due to:
 *
 * - CPU scheduling: Other processes interrupt execution unpredictably
 * - Hardware interrupts: Network, disk, USB activity causes delays
 * - Cache effects: Memory access patterns vary
 * - Thermal throttling: CPU speed adjusts based on temperature
 * - Power management: Voltage/frequency scaling
 *
 * These variations, while small (microseconds or less), are genuinely random
 * from an information-theoretic perspective. An attacker cannot predict them
 * even with full knowledge of the system's software state.
 *
 * ## How We Extract Entropy
 *
 * The technique:
 * 1. Perform a small amount of "chaotic" work (memory operations)
 * 2. Measure how long it took with high-resolution timer
 * 3. Extract the least significant bits of the timing
 * 4. Repeat many times and accumulate
 *
 * The least significant bits (microseconds, nanoseconds) are the most
 * unpredictable because they're dominated by hardware noise rather than
 * the deterministic work we're performing.
 *
 * ## Entropy Quality
 *
 * Timer jitter provides approximately 1-4 bits of entropy per sample,
 * depending on system load and timer resolution. We conservatively estimate
 * ~1 bit per sample, meaning:
 *
 * → 64 bits of entropy ≈ 64 samples
 * → 256 bits of entropy ≈ 256 samples
 *
 * This is slower than `crypto.getRandomValues()` but has the advantage of
 * being based on observable physical phenomena rather than a DRBG.
 *
 * ## Availability
 *
 * This source is ALWAYS available:
 * - Browser: `performance.now()` (high-resolution timer)
 * - Node.js: `process.hrtime()` or `performance.now()`
 *
 * This makes it the fallback source when other sources are unavailable.
 *
 * ## Security Considerations
 *
 * Timer jitter alone should not be relied upon for cryptographic purposes.
 * In virtual machines or heavily loaded systems, the jitter may be more
 * predictable. However, as one of several entropy sources being mixed
 * together, it provides valuable additional randomness.
 */

import type { TimingEntropyResult } from '../types/TimingEntropyResult';
import type { TimingEntropyOptions } from '../types/TimingEntropyOptions';

/**
 * Default configuration values.
 */
const DEFAULT_SAMPLE_COUNT = 256;
const DEFAULT_TIMEOUT_MS = 200;

/**
 * Collects entropy from high-resolution timer jitter.
 *
 * The collection process:
 * 1. Perform chaotic memory operations to induce timing variance
 * 2. Measure the elapsed time with `performance.now()`
 * 3. Extract the fractional part (sub-millisecond precision)
 * 4. Pack the least significant bits into output bytes
 *
 * Example:
 * → collectTimingEntropy({ sampleCount: 64 })
 * → Returns ~8 bytes with ~64 bits of estimated entropy
 *
 * @param options Configuration options
 * @returns Promise resolving to TimingEntropyResult
 */
export async function collectTimingEntropy(
  options: TimingEntropyOptions = {}
): Promise<TimingEntropyResult> {
  const sampleCount = options.sampleCount ?? DEFAULT_SAMPLE_COUNT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const startTime = performance.now();

  /**
   * We'll collect timing samples and pack them into bytes.
   * Each sample contributes ~1 bit of entropy, but we collect
   * 8 samples per byte to be conservative.
   */
  const outputBytes = Math.ceil(sampleCount / 8);
  const output = new Uint8Array(outputBytes);

  /**
   * Chaotic buffer used to induce timing jitter.
   * Memory access patterns affect CPU cache behavior,
   * introducing unpredictable timing variations.
   */
  const chaoticBuffer = new Uint8Array(1024);
  let chaoticIndex = 0;

  let samplesCollected = 0;
  let currentByte = 0;
  let bitPosition = 0;
  let byteIndex = 0;

  /**
   * Collect timing samples until we reach our target or timeout.
   */
  while (samplesCollected < sampleCount) {
    /**
     * Check timeout to prevent blocking for too long.
     */
    const elapsed = performance.now() - startTime;
    if (elapsed > timeoutMs) {
      break;
    }

    /**
     * Perform chaotic work to induce timing jitter.
     * The work itself is deterministic, but the TIME it takes varies.
     */
    const jitterStart = performance.now();
    chaoticIndex = performChaoticWork(chaoticBuffer, chaoticIndex);
    const jitterEnd = performance.now();

    /**
     * Extract entropy from the timing measurement.
     *
     * We use the fractional part of the timing (sub-millisecond precision).
     * In browsers, performance.now() typically has microsecond resolution.
     *
     * Example:
     * → jitterDelta = 0.00234567 ms
     * → fractional = 0.00234567
     * → scaled = 234567 (approximate)
     * → We extract the least significant bit
     */
    const jitterDelta = jitterEnd - jitterStart;
    const entropyBit = extractEntropyBit(jitterDelta);

    /**
     * Pack extracted bits into output bytes.
     * We fill each byte with 8 bits before moving to the next.
     */
    currentByte = (currentByte << 1) | entropyBit;
    bitPosition++;

    if (bitPosition === 8) {
      if (byteIndex < outputBytes) {
        output[byteIndex] = currentByte;
        byteIndex++;
      }
      currentByte = 0;
      bitPosition = 0;
    }

    samplesCollected++;

    /**
     * Yield to the event loop periodically to keep the page responsive.
     * This also introduces additional timing unpredictability.
     */
    if (samplesCollected % 64 === 0) {
      await yieldToEventLoop();
    }
  }

  /**
   * Handle any remaining bits in the current byte.
   */
  if (bitPosition > 0 && byteIndex < outputBytes) {
    output[byteIndex] = currentByte << (8 - bitPosition);
  }

  const endTime = performance.now();

  return {
    bytes: output.slice(0, Math.ceil(samplesCollected / 8)),
    estimatedBits: samplesCollected,
    collectionTimeMs: endTime - startTime,
  };
}

/**
 * Performs chaotic memory operations to induce timing jitter.
 *
 * The operations are designed to:
 * - Access memory in a pattern that defeats CPU prefetching
 * - Perform enough work to be measurable but not too slow
 * - Be deterministic in result but not in timing
 *
 * The exact timing depends on:
 * - CPU cache hits/misses
 * - Memory bus contention
 * - Other processes competing for CPU
 *
 * @param buffer Working buffer for memory operations
 * @param startIndex Starting position for operations
 * @returns New index for next iteration
 */
function performChaoticWork(buffer: Uint8Array, startIndex: number): number {
  /**
   * XOR-based scrambling with cache-defeating access pattern.
   *
   * We use indices that jump around the buffer to cause cache misses.
   * The XOR operations are cheap but the memory access timing varies.
   */
  let index = startIndex;
  const len = buffer.length;

  for (let i = 0; i < 16; i++) {
    /**
     * Access pattern that jumps around the buffer.
     * The multiplier 73 is chosen to create a pseudo-random access pattern
     * (it's coprime to typical buffer sizes).
     */
    const target = (index * 73 + 17) % len;
    buffer[target] = buffer[target]! ^ buffer[index]! ^ (i & 0xff);
    index = target;
  }

  return index;
}

/**
 * Extracts a single bit of entropy from a timing measurement.
 *
 * We focus on the least significant bits of the timing, which are
 * dominated by hardware noise rather than the deterministic work.
 *
 * Approach:
 * 1. Multiply by a large factor to amplify sub-millisecond precision
 * 2. Take the XOR of several bit positions for whitening
 * 3. Return the final bit
 *
 * Example:
 * → delta = 0.00234567 ms
 * → scaled = 234567 (approximately)
 * → bit0 = 1, bit1 = 1, bit2 = 1, ...
 * → XOR of bits = 1 (for example)
 *
 * @param deltaMs Time difference in milliseconds
 * @returns 0 or 1
 */
function extractEntropyBit(deltaMs: number): number {
  /**
   * Scale to amplify the fractional precision.
   * 1e9 captures nanosecond-level timing if available.
   */
  const scaled = Math.floor(deltaMs * 1e9);

  /**
   * XOR multiple bit positions for "whitening".
   * This helps remove any bias in individual bit positions.
   */
  const bit0 = scaled & 1;
  const bit1 = (scaled >> 1) & 1;
  const bit2 = (scaled >> 2) & 1;
  const bit3 = (scaled >> 3) & 1;

  return bit0 ^ bit1 ^ bit2 ^ bit3;
}

/**
 * Yields execution to the event loop.
 *
 * This is used to:
 * 1. Keep the page responsive during entropy collection
 * 2. Introduce additional timing unpredictability from event loop scheduling
 *
 * Using setTimeout(0) yields to the macrotask queue, which introduces
 * jitter from the JavaScript runtime's task scheduling.
 */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
