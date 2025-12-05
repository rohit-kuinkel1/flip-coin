# Proposed Technology Stack

## Overview

This document outlines the technology stack for the `flip-coin` library. The stack prioritizes:
- **Dual-environment support** (Browser + Node.js)
- **Zero runtime dependencies** for the core library
- **Developer experience** with modern tooling
- **Bundle size minimization** for browser usage

---

## Core Stack

| Category | Choice | Rationale |
|----------|--------|-----------|
| **Language** | TypeScript 5.x | Type safety, excellent IDE support, required by spec |
| **Runtime** | Browser + Node.js 18+ | Dual-target as per requirements |
| **Package Manager** | pnpm | Fast, disk-efficient, strict dependency resolution |

---

## Build & Bundling

| Tool | Purpose | Rationale |
|------|---------|-----------|
| **tsup** | Build & bundle | Zero-config, built on esbuild, outputs ESM + CJS + types in one command |
| **esbuild** | Bundler (via tsup) | Blazing fast, tree-shaking, handles dual-format output |

### Output Formats
```
dist/
├── index.js        # ESM (modern browsers, Node.js ESM)
├── index.cjs       # CommonJS (legacy Node.js)
├── index.d.ts      # TypeScript declarations
└── debug.js        # Separate debug API entry (tree-shakeable)
```

### Why tsup over alternatives?

| Alternative | Issue |
|-------------|-------|
| tsc only | No bundling, manual dual-format handling |
| Rollup | More config, slower |
| Webpack | Overkill for a library |
| Vite (library mode) | Good option, but tsup is more library-focused |

---

## Testing

| Tool | Purpose | Rationale |
|------|---------|-----------|
| **Vitest** | Unit & integration tests | Fast, native ESM, TypeScript-first, Jest-compatible API |
| **@vitest/coverage-v8** | Code coverage | Built-in, no extra config |

### Test Categories

1. **Unit Tests** — Math primitives, individual physics functions
2. **Integration Tests** — Full simulation runs
3. **Statistical Tests** — 10,000+ flips for distribution validation
4. **Entropy Quality Tests** — Randomness validation (custom suite)

---

## Code Quality

| Tool | Purpose |
|------|---------|
| **ESLint** | Linting with TypeScript rules |


### ESLint Config
- `@typescript-eslint/recommended`
- `eslint-config-prettier` (disable conflicting rules)

---

---

## Optional: Visualization

| Tool | Purpose | Notes |
|------|---------|-------|
| **Three.js** | 3D debug visualization | Peer dependency, not bundled |
| **Vite** | Dev server for visualization demo | Dev dependency only |

The visualization module will be a **separate entry point** (`flip-coin/visualization`) with Three.js as a peer dependency. This keeps the core library at **0 runtime dependencies**.

---

## Dependency Summary

### Production Dependencies
```json
{
  "dependencies": {}  // ZERO - all logic is self-contained
}
```

### Dev Dependencies
```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsup": "^8.0.0",
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "prettier": "^3.1.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0",
    "typedoc": "^0.25.0"
  }
}
```

### Peer Dependencies (optional visualization)
```json
{
  "peerDependencies": {
    "three": ">=0.150.0"
  },
  "peerDependenciesMeta": {
    "three": { "optional": true }
  }
}
```

---

## Node.js Version

**Minimum: Node.js 18 LTS**
- Native `crypto.getRandomValues()` support via `webcrypto`
- Native `fetch` for Quantum API calls
- ESM support stable

---

## Browser Support

**Target: ES2020+**
- All modern browsers (Chrome 80+, Firefox 73+, Safari 14+, Edge 80+)
- No IE11 support
- Relies on `crypto.getRandomValues()` (universal in ES2020 browsers)

---

## Alternatives Considered

| Category | Rejected Option | Reason |
|----------|-----------------|--------|
| Package Manager | npm / yarn | pnpm is faster and stricter |
| Bundler | Rollup | More config, tsup handles everything |
| Test Runner | Jest | Slower, ESM support is awkward |
| Build Tool | Vite | Great for apps, tsup is better for libraries |

---

