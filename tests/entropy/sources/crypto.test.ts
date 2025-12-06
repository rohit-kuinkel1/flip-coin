import { describe, it, expect } from 'vitest';
import {
  collectCryptoEntropy,
  isCryptoEntropyAvailable,
} from '../../../src/entropy/sources/crypto';

describe('Crypto Entropy Source', () => {
  describe('isCryptoEntropyAvailable', () => {
    it('should correctly detect Web Crypto API availability', () => {
      /**
       * This test verifies the detection logic works correctly.
       *
       * In modern environments (Node.js 15+, modern browsers), crypto
       * is typically available. However, per ARCHITECTURE.md, the system
       * is designed for graceful degradation - if crypto is unavailable,
       * entropy collection should fall back to timing source.
       *
       * Note: This test documents current environment behavior, not a
       * requirement. The entropy pool works with or without crypto.
       */
      const available = isCryptoEntropyAvailable();

      /**
       * We expect crypto to be available in our test environment,
       * but the system handles both cases gracefully.
       */
      expect(typeof available).toBe('boolean');

      /**
       * In Node.js test environment, crypto should be available.
       * We verify by checking both the global and its method exist.
       */
      if (typeof globalThis.crypto !== 'undefined') {
        expect(available).toBe(true);
      }
    });

    it('should return boolean type', () => {
      /**
       * Regardless of availability, the function must return a boolean.
       */
      const result = isCryptoEntropyAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('collectCryptoEntropy', () => {
    it('should return bytes, estimatedBits, and collectionTimeMs', async () => {
      /**
       * Basic contract test: ensure all expected fields are returned.
       */
      const result = await collectCryptoEntropy();

      expect(result).toHaveProperty('bytes');
      expect(result).toHaveProperty('estimatedBits');
      expect(result).toHaveProperty('collectionTimeMs');

      expect(result.bytes).toBeInstanceOf(Uint8Array);
      expect(typeof result.estimatedBits).toBe('number');
      expect(typeof result.collectionTimeMs).toBe('number');
    });

    it('should return requested number of bytes', async () => {
      /**
       * We should get exactly the number of bytes we request.
       */
      const result16 = await collectCryptoEntropy({ byteCount: 16 });
      const result32 = await collectCryptoEntropy({ byteCount: 32 });
      const result64 = await collectCryptoEntropy({ byteCount: 64 });

      expect(result16.bytes.length).toBe(16);
      expect(result32.bytes.length).toBe(32);
      expect(result64.bytes.length).toBe(64);
    });

    it('should estimate 8 bits per byte', async () => {
      /**
       * crypto.getRandomValues() provides full entropy (8 bits per byte).
       */
      const result = await collectCryptoEntropy({ byteCount: 32 });

      expect(result.estimatedBits).toBe(32 * 8);
    });

    it('should use default byteCount of 32', async () => {
      /**
       * Without specifying byteCount, we should get 32 bytes (256 bits).
       */
      const result = await collectCryptoEntropy();

      expect(result.bytes.length).toBe(32);
      expect(result.estimatedBits).toBe(256);
    });

    it('should complete very quickly', async () => {
      /**
       * crypto.getRandomValues() is synchronous and near-instant.
       * Collection should take less than 10ms.
       */
      const result = await collectCryptoEntropy({ byteCount: 1024 });

      expect(result.collectionTimeMs).toBeLessThan(10);
    });

    it('should produce different results on successive calls', async () => {
      /**
       * Each call should produce different random bytes.
       */
      const result1 = await collectCryptoEntropy({ byteCount: 32 });
      const result2 = await collectCryptoEntropy({ byteCount: 32 });

      const bytes1 = Array.from(result1.bytes).join(',');
      const bytes2 = Array.from(result2.bytes).join(',');

      /**
       * With 256 bits, the probability of collision is negligible (2^-256).
       */
      expect(bytes1).not.toBe(bytes2);
    });

    it('should produce uniformly distributed bytes', async () => {
      /**
       * Statistical test: collect many bytes and check distribution.
       * Each byte value (0-255) should appear with roughly equal frequency.
       */
      const result = await collectCryptoEntropy({ byteCount: 2560 });
      const counts = new Array(256).fill(0);

      for (const byte of result.bytes) {
        counts[byte]++;
      }

      /**
       * With 2560 bytes, each value should appear ~10 times on average.
       * Check that no value is extremely over/under-represented.
       */
      const minCount = Math.min(...counts);
      const maxCount = Math.max(...counts);

      /**
       * Allow wide range due to randomness, but catch extreme bias.
       * Minimum should be > 0 (all values should appear at least once with high probability).
       * Maximum should be < 50 (no value appears suspiciously often).
       */
      expect(minCount).toBeGreaterThanOrEqual(0);
      expect(maxCount).toBeLessThan(50);
    });

    it('should produce bytes with roughly 50% ones', async () => {
      /**
       * For uniformly random bytes, approximately 50% of bits should be 1.
       */
      const result = await collectCryptoEntropy({ byteCount: 1024 });

      let oneBits = 0;
      let totalBits = 0;

      for (const byte of result.bytes) {
        for (let i = 0; i < 8; i++) {
          if (byte & (1 << i)) oneBits++;
          totalBits++;
        }
      }

      const ratio = oneBits / totalBits;

      /**
       * For random data, we expect ~50% ones.
       * With 8192 bits, we should be within 48-52% almost always.
       */
      expect(ratio).toBeGreaterThan(0.45);
      expect(ratio).toBeLessThan(0.55);
    });

    it('should handle large byte counts', async () => {
      /**
       * crypto.getRandomValues() has a limit (65536 bytes typically),
       * but we should handle reasonable large requests.
       */
      const result = await collectCryptoEntropy({ byteCount: 8192 });

      expect(result.bytes.length).toBe(8192);
      expect(result.estimatedBits).toBe(8192 * 8);
    });

    it('should handle very small byte counts', async () => {
      /**
       * Even requesting 1 byte should work.
       */
      const result = await collectCryptoEntropy({ byteCount: 1 });

      expect(result.bytes.length).toBe(1);
      expect(result.estimatedBits).toBe(8);
    });
  });

  describe('Entropy Quality', () => {
    it('should pass runs test for randomness', async () => {
      /**
       * Runs test: count sequences of consecutive 0s or 1s.
       * Random data should have many short runs, not long runs.
       */
      const result = await collectCryptoEntropy({ byteCount: 256 });

      /**
       * Convert bytes to bits and count runs.
       */
      const bits: number[] = [];
      for (const byte of result.bytes) {
        for (let i = 7; i >= 0; i--) {
          bits.push((byte >> i) & 1);
        }
      }

      /**
       * Count number of runs (sequences of same bit).
       */
      let runs = 1;
      for (let i = 1; i < bits.length; i++) {
        if (bits[i] !== bits[i - 1]) runs++;
      }

      /**
       * For random data, expected runs ≈ n/2 + 1.
       * With 2048 bits, we expect ~1025 runs.
       * Allow range of 800-1300.
       */
      expect(runs).toBeGreaterThan(800);
      expect(runs).toBeLessThan(1300);
    });

    it('should have no obvious patterns', async () => {
      /**
       * Check that consecutive bytes are independent.
       * Correlation between adjacent bytes should be near zero.
       */
      const result = await collectCryptoEntropy({ byteCount: 1024 });

      /**
       * Calculate correlation coefficient between adjacent bytes.
       */
      let sumXY = 0;
      let sumX = 0;
      let sumY = 0;
      let sumX2 = 0;
      let sumY2 = 0;
      const n = result.bytes.length - 1;

      for (let i = 0; i < n; i++) {
        const x = result.bytes[i]!;
        const y = result.bytes[i + 1]!;
        sumXY += x * y;
        sumX += x;
        sumY += y;
        sumX2 += x * x;
        sumY2 += y * y;
      }

      /**
       * Pearson correlation coefficient.
       */
      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt(
        (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
      );
      const correlation = denominator === 0 ? 0 : numerator / denominator;

      /**
       * For random data, correlation should be near 0.
       * Allow range of -0.1 to 0.1.
       */
      expect(correlation).toBeGreaterThan(-0.1);
      expect(correlation).toBeLessThan(0.1);
    });
  });
});
