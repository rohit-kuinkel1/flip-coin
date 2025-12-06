/**
 * Hash-based entropy mixer using cryptographic functions.
 *
 * ## Purpose
 *
 * When collecting entropy from multiple sources (timer jitter, crypto API, audio noise, etc.),
 * we need a way to combine them that:
 * 1. Preserves all entropy from each source (no entropy loss)
 * 2. Produces uniformly distributed output (no bias)
 * 3. Hides the structure of individual inputs (defense in depth)
 *
 * ## Why Use a Cryptographic Hash?
 *
 * A cryptographic hash function like SHA-256 is ideal for entropy mixing because:
 *
 * - **Avalanche Effect**: Changing 1 bit of input changes ~50% of output bits.
 *   → Even weak entropy sources contribute meaningfully to the final mix.
 *
 * - **Uniform Distribution**: Output bits are statistically indistinguishable from random.
 *   → No bias even if some inputs are biased.
 *
 * - **One-Way Function**: Cannot reverse the hash to recover individual sources.
 *   → An attacker who compromises one source cannot predict the mix.
 *
 * - **Collision Resistance**: Extremely hard to find two inputs with the same hash.
 *   → Each unique combination of entropy produces a unique output.
 *
 * ## Entropy Accumulation Principle
 *
 * When mixing entropy sources, the total entropy is at least as much as the
 * highest-entropy source (and potentially more if sources are independent).
 *
 * Example:
 * - Source A: 64 bits of entropy
 * - Source B: 32 bits of entropy
 * - Mixed output: At least 64 bits, potentially up to 96 bits if independent
 *
 * This is why we always collect from ALL sources, even if one has high quality.
 *
 * ## Implementation
 *
 * We use SHA-256 from the Web Crypto API (available in browsers and Node.js 15+).
 * The mixing process:
 * 1. Concatenate all input buffers
 * 2. Hash the concatenation with SHA-256
 * 3. Return the 256-bit (32-byte) digest
 *
 * For cases where we need more than 256 bits, we use a counter mode:
 * → H(input || 0) || H(input || 1) || H(input || 2) || ...
 */

import { InsufficientEntropyBufferError } from './errors';

/**
 * Mixes multiple entropy sources into a single buffer using SHA-256.
 *
 * The mixing function concatenates all inputs and hashes them together,
 * producing a uniformly distributed 256-bit output.
 *
 * For entropy sources A, B, C:
 * → output = SHA-256(A || B || C)
 *
 * Where || denotes concatenation.
 *
 * Example:
 * → mixEntropy([timerBytes, cryptoBytes, audioBytes])
 * → Returns: 32-byte Uint8Array with mixed entropy
 *
 * @param sources Array of Uint8Array buffers from various entropy sources
 * @returns Promise resolving to a 32-byte Uint8Array of mixed entropy
 */
export async function mixEntropy(sources: Uint8Array[]): Promise<Uint8Array> {
  /**
   * Handle edge cases:
   * - No sources: Return empty array (caller should validate)
   * - Single source: Still hash it for uniform distribution
   */
  if (sources.length === 0) {
    return new Uint8Array(0);
  }

  /**
   * Calculate total length needed for the concatenated buffer.
   * This avoids multiple array resizes during concatenation.
   */
  const totalLength = sources.reduce((sum, source) => sum + source.length, 0);
  const concatenated = new Uint8Array(totalLength);

  /**
   * Concatenate all sources into a single buffer.
   * We use a running offset to place each source at the correct position.
   *
   * Example with 3 sources of lengths [8, 4, 16]:
   * → offset starts at 0
   * → copy source[0] (8 bytes) at position 0, offset becomes 8
   * → copy source[1] (4 bytes) at position 8, offset becomes 12
   * → copy source[2] (16 bytes) at position 12, offset becomes 28
   */
  let offset = 0;
  for (const source of sources) {
    concatenated.set(source, offset);
    offset += source.length;
  }

  /**
   * Hash the concatenated buffer using SHA-256.
   *
   * The Web Crypto API is available in:
   * - Browsers: window.crypto.subtle
   * - Node.js 15+: globalThis.crypto.subtle (with --experimental-global-webcrypto in older versions)
   *
   * SHA-256 produces a 256-bit (32-byte) digest.
   */
  const hashBuffer = await crypto.subtle.digest('SHA-256', concatenated);

  return new Uint8Array(hashBuffer);
}

/**
 * Expands mixed entropy to a larger size using counter mode.
 *
 * When we need more than 256 bits (32 bytes) of output, we use a
 * counter mode construction similar to HKDF-Expand:
 *
 * → output = H(seed || 0x00) || H(seed || 0x01) || H(seed || 0x02) || ...
 *
 * This is cryptographically secure as long as the seed has sufficient entropy.
 * Each 32-byte block is independent and uniformly distributed.
 *
 * Example: Expand 32-byte seed to 64 bytes
 * → block0 = SHA-256(seed || 0x00) = 32 bytes
 * → block1 = SHA-256(seed || 0x01) = 32 bytes
 * → output = block0 || block1 = 64 bytes
 *
 * @param seed The mixed entropy seed (should be at least 32 bytes for security)
 * @param outputLength Desired output length in bytes
 * @returns Promise resolving to a Uint8Array of the requested length
 */
export async function expandEntropy(
  seed: Uint8Array,
  outputLength: number
): Promise<Uint8Array> {
  /**
   * Calculate how many 32-byte blocks we need.
   * Round up to ensure we generate enough bytes.
   *
   * Example: outputLength = 50
   * → blocks = ceil(50 / 32) = ceil(1.5625) = 2
   * → We'll generate 64 bytes, then truncate to 50
   */
  const blockSize = 32;
  const blocksNeeded = Math.ceil(outputLength / blockSize);

  const output = new Uint8Array(blocksNeeded * blockSize);

  /**
   * Generate each block by hashing seed || counter.
   * The counter is a single byte, limiting us to 256 blocks (8192 bytes).
   * This is sufficient for our use case (initial conditions need ~64-128 bytes).
   */
  for (let i = 0; i < blocksNeeded; i++) {
    /**
     * Create input buffer: seed || counter
     * The counter ensures each block is different even with the same seed.
     */
    const input = new Uint8Array(seed.length + 1);
    input.set(seed, 0);
    input[seed.length] = i;

    const blockHash = await crypto.subtle.digest('SHA-256', input);
    output.set(new Uint8Array(blockHash), i * blockSize);
  }

  /**
   * Truncate to the exact requested length.
   * The extra bytes (if any) are discarded.
   */
  return output.slice(0, outputLength);
}

/**
 * Converts a buffer of random bytes to a floating-point number in [0, 1).
 *
 * This is used to convert entropy bytes into usable random numbers for
 * physics initial conditions (position, velocity, angles, etc.).
 *
 * We use 32 bits (4 bytes) for simplicity and to avoid floating-point
 * edge cases. While 53 bits would give more precision, the division
 * (2^53-1)/2^53 can round to exactly 1.0 in JavaScript, breaking the
 * [0, 1) contract.
 *
 * Algorithm:
 * 1. Read 4 bytes as a 32-bit unsigned integer
 * 2. Divide by 2^32 to get a value in [0, 1)
 *
 * The maximum value is (2^32 - 1) / 2^32 ≈ 0.99999999976...
 * which is safely less than 1.0.
 *
 * Example:
 * → bytes = [0xFF, 0xFF, 0xFF, 0xFF]
 * → value = 4294967295
 * → result = 4294967295 / 4294967296 ≈ 0.9999999998
 *
 * @param buffer Random bytes (at least 4 bytes needed for one float)
 * @param offset Starting position in the buffer
 * @returns A floating-point number uniformly distributed in [0, 1)
 */
export function bytesToFloat(buffer: Uint8Array, offset: number = 0): number {
  /**
   * We need 4 bytes to build a 32-bit unsigned integer.
   */
  if (buffer.length < offset + 4) {
    throw new InsufficientEntropyBufferError(4, buffer.length - offset);
  }

  /**
   * Build a 32-bit unsigned integer from 4 bytes (little-endian).
   *
   * Example: bytes [0x12, 0x34, 0x56, 0x78]
   * → value = 0x12 + 0x34*256 + 0x56*65536 + 0x78*16777216
   * → value = 18 + 13312 + 5636096 + 2013265920 = 2018915346
   */
  const value =
    buffer[offset]! +
    buffer[offset + 1]! * 0x100 +
    buffer[offset + 2]! * 0x10000 +
    buffer[offset + 3]! * 0x1000000;

  /**
   * Divide by 2^32 to normalize to [0, 1).
   * 2^32 = 4294967296
   *
   * Maximum possible value: (2^32 - 1) / 2^32 = 0.9999999997671694...
   * This is safely less than 1.0 with no rounding issues.
   */
  return value / 4294967296;
}

/**
 * Converts entropy bytes to a floating-point number in a specified range.
 *
 * This is a convenience function that maps [0, 1) to [min, max).
 *
 * Formula:
 * → result = min + (max - min) × bytesToFloat(buffer, offset)
 *
 * Example: Range [0.3, 0.5] for initial height
 * → bytesToFloat returns 0.75
 * → result = 0.3 + (0.5 - 0.3) × 0.75 = 0.3 + 0.15 = 0.45
 *
 * @param buffer Random bytes
 * @param offset Starting position in the buffer
 * @param min Minimum value (inclusive)
 * @param max Maximum value (exclusive)
 * @returns A floating-point number uniformly distributed in [min, max)
 */
export function bytesToFloatRange(
  buffer: Uint8Array,
  offset: number,
  min: number,
  max: number
): number {
  return min + (max - min) * bytesToFloat(buffer, offset);
}
