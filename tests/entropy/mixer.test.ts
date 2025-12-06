import { describe, it, expect } from 'vitest';
import {
  mixEntropy,
  expandEntropy,
  bytesToFloat,
  bytesToFloatRange,
} from '../../src/entropy/mixer';

describe('Entropy Mixer', () => {
  describe('mixEntropy', () => {
    it('should return empty array for empty input', async () => {
      /**
       * Edge case: No entropy sources provided.
       * The caller should validate this, but we handle it gracefully.
       */
      const result = await mixEntropy([]);
      expect(result.length).toBe(0);
    });

    it('should return 32 bytes (SHA-256 output) for non-empty input', async () => {
      /**
       * SHA-256 always produces a 256-bit (32-byte) digest,
       * regardless of input size.
       */
      const input = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await mixEntropy([input]);

      expect(result.length).toBe(32);
    });

    it('should produce different output for different inputs', async () => {
      /**
       * The avalanche effect of SHA-256 means even small input
       * changes produce completely different outputs.
       *
       * Changing a single bit should change ~50% of output bits.
       */
      const input1 = new Uint8Array([1, 2, 3, 4, 5]);
      const input2 = new Uint8Array([1, 2, 3, 4, 6]);

      const result1 = await mixEntropy([input1]);
      const result2 = await mixEntropy([input2]);

      /**
       * Compare the results byte by byte.
       * They should be completely different due to avalanche effect.
       */
      let equalBytes = 0;
      for (let i = 0; i < 32; i++) {
        if (result1[i] === result2[i]) equalBytes++;
      }

      /**
       * With proper avalanche, we expect ~0-2 equal bytes by chance.
       * If more than 8 bytes match, something is wrong.
       */
      expect(equalBytes).toBeLessThan(8);
    });

    it('should produce same output for same input', async () => {
      /**
       * SHA-256 is deterministic: same input always produces same output.
       * This is important for reproducibility in debug mode.
       */
      const input = new Uint8Array([10, 20, 30, 40, 50]);

      const result1 = await mixEntropy([input]);
      const result2 = await mixEntropy([input]);

      expect(result1).toEqual(result2);
    });

    it('should mix multiple sources correctly', async () => {
      /**
       * When mixing multiple sources, the output depends on ALL inputs.
       * Changing any source should change the output completely.
       */
      const source1 = new Uint8Array([1, 2, 3]);
      const source2 = new Uint8Array([4, 5, 6]);
      const source3 = new Uint8Array([7, 8, 9]);

      const resultAll = await mixEntropy([source1, source2, source3]);
      const resultPartial = await mixEntropy([source1, source2]);

      expect(resultAll.length).toBe(32);
      expect(resultPartial.length).toBe(32);
      expect(resultAll).not.toEqual(resultPartial);
    });

    it('should handle large inputs', async () => {
      /**
       * SHA-256 can handle inputs of any size.
       * We test with a large buffer to ensure no issues.
       */
      const largeInput = new Uint8Array(10000);
      for (let i = 0; i < largeInput.length; i++) {
        largeInput[i] = i % 256;
      }

      const result = await mixEntropy([largeInput]);

      expect(result.length).toBe(32);
    });

    it('should be order-dependent', async () => {
      /**
       * Concatenating A || B is different from B || A.
       * The hash of different concatenations should be different.
       */
      const source1 = new Uint8Array([1, 2, 3]);
      const source2 = new Uint8Array([4, 5, 6]);

      const result1 = await mixEntropy([source1, source2]);
      const result2 = await mixEntropy([source2, source1]);

      expect(result1).not.toEqual(result2);
    });
  });

  describe('expandEntropy', () => {
    it('should return requested number of bytes', async () => {
      /**
       * Expansion should produce exactly the requested output length.
       */
      const seed = new Uint8Array(32);
      for (let i = 0; i < 32; i++) seed[i] = i;

      const result16 = await expandEntropy(seed, 16);
      const result64 = await expandEntropy(seed, 64);
      const result100 = await expandEntropy(seed, 100);

      expect(result16.length).toBe(16);
      expect(result64.length).toBe(64);
      expect(result100.length).toBe(100);
    });

    it('should produce deterministic output for same seed', async () => {
      /**
       * Same seed should always produce same expanded output.
       * This enables deterministic replay in debug mode.
       */
      const seed = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

      const result1 = await expandEntropy(seed, 64);
      const result2 = await expandEntropy(seed, 64);

      expect(result1).toEqual(result2);
    });

    it('should produce different output for different seeds', async () => {
      /**
       * Different seeds should produce different outputs.
       */
      const seed1 = new Uint8Array([1, 2, 3, 4]);
      const seed2 = new Uint8Array([1, 2, 3, 5]);

      const result1 = await expandEntropy(seed1, 64);
      const result2 = await expandEntropy(seed2, 64);

      expect(result1).not.toEqual(result2);
    });

    it('should produce independent blocks', async () => {
      /**
       * When we expand to more than 32 bytes, each 32-byte block
       * should be independent (derived from different counter values).
       */
      const seed = new Uint8Array(32);
      seed[0] = 42;

      const result = await expandEntropy(seed, 64);

      /**
       * First 32 bytes (block 0) should differ from second 32 bytes (block 1).
       */
      const block0 = result.slice(0, 32);
      const block1 = result.slice(32, 64);

      expect(block0).not.toEqual(block1);
    });

    it('should handle small output requests', async () => {
      /**
       * When requesting less than 32 bytes, we truncate the output.
       */
      const seed = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

      const result8 = await expandEntropy(seed, 8);
      const result32 = await expandEntropy(seed, 32);

      expect(result8.length).toBe(8);
      expect(result32.length).toBe(32);

      /**
       * The 8-byte output should be the prefix of the 32-byte output.
       */
      expect(result8).toEqual(result32.slice(0, 8));
    });
  });

  describe('bytesToFloat', () => {
    it('should return a value in [0, 1)', () => {
      /**
       * The output should always be in the half-open interval [0, 1).
       */
      const buffer = new Uint8Array([0, 0, 0, 0]);
      const result = bytesToFloat(buffer);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });

    it('should return 0 for all-zero input', () => {
      /**
       * All zeros should produce 0.0.
       */
      const buffer = new Uint8Array([0, 0, 0, 0]);
      const result = bytesToFloat(buffer);

      expect(result).toBe(0);
    });

    it('should return value close to 1 for all-255 input', () => {
      /**
       * All 255s should produce a value very close to (but less than) 1.
       */
      const buffer = new Uint8Array([255, 255, 255, 255]);
      const result = bytesToFloat(buffer);

      expect(result).toBeGreaterThan(0.999);
      expect(result).toBeLessThan(1);
    });

    it('should produce different values for different inputs', () => {
      /**
       * Different byte patterns should produce different floats.
       */
      const buffer1 = new Uint8Array([1, 2, 3, 4]);
      const buffer2 = new Uint8Array([4, 3, 2, 1]);

      const result1 = bytesToFloat(buffer1);
      const result2 = bytesToFloat(buffer2);

      expect(result1).not.toBe(result2);
    });

    it('should use offset parameter correctly', () => {
      /**
       * The offset should allow reading from different positions.
       */
      const buffer = new Uint8Array([0, 0, 0, 0, 1, 2, 3, 4]);

      const result0 = bytesToFloat(buffer, 0);
      const result4 = bytesToFloat(buffer, 4);

      expect(result0).toBe(0);
      expect(result4).not.toBe(0);
    });

    it('should throw for insufficient bytes', () => {
      /**
       * We need at least 4 bytes to build a 32-bit integer.
       */
      const buffer = new Uint8Array([1, 2, 3]);

      expect(() => bytesToFloat(buffer)).toThrow();
    });

    it('should throw when offset leaves insufficient bytes', () => {
      /**
       * Offset + 4 must not exceed buffer length.
       */
      const buffer = new Uint8Array([1, 2, 3, 4, 5]);

      expect(() => bytesToFloat(buffer, 2)).toThrow();
    });
  });

  describe('bytesToFloatRange', () => {
    it('should map [0,1) to [min, max)', () => {
      /**
       * All-zero input should map to min.
       * All-255 input should map close to max.
       */
      const zeros = new Uint8Array([0, 0, 0, 0]);
      const ones = new Uint8Array([255, 255, 255, 255]);

      const min = 10;
      const max = 20;

      const resultMin = bytesToFloatRange(zeros, 0, min, max);
      const resultMax = bytesToFloatRange(ones, 0, min, max);

      expect(resultMin).toBe(min);
      expect(resultMax).toBeGreaterThan(19.9);
      expect(resultMax).toBeLessThan(max);
    });

    it('should handle negative ranges', () => {
      /**
       * Should work correctly with negative min/max values.
       */
      const buffer = new Uint8Array([128, 0, 0, 0]);

      const result = bytesToFloatRange(buffer, 0, -10, 10);

      expect(result).toBeGreaterThan(-10);
      expect(result).toBeLessThan(10);
    });

    it('should handle fractional ranges', () => {
      /**
       * Should work with small fractional ranges like [0.3, 0.5].
       */
      const zeros = new Uint8Array([0, 0, 0, 0]);
      const ones = new Uint8Array([255, 255, 255, 255]);

      const resultMin = bytesToFloatRange(zeros, 0, 0.3, 0.5);
      const resultMax = bytesToFloatRange(ones, 0, 0.3, 0.5);

      expect(resultMin).toBeCloseTo(0.3, 10);
      expect(resultMax).toBeGreaterThan(0.499);
      expect(resultMax).toBeLessThan(0.5);
    });
  });

  describe('Distribution Tests', () => {
    it('should produce roughly uniform distribution for bytesToFloat', async () => {
      /**
       * Statistical test: Generate many random floats and check
       * that they're roughly uniformly distributed.
       *
       * We use chi-squared test logic: divide [0,1) into 10 buckets
       * and check that each bucket gets roughly 10% of values.
       */
      const buckets = new Array(10).fill(0);
      const iterations = 1000;

      /**
       * Generate random bytes using SHA-256 to ensure good distribution.
       */
      for (let i = 0; i < iterations; i++) {
        const input = new Uint8Array([i & 255, (i >> 8) & 255, 0, 0, 0, 0, 0, 0]);
        const hash = await mixEntropy([input]);
        const value = bytesToFloat(hash, 0);

        const bucket = Math.floor(value * 10);
        buckets[Math.min(bucket, 9)]++;
      }

      /**
       * Each bucket should have roughly 100 values (10% of 1000).
       * Allow significant deviation for randomness.
       */
      for (let i = 0; i < 10; i++) {
        expect(buckets[i]).toBeGreaterThan(50);
        expect(buckets[i]).toBeLessThan(150);
      }
    });
  });
});
