import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flipCoin } from '../../src/simulation/controller';
import * as entropyPool from '../../src/entropy/pool';
import * as stability from '../../src/simulation/stability';
import * as faceEvaluator from '../../src/evaluator/face';
import * as integrator from '../../src/physics/integrator';
import { SimulationTimeoutError } from '../../src/simulation/errors/simulation-timeout-error';
import { EdgeRetryExhaustedError } from '../../src/simulation/errors/edge-retry-exhausted-error';

function mockEntropy(bytes: Uint8Array = new Uint8Array(32)) {
    vi.spyOn(entropyPool, 'collectEntropy').mockResolvedValue({
        bytes,
        stats: {
            totalBits: bytes.length * 8,
            collectionTimeMs: 0,
            sourcesUsed: [],
            level: 'standard'
        }
    });
}

describe('flipCoin', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mockEntropy();
        vi.spyOn(integrator, 'integrate').mockImplementation(() => { });
        vi.spyOn(stability, 'isStable').mockReturnValue(true);
        vi.spyOn(faceEvaluator, 'determineFace').mockReturnValue('HEADS');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should complete a simple flip returning HEADS', async () => {
        const result = await flipCoin();

        expect(result.outcome).toBe('HEADS');
        expect(result.stats.retryCount).toBe(0);
        expect(entropyPool.collectEntropy).toHaveBeenCalledTimes(1);
    });

    it('should handle edge retries', async () => {
        const faceSpy = vi.spyOn(faceEvaluator, 'determineFace');
        faceSpy
            .mockReturnValueOnce('EDGE')
            .mockReturnValueOnce('TAILS');

        const result = await flipCoin({ maxEdgeRetries: 5 });

        expect(result.outcome).toBe('TAILS');
        expect(result.stats.retryCount).toBe(1);
        expect(entropyPool.collectEntropy).toHaveBeenCalledTimes(2);
    });

    it('should throw EdgeRetryExhaustedError if max retries exceeded', async () => {
        vi.spyOn(faceEvaluator, 'determineFace').mockReturnValue('EDGE');

        await expect(flipCoin({ maxEdgeRetries: 2 }))
            .rejects.toThrow(EdgeRetryExhaustedError);

        expect(entropyPool.collectEntropy).toHaveBeenCalledTimes(3);
    }); ``

    /**
     * Testing logic for loop and stability waiting.
     * We simulate the loop running for a few ticks before stabilizing.
     */
    it('should wait for stability before determining face', async () => {
        const stabilitySpy = vi.spyOn(stability, 'isStable');
        /**
         * Unstable for 5 checks, then stable.
         * Note: Controller waits for 10 consecutive stable frames.
         * So we need: unstable, unstable, then stable x 10.
         */
        let callCount = 0;
        stabilitySpy.mockImplementation(() => {
            callCount++;
            return callCount > 5;
        });

        const result = await flipCoin();

        expect(result.outcome).toBe('HEADS');
        expect(callCount).toBeGreaterThanOrEqual(15);
    });

    it('should throw SimulationTimeoutError if coin never settles', async () => {
        vi.spyOn(stability, 'isStable').mockReturnValue(false);
        /**
         * Never stable.
         */

        /**
         * Set a very short timeout for test speed.
         */
        await expect(flipCoin({ timeout: 10 }))
            .rejects.toThrow(SimulationTimeoutError);
    });

    /**
     * Test mapping of toss profile
     * Since we can't easily inspect internal variables, we can check if
     * generateInitialCondition is called with varying data.
     * But since entropy is mocked to same zeros, generateInitialCondition
     * might produce same output unless we vary the mocking.
     */
});
