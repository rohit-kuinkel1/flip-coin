# Flip Coin

A physically-based, deterministically-simulated, entropy-seeded libarary for high-stakes decision making... like coin flipping.

## Overview

Flip Coin is not your standard `Math.random() > 0.5`. It is a full physics engine dedicated to simulating a single coin flip. It features:

-   **Rigid Body Physics**: Simulates 3D rotation, gyroscopic forces, air drag, and collision impulses using an RK4 integrator.
-   **True Entropy**: Seeds the initial conditions using high-quality entropy sources (Crypto API + Timing jitter), ensuring unguessable outcomes.
-   **Deterministic Replay**: The physics simulation in itself is deterministic. Given the same seed, it produces the exact same trajectory, allowing for auditability and debug replay.
-   **Chaos**: The system is sensitive to initial conditions. Tiny variations in launch parameters (derived from entropy) lead to unpredictable outcomes.
-   **No "God Mode"**: The outcome is determined ONLY by physics. There is no `if (win)` logic. The coin settles where gravity and friction dictate.

## Installation

TODO

## Usage

### Basic Flip

The simplest use case uses default coin parameters (US Quarter) and standard entropy.

```typescript
import { flipCoin } from 'flip-coin';

async function decideFate() {
    try {
        const result = await flipCoin();
        console.log(`Outcome: ${result.outcome}`); // 'HEADS' or 'TAILS'
        console.log(`Time:Ms ${result.stats.simulationTime.toFixed(2)}`);
    } catch (error) {
        console.error('Flip failed:', error);
    }
}
```

### Precise Usage

You can customize the coin properties, toss strength, and entropy source.

```typescript
import { flipCoin } from 'flip-coin';

const result = await flipCoin({
    coin: {
        mass: 0.020, // 20g
        radius: 0.015, // 15mm
        thickness: 0.003 // 3mm
    },
    tossProfile: {
        linearVelocityRange: [4.0, 6.0], // m/s upwards
        angularVelocityRange: [20, 40]   // rad/s spin
    },
    entropyLevel: 'paranoid' 
});
```

### Deterministic Debugging

If you need to verify a flip or replay a specific scenario, use `debugFlipCoin`.

```typescript
import { debugFlipCoin } from 'flip-coin/debug';

const original = await debugFlipCoin({ recordTrajectory: true });
console.log('Seed:', original.seed);

const replay = await debugFlipCoin({ 
    seed: original.seed,
    recordTrajectory: true 
});

assert(original.outcome === replay.outcome);
assert(original.initialConditions.linearVelocity.equals(replay.initialConditions.linearVelocity));
```

## Architecture

The system is composed of four main stages:

1.  **Entropy Collection**: Gathers randomness from the environment.
2.  **Initial Condition Generation**: Maps randomness to launch vectors (Impulse, Torque).
3.  **Physics Simulation**:
    *   **Integrator**: Runge-Kutta 4th Order (RK4) for numerical stability.
    *   **Forces**: Gravity, Linear Drag, Angular Drag.
    *   **Collision**: Impulse-based response with restitution and friction.
4.  **Evaluation**: Checks stability and face orientation (Dot product of Normal vs Up).

## License

MIT
