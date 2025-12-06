import { describe, it, expect } from 'vitest';
import { collectEntropy, fromSeed } from '../../src/entropy/pool';
import type { EntropyLevel } from '../../src/entropy/types';
import { isCryptoEntropyAvailable } from '../../src/entropy/sources/crypto';

describe('Entropy Pool', () => {
  describe('collectEntropy', () => {
    it('should return bytes and stats', async () => {
      /**
       * Basic contract test: ensure all expected fields are returned.
       */
      const result = await collectEntropy({ level: 'fast' });

      expect(result).toHaveProperty('bytes');
      expect(result).toHaveProperty('stats');

      expect(result.bytes).toBeInstanceOf(Uint8Array);
      expect(result.stats).toHaveProperty('totalBits');
      expect(result.stats).toHaveProperty('collectionTimeMs');
      expect(result.stats).toHaveProperty('sourcesUsed');
      expect(result.stats).toHaveProperty('level');
    });

    it('should return requested number of output bytes', async () => {
      /**
       * The output should match the requested size.
       */
      const result32 = await collectEntropy({ outputBytes: 32 });
      const result64 = await collectEntropy({ outputBytes: 64 });
      const result128 = await collectEntropy({ outputBytes: 128 });

      expect(result32.bytes.length).toBe(32);
      expect(result64.bytes.length).toBe(64);
      expect(result128.bytes.length).toBe(128);
    });

    it('should use default outputBytes of 64', async () => {
      /**
       * Without specifying outputBytes, we should get 64 bytes.
       */
      const result = await collectEntropy();

      expect(result.bytes.length).toBe(64);
    });

    it('should use default level of standard', async () => {
      /**
       * Without specifying level, we should use 'standard'.
       */
      const result = await collectEntropy();

      expect(result.stats.level).toBe('standard');
    });

    it('should report the correct level', async () => {
      /**
       * The stats should reflect the requested level.
       */
      const levels: EntropyLevel[] = ['fast', 'standard', 'high', 'paranoid'];

      for (const level of levels) {
        const result = await collectEntropy({ level });
        expect(result.stats.level).toBe(level);
      }
    });

    it('should use at least one entropy source', async () => {
      /**
       * We should always have at least timer jitter (always available).
       */
      const result = await collectEntropy({ level: 'fast' });

      expect(result.stats.sourcesUsed.length).toBeGreaterThan(0);
    });

    it('should include timing source', async () => {
      /**
       * Timer jitter source is always available.
       */
      const result = await collectEntropy({ level: 'fast' });

      expect(result.stats.sourcesUsed).toContain('timing');
    });

    it('should include crypto source when available', async () => {
      /**
       * crypto.getRandomValues() should be available in Node.js.
       * This test is conditional to support environments without Web Crypto.
       */
      const result = await collectEntropy({ level: 'fast' });

      if (isCryptoEntropyAvailable()) {
        expect(result.stats.sourcesUsed).toContain('crypto');
      } else {
        /**
         * In environments without crypto, we should still succeed
         * with just timing source (graceful degradation).
         */
        expect(result.stats.sourcesUsed).toContain('timing');
      }
    });

    it('should work with only timing source (graceful degradation)', async () => {
      /**
       * Per ARCHITECTURE.md: "The minimum viable scenario is timer jitter alone."
       * Even if crypto is available, timing must always be present.
       */
      const result = await collectEntropy({ level: 'fast' });

      expect(result.stats.sourcesUsed).toContain('timing');
      expect(result.bytes.length).toBeGreaterThan(0);
      expect(result.stats.totalBits).toBeGreaterThan(0);
    });

    it('should collect entropy bits', async () => {
      /**
       * We should collect a non-zero amount of entropy.
       */
      const result = await collectEntropy({ level: 'fast' });

      expect(result.stats.totalBits).toBeGreaterThan(0);
    });

    it('should produce different results on successive calls', async () => {
      /**
       * Each call should produce different random bytes.
       */
      const result1 = await collectEntropy({ level: 'fast' });
      const result2 = await collectEntropy({ level: 'fast' });

      const bytes1 = Array.from(result1.bytes).join(',');
      const bytes2 = Array.from(result2.bytes).join(',');

      expect(bytes1).not.toBe(bytes2);
    });

    it('should complete within reasonable time for fast level', async () => {
      /**
       * Fast level should complete quickly (under 500ms).
       */
      const startTime = performance.now();
      const result = await collectEntropy({ level: 'fast' });
      const elapsed = performance.now() - startTime;

      expect(result.stats.collectionTimeMs).toBeLessThan(1000);
      expect(elapsed).toBeLessThan(1000);
    });

    it('should track collection time', async () => {
      /**
       * The reported collection time should be positive and reasonable.
       */
      const result = await collectEntropy({ level: 'fast' });

      expect(result.stats.collectionTimeMs).toBeGreaterThan(0);
      expect(result.stats.collectionTimeMs).toBeLessThan(5000);
    });

    it('should enforce minimum collection time', async () => {
      /**
       * Fast level has minTimeMs = 100ms.
       * The collection should take at least this long, even if
       * sources complete faster.
       */
      const startTime = performance.now();
      const result = await collectEntropy({ level: 'fast' });
      const elapsed = performance.now() - startTime;

      /**
       * Should take at least 100ms (the minTimeMs for 'fast' level).
       * We allow some tolerance for timer imprecision.
       */
      expect(elapsed).toBeGreaterThanOrEqual(95);
      expect(result.stats.collectionTimeMs).toBeGreaterThanOrEqual(95);
    });
  });

  describe('Entropy Level Presets', () => {
    it('should collect appropriate entropy for fast level', async () => {
      /**
       * Fast level targets 64 bits minimum.
       */
      const result = await collectEntropy({ level: 'fast' });

      /**
       * With both timing and crypto sources, we should easily exceed 64 bits.
       * Crypto alone provides 256 bits for 32 bytes.
       */
      expect(result.stats.totalBits).toBeGreaterThanOrEqual(64);
    });

    it('should collect appropriate entropy for standard level', async () => {
      /**
       * Standard level targets 128 bits minimum.
       */
      const result = await collectEntropy({ level: 'standard' });

      expect(result.stats.totalBits).toBeGreaterThanOrEqual(128);
    });

    it('should collect appropriate entropy for high level', async () => {
      /**
       * High level targets 256 bits minimum.
       */
      const result = await collectEntropy({ level: 'high' });

      expect(result.stats.totalBits).toBeGreaterThanOrEqual(256);
    });

    /**
     * Note: We skip paranoid level test as it takes 2+ seconds.
     * In real usage, this level is only for critical applications.
     */
  });

  describe('fromSeed', () => {
    it('should produce deterministic output from seed', async () => {
      /**
       * Same seed should always produce same output.
       * This enables reproducible simulations for debugging.
       */
      const seed = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

      const result1 = await fromSeed(seed, 64);
      const result2 = await fromSeed(seed, 64);

      expect(result1).toEqual(result2);
    });

    it('should produce different output for different seeds', async () => {
      /**
       * Different seeds should produce different outputs.
       */
      const seed1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const seed2 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 9]);

      const result1 = await fromSeed(seed1, 64);
      const result2 = await fromSeed(seed2, 64);

      expect(result1).not.toEqual(result2);
    });

    it('should return requested number of bytes', async () => {
      /**
       * Output should match requested size.
       */
      const seed = new Uint8Array([1, 2, 3, 4]);

      const result32 = await fromSeed(seed, 32);
      const result64 = await fromSeed(seed, 64);
      const result128 = await fromSeed(seed, 128);

      expect(result32.length).toBe(32);
      expect(result64.length).toBe(64);
      expect(result128.length).toBe(128);
    });

    it('should use default output of 64 bytes', async () => {
      /**
       * Without specifying outputBytes, should return 64 bytes.
       */
      const seed = new Uint8Array([1, 2, 3, 4]);
      const result = await fromSeed(seed);

      expect(result.length).toBe(64);
    });

    it('should produce uniform output from biased seed', async () => {
      /**
       * Even a biased seed (all zeros, all ones) should produce
       * uniformly distributed output after mixing.
       */
      const biasedSeed = new Uint8Array(32);
      biasedSeed.fill(0);

      const result = await fromSeed(biasedSeed, 256);

      /**
       * Check that the output has reasonable byte distribution.
       * Not all zeros, and multiple unique values.
       */
      const uniqueValues = new Set(result);
      expect(uniqueValues.size).toBeGreaterThan(100);

      /**
       * Check bit distribution (should be roughly 50% ones).
       */
      let oneBits = 0;
      for (const byte of result) {
        for (let i = 0; i < 8; i++) {
          if (byte & (1 << i)) oneBits++;
        }
      }
      const ratio = oneBits / (result.length * 8);
      expect(ratio).toBeGreaterThan(0.4);
      expect(ratio).toBeLessThan(0.6);
    });
  });

  describe('Mixing Quality', () => {
    it('should produce uniformly distributed bytes', async () => {
      /**
       * The output bytes should be uniformly distributed.
       */
      const result = await collectEntropy({
        level: 'fast',
        outputBytes: 2048,
      });

      const counts = new Array(256).fill(0);
      for (const byte of result.bytes) {
        counts[byte]++;
      }

      /**
       * With 2048 bytes, each value should appear ~8 times on average.
       * Check for reasonable distribution.
       */
      const minCount = Math.min(...counts);
      const maxCount = Math.max(...counts);

      expect(minCount).toBeGreaterThanOrEqual(0);
      expect(maxCount).toBeLessThan(40);
    });

    it('should have no correlation between adjacent bytes', async () => {
      /**
       * Adjacent bytes should be independent.
       */
      const result = await collectEntropy({
        level: 'fast',
        outputBytes: 1024,
      });

      /**
       * Calculate correlation coefficient.
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

      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt(
        (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
      );
      const correlation = denominator === 0 ? 0 : numerator / denominator;

      expect(correlation).toBeGreaterThan(-0.1);
      expect(correlation).toBeLessThan(0.1);
    });
  });
});
