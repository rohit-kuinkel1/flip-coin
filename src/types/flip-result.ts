import type { Face } from '../evaluator/types/face';

/**
 * The final result of a coin flip simulation.
 */
export interface FlipResult {
    /**
     * The final outcome of the flip.
     * Note that 'edge' is excluded as it triggers internal retries.
     */
    outcome: Exclude<Face, 'edge'>;

    /**
     * Statistical metadata about the simulation execution.
     */
    stats: {
        /**
         * Total wall-clock time spent in the physics loop in milliseconds.
         */
        simulationTime: number;

        /**
         * Estimated number of entropy bits consumed for initial conditions.
         */
        entropyBitsUsed: number;

        /**
         * Number of collision events (bounces) detected during the simulation.
         */
        bounceCount: number;

        /**
         * Number of times the flip was retried due to edge landings.
         */
        retryCount: number;
    };
}
