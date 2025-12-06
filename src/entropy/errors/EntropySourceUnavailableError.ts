import { BaseError, type BaseErrorOptions } from '../../common/errors';

/**
 * Thrown when an entropy source is not available in the current environment.
 *
 * Example causes:
 * - crypto.getRandomValues() not available (very old browser/runtime)
 * - Microphone permission denied for audio entropy
 * - Network unavailable for quantum API
 */
export class EntropySourceUnavailableError extends BaseError {
    constructor(source: string, reason?: string, options?: BaseErrorOptions) {
        const message = reason
            ? `Entropy source "${source}" is not available: ${reason}`
            : `Entropy source "${source}" is not available`;

        super(message, {
            ...options,
            context: { ...options?.context, source, reason },
        });
    }
}
