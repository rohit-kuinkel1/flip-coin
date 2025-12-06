import { BaseError, type BaseErrorOptions } from '../../common/errors';

/**
 * Thrown when entropy collection times out.
 *
 * Each entropy source has a timeout to prevent blocking.
 * If collection doesn't complete within the timeout, this error is thrown.
 */
export class EntropyCollectionTimeoutError extends BaseError {
    constructor(source: string, timeoutMs: number, options?: BaseErrorOptions) {
        super(`Entropy source "${source}" timed out after ${timeoutMs}ms`, {
            ...options,
            context: { ...options?.context, source, timeoutMs },
        });
    }
}
