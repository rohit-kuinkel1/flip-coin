import type { RigidBody } from '../physics/rigid-body';
import type { StabilityOptions } from './types/stability-options';

/**
 * Default threshold for linear velocity (1 cm/s).
 * If the coin is moving slower than this, it's considered effectively stationary.
 */
const DEFAULT_LINEAR_THRESHOLD = 0.01;

/**
 * Default threshold for angular velocity (0.1 rad/s ≈ 5.7 deg/s).
 * If rotation is slower than this, it's considered effectively not spinning.
 */
const DEFAULT_ANGULAR_THRESHOLD = 0.1;

/**
 * Determines if the coin has settled (stopped moving).
 *
 * This function checks the instantaneous linear and angular velocities of the rigid body.
 * If both are below their respective thresholds, the body is considered stable.
 *
 * Note: This only checks the current state. A more robust simulation controller
 * might require the body to remain stable for multiple consecutive frames to
 * declare the simulation complete.
 *
 * @param body - The rigid body state to check.
 * @param options - Optional configuration for stability thresholds.
 * @returns `true` if the body's velocities are below the thresholds, `false` otherwise.
 */
export function isStable(
    body: RigidBody,
    options: StabilityOptions = {}
): boolean {
    const linThreshold = options.linearVelocityThreshold ?? DEFAULT_LINEAR_THRESHOLD;
    const angThreshold = options.angularVelocityThreshold ?? DEFAULT_ANGULAR_THRESHOLD;

    /**
     * Optimization: use squared magnitude if we cared about sqrt cost, but
     * for readability and since this isn't in the inner loop, direct magnitude is fine.
     */

    if (body.linearVelocity.magnitude() > linThreshold) {
        return false;
    }

    if (body.angularVelocity.magnitude() > angThreshold) {
        return false;
    }

    /**
     * The coin can be 'stable' (velocity ~ 0) at the apex of its throw
     * while floating in mid-air. We must ensure it is near the ground.
     * Use 2x thickness or a small constant like 1cm. We consider the 
     * coin as "stable" if it is "grounded", meaning the y position is
     * below the given threshold, in this case 1cm.
     */
    return (body.position.y < 0.01)
        ? true
        : false;
}
