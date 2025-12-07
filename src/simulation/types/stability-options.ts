/**
 * Configuration options for determining if the simulation is stable (settled).
 */
export interface StabilityOptions {
    /**
     * Maximum linear velocity (in m/s) to be considered stable.
     * If the body is moving faster than this, it is not stable.
     * Default: 0.01 m/s (1 cm/s)
     */
    linearVelocityThreshold?: number;

    /**
     * Maximum angular velocity (in rad/s) to be considered stable.
     * If the body is spinning faster than this, it is not stable.
     * Default: 0.1 rad/s
     */
    angularVelocityThreshold?: number;
}
