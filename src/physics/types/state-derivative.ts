import { Vec3 } from '../math/vec3';
import { Quaternion } from '../math/quaternion';

/**
 * Represents the rates of change (derivatives) for the primary state variables of a rigid body.
 *
 * This structure captures the instantaneous slopes of the state variables, which are
 * used by the numerical integrator (RK4) to predict the state at a future time.
 *
 * ## State Variables & Derivatives
 *
 * 1. **Position (r)** — Derivative is Velocity (v)
 *    -> dr/dt = v
 *
 * 2. **Linear Momentum / Velocity** — Derivative is Force (F) or Acceleration (a)
 *    Note: We store Force here. The integrator divides by mass to get acceleration.
 *    -> dp/dt = F  (or dv/dt = F/m)
 *
 * 3. **Orientation (q)** — Derivative is Spin Term
 *    -> dq/dt = 0.5 * ω * q
 *
 * 4. **Angular Momentum** — Derivative is Torque (τ)
 *    -> dL/dt = τ
 *
 * ## Why separates derivatives?
 *
 * Separating the derivatives allows the RK4 integrator to sample gradients at
 * multiple points within a timestep (k1, k2, k3, k4) and combine them weighted
 * average for higher accuracy than simple Euler integration.
 */
export interface StateDerivative {
    /**
     * The rate of change of position (dr/dt).
     * This is simply the linear velocity vector (m/s).
     */
    velocity: Vec3;

    /**
     * The rate of change of linear momentum (dp/dt).
     * This is the net force vector acting on the body (N).
     *
     * To get acceleration (dv/dt), divide this by mass.
     */
    force: Vec3;

    /**
     * The rate of change of the orientation quaternion (dq/dt).
     *
     * Formula:
     * -> dq/dt = 0.5 * ω_quat * q
     *
     * This is a 4D vector representing how the rotation is evolving.
     */
    spin: Quaternion;

    /**
     * The rate of change of angular momentum (dL/dt).
     * This is the net torque vector acting on the body (N⋅m).
     *
     * Used to compute angular acceleration:
     * -> α = I⁻¹ * (τ - ω × (I * ω))
     */
    torque: Vec3;
}
