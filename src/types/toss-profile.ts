/**
 * Defines the parameters for the initial toss conditions.
 *
 * This allows customizing the "throw" to simulate different strengths, heights,
 * or techniques. Ranges are used to add variety within the constraints.
 */
export interface TossProfile {
    /**
     * Range of possible starting heights in meters [min, max].
     * The coin's center of mass starts at a random height in this range.
     */
    heightRange?: [number, number];

    /**
     * Range of initial linear velocity magnitudes in m/s [min, max].
     * Determines how hard the coin is thrown upwards/sideways.
     */
    linearVelocityRange?: [number, number];

    /**
     * Range of initial angular velocity magnitudes in rad/s [min, max].
     * Determines how fast the coin spins.
     */
    angularVelocityRange?: [number, number];
}
