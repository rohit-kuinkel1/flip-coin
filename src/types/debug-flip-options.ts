import type { FlipOptions } from './flip-options';
import type { Vec3 } from '../physics/math/vec3';
import type { Quaternion } from '../physics/math/quaternion';

/**
 * Options for the debug-mode coin flip.
 * Extends standard options with deterministic controls and telemetry.
 */
export interface DebugFlipOptions extends FlipOptions {
    /**
     * Manual entropy seed to use for the simulation.
     * If provided, `collectEntropy` is skipped and this seed is used
     * to strictly determine the initial conditions.
     *
     * Useful for deterministic replay of a previous flip.
     */
    seed?: Uint8Array;

    /**
     * Whether to record the full trajectory of the coin during simulation.
     * If true, the result will contain an array of CoinStates for every frame.
     *
     * @defaultValue false
     */
    recordTrajectory?: boolean;

    /**
     * Explicitly override the initial conditions of the coin.
     * If provided, entropy generation is skipped entirely for these values.
     */
    initialConditions?: {
        position?: Vec3;
        orientation?: Quaternion;
        linearVelocity?: Vec3;
        angularVelocity?: Vec3;
    };
}
