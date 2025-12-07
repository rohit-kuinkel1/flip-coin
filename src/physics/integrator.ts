import { RigidBody } from './rigid-body';
import { computeForces } from './forces';
import { Mat3 } from './math/mat3';
import { Vec3 } from './math/vec3';
import { Quaternion } from './math/quaternion';
import type { ForceConfig, RigidBodyState, StateDerivative } from './types';

/**
 * Performs a single step of Runge-Kutta 4th Order (RK4) integration.
 *
 * RK4 is chosen over simpler Euler integration because it offers much higher accuracy
 * (O(dt⁵) local error) and stability. For a coin flip simulation involving high-speed
 * rotations (tumbling) and collisions, Euler integration yields energy drift (coin
 * spinning faster/slower spiraling out of control) while RK4 preserves energy well enough
 * without needing symplectic integrators.
 *
 * The state `y` at `t + dt` is computed as:
 * -> y_{n+1} = y_n + (dt/6) * (k1 + 2k2 + 2k3 + k4)
 *
 * Where:
 * -> k1 = derivatives at start (t)
 * -> k2 = derivatives at midpoint (t + dt/2) using k1
 * -> k3 = derivatives at midpoint (t + dt/2) using k2
 * -> k4 = derivatives at end (t + dt) using k3
 *
 * We integrate 4 state variables:
 * 1. position (dp/dt = linearVelocity)
 * 2. linearVelocity (dv/dt = force / mass)
 * 3. orientation (dq/dt = 0.5 * ω * q)
 * 4. angularVelocity (dω/dt = I⁻¹ * (τ - ω × (I * ω)))
 *
 * Explicit normalization is used for quaternions to prevent drift.
 *
 * @param body The rigid body to integrate (mutated in place).
 * @param dt The timestep in seconds.
 * @param config Optional force configuration.
 */
export function integrate(body: RigidBody, dt: number, config?: ForceConfig): void {
    const initialState: RigidBodyState = {
        position: body.position,
        linearVelocity: body.linearVelocity,
        orientation: body.orientation,
        angularVelocity: body.angularVelocity,
    };

    const zeroDerivative: StateDerivative = {
        velocity: Vec3.ZERO,
        force: Vec3.ZERO,
        spin: new Quaternion(0, 0, 0, 0),
        torque: Vec3.ZERO,
    };

    /**
     * Compute RK4 derivatives (k1, k2, k3, k4):
     * - k1: Derivatives at start of interval (t)
     * - k2: Derivatives at midpoint (t + dt/2) predicted by k1
     * - k3: Derivatives at midpoint (t + dt/2) predicted by k2
     * - k4: Derivatives at end of interval (t + dt) predicted by k3
     */
    const k1 = evaluate(body, initialState, 0, zeroDerivative, config);
    const k2 = evaluate(body, initialState, dt * 0.5, k1, config);
    const k3 = evaluate(body, initialState, dt * 0.5, k2, config);
    const k4 = evaluate(body, initialState, dt, k3, config);

    /**
     * Combine derivatives using weighted average: (k1 + 2k2 + 2k3 + k4) / 6
     * 
     * Update Strategy:
     * 1. Position: Updated via weighted average velocity.
     * 2. Velocity: Updated via weighted average Force / Mass.
     *    (We average forces first, then divide by mass).
     * 3. Orientation: Updated via weighted average spin quaternion.
     *    (Result is normalized to prevent numerical drift).
     * 4. Angular Velocity: Updated via weighted average Angular Acceleration.
     *    (The `torque` field in StateDerivative actually holds Alpha).
     */

    const dPosition = weightedAverageVec3(k1.velocity, k2.velocity, k3.velocity, k4.velocity);
    body.position = body.position.add(dPosition.scale(dt));

    const dForce = weightedAverageVec3(k1.force, k2.force, k3.force, k4.force);
    const acceleration = dForce.scale(1 / body.mass);
    body.linearVelocity = body.linearVelocity.add(acceleration.scale(dt));

    const dSpin = weightedAverageQuaternion(k1.spin, k2.spin, k3.spin, k4.spin);
    const qNew = new Quaternion(
        body.orientation.w + dSpin.w * dt,
        body.orientation.x + dSpin.x * dt,
        body.orientation.y + dSpin.y * dt,
        body.orientation.z + dSpin.z * dt
    );
    body.orientation = qNew.normalize();

    const dAngularAcceleration = weightedAverageVec3(k1.torque, k2.torque, k3.torque, k4.torque);
    body.angularVelocity = body.angularVelocity.add(dAngularAcceleration.scale(dt));
}

/**
 * Computes the weighted average for RK4: (k1 + 2k2 + 2k3 + k4) / 6.
 *
 * RK4 gives more weight to the midpoint estimates (k2, k3) because they are
 * generally more accurate predictors of the average slope over the interval.
 */
function weightedAverageVec3(k1: Vec3, k2: Vec3, k3: Vec3, k4: Vec3): Vec3 {
    return k1
        .add(k2.scale(2))
        .add(k3.scale(2))
        .add(k4)
        .scale(1 / 6);
}

/**
 * Computes the weighted average for Quaternions (component-wise). * 
 * With 4 quaternions, this is equivalent to:
 * -> (q1 + 2q2 + 2q3 + q4) / 6
 * 
 * This is because RK4 gives more weight to the midpoint estimates (k2, k3) because they are
 * generally more accurate predictors of the average slope over the interval.
 */
function weightedAverageQuaternion(
    k1: Quaternion,
    k2: Quaternion,
    k3: Quaternion,
    k4: Quaternion
): Quaternion {
    return new Quaternion(
        (k1.w + 2 * k2.w + 2 * k3.w + k4.w) / 6,
        (k1.x + 2 * k2.x + 2 * k3.x + k4.x) / 6,
        (k1.y + 2 * k2.y + 2 * k3.y + k4.y) / 6,
        (k1.z + 2 * k2.z + 2 * k3.z + k4.z) / 6
    );
}

/**
 * Evaluates the derivatives (slopes) of the state variables at a specific point.
 *
 * This function calculates the instantaneous rate of change for all state variables:
 * 1. Linearly advances the state:
 *    -> state = initial + derivative * dt
 * 
 * 2. Computes forces and torques at this new state (Gravity, Drag, etc.)
 *
 * 3. Returns the derivatives:
 *    - Velocity (for position change)
 *    - Force (for velocity change)
 *    - Spin Quaternion (for orientation change)
 *    - Angular Acceleration (for angular velocity change)
 *
 * Euler's Equations for Angular Acceleration (α):
 * -> τ_net = I * α + ω × (I * ω)
 * -> α = I⁻¹ * (τ_net - ω × (I * ω))
 *
 * Note: We reuse the `torque` field of StateDerivative to store Angular Acceleration.
 * This is necessary because RK4 requires summing commensurate derivatives (dω/dt).
 */
function evaluate(
    body: RigidBody,
    initial: RigidBodyState,
    dt: number,
    derivative: StateDerivative,
    config?: ForceConfig
): StateDerivative {
    /**
     * Advance State linearly
     * We calculate the temporary state at `t + dt` assuming the provided `derivative`
     * holds constant over `dt`.
     * - Position += Velocity * dt
     * - Velocity += (Force/Mass) * dt
     * - Orientation += Spin * dt (Normalized)
     * - AngularVelocity += AngularAcceleration * dt
     */
    const statePos = initial.position.add(derivative.velocity.scale(dt));

    const stateVel = initial.linearVelocity.add(
        derivative.force.scale(dt / body.mass)
    );

    const dSpin = derivative.spin;
    const stateOrient = new Quaternion(
        initial.orientation.w + dSpin.w * dt,
        initial.orientation.x + dSpin.x * dt,
        initial.orientation.y + dSpin.y * dt,
        initial.orientation.z + dSpin.z * dt
    ).normalize();

    const stateAngVel = initial.angularVelocity.add(derivative.torque.scale(dt));

    /**
     * Compute Forces at the new State
     * We create a temporary body with the advanced state to query the force model.
     */
    const tempBody = {
        mass: body.mass,
        radius: body.radius,
        position: statePos,
        linearVelocity: stateVel,
        orientation: stateOrient,
        angularVelocity: stateAngVel,
    } as RigidBody;

    const accum = computeForces(tempBody, config);

    /**
     * Compute Derivatives for the new State
     * - dPosition/dt = Velocity
     * - dVelocity/dt = Force (Accumulated Force)
     * - dOrientation/dt = Spin New (derived from new AngVel)
     * - dAngularVelocity/dt = Alpha (Euler's Equations)
     * 
     * Euler's Equations Calculation:
     * 1. Transform Inertia Tensor to World Space: I_world = R * I_local * R^T
     * 2. Calculate Gyroscopic Torque: τ_gyro = ω × (I_world * ω)
     * 3. Net Moment: τ_net = τ_external - τ_gyro
     * 4. Angular Acceleration: α = I_world_inv * τ_net
     */
    const dPos = stateVel;
    const dForce = accum.force;
    const dSpinNew = stateOrient.derivative(stateAngVel);

    const R = quatToRotationMatrix(stateOrient);
    const Rt = R.transpose();

    const I_inv_local = body.inverseInertiaTensor;
    const I_inv_world = R.multiply(I_inv_local).multiply(Rt);

    const I_local = body.inertiaTensor;
    const I_world = R.multiply(I_local).multiply(Rt);

    const angularMomentum = I_world.multiplyVec3(stateAngVel);
    const gyroTorque = stateAngVel.crossProduct(angularMomentum);

    const netTorque = accum.torque.subtract(gyroTorque);
    const alpha = I_inv_world.multiplyVec3(netTorque);

    return {
        velocity: dPos,
        force: dForce,
        spin: dSpinNew,
        torque: alpha,
    };
}

/**
 * Converts a unit quaternion to a rotation matrix.
 * This method is useful because it allows us to transform
 * the inertia tensor from local to world space which is
 * required for the Euler's Equations calculation. It enables 
 * us to do things like calculate the angular momentum in world space
 * which in turn allows us to calculate the gyroscopic torque.
 *
 * Formula:
 * R = [ 1-2(y²+z²)   2(xy-zw)     2(xz+yw) ]
 *     [ 2(xy+zw)     1-2(x²+z²)   2(yz-xw) ]
 *     [ 2(xz-yw)     2(yz+xw)     1-2(x²+y²) ]
 */
function quatToRotationMatrix(q: Quaternion): Mat3 {
    const w = q.w;
    const x = q.x;
    const y = q.y;
    const z = q.z;

    const xx = x * x;
    const yy = y * y;
    const zz = z * z;
    const xy = x * y;
    const xz = x * z;
    const yz = y * z;
    const wx = w * x;
    const wy = w * y;
    const wz = w * z;

    return new Mat3(
        1 - 2 * (yy + zz),
        2 * (xy - wz),
        2 * (xz + wy),

        2 * (xy + wz),
        1 - 2 * (xx + zz),
        2 * (yz - wx),

        2 * (xz - wy),
        2 * (yz + wx),
        1 - 2 * (xx + yy)
    );
}
