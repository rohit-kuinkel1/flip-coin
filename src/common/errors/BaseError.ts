import type { BaseErrorOptions } from "./BaseErrorOptions";

/**
 * Base error class for all custom errors in the flip-coin library.
 *
 * All domain-specific errors should extend this class to ensure:
 * - Consistent error structure across the codebase
 * - Proper instanceof checks work correctly
 * - Error name matches the class name
 * - Structured context appended to the message
 *
 * Example usage:
 * ```typescript
 * import { BaseError, type BaseErrorOptions } from '../../common/errors';
 *
 * export class EntropyTimeoutError extends BaseError {
 *   constructor(source: string, timeoutMs: number, options?: BaseErrorOptions) {
 *     super(`Entropy source "${source}" timed out after ${timeoutMs}ms`, {
 *       ...options,
 *       context: { ...options?.context, source, timeoutMs }
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseError extends Error {
    /**
     * Structured context data attached to this error.
     * Contains arbitrary key-value pairs for debugging.
     * If a `cause` was provided, it's stored here as `context.cause`.
     */
    public readonly context: Record<string, unknown>;

    constructor(message: string, options?: BaseErrorOptions) {
        const contextWithCause = options?.cause
            ? { ...options?.context, cause: options.cause }
            : options?.context;

        const contextStr = contextWithCause && Object.keys(contextWithCause).length > 0
            ? ` | Context: ${JSON.stringify(contextWithCause)}`
            : '';
        const fullMessage = `${message}${contextStr}`;

        super(fullMessage);

        /**
         * Set the error name to match the class name.
         * This ensures error.name is 'EntropyTimeoutError'
         * instead of just 'Error' when subclassed.
         */
        this.name = this.constructor.name;

        /**
         * Store context (including cause) as a property for programmatic access
         * if we ever need to access them later on down the line.
         */
        this.context = contextWithCause ?? {};
    }
}
