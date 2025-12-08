import { collectEntropy, fromSeed } from './entropy/pool';
import { generateInitialCondition } from './simulation/initial';
import { integrate } from './physics/integrator';
import { handleCollision } from './physics/collision';
import { isStable } from './simulation/stability';
import { determineFace } from './evaluator/face';
import { RigidBody } from './physics/rigid-body';
import { Mat3 } from './physics/math/mat3';
import { Vec3 } from './physics/math/vec3';
import { Quaternion } from './physics/math/quaternion';
import type { RigidBodyState } from './physics/types/rigid-body-state';

import type { CoinConfig } from './types/coin-config';
import type { TossProfile } from './types/toss-profile';
import type { LaunchParameters } from './simulation/types/launch-parameters';
import { DEFAULT_LAUNCH_PARAMETERS } from './simulation/types/launch-parameters';
import { SimulationTimeoutError } from './simulation/errors/simulation-timeout-error';
import type { DebugFlipOptions } from './types/debug-flip-options';
import type { DebugFlipResult } from './types/debug-flip-result';

export type { DebugFlipOptions };
export type { DebugFlipResult };

/**
 * Re-export low-level math and state helpers so that external tooling
 * (for example, a Three.js visualization or a deterministic replay UI)
 * can consume the same immutable primitives used by the simulation.
 *
 * The visualization layer needs to read positions, orientations, and inertia
 * tensors to draw the trajectory. By exposing these here instead of duplicating
 * implementations, we guarantee identical numerical behavior between the
 * simulator and any debug overlays.
 *
 * Example:
 * -> A debugger can read a `RigidBodyState` frame, feed its `Quaternion` and
 *    `Vec3` values into a renderer, and be confident the numbers match the
 *    physics step because they share the same class definitions.
 */
export { Mat3, Vec3, Quaternion };
export type { RigidBodyState };

/**
 * Debug-mode coin flip simulation.
 *
 * This version of the controller includes features for debugging, validation,
 * and visualization:
 * - Deterministic replay via seeds or explicit initial conditions
 * - Trajectory recording
 * - Exposure of internal state
 *
 * It is kept separate from the main `flipCoin` controller to ensure the
 * production bundle remains lightweight and focused on performance/security.
 */
export async function debugFlipCoin(options: DebugFlipOptions = {}): Promise<DebugFlipResult> {
    const {
        entropyLevel = 'standard',
        coin: userCoinConfig = {},
        tossProfile = {},
        /**
         * Can raise default timeout for debug sessions if analyzing slow-mo
         * but as default we keep it at 5 seconds to avoid waiting too long.
         */
        timeout = 10000,
        seed: providedSeed,
        initialConditions: overrideInitialConditions,
        recordTrajectory = false,
    } = options;

    const coinConfig: Required<CoinConfig> = {
        mass: 0.00567,
        radius: 0.01213,
        thickness: 0.00175,
        ...userCoinConfig,
    };

    const dt = 0.0001;
    const maxConsecutiveStableFrames = 10;

    /**
     * We don't implement full retry logic in debug for simplicity.
     * Usually debug replay wants to see exactly what happens, so we might just return the result even if it's EDGE?
     * But to match `FlipResult` outcome type, we must return Heads/Tails.
     *
     * Let's stick to single-shot for debug (no retries) to keep it deterministic and simple to analyze.
     * We'll throw if it lands on edge for now in debug mode.
     */

    /**
     * 1. Resolve Entropy / Seed
     */
    let entropyBytes: Uint8Array;
    let seedUsed: Uint8Array;

    if (providedSeed) {
        /**
         * Expand the provided seed to ensure we have enough bytes for generation.
         * fromSeed utility in pool.ts does this.
         */
        seedUsed = providedSeed;
        entropyBytes = await fromSeed(providedSeed);
    } else {
        const entropyResult = await collectEntropy({ level: entropyLevel });
        /**
         * We use the collected entropy as the SEED for this run.
         * We then expand it via fromSeed() to ensure we have a consistent,
         * reproducible stream of bytes (and enough of them!) for the simulation.
         */
        seedUsed = entropyResult.bytes;
        entropyBytes = await fromSeed(seedUsed);
    }

    /**
     * Generate Initial Conditions
     * First we define the default launch params.
     * Then the initial conditions are generated from the entropy bytes.
     * We then setup our physics engine with the initial conditions and finally
     * let it rip.
     */
    const launchParams = mapTossProfileToLaunchParams(tossProfile, DEFAULT_LAUNCH_PARAMETERS);
    const generatedState = generateInitialCondition(entropyBytes, launchParams);
    const initialState: RigidBodyState = {
        position: overrideInitialConditions?.position ?? generatedState.position,
        orientation: overrideInitialConditions?.orientation ?? generatedState.orientation,
        linearVelocity: overrideInitialConditions?.linearVelocity ?? generatedState.linearVelocity,
        angularVelocity: overrideInitialConditions?.angularVelocity ?? generatedState.angularVelocity,
    };

    const r = coinConfig.radius;
    const h = coinConfig.thickness;
    const m = coinConfig.mass;

    const I_yy = 0.5 * m * r * r;
    const I_xx = (1 / 12) * m * (3 * r * r + h * h);
    const inertiaTensor = new Mat3(I_xx, 0, 0, 0, I_yy, 0, 0, 0, I_xx);

    const body = new RigidBody(
        m,
        inertiaTensor,
        r,
        h,
        initialState.position.clone(),
        initialState.orientation.clone(),
        initialState.linearVelocity.clone(),
        initialState.angularVelocity.clone()
    );

    const trajectory: RigidBodyState[] = [];
    if (recordTrajectory) {
        trajectory.push(captureState(body));
    }

    const startTimeStamp = performance.now();
    let consecutiveStableCount = 0;
    let elapsedSimulationTime = 0;

    let bounceCount = 0;
    while (elapsedSimulationTime < timeout) {
        integrate(body, dt);

        if (recordTrajectory) {
            trajectory.push(captureState(body));
        }

        /**
         * Ground damping: bleed energy when the coin is close to the surface.
         *
         * We treat "near ground" as y < radius, which corresponds to the coin's
         * center being at or below the point where a perfectly flat coin would
         * contact the plane. When this triggers, we apply a simple exponential
         * decay to both linear and angular velocity:
         *
         * -> v_new = v_old * 0.8
         * -> ω_new = ω_old * 0.8
         *
         * Example:
         * -> linear speed = 1.0 m/s near ground
         * -> after damping: 1.0 * 0.8 = 0.8 m/s
         * -> after two frames: 0.8 * 0.8 = 0.64 m/s
         *
         * This artificial damping compensates for the coarse collision model
         * and floating-point accumulation errors that could otherwise leave
         * the coin jittering on the surface indefinitely.
         */
        if (body.position.y < coinConfig.radius) {
            body.angularVelocity = body.angularVelocity.scale(0.8);
            body.linearVelocity = body.linearVelocity.scale(0.8);
        }

        const collisionMsg = handleCollision(body);
        if (collisionMsg.colliding) {
            bounceCount++;
        }

        if (isStable(body)) {
            consecutiveStableCount++;
        } else {
            consecutiveStableCount = 0;
        }

        if (consecutiveStableCount >= maxConsecutiveStableFrames) {
            break;
        }

        elapsedSimulationTime += dt * 1000;
    }

    const runTime = performance.now() - startTimeStamp;

    if (consecutiveStableCount < maxConsecutiveStableFrames) {
        throw new SimulationTimeoutError(timeout, runTime);
    }

    const face = determineFace(body);
    if (face === 'EDGE') {
        throw new Error("Debug simulation landed on EDGE. Automatic retry is disabled in debug mode.");
    }

    return {
        outcome: face,
        seed: seedUsed,
        initialConditions: initialState,
        trajectory: recordTrajectory ? trajectory : undefined,
        stats: {
            simulationTime: runTime,
            entropyBitsUsed: entropyBytes.length * 8,
            bounceCount: bounceCount,
            retryCount: 0
        }
    };
}

function captureState(body: RigidBody): RigidBodyState {
    return {
        position: body.position.clone(),
        orientation: body.orientation.clone(),
        linearVelocity: body.linearVelocity.clone(),
        angularVelocity: body.angularVelocity.clone()
    };
}

/**
 * Duplicated helper (or export it from controller? Unlikely to export private helper).
 */
function mapTossProfileToLaunchParams(
    profile: TossProfile,
    defaults: LaunchParameters
): LaunchParameters {
    const params = { ...defaults };
    if (profile.linearVelocityRange) {
        const [min, max] = profile.linearVelocityRange;
        params.impulseMean = (min + max) / 2;
        params.impulseStdDev = (max - min) / 4;
    }
    if (profile.angularVelocityRange) {
        const [min, max] = profile.angularVelocityRange;
        params.angularVelocityMean = (min + max) / 2;
        params.angularVelocityStdDev = (max - min) / 4;
    }
    if (profile.heightRange) {
        const [min, max] = profile.heightRange;
        params.initialPosition = new Vec3(0, (min + max) / 2, 0);
    }
    return params;
}
