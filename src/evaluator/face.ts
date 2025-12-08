import type { RigidBody } from '../physics/rigid-body';
import { Vec3 } from '../physics/math/vec3';
import { type Face, type FaceDeterminationOptions } from './types';

/**
 * Default threshold for edge detection.
 * ~Cos(84.26°)
 */
const DEFAULT_EDGE_THRESHOLD = 0.1;

/**
 * Determines which face of the coin is pointing upwards.
 *
 * This function calculates the orientation of the coin's local "up" vector (the normal
 * to the face) relative to the world's "up" vector (Y-axis).
 *
 * ## Logic
 *
 * 1. The coin's local "up" vector is (0, 1, 0).
 * 2. We rotate this vector by the coin's orientation quaternion to get the world normal.
 * 3. We take the dot product of this world normal with the global up vector (0, 1, 0).
 *    Since both are unit vectors, this equals the Y-component of the world normal.
 *    -> dot = cos(θ) where θ is the angle between the two vectors.
 *
 * ## Outcome Determination
 *
 * - If dot > threshold: HEADS (facing up)
 * - If dot < -threshold: TAILS (facing down)
 * - If |dot| <= threshold: EDGE (standing on side)
 *
 * @param body - The rigid body state of the coin.
 * @param options - Configuration options for sensitivity.
 * @returns The determined Face ('HEADS', 'TAILS', or 'EDGE').
 */
export function determineFace(
    body: RigidBody,
    options: FaceDeterminationOptions = {}
): Face {
    const threshold = options.edgeThreshold ?? DEFAULT_EDGE_THRESHOLD;

    /**
     * Get the coin's normal vector in world space.
     * The local up vector is (0, 1, 0).
     */
    const localUp = Vec3.UP;
    const worldNormal = body.orientation.rotateVector(localUp);

    /**
     * Calculate alignment with world up (Y-axis).
     * The dot product with (0, 1, 0) is simply the Y component.
     * Then based on the alignment, we determine the face of the
     * result.
     */
    const alignment = worldNormal.y;
    if (Math.abs(alignment) <= threshold) {
        return 'EDGE';
    }

    return alignment > 0
        ? 'HEADS'
        : 'TAILS';
}
