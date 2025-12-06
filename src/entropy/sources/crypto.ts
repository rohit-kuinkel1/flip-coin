/**
 * Operating system entropy source via Web Crypto API.
 *
 * ## What is crypto.getRandomValues()?
 *
 * The Web Crypto API provides access to the operating system's cryptographic
 * random number generator (CSPRNG). This is the same entropy source used for:
 *
 * - TLS/SSL key generation
 * - Disk encryption keys
 * - Password hashing salts
 * - Session tokens
 *
 * On different platforms, the underlying source is:
 * - Linux: `/dev/urandom` (seeded from hardware RNG, interrupts, etc.)
 * - Windows: `BCryptGenRandom` (CNG)
 * - macOS: `SecRandomCopyBytes`
 * - Node.js: Uses OpenSSL's CSPRNG
 *
 * ## Entropy Quality: 4/5
 *
 * The OS CSPRNG is considered high quality because:
 * 1. It's seeded from multiple hardware entropy sources
 * 2. It's continuously re-seeded during system operation
 * 3. It uses cryptographically secure algorithms (typically ChaCha20 or AES-CTR)
 * 4. It's the same source trusted for TLS key generation
 *
 * We rate it 4/5 (not 5/5) because:
 * - It's ultimately a DRBG (deterministic random bit generator), not true randomness
 * - In VMs or containers, entropy pool quality can degrade
 * - Immediately after boot, the pool may not be fully seeded
 *
 * ## Why Use This Despite Being a PRNG?
 *
 * While `crypto.getRandomValues()` is technically a PRNG, it's seeded from
 * true entropy sources (hardware RNG, interrupt timing, etc.). The seeding
 * happens continuously and is managed by the OS, making it effectively
 * unpredictable even with source code access.
 *
 * We include it as a primary entropy source because:
 * - It's always available (browser and Node.js)
 * - It's fast (microseconds per call)
 * - It's audited and maintained
 * - Combined with other sources, it increases total entropy
 *
 * ## Availability
 *
 * Available in all modern environments:
 * - Browsers: All modern browsers (IE 11+, all evergreen browsers)
 * - Node.js: Built-in since Node 15, crypto module before that
 */

import type { CryptoEntropyResult } from '../types/CryptoEntropyResult';
import type { CryptoEntropyOptions } from '../types/CryptoEntropyOptions';

/**
 * Default configuration values.
 */
const DEFAULT_BYTE_COUNT = 32;
const DEFAULT_TIMEOUT_MS = 100;

/**
 * Collects entropy from the operating system's CSPRNG.
 *
 * This is typically the fastest and most reliable entropy source.
 * The OS handles all the complexity of gathering hardware entropy,
 * maintaining entropy pools, and ensuring cryptographic quality.
 *
 * Example:
 * → collectCryptoEntropy({ byteCount: 32 })
 * → Returns 32 bytes with 256 bits of estimated entropy
 *
 * @param options Configuration options
 * @returns Promise resolving to CryptoEntropyResult
 * @throws Error if crypto API is unavailable or timeout exceeded
 */
export async function collectCryptoEntropy(
  options: CryptoEntropyOptions = {}
): Promise<CryptoEntropyResult> {
  const byteCount = options.byteCount ?? DEFAULT_BYTE_COUNT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const startTime = performance.now();

  if (!isCryptoEntropyAvailable()) {
    throw new Error('Web Crypto API (crypto.getRandomValues) is not available');
  }

  /**
   * Use a timeout wrapper to prevent blocking if something goes wrong.
   * In practice, getRandomValues is synchronous and instant, but we
   * wrap it in a promise for consistency with other entropy sources.
   */
  const result = await withTimeout(
    async () => {
      const buffer = new Uint8Array(byteCount);
      crypto.getRandomValues(buffer);
      return buffer;
    },
    timeoutMs,
    'Crypto entropy collection timed out'
  );

  const endTime = performance.now();

  return {
    bytes: result,
    /**
     * We assume full entropy for crypto.getRandomValues().
     * Each byte has 8 bits of entropy (uniformly distributed 0-255).
     */
    estimatedBits: byteCount * 8,
    collectionTimeMs: endTime - startTime,
  };
}

/**
 * Checks if the crypto entropy source is available.
 *
 * This allows callers to gracefully skip this source if unavailable,
 * rather than catching exceptions.
 *
 * @returns true if crypto.getRandomValues is available
 */
export function isCryptoEntropyAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function';
}

/**
 * Wraps a promise with a timeout.
 *
 * If the promise doesn't resolve within the timeout, the returned promise
 * rejects with the given error message.
 *
 * This is used to prevent entropy collection from blocking indefinitely.
 *
 * @param fn Async function to execute
 * @param timeoutMs Maximum time to wait
 * @param errorMessage Error message if timeout exceeded
 * @returns Promise that resolves with fn's result or rejects on timeout
 */
function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    fn()
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
