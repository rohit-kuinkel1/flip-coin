import { describe, it, expect } from 'vitest';
import { generateInitialCondition } from '../../src/simulation/initial';
import { DEFAULT_LAUNCH_PARAMETERS, LaunchParameters } from '../../src/simulation/types/launch-parameters';
import { Vec3 } from '../../src/physics/math/vec3';
import { Quaternion } from '../../src/physics/math/quaternion';

describe('Initial Condition Generator', () => {
    const mockEntropy = new Uint8Array(64).fill(128);

    it('should generate a valid RigidBodyState', () => {
        const state = generateInitialCondition(mockEntropy);

        expect(state).toBeDefined();
        expect(state.position).toBeInstanceOf(Vec3);
        expect(state.linearVelocity).toBeInstanceOf(Vec3);
        expect(state.orientation).toBeInstanceOf(Quaternion);
        expect(state.angularVelocity).toBeInstanceOf(Vec3);
    });

    it('should be deterministic given the same entropy', () => {
        const entropy1 = new Uint8Array(64).map((_, i) => i);
        const entropy2 = new Uint8Array(64).map((_, i) => i);

        /**
         * params must be same/default since we are using the same entropy
         * that would mean the initial conditions are the same since they
         * totally depend on the entropy
         */
        const state1 = generateInitialCondition(entropy1);
        const state2 = generateInitialCondition(entropy2);

        expect(state1.linearVelocity.y).toBe(state2.linearVelocity.y);
        expect(state1.angularVelocity.x).toBe(state2.angularVelocity.x);
        expect(state1.angularVelocity.y).toBe(state2.angularVelocity.y);
        expect(state1.angularVelocity.z).toBe(state2.angularVelocity.z);
    });

    it('should respond to launch parameters', () => {
        const params: LaunchParameters = {
            ...DEFAULT_LAUNCH_PARAMETERS,
            impulseMean: 1000,
            impulseStdDev: 0.1
        };

        const state = generateInitialCondition(mockEntropy, params);

        expect(state.linearVelocity.y).toBeGreaterThan(900);
        expect(state.linearVelocity.y).toBeLessThan(1100);
    });

    it('should handle entropy exhaustion gracefully (fallback to Math.random)', () => {
        const emptyEntropy = new Uint8Array(0);
        /**
         * No bytes provided by the entropy pool
         * but still, we should be able to generate a valid state
         * and it should not throw
         */
        const state = generateInitialCondition(emptyEntropy);

        expect(state.linearVelocity).toBeDefined();
        expect(state.linearVelocity.y).not.toBeNaN();
    });

    it('should produce variations in spin axis', () => {
        /**
         * We use a large number of bytes to ensure we don't run out
         * of entropy since we are using multiple bytes for different
         * calculations.
         */
        const entropyA = new Uint8Array(100).map((_, i) => i);
        /**
         * Change byte for the wobble calculation (which happens after impulse and spin mag)
         * Impulse: 8 bytes (2x u32)
         * SpinMag: 8 bytes
         * Wobble: 3 calls * 8 bytes = 24 bytes
         * So if we change byte 20, we should see different axis.
         */
        const entropyB = new Uint8Array(100).map((_, i) => (i === 20 ? 255 : i));

        const stateA = generateInitialCondition(entropyA);
        const stateB = generateInitialCondition(entropyB);

        /**
         * Initial parameters are same defaults
         * But axis should differ since entropies dont match
         */
        const axisA = stateA.angularVelocity.normalize();
        const axisB = stateB.angularVelocity.normalize();

        expect(axisA.equals(axisB)).toBe(false);
    });
});
