import { BaseError, type BaseErrorOptions } from '../../common/errors';

/**
 * Thrown when a buffer is too small for the required operation.
 *
 * This occurs when the fn bytesToFloat is called with a buffer that
 * doesn't have enough bytes at the specified offset. 
 */
export class InsufficientEntropyBufferError extends BaseError {
    constructor(required: number, available: number, options?: BaseErrorOptions) {
        super(
            `Insufficient entropy buffer: required ${required} bytes, but only ${available} available`,
            {
                ...options,
                context: { ...options?.context, required, available },
            }
        );
    }
}
