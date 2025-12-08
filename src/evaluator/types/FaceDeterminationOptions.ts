/**
 * Options for face determination.
 */
export interface FaceDeterminationOptions {
    /**
     * The threshold for the dot product between the coin's normal and the world up vector
     * below which the coin is considered to be on its edge.
     *
     * The dot product ranges from -1 (tails) to +1 (heads).
     * 0 indicates the coin is perfectly vertical (on edge).
     *
     * Default: 0.1 (corresponding to an angle of ~84° from vertical)
     */
    edgeThreshold?: number;
}