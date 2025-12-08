import type { FlipResult } from './flip-result';
import type { RigidBodyState } from '../physics/types/rigid-body-state';
import type { Vec3 } from '../physics/math/vec3';
import type { Quaternion } from '../physics/math/quaternion';

/**
 * Result of a debug-mode coin flip.
 * Contains additional telemetry and state data.
 */
export interface DebugFlipResult extends FlipResult {
    /**
     * The entropy seed used for this flip.
     * Can be passed to `DebugFlipOptions.seed` to replay this exact flip
     * (assuming code/constants haven't changed).
     */
    seed: Uint8Array;

    /**
     * The actual initial conditions used for the simulation.
     */
    initialConditions: {
        position: Vec3;
        orientation: Quaternion;
        linearVelocity: Vec3;
        angularVelocity: Vec3;
    };

    /**
     * Full history of the coin's state per physics step.
     * Only populated if `recordTrajectory` was true.
     */
    trajectory?: RigidBodyState[];
}
