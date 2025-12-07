import { Vec3 } from './math/vec3';
import { RigidBody } from './rigid-body';
import type { ForceConfig } from './types/force-config';
import type { ForceAccumulator } from './types/force-accumulator';
import { DEFAULT_FORCE_CONFIG } from './types/force-config';

/**
 * Computes the gravitational force acting on a body.
 *
 * Gravity is modeled as a constant downward force proportional to mass.
 * This is Newton's law of universal gravitation simplified for near-Earth surface:
 *
 * -> F_gravity = m * g
 *
 * Where:
 * -> m = mass of the body (kg)
 * -> g = gravitational acceleration vector (m/s², pointing down)
 *
 * For a coin with mass 0.00567 kg (US quarter):
 * -> F = 0.00567 * 9.81 = 0.0556 N downward
 *
 * Example with mass = 1 kg:
 * -> F = 1.0 * (0, -9.81, 0) = (0, -9.81, 0) N
 *
 * @param mass - Mass of the body in kilograms
 * @param gravity - Gravitational acceleration magnitude (defaults to 9.81 m/s²)
 * @returns Force vector pointing downward
 */
export function computeGravityForce(
    mass: number,
    gravity: number = DEFAULT_FORCE_CONFIG.gravity
): Vec3 {
    /**
     * Vec3.UP has been defined as (0, 1, 0). 
     * Scaling a vec3 just means we multiply each component by the scalar
     * so we can make use of our pre-defined constants and also the scale
     * method we implemented in the Vec3 class to get the gravity force 
     * vector. We scale it with -mass because gravity is pulling you towards
     * the earth, meaning the vector direction is downwards facing.
     */
    return Vec3.UP.scale(-mass * gravity);
}

/**
 * Computes the aerodynamic drag force opposing linear motion.
 *
 * Drag force opposes motion and is proportional to velocity squared. This models
 * the resistance a coin experiences as it moves through air. The formula is:
 *
 * -> F_drag = -½ * ρ * Cd * A * |v|² * v̂
 *
 * Where:
 * -> ρ (rho) = air density (kg/m³)
 * -> Cd = drag coefficient (dimensionless)
 * -> A = cross-sectional area (m²)
 * -> |v| = speed (magnitude of velocity, m/s)
 * -> v̂ = unit vector in direction of velocity
 *
 * The negative sign indicates drag opposes motion (acts in -v̂ direction).
 *
 * For a coin, we approximate the cross-sectional area as πr² (full disc area).
 * In reality, a tumbling coin presents varying cross-sections, but the drag
 * coefficient already accounts for average tumbling behavior.
 *
 * Example calculation for a quarter (r = 0.012m) moving at 3 m/s:
 * -> A = π * (0.012)² = 4.52e-4 m²
 * -> F_drag magnitude = 0.5 * 1.2 * 1.17 * 4.52e-4 * 9
 * -> = 0.5 * 1.2 * 1.17 * 4.52e-4 * 9
 * -> = 2.85e-3 N (about 0.3% of a quarter's weight)
 *
 * This is small but accumulates over ~0.5s of flight time, contributing to
 * realistic deceleration.
 *
 * @param velocity - Current velocity vector (m/s)
 * @param radius - Coin radius for cross-sectional area calculation (m)
 * @param airDensity - Air density ρ (defaults to 1.2 kg/m³)
 * @param dragCoefficient - Drag coefficient Cd (defaults to 1.17)
 * @returns Force vector opposing motion
 */
export function computeLinearDragForce(
    velocity: Vec3,
    radius: number,
    airDensity: number = DEFAULT_FORCE_CONFIG.airDensity,
    dragCoefficient: number = DEFAULT_FORCE_CONFIG.dragCoefficient
): Vec3 {
    const speedSquared = velocity.magnitudeSquare();

    /**
     * If the coin is stationary or very nearly so, there's no drag.
     * This early return prevents division by zero during normalization
     * and avoids unnecessary computation.
     */
    if (speedSquared < 1e-12) {
        return Vec3.ZERO;
    }

    /**
     * Cross-sectional area of the coin disc.
     * We use the full disc area as a simplification.
     */
    const area = Math.PI * radius * radius;

    /**
     * Calculate drag force magnitude: ½ρCdAv².
     * The drag magnitude is useful in a coin flip simulation to model the
     * air resistance acting on the coin as it moves through the air so we
     * can simulate the deceleration of the coin as it slows down due to air
     * resistance.
     */
    const dragMagnitude = 0.5 * airDensity * dragCoefficient * area * speedSquared;

    /**
     * Direction opposite to velocity.
     * We negate the normalized velocity to get the drag direction,
     * then scale by the calculated magnitude.
     */
    const velocityDirection = velocity.normalize();
    return velocityDirection.scale(-dragMagnitude);
}

/**
 * Computes the angular drag torque opposing rotation.
 *
 * Angular drag models air resistance to the coin's spin. As the coin rotates,
 * its surfaces encounter air resistance that gradually slows the rotation.
 * We use a simple linear damping model:
 *
 * -> τ_drag = -k * ω
 *
 * Where:
 * -> k = angular damping coefficient (N⋅m⋅s/rad)
 * -> ω = angular velocity vector (rad/s)
 *
 * This linear model is a simplification. In reality, angular drag would also
 * have a velocity-squared component, but for the low speeds and short durations
 * of a coin flip, linear damping provides adequate realism without complexity.
 *
 * Example: A coin spinning at ω = (0, 100, 0) rad/s (spinning around Y axis):
 * -> k = 0.00001 N⋅m⋅s/rad (default)
 * -> τ = -0.00001 * (0, 100, 0) = (0, -0.001, 0) N⋅m
 *
 * This tiny torque accumulates over thousands of timesteps to produce visible
 * spin decay by the time the coin lands.
 *
 * @param angularVelocity - Current angular velocity vector (rad/s)
 * @param angularDamping - Damping coefficient (defaults to 0.00001 N⋅m⋅s/rad)
 * @returns Torque vector opposing rotation
 */
export function computeAngularDragTorque(
    angularVelocity: Vec3,
    angularDamping: number = DEFAULT_FORCE_CONFIG.angularDamping
): Vec3 {
    return angularVelocity.scale(-angularDamping);
}

/**
 * Computes all forces and torques acting on a rigid body.
 *
 * This is the main entry point for force calculations, aggregating all physical
 * effects into a single ForceAccumulator that can be passed to the integrator.
 *
 * ## Forces Computed
 *
 * 1. **Gravity**: Constant downward force, F = m * g
 * 2. **Linear Drag**: Air resistance opposing motion, F = -½ρCdAv²
 *
 * ## Torques Computed
 *
 * 1. **Angular Drag**: Air resistance to spin, τ = -k * ω
 *
 * ## Notes on Modeling
 *
 * **Gravity applies no torque** because it acts on the center of mass. For a
 * uniform coin, the center of mass coincides with the geometric center, so
 * gravitational force creates no moment arm and thus no torque.
 *
 * **Aerodynamic torque from linear drag** (Magnus effect, tumbling asymmetry)
 * is not modeled. These effects are minor for a small, thin coin at low speeds
 * and would add significant complexity. The angular drag term captures the
 * dominant spin-decay behavior.
 *
 * Example for a US quarter in flight:
 * -> mass = 0.00567 kg, radius = 0.012 m
 * -> velocity = (2, 3, 0) m/s, angularVelocity = (0, 100, 50) rad/s
 *
 * Forces:
 * -> Gravity: (0, -0.0556, 0) N
 * -> Linear drag: ~(-0.001, -0.0015, 0) N (opposing velocity direction)
 * -> Net force: (−0.001, −0.057, 0) N (gravity dominates)
 *
 * Torques:
 * -> Angular drag: (0, -0.001, -0.0005) N⋅m (opposing spin)
 *
 * @param body - The rigid body to compute forces for
 * @param config - Optional configuration overrides for physical constants
 * @returns ForceAccumulator containing net force and torque vectors
 */
export function computeForces(
    body: RigidBody,
    config: ForceConfig = {}
): ForceAccumulator {
    const resolvedConfig: Required<ForceConfig> = {
        ...DEFAULT_FORCE_CONFIG,
        ...config,
    };

    const gravityForce = computeGravityForce(body.mass, resolvedConfig.gravity);

    const dragForce = computeLinearDragForce(
        body.linearVelocity,
        body.radius,
        resolvedConfig.airDensity,
        resolvedConfig.dragCoefficient
    );

    const angularDragTorque = computeAngularDragTorque(
        body.angularVelocity,
        resolvedConfig.angularDamping
    );

    return {
        force: gravityForce.add(dragForce),
        torque: angularDragTorque,
    };
}
