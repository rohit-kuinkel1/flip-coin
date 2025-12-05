/**
 * =============================================================================
 * ESLINT FLAT CONFIGURATION
 * =============================================================================
 *
 * ESLint 9+ uses the new "flat config" format (eslint.config.js) instead of
 * the legacy .eslintrc format. This provides better performance and clearer
 * configuration through explicit JavaScript.
 *
 * This configuration enforces:
 * - TypeScript-specific best practices
 * - Explicit function return types (important for a physics library)
 * - No console.log in production code
 * - Consistent code style
 *
 * @see https://eslint.org/docs/latest/use/configure/configuration-files-new
 */

import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  /**
   * Global ignore patterns.
   *
   * These directories are excluded from linting entirely:
   * - dist/: Compiled output (generated code)
   * - node_modules/: Third-party dependencies
   * - coverage/: Test coverage reports
   */
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },

  /**
   * Base ESLint recommended rules.
   *
   * These are language-agnostic JavaScript best practices that apply
   * to all files. TypeScript-specific rules are added in the next block.
   */
  eslint.configs.recommended,

  /**
   * TypeScript-specific configuration.
   *
   * Applied only to .ts files. Uses the TypeScript parser and plugin
   * to enable type-aware linting rules.
   */
  {
    files: ['**/*.ts'],

    /**
     * Language options configure how ESLint parses the code.
     *
     * We use the TypeScript parser with project-aware type information,
     * which enables powerful rules that understand TypeScript's type system.
     */
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },

    plugins: {
      '@typescript-eslint': tseslint,
    },

    rules: {
      /**
       * Include all recommended TypeScript-ESLint rules as a baseline.
       * These catch common TypeScript mistakes and anti-patterns.
       */
      ...tseslint.configs.recommended.rules,

      /**
       * Require explicit return types on functions.
       *
       * For a physics library where numerical precision matters, explicit
       * return types serve as documentation and catch unintended type
       * inference. For example, ensuring a function returns `number`
       * instead of accidentally returning `number | undefined`.
       *
       * Set to 'warn' during development; consider 'error' for CI.
       */
      '@typescript-eslint/explicit-function-return-type': 'warn',

      /**
       * Disallow unused variables, with exception for underscore-prefixed.
       *
       * Unused variables often indicate incomplete refactoring or dead code.
       * The underscore prefix exception (e.g., `_unused`) allows intentionally
       * ignored parameters, common in callbacks and interface implementations.
       */
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],

      /**
       * Warn on console.log usage.
       *
       * Console statements should not appear in production library code.
       * Warnings allow them during development while flagging them for
       * removal before release. The debug API has proper logging mechanisms.
       */
      'no-console': 'warn',
    },
  },
];
