# flip-coin Development Progress

---

## Misc

Cross-cutting infrastructure and shared utilities.

- [x] Base error class — `src/common/errors/`
  - `BaseError.ts` — Abstract base class for all custom errors (extends `Error`)
  - `BaseErrorOptions.ts` — Options interface with `cause` and `context` support
  - `index.ts` — Barrel export
  - Domain-specific errors extend `BaseError` and live in their own `errors/` subdirectory
- [x] Entropy errors — `src/entropy/errors/`
  - `EntropySourceUnavailableError` — Source not available in environment
  - `EntropyCollectionTimeoutError` — Individual source timed out
  - `EntropyCollectionFailedError` — All sources failed after time budget
  - `InsufficientEntropyBufferError` — Buffer too small for operation

---

## Phase 0: Project Scaffolding

**Status: COMPLETE**

- [x] Initialize pnpm project
- [x] Install dev dependencies
- [x] Configure TypeScript (`tsconfig.json`)
- [x] Configure tsup bundler (`tsup.config.ts`)
- [x] Configure Vitest testing (`vitest.config.ts`)
- [x] Configure ESLint (`eslint.config.js`)
- [x] Configure Prettier (`.prettierrc`)
- [x] Document stack decisions (`docs/STACK.md`)
- [x] Create CLAUDE.md with code style preferences

### npm Scripts Available

| Script | Purpose |
|--------|---------|
| `pnpm build` | Build ESM + CJS + .d.ts to dist/ |
| `pnpm dev` | Build in watch mode |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:run` | Run tests once |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm lint` | Lint source files |
| `pnpm typecheck` | Type-check without emitting |

---

## Phase 1: Math Primitives

**Status: COMPLETE**

Core mathematical types for 3D physics. These are foundational — every other module depends on them.

- [x] Vec3 (3D vector) — `src/physics/math/vec3.ts`
- [x] Mat3 (3x3 matrix) — `src/physics/math/mat3.ts`
- [x] Quaternion (rotation) — `src/physics/math/quaternion.ts`
- [x] Vec3 unit tests — `tests/physics/math/vec3.test.ts` (15 tests)
- [x] Mat3 unit tests — `tests/physics/math/mat3.test.ts` (67 tests)
- [x] Quaternion unit tests — `tests/physics/math/quaternion.test.ts` (21 tests)

**Total: 103 tests passing**

### Vec3 Requirements
- Basic operations: add, subtract, scale, dot, cross
- Magnitude, normalize, distance
- Immutable API (operations return new instances)

### Mat3 Requirements
- Matrix multiplication
- Transpose, determinant, inverse
- Used for inertia tensor calculations

### Quaternion Requirements
- Normalize, conjugate, inverse
- Quaternion multiplication
- Rotate vector by quaternion
- Convert to/from axis-angle
- Quaternion derivative for angular velocity integration

---

## Phase 2: Entropy System

**Status: CORE COMPLETE, OPTIONAL SOURCES NOT IMPLEMENTED**

True randomness collection from multiple sources.

### Core Implementation (Complete)
- [x] Entropy pool — `src/entropy/pool.ts`
- [x] Mixer (hash-based) — `src/entropy/mixer.ts`
- [x] Timer jitter source — `src/entropy/sources/timing.ts`
- [x] Crypto API source — `src/entropy/sources/crypto.ts`
- [x] Pool unit tests — `tests/entropy/pool.test.ts`
- [x] Mixer unit tests — `tests/entropy/mixer.test.ts`
- [x] Crypto source tests — `tests/entropy/sources/crypto.test.ts`
- [x] Timing source tests — `tests/entropy/sources/timing.test.ts`
- [x] Graceful degradation (works with timing-only if crypto unavailable)
- [x] Per-source timeouts and silent skip on failure

### Optional Entropy Sources (NOT IMPLEMENTED YET BUT THIS WILL DEFINITELY BE IMPLEMENTED)
The following sources are described in ARCHITECTURE.md but are **not implemented**:
- [ ] Quantum API source — `src/entropy/sources/quantum.ts`
  - Would require external API (ANU QRNG, random.org)
  - Adds network dependency
- [ ] Audio noise source — `src/entropy/sources/audio.ts`
  - Requires microphone permission
  - Browser-only (navigator.mediaDevices)
- [ ] User input timing source — `src/entropy/sources/input.ts`
  - Requires active user interaction
  - DOM event listeners

*These sources are marked as optional enhancements for now. The core entropy system is fully functional with crypto + timing sources. Timer jitter alone is the minimum viable fallback. We will however definitely implement them in the future.*

### Architectural Notes
- **Stateless Pool**: The current implementation uses one-shot collection rather than
  a persistent entropy buffer that depletes/refills. This is simpler and sufficient
  for the coin flip use case where each flip collects fresh entropy.
- **No Entropy Accumulation Buffer**: Unlike `/dev/random`, we don't track accumulated
  bits across calls. Each `collectEntropy()` call is independent.

**Current Total: 172 tests passing, 3 skipped**

---

## Phase 3: Physics Engine

**Status: IN PROGRESS**

3D rigid body dynamics simulation.

- [x] Rigid body state — `src/physics/rigid-body.ts`
- [x] Rigid body tests — `tests/physics/rigid-body.test.ts`
- [ ] Force calculations — `src/physics/forces.ts`
- [ ] Force calculation tests — `tests/physics/forces.test.ts`
- [ ] RK4 integrator — `src/physics/integrator.ts`
- [ ] Integrator tests — `tests/physics/integrator.test.ts`
- [ ] Collision detection — `src/physics/collision.ts`
- [ ] Collision tests — `tests/physics/collision.test.ts`

---

## Phase 4: Result Evaluator

**Status: NOT STARTED**

Determine flip outcome from final coin state.

- [ ] Face determination — `src/evaluator/face.ts`
- [ ] Face determination tests — `tests/evaluator/face.test.ts`
- [ ] Stability detection — `src/simulation/stability.ts`
- [ ] Stability detection tests — `tests/simulation/stability.test.ts`

---

## Phase 5: Simulation Controller

**Status: NOT STARTED**

Orchestrate the full flip process.

- [ ] Initial condition generator — `src/simulation/initial.ts`
- [ ] Initial condition tests — `tests/simulation/initial.test.ts`
- [ ] Main simulation loop — `src/simulation/controller.ts`
- [ ] Controller tests — `tests/simulation/controller.test.ts`
- [ ] Public API exports — `src/index.ts`
- [ ] Debug API exports — `src/debug.ts`
- [ ] Type definitions — `src/types/*.ts`
- [ ] Integration tests — `tests/integration/*.test.ts`

---

## Phase 6: Validation and Polish

**Status: NOT STARTED**

Statistical validation and final touches.

- [ ] Statistical distribution tests — `tests/statistical/*.test.ts`
- [ ] Entropy quality tests — `tests/entropy/quality.test.ts`
- [ ] README documentation — `README.md`
- [ ] API documentation — TypeDoc comments

---

## Phase 7: Visualization (Optional)

**Status: NOT STARTED**

Three.js debug visualization.

- [ ] Scene setup — `src/visualization/scene.ts`
- [ ] Coin mesh — `src/visualization/coin-mesh.ts`
- [ ] Trajectory replay — `src/visualization/replay.ts`
