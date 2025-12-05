/**
 * =============================================================================
 * VITEST TEST CONFIGURATION
 * =============================================================================
 *
 * Vitest is a Vite-native testing framework with a Jest-compatible API.
 * It provides fast test execution through native ESM support and esbuild.
 *
 * Key features used:
 * - Global test functions (no imports needed for describe/it/expect)
 * - V8 coverage provider (fast, accurate coverage reports)
 * - Extended timeouts for statistical validation tests
 *
 * Test organization:
 *   src/
 *   ├── physics/math/vec3.ts
 *   ├── physics/math/vec3.test.ts     (co-located unit tests)
 *   └── ...
 *   tests/
 *   ├── integration/                   (full simulation tests)
 *   └── statistical/                   (distribution validation)
 *
 * @see https://vitest.dev/
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /**
     * Enable global test functions.
     *
     * When true, describe(), it(), expect(), vi, etc. are available
     * globally without imports. This matches Jest's behavior and
     * reduces boilerplate in test files.
     *
     * The tradeoff is slightly less explicit dependencies, but the
     * improved developer experience is worth it for a testing context.
     */
    globals: true,

    /**
     * Test environment.
     *
     * 'node' uses Node.js globals and APIs. This is appropriate for
     * our library since the core physics engine has no DOM dependencies.
     *
     * The entropy system will have environment-specific implementations
     * that can be tested with environment mocking.
     */
    environment: 'node',

    /**
     * Test file patterns.
     *
     * We support one location for tests. The idea here is to have a clear
     * separation between the source code and the tests where everything thats
     * relevant to the core logic is in the src folder and everything thats
     * relevant to the tests is in the tests folder.
     *
     * - tests/**\/*.test.ts: Integration and statistical tests
     */
    include: ['tests/**/*.test.ts'],

    /**
     * Code coverage configuration.
     *
     * Uses the V8 coverage provider which is faster than Istanbul
     * and provides accurate coverage without instrumentation overhead.
     *
     * Reports generated:
     * - text: Console output summary
     * - html: Browsable detailed report in coverage/
     * - lcov: Machine-readable format for CI integration
     */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['tests/**/*.test.ts', 'src/index.ts', 'src/debug.ts'],
    },

    /**
     * Test timeout in milliseconds.
     *
     * Extended to 30 seconds to accommodate:
     * - Statistical tests running 10,000+ simulations
     * - Entropy quality validation tests
     * - Full simulation integration tests
     *
     * Individual tests can override this with test.timeout() if needed.
     */
    testTimeout: 30000,
  },
});
