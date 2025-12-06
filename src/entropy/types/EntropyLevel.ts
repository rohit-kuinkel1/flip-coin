/**
 * Entropy quality presets.
 *
 * Different use cases have different entropy requirements:
 *
 * | Level    | Min Time | Target Bits | Max Time | Use Case              |
 * |----------|----------|-------------|----------|-----------------------|
 * | fast     | 100ms    | 64 bits     | 500ms    | Quick demos           |
 * | standard | 200ms    | 128 bits    | 1000ms   | Normal use            |
 * | high     | 500ms    | 256 bits    | 2000ms   | Important decisions   |
 * | paranoid | 2000ms   | 512 bits    | 5000ms   | Maximum randomness    |
 */
export type EntropyLevel = 'fast' | 'standard' | 'high' | 'paranoid';
