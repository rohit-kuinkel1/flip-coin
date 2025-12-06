# Claude Code Style Preferences

This file documents coding conventions and preferences for this project. Claude should follow these guidelines when generating or modifying code.

---

## Comments Policy

**No single-line comments.** Every comment must be a block comment that explains:

1. **WHAT** — What does this code do?
2. **WHY** — Why was this approach chosen? What problem does it solve?
3. **HOW** — For mathematical/algorithmic code, show the formula and a worked example.

### Mathematical Comments

For any code involving math, physics, or algorithms, comments should include:

- **The formula** using clear notation
- **Arrow notation** (`->`) for step-by-step derivations
- **A concrete example** with actual numbers worked through

```typescript
/**
 * BAD - Single line comment, no context
 */
// Calculate dot product

/**
 * BAD - Block comment but too terse
 */
/**
 * Computes the dot product with another vector.
 */

/**
 * GOOD - Shows formula, derivation, and worked example
 */
/**
 * Computes the dot product (scalar product) with another vector.
 *
 * For two vectors v1 = (x1, y1, z1) and v2 = (x2, y2, z2), the dot product is:
 * -> v1 · v2 = x1 * x2 + y1 * y2 + z1 * z2
 *
 * Example: (1, 2, 3) · (4, -5, 6)
 * -> = (1 * 4) + (2 * -5) + (3 * 6)
 * -> = 4 + (-10) + 18
 * -> = 12
 *
 * The dot product relates to the cosine of the angle between vectors:
 * -> v1 · v2 = |v1| * |v2| * cos(θ)
 *
 * This is essential for projecting vectors onto axes or calculating work/energy.
 */
```

### General Comments

For non-mathematical code, explain the reasoning and design decisions:

```typescript
/**
 * GOOD - Explains what AND why
 */
/**
 * Calculates the instantaneous velocity from position delta and timestep.
 *
 * We use central difference (pos[t+1] - pos[t-1]) / (2*dt) instead of
 * forward difference for better numerical accuracy, especially important
 * when the physics simulation runs at 10kHz where small errors accumulate.
 */
```

If a piece of code is self-explanatory and doesn't need context, **don't comment it at all**. Comments should add value, not noise.

---

## File Organization

### One Type Per File

Each TypeScript type, interface, or class should be in its own dedicated file. Do not bundle multiple unrelated types into a single file.

```
BAD:
  src/types.ts  (contains Vec3, Mat3, Quaternion, CoinState, FlipResult...)

GOOD:
  src/physics/math/vec3.ts
  src/physics/math/mat3.ts
  src/physics/math/quaternion.ts
  src/types/coin-state.ts
  src/types/flip-result.ts
```

**Rationale:**
- Easier to locate specific types
- Cleaner git diffs (changes isolated to relevant file)
- Better tree-shaking potential
- Avoids circular dependency issues

**Exception:** Closely related types that are always used together (e.g., `FlipOptions` and `FlipResult`) may share a file if it makes semantic sense.

---

## Formatting Preferences

### No Emojis in Documentation or Code

Use plain text markers in markdown files:
- `[x]` for completed items
- `[ ]` for incomplete items
- `COMPLETE`, `IN PROGRESS`, `NOT STARTED` for status text

### Block Over Inline

Prefer block-style formatting for readability:
- Block comments over line comments
- Multi-line object literals over single-line
- Explicit returns over implicit (when it aids clarity)

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `rigid-body.ts`, `coin-state.ts` |
| Classes | PascalCase | `RigidBody`, `EntropyPool` |
| Interfaces | PascalCase | `CoinState`, `FlipOptions` |
| Types | PascalCase | `Face`, `EntropyLevel` |
| Functions | camelCase | `flipCoin`, `determineFace` |
| Constants | SCREAMING_SNAKE | `GRAVITY`, `DEFAULT_TIMESTEP` |
| Variables | camelCase | `angularVelocity`, `bounceCount` |

---

## Testing Conventions

- All tests go in `tests/` directory (not co-located with source)
- Test files mirror source structure: `src/physics/math/vec3.ts` -> `tests/physics/math/vec3.test.ts`
- Use descriptive test names that explain the scenario being tested

---

## General Principles

1. **Explicit over implicit** — Prefer clarity even if its more verbose
2. **Document the why** — Code shows what, comments explain why
3. **Single responsibility** — Each file/function does one thing well
4. **No magic numbers** — Use named constants with explanatory comments
5. **One file per type** — Each type, interface, or class should be in its own dedicated file, no exceptions
6. **Default Value** - If a type has a default value, define it in the same file that the type is defined in and export it
