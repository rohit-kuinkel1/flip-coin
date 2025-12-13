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

/**
 * Default Coin Configuration (approx. US Quarter)
 * Mass: 5.67g
 * Radius: 12.13mm
 * Thickness: 1.75mm
 */
export const defaultCoinConfig: Required<CoinConfig> = {
    /**
     * Mass conversion:
     * -> 5.67 g = 5.67 / 1000 = 0.00567 kg
     *
     * We store mass in kilograms because all force equations
     * (F = m * a) assume SI units.
     */
    mass: 0.00567,

    /**
     * Radius conversion:
     * -> 12.13 mm = 12.13 / 1000 = 0.01213 m
     *
     * The radius feeds into the cylinder inertia tensor:
     * -> I_yy = 0.5 * m * r^2
     */
    radius: 0.01213,

    /**
     * Thickness conversion:
     * -> 1.75 mm = 1.75 / 1000 = 0.00175 m
     *
     * Thickness affects the inertia term:
     * -> I_xx = I_zz = (1/12) * m * (3r^2 + h^2)
     */
    thickness: 0.00175,
};
