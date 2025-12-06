/**
 * Result from a single entropy source.
 */
export interface SourceResult {
  name: string;
  bytes: Uint8Array;
  estimatedBits: number;
  success: boolean;
}
