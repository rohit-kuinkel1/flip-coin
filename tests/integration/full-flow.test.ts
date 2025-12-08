import { describe, it, expect } from 'vitest';
import { flipCoin } from '../../src/index';
import { debugFlipCoin } from '../../src/debug';
import { Vec3 } from '../../src/physics/math/vec3';
import { Quaternion } from '../../src/physics/math/quaternion';

/**
 * Integration Tests: Full Flow
 *
 * These tests verify the end-to-end functionality of the flip-coin library.
 * They connect the entropy system, physics engine, and evaluator to ensure
 * they work together correctly.
 */
describe('Integration: Full Flow', () => {

    /**
     * Test the standard public API: flipCoin().
     * This uses real entropy (crypto/timing) and runs the full simulation.
     */
    it('should complete a standard coin flip successfully', async () => {
        const result = await flipCoin({
            entropyLevel: 'fast',
            timeout: 5000
        });

        /**
         * the outcome must match either HEADS or TAILS.
         * Notice how we dont have 'SIDE' as an option.
         * This is because the FaceEvaluator only returns HEADS or TAILS
         * as per our initial requirement. If the coin lands on its side,
         * then we just re-run our simulation.
         */
        expect(result.outcome).toMatch(/^(HEADS|TAILS)$/);

        /**
         * Not sure how we can accurately test for this behavior 
         * here, for now we just check that the stats are defined
         * and that the simulation time is greater than 0 and the 
         * entropy bits used is greater than 0 since we used real
         * entropy, from how many sources, doesnt really matter here.
         */
        expect(result.stats).toBeDefined();
        expect(result.stats.simulationTime).toBeGreaterThan(0);
        expect(result.stats.entropyBitsUsed).toBeGreaterThan(0);
    });

    /**
     * Test deterministic replay using the outcome seed.
     * This verifies that providing the same seed yields the same initial conditions
     * and outcome on the same machine. As noted in our requirement, the physics
     * simulation is deterministic and all it relies on is the randomness of the 
     * entropy thats used to run the simulation. So given the same initial seed,
     * we should have the same initial conditions and also the outcome must be the
     * same in both runs.
     */
    it('should be deterministic when replaying with the same seed (Debug API)', async () => {
        const run1 = await debugFlipCoin({
            entropyLevel: 'fast',
            recordTrajectory: false
        });

        const run2 = await debugFlipCoin({
            seed: run1.seed,
            recordTrajectory: false
        });

        const ic1 = run1.initialConditions;
        const ic2 = run2.initialConditions;

        expect(ic1.position.equals(ic2.position)).toBe(true);
        expect(ic1.orientation.equals(ic2.orientation)).toBe(true);
        expect(ic1.linearVelocity.equals(ic2.linearVelocity)).toBe(true);
        expect(ic1.angularVelocity.equals(ic2.angularVelocity)).toBe(true);

        expect(run2.outcome).toBe(run1.outcome);

        expect(run2.stats.bounceCount).toBe(run1.stats.bounceCount);
    });

    /**
     * Test ability to override initial conditions manually.
     * We'll drop a coin flat from a small height with no rotation.
     * It should land flat and be stable very quickly.
     */
    it('should respect manual initial condition overrides', async () => {
        const startHeight = 0.05; //equals 5cm
        const result = await debugFlipCoin({
            initialConditions: {
                position: new Vec3(0, startHeight, 0),
                orientation: Quaternion.IDENTITY, //flat, face up (HEADS)
                linearVelocity: new Vec3(0, 0, 0),
                angularVelocity: new Vec3(0, 0, 0)
            },
            timeout: 2000
        });

        /**
         * Should be HEADS because it started HEADS up and just fell flat
         * Let's check our Face Evaluator logic: 
         * determineFace uses orientation.rotate(Vec3.UP). 
         * If identity, UP (0,1,0) -> (0,1,0). Dot product with Y is 1. -> HEADS.
         * We then verify that the initial conditions were respected.
         */
        expect(result.outcome).toBe('HEADS');
        expect(result.initialConditions.position.y).toBeCloseTo(startHeight);
        expect(result.initialConditions.angularVelocity.magnitude()).toBe(0);
    });
});
