import { Vec3 } from '../math/vec3';

/**
 * Result of a collision detection check.
 *
 * This structure separates collision *detection* (did we hit something?) from
 * collision *response* (how do we react?). The integrator uses this information
 * to apply corrective impulses to the rigid body state.
 */
export interface CollisionResult {
    /**
     * Whether a collision was detected.
     *
     * If false, all other fields are undefined and should be ignored.
     * If true, the collision response should be computed and applied.
     */
    colliding: boolean;

    /**
     * Contact normal vector (unit vector pointing away from the collision surface).
     *
     * For a ground plane at y = 0, this is always (0, 1, 0) — pointing straight up.
     * This is used to decompose velocity into normal and tangential components for
     * applying restitution and friction separately.
     *
     * Only defined when colliding = true.
     */
    normal?: Vec3;

    /**
     * Penetration depth in meters (always >= 0).
     *
     * How far the coin has penetrated into the collision surface. This is used
     * to apply a position correction to prevent the coin from sinking through the ground.
     *
     * Example: If the coin's lowest point is at y = -0.002, penetration = 0.002m.
     *
     * Only defined when colliding = true.
     */
    penetrationDepth?: number;

    /**
     * Contact point in world space where collision occurred.
     *
     * This is the position on the coin's surface that is touching (or penetrating) the ground.
     * For a disc, this is typically a point on the edge rim when tilted, or the center
     * when the coin is flat.
     *
     * Used for calculating realistic friction torques (friction acts at contact point,
     * which may be offset from center of mass).
     *
     * Only defined when colliding = true.
     */
    contactPoint?: Vec3;
}
