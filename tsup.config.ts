/**
 * =============================================================================
 * TSUP BUILD CONFIGURATION
 * =============================================================================
 *
 * tsup is a zero-config bundler powered by esbuild. It handles:
 * - TypeScript compilation
 * - Bundling into ESM and CommonJS formats
 * - Declaration file (.d.ts) generation
 * - Tree-shaking for optimal bundle size
 *
 * This configuration produces a dual-format library that works in:
 * - Modern browsers (ESM via <script type="module">)
 * - Node.js ESM (import syntax)
 * - Node.js CommonJS (require syntax)
 *
 * Output structure:
 *   dist/
 *   ├── index.js        (ESM - production API)
 *   ├── index.cjs       (CommonJS - production API)
 *   ├── index.d.ts      (TypeScript declarations)
 *   ├── debug.js        (ESM - debug API, separate for tree-shaking)
 *   ├── debug.cjs       (CommonJS - debug API)
 *   └── debug.d.ts      (TypeScript declarations for debug)
 *
 * @see https://tsup.egoist.dev/
 */

import { defineConfig } from 'tsup';

export default defineConfig({
  /**
   * Entry points define the public API surface of the library.
   *
   * We have two separate entry points:
   * - index: Production API (flipCoin function and types)
   * - debug: Debug API (extends production with replay/trajectory features)
   *
   * Separating these allows bundlers to tree-shake the debug code entirely
   * when consumers only import from the production entry point.
   */
  entry: {
    index: 'src/index.ts',
    debug: 'src/debug.ts',
  },

  /**
   * Output formats for maximum compatibility.
   *
   * ESM (ECMAScript Modules):
   * - Modern standard, supports static analysis and tree-shaking
   * - Used by modern browsers, Node.js 14+, and bundlers
   *
   * CJS (CommonJS):
   * - Legacy format for older Node.js environments
   * - Required for projects that haven't migrated to ESM
   */
  format: ['esm', 'cjs'],

  /**
   * Generate TypeScript declaration files (.d.ts).
   *
   * These provide type information for consumers using TypeScript,
   * enabling autocomplete, type checking, and "Go to Definition".
   */
  dts: true,

  /**
   * Generate source maps for debugging.
   *
   * Source maps allow debuggers to show original TypeScript source
   * instead of compiled JavaScript, making debugging much easier.
   */
  sourcemap: true,

  /**
   * Clean the dist/ directory before each build.
   *
   * Prevents stale files from previous builds from lingering.
   */
  clean: true,

  /**
   * JavaScript target version.
   *
   * ES2020 matches our tsconfig target for consistency.
   * This affects which JavaScript features esbuild will use or polyfill.
   */
  target: 'es2020',

  /**
   * Enable code splitting for the ESM output.
   *
   * When enabled, shared code between entry points is extracted into
   * separate chunks. This reduces duplication and improves caching.
   */
  splitting: true,

  /**
   * Minification setting.
   *
   * Currently disabled to keep output readable for debugging.
   * For production releases, consider enabling this or letting
   * consumers handle minification in their own build process.
   */
  minify: false,
});
