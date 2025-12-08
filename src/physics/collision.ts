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

    /**
     * Determine which face is pointing down calculating both potential contact points.
     * point1 = center + (h/2) * upWorld
     * point2 = center - (h/2) * upWorld
     */
    const point1 = body.position.add(upWorld.scale(halfThickness));
    const point2 = body.position.subtract(upWorld.scale(halfThickness));

    /**
     * Choose the rim point that is physically lowest.
     *
     * point1 and point2 represent the two faces of the coin along its local
     * "up" axis. Only the face with the smaller y-coordinate can touch the
     * ground first. Selecting the minimum y ensures we do not falsely report
     * a collision from the upward-facing face.
     *
     * Example:
     * -> point1.y = 0.05, point2.y = 0.047
     * -> lowestPoint = point2 because 0.047 < 0.05
     */
    const lowestPoint = point1.y < point2.y ? point1 : point2;

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
    if (!collision.colliding || !collision.normal || collision.penetrationDepth === undefined || !collision.contactPoint) {
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
     * Calculate the vector from center of mass to contact point.
     * r = contactPoint - position
     */
    const r = collision.contactPoint.subtract(body.position);

    /**
     * Determine velocity of the point on the body at the contact point.
     * v_point = v_cm + ω × r
     */
    const pointVelocity = body.linearVelocity.add(
        body.angularVelocity.crossProduct(r)
    );

    /**
     * Decompose point velocity into normal and tangential components.
     */
    const velocityDotNormal = pointVelocity.dotProduct(normal);
    const normalVelocity = normal.scale(velocityDotNormal);
    const tangentialVelocity = pointVelocity.subtract(normalVelocity);

    /**
     * Calculate Impulse magnitude for restitution (bounce).
     * If v_n < 0 (moving into ground), we bounce.
     */
    let j_n = 0;
    if (velocityDotNormal < 0) {
        /**
         * Coin is moving into the ground, apply bounce.
         *
         * Formula: v_n_new = -e * v_n_old
         *
         * Micro-collision check: If velocity is very small, we assume it's settling
         * and kill the bounce (restitution = 0) to prevent infinite micro-bouncing.
         */
        const effectiveRestitution = velocityDotNormal > -0.1 ? 0 : resolvedConfig.restitution;

        /**
         * For a simple model, we assume infinite mass of the ground.
         * J_n = -(1 + e) * v_n / (1/m + ...)
         * But we are applying direct velocity modification logic before,
         * which was simplified for a particle. For a rigid body, we must use the proper
         * impulse scalar formula:
         *
         * J = -(1+e) * v_rel_n / (1/m + (I^-1 * (r x n)) . (r x n))
         */

        /**
         * Precompute cross products
         */
        const rCrossN = r.crossProduct(normal);
        const invI_rCrossN = body.inverseInertiaTensor.multiplyVec3(rCrossN);
        const angularFactor = invI_rCrossN.dotProduct(rCrossN);

        const impulseScalar = -(1 + effectiveRestitution) * velocityDotNormal / (
            (1 / body.mass) + angularFactor
        );
        j_n = impulseScalar;
    }

    /**
     * Tangential Impulse (Friction).
     * We apply a simplified friction impulse opposing tangential velocity.
     * 
     * J_t = -μ * |J_n| * tangent_direction
     * (Model: Coulomb friction)
     */
    const frictionImpulseMagnitude = resolvedConfig.friction * Math.abs(j_n);
    let j_t_vec = Vec3.ZERO;

    if (tangentialVelocity.magnitudeSquare() > 1e-12) {
        const tangentDir = tangentialVelocity.normalize();

        /**
         * Friction impulse is clamped to Coulomb's limit so it counters sliding
         * without injecting energy or reversing motion.
         *
         * Coulomb model: |J_t| <= μ * |J_n|
         * -> We choose J_t = -t̂ * μ * |J_n|
         *
         * Rationale:
         * - If we perfectly cancel tangential velocity when |v_t| is small,
         *   we stop sliding without creating stick-slip oscillations.
         * - If |v_t| is large, limiting |J_t| prevents an unrealistic reversal
         *   where friction would make the coin accelerate in the opposite direction.
         *
         * Example with μ = 0.3 and |J_n| = 2 N·s:
         * -> |J_t| = 0.3 * 2 = 0.6 N·s
         * -> If tangential speed would require 1.0 N·s to fully stop, we only
         *    apply 0.6 N·s, reducing but not flipping the direction.
         */
        j_t_vec = tangentDir.scale(-frictionImpulseMagnitude);
    }

    /**
     * Total Impulse Vector J
     * J = J_n * n + J_t
     */
    const impulse = normal.scale(j_n).add(j_t_vec);

    /**
     * Apply Impulse to Linear Velocity
     * Δv = J / m
     */
    body.linearVelocity = body.linearVelocity.add(impulse.scale(1 / body.mass));

    /**
     * Apply Impulse to Angular Velocity
     * Δω = I⁻¹ * (r × J)
     */
    const torqueImpulse = r.crossProduct(impulse);
    const deltaOmega = body.inverseInertiaTensor.multiplyVec3(torqueImpulse);
    body.angularVelocity = body.angularVelocity.add(deltaOmega);

    /**
     * Position Correction (Projection)
     * Push the body out of the ground to prevent sinking.
     * We modify position directly.
     */
    if (collision.penetrationDepth > 0) {
        body.position = body.position.add(normal.scale(collision.penetrationDepth));

        /**
         * Also apply a slight energy penalty to prevent jitter? 
         * No, let's keep it simple. If we sink deep, we push out.
         */
    }

    /**
     * Apply additional angular damping on collision?
     * The friction impulse `j_t` already provides torque that opposes spin if 
     * the spin causes the contact point to slide. 
     * `v_point = v + w x r`. Friction opposes `v_point`.
     * So `r x J_friction` opposes `w`.
     * This naturally handles spin damping! We don't need artificial damping.
     */
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
