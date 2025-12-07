import { Vec3 } from '../math/vec3';

/**
 * Container for all forces and torques acting on a rigid body at a given instant.
 *
 * This is the output of computeForces() and serves as input to the integrator.
 * Separating force calculation from integration keeps the code modular and testable.
 */
export interface ForceAccumulator {
    /**
     * Net force vector in Newtons (N).
     * This will be divided by mass to get linear acceleration: a = F/m
     */
    force: Vec3;

    /**
     * Net torque vector in Newton-meters (N⋅m).
     * This will be used to compute angular acceleration via Euler's equation:
     * -> α = I⁻¹ * (τ - ω × (I * ω))
     */
    torque: Vec3;
}
