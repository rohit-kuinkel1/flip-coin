/**
 * Options for creating a BaseError instance.
 */
export interface BaseErrorOptions {
    /**
     * The underlying error that caused this error.
     * Stored as a property on the error for debugging root causes.
     *
     * Example:
     * ```typescript
     * try {
     *   await fetchQuantumEntropy();
     * } catch (err) {
     *   throw new EntropyFetchError('Quantum API failed', { cause: err });
     * }
     * ```
     */
    cause?: unknown;

    /**
     * Arbitrary context data attached to the error.
     * This gets appended to the error message and stored as a property.
     *
     * Example:
     * ```typescript
     * throw new EntropyTimeoutError('Collection timed out', {
     *   context: { source: 'crypto', timeoutMs: 100, attemptedBytes: 32 }
     * });
     * ```
     */
    context?: Record<string, unknown>;
}