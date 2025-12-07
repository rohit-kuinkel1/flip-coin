/**
 * Configuration parameters for collision detection and response.
 *
 * These values control how the coin interacts with the ground plane during collisions.
 * They determine bounciness, sliding friction, and numerical tolerance for penetration detection.
 */
export interface CollisionConfig {
    /**
     * Coefficient of restitution (bounciness) for ground collisions.
     *
     * Restitution controls how much velocity is retained after a bounce:
     * -> e = 0: perfectly inelastic (no bounce, coin sticks to ground)
     * -> e = 1: perfectly elastic (ball bounces back to same height)
     * -> 0 < e < 1: realistic collision (some energy lost to heat/deformation)
     *
     * For a coin hitting a hard surface (wood table, concrete), typical values are 0.3-0.7.
     * We default to 0.5 for realistic but not overly bouncy behavior.
     *
     * Example with e = 0.5:
     * -> A coin dropping from 1m (v = sqrt(2*g*h) ≈ 4.43 m/s) bounces to:
     * -> v_after = e * v_before = 0.5 * 4.43 = 2.215 m/s
     * -> h_after = v²/(2g) = (2.215)²/(2*9.81) ≈ 0.25m (25% of original height)
     */
    restitution?: number;

    /**
     * Coefficient of kinetic friction (Coulomb friction) between coin and ground.
     *
     * Friction opposes tangential motion during contact. It's modeled using Coulomb's law:
     * -> F_friction = μ * N
     *
     * Where:
     * -> μ (mu) = coefficient of friction (dimensionless)
     * -> N = normal force pressing surfaces together (Newtons)
     *
     * Typical values:
     * -> Metal on wood: 0.2-0.5
     * -> Metal on concrete: 0.4-0.6
     * -> Ice on ice: 0.02-0.05
     *
     * We default to 0.3 for a coin on a typical table surface.
     * This creates noticeable sliding resistance without excessive damping.
     *
     * Example:
     * -> Coin hits ground with normal force N = 0.05 N
     * -> Maximum friction force = 0.3 * 0.05 = 0.015 N
     * -> This opposes tangential (sliding) motion during contact
     */
    friction?: number;

    /**
     * Penetration depth tolerance in meters.
     *
     * Due to discrete timesteps, the coin can slightly penetrate the ground plane between
     * integration steps. If penetration exceeds this threshold, we apply a corrective impulse
     * to "push" the coin back out.
     *
     * Default: 0.0001m (0.1mm) — small enough to be visually imperceptible but large enough
     * to avoid triggering corrections on floating-point rounding errors.
     *
     * A smaller tolerance increases accuracy but may cause instability or jittering.
     * A larger tolerance allows more visible penetration but is more stable.
     */
    penetrationTolerance?: number;
}

/**
 * Default collision configuration values for realistic coin-ground interactions.
 */
export const DEFAULT_COLLISION_CONFIG: Required<CollisionConfig> = {
    /**
     * Coefficient of restitution: 0.5 (semi-elastic collision).
     * The coin retains 50% of its bounce velocity, losing the rest to energy dissipation.
     */
    restitution: 0.5,

    /**
     * Coefficient of friction: 0.3 (metal on wood/table surface).
     * Provides realistic sliding resistance during ground contact.
     */
    friction: 0.3,

    /**
     * Penetration tolerance: 0.1mm.
     * Allows tiny numerical penetrations without correction, preventing jitter.
     */
    penetrationTolerance: 0.0001,
};
