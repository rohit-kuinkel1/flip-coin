import { collectEntropy } from '../entropy/pool';
import { generateInitialCondition } from './initial';
import { integrate } from '../physics/integrator';
import { handleCollision } from '../physics/collision';
import { isStable } from './stability';
import { determineFace } from '../evaluator/face';
import { RigidBody } from '../physics/rigid-body';
import { Mat3 } from '../physics/math/mat3';
import { Vec3 } from '../physics/math/vec3';
import type { FlipOptions } from '../types/flip-options';
import type { FlipResult } from '../types/flip-result';
import type { CoinConfig } from '../types/coin-config';
import { defaultCoinConfig } from '../types/coin-config';
import type { TossProfile } from '../types/toss-profile';
import type { LaunchParameters } from './types/launch-parameters';
import { DEFAULT_LAUNCH_PARAMETERS } from './types/launch-parameters';
import { SimulationTimeoutError } from './errors/simulation-timeout-error';
import { EdgeRetryExhaustedError } from './errors/edge-retry-exhausted-error';

/**
 * Orchestrates the coin flip simulation.
 *
 * This function serves as the "brain" of the operation, coordinating:
 * 1. Entropy collection (randomness source)
 * 2. Initial condition generation (physics state)
 * 3. Rigid body simulation loop (RK4 integration)
 * 4. Stability detection (knowing when to stop)
 * 5. Outcome evaluation (heads/tails)
 *
 * Unlike a simple random number generator, this controller physically simulates
 * the trajectory of the coin. It is deterministic given the initial conditions,
 * but the initial conditions are seeded by high-quality entropy.
 *
 * @param options Configuration for the flip simulation.
 * @returns Promise resolving to the flip result.
 */
export async function flipCoin(options: FlipOptions = {}): Promise<FlipResult> {
    /**
     * FlipOptions are the custom parameters that the user can provide to configure the flip.
     * If the user has specified a value for a parameter then we need to use the provided
     * value, else we just define a default value and move forward with that.
     */
    const {
        entropyLevel = 'standard',
        coinConfig: userCoinConfig = {},
        tossProfile = {},
        timeout = 10000,
        maxEdgeRetries = 5,
    } = options;

    /**
     * Note: we cant just assign defaultConfig to coinConfig up front for the 
     * default values in options because it would technically work, but only if
     * the user passed nothing, then coinConfig would correctly be set to the 
     * defaultCoinConfig. But if the user passes partial values, like for instance
     * for radius and thickness only but avoids mass, then our approach will just
     * break the wanted behavior if we were to assign defaultCoinConfig in options
     * itself without using spread operator here like this.
     * 
     * Also note that the order matters here.
     */
    const coinConfig: Required<CoinConfig> = {
        ...defaultCoinConfig,
        ...userCoinConfig,
    };

    /**
     * 10kHz fixed timestep.
     * 10kHz because f = 1/T and 1/0.0001 results in 10kHz.
     * 
     * High frequency is needed for accurate rigid body physics.
     */
    const dt = 0.0001;

    /**
     * Frames to hold stable before stopping.
     * Ensures we don't stop prematurely if the coin briefly pauses at an apex.
     * Basically, only consider a stop as a stop if the coin actually didnt move
     * for a number of frames which currently we have defined to be here under 
     * maxConsecutiveStableFrames.
     */
    const maxConsecutiveStableFrames = 10;

    let retries = 0;
    while (true) {
        /**
         * Collect Entropy
         * We collect fresh entropy for every attempt (including retries).
         */
        const entropyResult = await collectEntropy({ level: entropyLevel });
        const entropyBytes = entropyResult.bytes;

        /**
         * Generate Initial Conditions
         * Convert public TossProfile to internal LaunchParameters
         */
        const launchParams = mapTossProfileToLaunchParams(tossProfile, DEFAULT_LAUNCH_PARAMETERS);
        const initialState = generateInitialCondition(entropyBytes, launchParams);

        /**
         * Setup Physics Body
         * Calculate Inertia Tensor for a cylinder (coin).
         * Local Y-axis is the cylinder axis (thickness).
         * I_yy = 0.5 * m * r^2
         * I_xx = I_zz = 1/12 * m * (3r^2 + h^2)
         */
        const r = coinConfig.radius;
        const h = coinConfig.thickness;
        const m = coinConfig.mass;

        const I_yy = 0.5 * m * r * r;
        const I_xx = (1 / 12) * m * (3 * r * r + h * h);

        const inertiaTensor = new Mat3(
            I_xx, 0, 0,
            0, I_yy, 0,
            0, 0, I_xx
            /**
             * I_zz = I_xx due to cylinder symmetry.
             */
        );

        const body = new RigidBody(
            m,
            inertiaTensor,
            r,
            h,
            initialState.position,
            initialState.orientation,
            initialState.linearVelocity,
            initialState.angularVelocity
        );

        /**
         * Run Physics Simulation Loop
         */
        const startTime = performance.now();
        /**
         * TODO: Hook into collision callbacks to count this if needed.
         * Currently returns 0 as placeholder.
         */
        let bounceCount = 0;
        let consecutiveStableCount = 0;
        let elapsedSimulationTime = 0;

        /**
         * Safety break against infinite loops.
         */
        while (elapsedSimulationTime < timeout) {
            /**
             * Integrate one step.
             *
             * Application of Newton-Euler equations of motion to update the state
             * (position, orientation, velocities) of the coin by a discrete time step `dt`.
             * This discrete integration is the core of the trajectory simulation.
             */
            integrate(body, dt);

            /**
             * GROUND DAMPING
             * If the coin is rolling/spinning on the ground, apply extra damping to ensure it settles.
             * This helps dissipate energy that might otherwise keep the coin jittering due to floating point accumulation.
             */
            if (body.position.y < coinConfig.radius) {
                /**
                 * Apply 20% damping per step (exponential decay) to ensure it overcomes gravity accumulation.
                 * This ensures the coin settles on the ground and doesn't jitter indefinitely.
                 */
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
            /**
             * Convert dt (sec) to ms estimation for timeout check.
             */

            /**
             * Allow event loop to breathe
             * Since this is a busy loop in JS, it blocks.
             * For very long simulations, we might want to await setImmediate/setTimeout every N steps.
             * Given 10kHz, 5000 steps is 0.5s simulated time.
             * 5000 steps might take 10-100ms real time. Blocking is likely fine for 'standard' throws.
             */
        }

        const endTime = performance.now();
        const runTime = endTime - startTime;

        if (consecutiveStableCount < maxConsecutiveStableFrames) {
            throw new SimulationTimeoutError(timeout, runTime);
        }

        /**
         * Now time to evaluate the result. Lets see if the face
         * was EDGE, if so, we need to retry until we run out of 
         * retries, in which case, a EdgeRetryExhaustedError is thrown
         * and we break out of the loop.
         */
        const face = determineFace(body);
        if (face === 'EDGE') {
            retries++;
            if (retries > maxEdgeRetries) {
                throw new EdgeRetryExhaustedError(maxEdgeRetries);
            }
            continue;
        }

        return {
            outcome: face,
            stats: {
                simulationTime: runTime,
                entropyBitsUsed: entropyResult.stats.totalBits,
                bounceCount: bounceCount,
                /**
                 * Placeholder until physics hooks are added.
                 */
                retryCount: retries,
            },
        };
    }
}

/**
 * Helper to map public TossProfile to internal LaunchParameters.
 */
function mapTossProfileToLaunchParams(
    profile: TossProfile,
    defaults: LaunchParameters
): LaunchParameters {
    const params = { ...defaults };

    if (profile.linearVelocityRange) {
        const [min, max] = profile.linearVelocityRange;
        params.impulseMean = (min + max) / 2;
        /**
         * Assume range covers approx 4 standard deviations (±2 sigma).
         */
        params.impulseStdDev = (max - min) / 4;
    }

    if (profile.angularVelocityRange) {
        const [min, max] = profile.angularVelocityRange;
        params.angularVelocityMean = (min + max) / 2;
        params.angularVelocityStdDev = (max - min) / 4;
    }

    if (profile.heightRange) {
        const [min, max] = profile.heightRange;
        /**
         * We pick the mean height for the start position.
         * Variations are handled by the launch impulse, but technically
         * if we want to vary START position, we can't easily do it with
         * clean LaunchParameters without modifying generateInitialCondition to accept position jitter.
         * For now, setting the mean initial Y is reasonable.
         */
        params.initialPosition = new Vec3(0, (min + max) / 2, 0);
    }

    return params;
}
