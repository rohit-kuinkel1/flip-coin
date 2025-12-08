/**
 * Represents the desired quality level for entropy collection.
 *
 * - `fast`: Minimal collection time (e.g., 100ms), lower entropy target.
 * - `standard`: Balanced for general use (e.g., 200ms).
 * - `high`: Higher assurance (e.g., 500ms).
 * - `paranoid`: Maximum collection time and targets (e.g., 2000ms).
 */
export type EntropyLevel = 'fast' | 'standard' | 'high' | 'paranoid';
