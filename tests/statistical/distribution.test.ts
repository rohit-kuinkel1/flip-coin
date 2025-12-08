import { describe, it, expect } from 'vitest';
import { flipCoin } from '../../src/index';

/**
 * Statistical Validation Tests.
 *
 * verifying that the coin flip is fair (approx. 50/50 distribution)
 * and that the entropy sources are working as expected.
 *
 * Note: Running a statistically significant number of physics-based flips
 * is computationally expensive. These tests are configured to run a smaller
 * batch by default to keep the test suite fast, but can be scaled up
 * for full validation.
 */
describe('Statistical Distribution', () => {

    /**
     * Run a batch of flips and verify the head/tail ratio.
     * 
     * For a fair coin, we expect the ratio to be close to 0.5.
     * We use a relaxed tolerance here because with a small sample size (N=100),
     * variance can be high.
     * 
     * To run a full validation (N=1000 or N=10000), increase the count
     * and timeout.
     */
    it('should produce an approximately even distribution of heads and tails', async () => {
        const TRIALS = 50;
        /**
         * Keeping trials low for CI/CD speed. 
         * 50 flips * ~100ms per flip = ~5 seconds.
         */

        let heads = 0;
        let tails = 0;
        let totalTime = 0;

        for (let i = 0; i < TRIALS; i++) {
            const result = await flipCoin({
                entropyLevel: 'fast',
                maxEdgeRetries: 10
            });

            if (result.outcome === 'HEADS') {
                heads++;
            } else {
                tails++;
            }
            totalTime += result.stats.simulationTime;
        }

        const stats = {
            trials: TRIALS,
            heads,
            tails,
            ratio: heads / TRIALS,
            averageTimePerFlip: totalTime / TRIALS
        };

        console.log('Distribution Stats:', stats);

        /**
         * We verify that we got BOTH heads and tails. 
         * It is statistically extremely unlikely (2^-50) to get all heads or all tails
         * if the system is working.
         */
        expect(heads).toBeGreaterThan(0);
        expect(tails).toBeGreaterThan(0);

        /**
         * Check ratio is roughly balanced.
         * With N=50, 95% confidence interval is approx 0.36 - 0.64.
         * We'll use a wide range to strictly avoid flaky tests while trying to catch broken bias.
         */
        expect(stats.ratio).toBeGreaterThan(0.15);
        expect(stats.ratio).toBeLessThan(0.85);
    }, 30000); // 30s timeout
});
