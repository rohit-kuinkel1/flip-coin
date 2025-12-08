import { BaseError } from '../../common/errors/BaseError';

/**
 * Error thrown when the coin lands on its edge repeatedly and retries are exhausted.
 *
 * Real-world coins can land on their edge, which is typically considered a "void"
 * flip requiring a re-toss. This error indicates that we've hit the maximum
 * configured retry limit for such events.
 */
export class EdgeRetryExhaustedError extends BaseError {
    /**
     * Creates a new EdgeRetryExhaustedError.
     *
     * @param maxRetries - The maximum number of retries allowed.
     */
    constructor(maxRetries: number) {
        super(`Failed to resolve coin face after ${maxRetries} edge landing retries`, {
            context: { maxRetries },
        });
    }
}
