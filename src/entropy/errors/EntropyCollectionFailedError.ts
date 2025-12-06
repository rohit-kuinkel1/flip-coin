import { BaseError, type BaseErrorOptions } from '../../common/errors';

/**
 * Thrown when entropy collection fails completely.
 *
 * This is a critical failure indicating that ALL entropy sources failed
 * after exhausting the time budget. This should be rare since timer jitter
 * is always available, in theory at least.
 */
export class EntropyCollectionFailedError extends BaseError {
    constructor(maxTimeMs: number, options?: BaseErrorOptions) {
        super(
            `Entropy collection failed: no sources available after ${maxTimeMs}ms. ` +
            'This indicates a critical environment issue where even timer jitter entropy is unavailable.',
            {
                ...options,
                context: { ...options?.context, maxTimeMs },
            }
        );
    }
}
