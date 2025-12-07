import { Vec3 } from './math/vec3';
import { RigidBody } from './rigid-body';
import type { CollisionConfig } from './types/collision-config';
import type { CollisionResult } from './types/collision-result';
import { DEFAULT_COLLISION_CONFIG } from './types/collision-config';

/**
 * The ground plane is at y = 0 in world space.
 *
 * Any point with y < 0 is considered "underground" (a collision).
 * This is a simple implicit plane representation that's very efficient to test against.
 */
const GROUND_Y = 0;

/**
 * Ground plane normal vector (unit vector pointing up).
 *
 * For a horizontal ground plane at y = 0, the normal is always (0, 1, 0).
 * This never changes, so we pre-compute it as a constant for performance.
 */
const GROUND_NORMAL = Vec3.UP;

/**
 * Detects collisions between a coin (modeled as a thin disc) and the ground plane.
 *
 * The coin is approximated as a cylinder with radius `r` and thickness `h`.
 * To find the lowest point on the disc, we need to account for its orientation:
 *
 * 1. The coin's local "up" axis (0, 1, 0) in its own frame
 * 2. Rotate this by the coin's orientation quaternion to get world-space "up"
 * 3. The lowest point is at: center - (h/2) * up_world
 *
 * If this lowest point has y < 0, we have a collision.
 *
 * ## Geometric Intuition
 *
 * When the coin is flat (horizontal), its "up" vector is ±(0, 1, 0), so the lowest
 * point is simply at y = position.y - thickness/2.
 *
 * When the coin is tilted, the "up" vector points at an angle. The coin extends
 * further down in the direction opposite to "up", and we need to account for this
 * to avoid the coin incorrectly sinking into the ground.
 *
 * Example: Coin at position (0, 0.05, 0), thickness = 0.002m, lying flat:
 * -> up_world = (0, 1, 0)
 * -> lowest point = (0, 0.05, 0) - (0, 0.001, 0) = (0, 0.049, 0)
 * -> y = 0.049 > 0, no collision
 *
 * Example: Same coin tilted 90° (on its edge):
 * -> up_world = (1, 0, 0) (pointing horizontally)
 * -> lowest point = (0, 0.05, 0) - (0.001, 0, 0) = (-0.001, 0.05, 0)
 * -> We need to find the actual lowest rim point considering the radius!
 *
 * ## Simplified Model (Current Implementation)
 *
 * For simplicity, we currently ignore the radius and only consider the coin as two
 * flat faces separated by thickness. This is acceptable for a first implementation
 * and avoids the complexity of finding the lowest edge point on a tilted disc.
 *
 * A more accurate model would compute: lowest_point = center - (h/2) * up_world - r * down
 * where "down" is (0, -1, 0). This will be refined in future iterations if needed.
 *
 * @param body - The rigid body (coin) to check
 * @param config - Optional collision configuration overrides
 * @returns CollisionResult indicating if collision occurred and details
 */
export function detectCollision(
    body: RigidBody,
    config: CollisionConfig = {}
): CollisionResult {
    const resolvedConfig: Required<CollisionConfig> = {
        ...DEFAULT_COLLISION_CONFIG,
        ...config,
    };

    /**
     * Step 1: Find the coin's local "up" direction in world space.
     *
     * In the coin's local frame, "up" is (0, 1, 0). We rotate this by the coin's
     * orientation quaternion to get the direction in world space.
     *
     * Example: If the coin is flat (identity quaternion), up_world = (0, 1, 0).
     * If tilted 90° around X-axis, up_world might be (0, 0, 1) (pointing forward).
     */
    const localUp = Vec3.UP;
    const upWorld = body.orientation.rotateVector(localUp);

    /**
     * Step 2: Compute the lowest point on the coin disc.
     *
     * The coin extends from its center by ±(thickness/2) along the "up" direction.
     * The lowest point is at: center - (thickness/2) * up_world
     *
     * Example: Center at (0, 0.1, 0), thickness = 0.002m, up = (0, 1, 0):
     * -> lowest = (0, 0.1, 0) - (0, 0.001, 0) = (0, 0.099, 0)
     */
    const halfThickness = body.thickness / 2;
    const lowestPoint = body.position.subtract(upWorld.scale(halfThickness));

    /**
     * Step 3: Check if the lowest point has penetrated the ground (y < 0).
     */
    const penetrationDepth = GROUND_Y - lowestPoint.y;

    /**
     * If penetration is negative or within tolerance, no collision.
     * Negative means the coin is above ground.
     * Small positive values (< tolerance) are ignored to prevent jitter from
     * floating-point rounding errors.
     */
    if (penetrationDepth < resolvedConfig.penetrationTolerance) {
        return { colliding: false };
    }

    /**
     * Collision detected! Return details for response calculation.
     *
     * Contact point: We use the lowest point projected back onto the ground plane.
     * This is the point where the coin is touching (or would touch if not penetrating).
     *
     * Example: Lowest point at (0.5, -0.002, 0.3) with penetration 0.002m:
     * -> Contact point: (0.5, 0, 0.3) (same x,z but y clamped to ground)
     */
    const contactPoint = new Vec3(lowestPoint.x, GROUND_Y, lowestPoint.z);

    return {
        colliding: true,
        normal: GROUND_NORMAL,
        penetrationDepth,
        contactPoint,
    };
}

/**
 * Applies collision response to a rigid body by modifying its velocities.
 *
 * When a collision is detected, we need to:
 * 1. **Separate** the objects (position correction)
 * 2. **Apply restitution** (bounce) to normal velocity
 * 3. **Apply friction** to tangential velocity
 * 4. **Apply friction torque** to angular velocity
 *
 * This function implements an impulse-based collision response, which is the standard
 * approach in game physics and rigid body simulations.
 *
 * ## Impulse-Based Collision Response
 *
 * Instead of computing forces and integrating over time, we apply instantaneous
 * changes (impulses) to velocity. This is physically justified because collisions
 * happen very quickly (microseconds in reality), so we model them as instant events.
 *
 * ### Normal Impulse (Restitution)
 *
 * The normal component of velocity (perpendicular to the surface) is reversed and
 * scaled by the coefficient of restitution:
 *
 * -> v_n_after = -e * v_n_before
 *
 * Where:
 * -> e = coefficient of restitution (0 = stick, 1 = perfect bounce)
 * -> v_n = velocity component along normal (dot product with normal)
 *
 * Example: Coin drops straight down with v = (0, -3, 0), e = 0.5:
 * -> v_n = (0, -3, 0) · (0, 1, 0) = -3 m/s
 * -> v_n_after = -0.5 * (-3) = 1.5 m/s
 * -> v_after = (0, 1.5, 0) (bounces back up at half speed)
 *
 * ### Tangential Impulse (Friction)
 *
 * The tangential component (parallel to the surface) is reduced by friction.
 * Coulomb friction law states that friction force is proportional to normal force:
 *
 * -> F_friction = μ * N
 *
 * Where:
 * -> μ = coefficient of friction
 * -> N = normal force
 *
 * For an impulsive collision, we approximate this as:
 * -> J_friction = μ * J_normal
 *
 * Where J_normal is the impulse magnitude applied in the normal direction.
 *
 * In practice, we simply scale the tangential velocity by (1 - μ):
 * -> v_t_after = v_t_before * (1 - μ)
 *
 * This is a simplification but works well for coin flips where exact friction
 * physics isn't critical.
 *
 * Example: Coin sliding along ground with v_tangent = (2, 0, 1), μ = 0.3:
 * -> v_t_after = (2, 0, 1) * 0.7 = (1.4, 0, 0.7)
 * -> 30% of tangential speed lost to friction
 *
 * ### Angular Friction (Spin Damping)
 *
 * When the coin contacts the ground, friction also creates a torque that opposes
 * rotation. We model this by simply damping the angular velocity:
 *
 * -> ω_after = ω_before * (1 - μ)
 *
 * This prevents unrealistic perpetual spinning and helps the coin settle.
 *
 * ### Position Correction
 *
 * If the coin has penetrated the ground (y < 0), we "push" it back out by moving
 * it along the normal by the penetration depth:
 *
 * -> position_corrected = position + penetrationDepth * normal
 *
 * Example: Coin center at (0, -0.002, 0), penetration = 0.003m:
 * -> Corrected position = (0, -0.002, 0) + (0, 0.003, 0) = (0, 0.001, 0)
 *
 * @param body - The rigid body to modify (mutated in place)
 * @param collision - Collision detection result
 * @param config - Optional collision configuration overrides
 */
export function applyCollisionResponse(
    body: RigidBody,
    collision: CollisionResult,
    config: CollisionConfig = {}
): void {
    if (!collision.colliding || !collision.normal || collision.penetrationDepth === undefined) {
        /**
         * No collision detected, nothing to do.
         */
        return;
    }

    const resolvedConfig: Required<CollisionConfig> = {
        ...DEFAULT_COLLISION_CONFIG,
        ...config,
    };

    const normal = collision.normal;

    /**
     * Step 1: Decompose linear velocity into normal and tangential components.
     *
     * Normal component: v_n = (v · n) * n
     * Tangential component: v_t = v - v_n
     *
     * This separation allows us to apply restitution to v_n and friction to v_t independently.
     */
    const velocityDotNormal = body.linearVelocity.dotProduct(normal);
    const normalVelocity = normal.scale(velocityDotNormal);
    const tangentialVelocity = body.linearVelocity.subtract(normalVelocity);

    /**
     * Step 2: Apply restitution to normal velocity.
     *
     * If the coin is moving into the ground (v_n < 0), reverse and scale by restitution.
     * If moving away from ground (v_n > 0), leave it alone (already separating).
     *
     * The condition `velocityDotNormal < 0` ensures we only apply restitution when
     * actually colliding, not when the coin is resting or moving away.
     */
    let newNormalVelocity: Vec3;
    if (velocityDotNormal < 0) {
        /**
         * Coin is moving into the ground, apply bounce.
         *
         * Formula: v_n_new = -e * v_n_old
         *
         * Example: v_n = -3 m/s (downward), e = 0.5:
         * -> v_n_new = -0.5 * (-3) = 1.5 m/s (upward)
         */
        newNormalVelocity = normalVelocity.scale(-resolvedConfig.restitution);
    } else {
        /**
         * Coin is already moving away from ground or stationary in normal direction.
         * No restitution needed.
         */
        newNormalVelocity = normalVelocity;
    }

    /**
     * Step 3: Apply friction to tangential velocity.
     *
     * Friction opposes tangential motion. We reduce tangential velocity by the
     * friction coefficient:
     *
     * -> v_t_new = v_t_old * (1 - μ)
     *
     * Example: v_t = (2, 0, 1) m/s, μ = 0.3:
     * -> v_t_new = (2, 0, 1) * 0.7 = (1.4, 0, 0.7) m/s
     */
    const newTangentialVelocity = tangentialVelocity.scale(1 - resolvedConfig.friction);

    /**
     * Step 4: Recombine normal and tangential components to get new linear velocity.
     */
    body.linearVelocity = newNormalVelocity.add(newTangentialVelocity);

    /**
     * Step 5: Apply friction damping to angular velocity.
     *
     * When the coin touches the ground, rotational friction slows its spin.
     * We model this as simple damping: ω_new = ω_old * (1 - μ)
     *
     * Example: ω = (10, 50, 20) rad/s, μ = 0.3:
     * -> ω_new = (10, 50, 20) * 0.7 = (7, 35, 14) rad/s
     */
    body.angularVelocity = body.angularVelocity.scale(1 - resolvedConfig.friction);

    /**
     * Step 6: Apply position correction to prevent sinking through ground.
     *
     * Move the coin along the normal direction by the penetration depth:
     * -> position_new = position_old + penetrationDepth * normal
     *
     * Example: Position at (0, -0.005, 0), penetration = 0.006m:
     * -> Corrected = (0, -0.005, 0) + (0, 0.006, 0) = (0, 0.001, 0)
     *
     * This ensures the coin's lowest point is exactly at or slightly above the ground
     * after the correction, preventing visual artifacts and numerical instability.
     */
    body.position = body.position.add(normal.scale(collision.penetrationDepth));
}

/**
 * Full collision detection and response in a single function.
 *
 * This is a convenience wrapper that combines detectCollision and applyCollisionResponse.
 * It's the main entry point used by the integrator during physics simulation.
 *
 * @param body - The rigid body to check and potentially modify
 * @param config - Optional collision configuration overrides
 * @returns The collision result (useful for bounce counting, debugging, etc.)
 */
export function handleCollision(
    body: RigidBody,
    config: CollisionConfig = {}
): CollisionResult {
    const collision = detectCollision(body, config);
    applyCollisionResponse(body, collision, config);
    return collision;
}
