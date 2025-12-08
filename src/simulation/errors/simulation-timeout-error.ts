import { BaseError } from '../../common/errors/BaseError';

/**
 * Error thrown when the simulation exceeds the maximum allowed wall-clock time.
 *
 * This safeguards against infinite loops or extremely long-running simulations
 * (e.g., a coin that never settles due to energy injection bugs or
 * extremely elastic physics settings).
 */
export class SimulationTimeoutError extends BaseError {
    /**
     * Creates a new SimulationTimeoutError.
     *
     * @param timeoutMs - The timeout limit that was exceeded in milliseconds.
     * @param elapsedMs - The actual time elapsed in milliseconds.
     */
    constructor(timeoutMs: number, elapsedMs: number) {
        super(`Simulation timed out after ${elapsedMs}ms (limit: ${timeoutMs}ms)`, {
            context: { timeoutMs, elapsedMs },
        });
    }
}
