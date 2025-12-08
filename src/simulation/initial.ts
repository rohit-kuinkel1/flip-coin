import type { RigidBodyState } from '../physics/types/rigid-body-state';
import type { LaunchParameters } from './types/launch-parameters';
import { DEFAULT_LAUNCH_PARAMETERS } from './types/launch-parameters';
import { Vec3 } from '../physics/math/vec3';

/**
 * Generates the initial physical state of the coin for a new simulation.
 *
 * This function is the bridge between the entropy system and the physics engine.
 * It consumes raw entropy bytes to sample from the statistical distributions
 * defined in the LaunchParameters, producing a unique, randomized start state.
 *
 * ## Process
 *
 * 1. **Stream Entropy**: Wraps the entropy buffer to consume bytes sequentially.
 * 2. **Sample Impulse**: Generates a Gaussian-distributed vertical impulse.
 * 3. **Sample Spin**: Generates a Gaussian-distributed angular speed.
 * 4. **Micro-variations**: Perturbs the spin axis to introduce wobble.
 * 5. **Construct State**: Assembles the position, rotation, and velocities.
 *
 * ## Random Number Generation
 *
 * We use the Box-Muller transform to turn Uniform(0,1) entropy into
 * Normal(mean, stdDev) values.
 * -> z0 = sqrt(-2 ln(u1)) * cos(2 pi u2)
 * -> z1 = sqrt(-2 ln(u1)) * sin(2 pi u2)
 *
 * @param entropy - Raw entropy bytes from the EntropyPool (recommended >= 32 bytes).
 * @param params - Configuration for the toss (optional, defaults to standard human toss).
 * @returns A fully populated RigidBodyState ready for integration.
 */
export function generateInitialCondition(
    entropy: Uint8Array,
    params: LaunchParameters = DEFAULT_LAUNCH_PARAMETERS
): RigidBodyState {
    const reader = new EntropyReader(entropy);

    /**
     * Calculate Linear Velocity (Vertical Impulse)
     * We assume the launch is primarily vertical (Y-axis).
     * Future work could add horizontal drift parameters.
     */
    const impulseMag = reader.nextGaussian(
        params.impulseMean,
        params.impulseStdDev
    );
    const linearVelocity = new Vec3(0, impulseMag, 0);

    /**
     * Calculate Angular Velocity (Spin)
     */
    const spinMag = reader.nextGaussian(
        params.angularVelocityMean,
        params.angularVelocityStdDev
    );

    /**
     * Calculate Spin Axis (with wobble)
     * We perturb the ideal axis by adding a small random vector.
     * axis_final = normalize(axis_ideal + random * wobble)
     */
    const perturbation = new Vec3(
        reader.nextGaussian(0, params.spinAxisStdDev),
        reader.nextGaussian(0, params.spinAxisStdDev),
        reader.nextGaussian(0, params.spinAxisStdDev)
    );

    /**
     * Create base axis from config (cloned to avoid mutation)
     * Ensure input is normalized
     */
    const axis = new Vec3(
        params.spinAxis.x,
        params.spinAxis.y,
        params.spinAxis.z
    ).normalize();

    /**
     * Add perturbation and re-normalize
     */
    const finalAxis = axis.add(perturbation).normalize();
    const angularVelocity = finalAxis.scale(spinMag);

    return {
        position: params.initialPosition,
        /**
         * Vec3 is immutable, safe to reuse reference if strict.
         * But better to clone if we want total isolation?
         * Vec3 in this codebase seems to be immutable structure but let's check.
         * Based on Phase 1 check, Vec3 ops return new instances.
         * But params.initialPosition IS an instance.
         * We return it directly. The receiver shouldn't mutate it.
         */
        linearVelocity,
        orientation: params.initialOrientation,
        angularVelocity
    };
}

/**
 * Helper class to consume entropy bytes and generate numbers.
 * Normally we would have this in a separate class but due to the 
 * nature of this being so tightly coupled with @see generateInitialCondition
 * we will just keep it here.
 */
class EntropyReader {
    private offset = 0;

    constructor(private readonly data: Uint8Array) { }

    /**
     * Consumes 4 bytes to generate a uniform float in [0, 1).
     * Uses 32-bit unsigned integer normalization.
     */
    nextUniform(): number {
        if (this.offset + 4 > this.data.length) {
            /**
             * Fallback if we run out of entropy: use Math.random()
             * In a strict environment we might throw, but for visual simulation,
             * graceful degradation is preferred.
             */
            return Math.random();
        }

        /**
         * Read 32-bit integer (Big Endian or Little Endian doesn't matter for randomness)
         * We simply construct a u32.
         */
        const u32 = (this.data[this.offset]! << 24) |
            (this.data[this.offset + 1]! << 16) |
            (this.data[this.offset + 2]! << 8) |
            (this.data[this.offset + 3]!);

        this.offset += 4;

        /**
         * Normalize to [0, 1) using 0xFFFFFFFF + 1
         * We use >>> 0 to ensure unsigned interpretation
         */
        return (u32 >>> 0) / 4294967296;
    }

    /**
     * Generates a normally distributed number N(mean, stdDev).
     * Uses Box-Muller transform.
     */
    nextGaussian(mean: number, stdDev: number): number {
        const u1 = this.nextUniform();
        const u2 = this.nextUniform();

        /**
         * Box-Muller
         * We check for u1 close to 0 to avoid log(0)
         */
        const safeU1 = u1 < 1e-10 ? 1e-10 : u1;
        const z0 = Math.sqrt(-2.0 * Math.log(safeU1)) * Math.cos(2.0 * Math.PI * u2);

        return mean + z0 * stdDev;
    }
}
