/**
 * Configuration for the physical properties of the coin.
 *
 * Defines the mass and dimensions used in rigid body dynamics calculations.
 */
export interface CoinConfig {
    /**
     * The radius of the coin in meters.
     * Default is typically around 0.012m (quarter-sized).
     */
    radius?: number;

    /**
     * The thickness of the coin in meters.
     * Default is typically around 0.002m.
     */
    thickness?: number;

    /**
     * The mass of the coin in kilograms.
     * Default is typically around 0.00567kg.
     */
    mass?: number;
}
