import type { CoinConfig } from './coin-config';
import type { EntropyLevel } from './entropy-level';
import type { TossProfile } from './toss-profile';

/**
 * Options for configuring a single coin flip simulation.
 *
 * This is the primary configuration object passed to `flipCoin()`.
 */
export interface FlipOptions {
    /**
     * The desired quality of entropy to collect.
     * Higher levels take longer but collect more random bits.
     * Default: 'standard'
     */
    entropyLevel?: EntropyLevel;

    /**
     * physical properties of the coin.
     */
    coin?: CoinConfig;

    /**
     * Characteristics of the toss (height, speed, spin).
     */
    tossProfile?: TossProfile;

    /**
     * Maximum wall-clock time for the physics simulation in milliseconds.
     * If the coin doesn't settle by this time, a SimulationTimeoutError is thrown.
     * Default: 5000ms
     */
    timeout?: number;

    /**
     * Maximum number of retries if the coin lands on its edge.
     * Default: 5
     */
    maxEdgeRetries?: number;
}
