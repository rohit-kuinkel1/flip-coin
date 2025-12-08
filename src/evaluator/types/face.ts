/**
 * Represents the side of the coin facing upwards.
 *
 * - `HEADS`: The "heads" side is facing up (local Y axis aligns with world Y).
 * - `TAILS`: The "tails" side is facing up (local Y axis opposes world Y).
 * - `EDGE`: The coin is standing on its edge (local Y axis is perpendicular to world Y).
 */
export type Face = 'HEADS' | 'TAILS' | 'EDGE';
