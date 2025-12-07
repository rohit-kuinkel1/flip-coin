import { Vec3 } from '../math/vec3';
import { Quaternion } from '../math/quaternion';

/**
 * Represents the state of a rigid body at a specific snapshot in time.
 * These are the fundamental variables that evolve during the simulation and
 * we need to capture them at intermediate steps (k1, k2, k3, k4) without
 * mutating the actual RigidBody instance so that we can compute the next
 * state using the RK4 integrator.
 *
 * State Variables
 *
 * - Position (r): The location of the center of mass in world space.
 * - Linear Velocity (v): The rate of change of position (dr/dt).
 * - Orientation (q): The rotation of the body relative to world axes.
 * - Angular Velocity (ω): The rate of rotation around axes.
 *
 * This interface is used by the integrator to capture state at various
 * intermediate steps (k1, k2, k3, k4) without mutating the actual RigidBody instance.
 */
export interface RigidBodyState {
    position: Vec3;
    linearVelocity: Vec3;
    orientation: Quaternion;
    angularVelocity: Vec3;
}
