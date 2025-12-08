import { Vec3 } from '../../physics/math/vec3';
import { Quaternion } from '../../physics/math/quaternion';

/**
 * Configuration parameters for generating the initial launch state of the coin.
 *
 * ## Launch Mechanics
 *
 * The coin flip starts with an impulsive force applied by the thumb.
 * This impulse imparts both linear momentum (upward velocity) and angular
 * momentum (spin). The exact values are subject to human variance, which
 * we model using statistical distributions derived from the entropy source.
 *
 * ## Coordinate System
 *
 * - Y-axis: Up/Down (Gravity acts along -Y)
 * - X/Z-axes: Horizontal plane
 *
 * Use these parameters to tune the "feel" of the toss (e.g., weak vs strong).
 */
export interface LaunchParameters {
    /**
     * Initial position of the coin center of mass.
     * Default: (0, 1, 0)
     */
    initialPosition: Vec3;

    /**
     * Initial orientation of the coin.
     * Default: Identity (flat plane facing up)
     */
    initialOrientation: Quaternion;

    /**
     * Mean upward impulse magnitude (Newton-seconds).
     * Determines the average height of the toss.
     */
    impulseMean: number;

    /**
     * Standard deviation of the upward impulse.
     * Controls consistency of toss height.
     */
    impulseStdDev: number;

    /**
     * Mean angular velocity magnitude (radians/second).
     * Determines how fast the coin spins on average.
     */
    angularVelocityMean: number;

    /**
     * Standard deviation of angular velocity.
     * Controls consistency of spin rate.
     */
    angularVelocityStdDev: number;

    /**
     * Primary axis of rotation.
     * Default: (1, 0, 0) for flipping over X-axis.
     */
    spinAxis: Vec3;

    /**
     * Standard deviation of the spin axis angle (radians).
     * Introduces "wobble" or off-axis rotation.
     */
    spinAxisStdDev: number;
}

/**
 * Default launch parameters representing a standard human coin toss.
 */
export const DEFAULT_LAUNCH_PARAMETERS: LaunchParameters = {
    initialPosition: new Vec3(0, 1, 0),
    /**
     * Identity
     */
    initialOrientation: new Quaternion(1, 0, 0, 0),
    /**
     * Sufficient for ~1.2m height with standard mass
     */
    impulseMean: 5.0,
    impulseStdDev: 0.5,
    /**
     * ~19-20 rotations per second (rapid spin)
     * Previous value (30) was ~4-5 rotations/sec which looked too slow/heavy.
     */
    angularVelocityMean: 120.0,
    angularVelocityStdDev: 20.0,
    spinAxis: new Vec3(1, 0, 0),
    /**
     * Slight wobble
     */
    spinAxisStdDev: 0.1,
};
