/**
 * Configuration options for customizing force calculations.
 *
 * These allow the simulation to model different environments (e.g., high altitude
 * with thinner air) or different coin types (smooth vs textured surfaces).
 *
 * All fields are optional. When not specified, DEFAULT_FORCE_CONFIG values are used.
 */
export interface ForceConfig {
    /**
     * Gravitational acceleration magnitude in m/s².
     * Default: 9.81 (Earth surface gravity)
     */
    gravity?: number;

    /**
     * Air density in kg/m³.
     * Default: 1.2 (sea level at 20°C)
     */
    airDensity?: number;

    /**
     * Drag coefficient (dimensionless).
     * Default: 1.17 (tumbling thin disc)
     */
    dragCoefficient?: number;

    /**
     * Angular damping coefficient (N*m*s/rad).
     *
     * Models air resistance to rotation.
     * 
     * Tuned value: 0.0005
     * A higher value is chosen to ensure the coin simulation settles within a reasonable
     * timeout (e.g. 5 seconds) for UX reasons, even if a perfect vacuum coin might spin longer.
     */
    angularDamping?: number;
}

/**
 * Default force configuration using standard physical constants.
 *
 * ## Gravity (9.81 m/s²)
 *
 * Standard gravitational acceleration at Earth's surface. This is the average
 * value at sea level, which varies slightly by latitude and altitude
 * (9.78 at equator to 9.83 at poles).
 *
 * For our coin flip simulation, 9.81 matches intuitive expectations for how
 * fast a coin falls.
 *
 * Example calculation:
 * -> Time to fall height h: t = sqrt(2h/g)
 * -> For h = 0.5m: t = sqrt(2 * 0.5 / 9.81) = sqrt(0.102) ≈ 0.32s
 *
 * ## Air Density (1.2 kg/m³)
 *
 * Air density at sea level and 20°C. This value is used in the drag formula:
 * -> F_drag = -½ρCdAv²
 *
 * Higher elevations or temperatures would reduce this value, but for a tabletop
 * coin flip the variation is negligible.
 *
 * ## Drag Coefficient (1.17)
 *
 * Drag coefficient for a thin disc (coin) tumbling through air. The drag
 * coefficient (Cd) is a dimensionless number that characterizes aerodynamic drag.
 *
 * For a flat disc perpendicular to flow, Cd ≈ 1.1-1.3. We use 1.17 as a middle
 * value representing a tumbling coin that presents varying cross-sections.
 *
 * Reference values for context:
 * -> Sphere: Cd ≈ 0.47
 * -> Flat plate (perpendicular): Cd ≈ 1.28
 * -> Streamlined body: Cd ≈ 0.04
 * -> Tumbling disc (coin): Cd ≈ 1.1-1.3
 *
 * ## Angular Damping (0.00001 N⋅m⋅s/rad)
 *
 * Coefficient representing how quickly angular velocity decays due to air
 * resistance on the spinning coin. The torque from angular drag is:
 * -> τ = -k * ω
 *
 * Where k is this coefficient and ω is angular velocity. A higher value means
 * the coin's spin slows down faster.
 *
 * The value 0.00001 is tuned so that a coin spinning at 100 rad/s in free fall
 * loses a small but noticeable amount of spin before landing, matching real
 * coin flip observations where spin persists through the flip but visibly slows.
 *
 * ## Usage
 *
 * Consumers can spread this config and override individual values:
 * ```typescript
 * computeForces(body, { ...DEFAULT_FORCE_CONFIG, gravity: 1.62 }); 
 * ```
 */

export const DEFAULT_FORCE_CONFIG: Required<ForceConfig> = {
    gravity: 9.81,
    airDensity: 1.2,
    dragCoefficient: 1.17,
    angularDamping: 1e-8,
};
