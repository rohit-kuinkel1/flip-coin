import { Vec3 } from './math/vec3';
import { Mat3 } from './math/mat3';
import { Quaternion } from './math/quaternion';

/**
 * Represents the physical state and properties of a rigid body (specifically a coin) in the simulation.
 *
 * This class encapsulates all state variables required for rigid body dynamics integration,
 * including position, orientation, and their time derivatives (velocities).
 *
 * ## State Variables
 *
 * - **Position (r)**: Center of mass in world space (meters).
 * - **Orientation (q)**: Rotation from local to world space (quaternion).
 * - **Linear Velocity (v)**: Derivative of position (m/s).
 * - **Angular Velocity (ω)**: Axis of rotation scaled by speed (rad/s).
 *
 * ## Physical Properties
 *
 * - **Mass (m)**: Resistance to linear force (kg).
 * - **Inertia Tensor (I)**: Resistance to angular torque (kg⋅m²).
 * - **Geometry**: Radius and thickness for collision detection (meters).
 *
 * This layout allows the `Integrator` to advance the state over time using forces and torques.
 */
export class RigidBody {
  /**
   * Mass of the body in kilograms (kg).
   *
   * Used in Newton's Second Law: F = m * a
   * -> a = F / m
   */
  public mass: number;

  /**
   * The moment of inertia tensor in the body's local frame (kg⋅m²).
   *
   * This 3x3 matrix describes how mass is distributed relative to the center of rotation.
   * For the angular equivalent of F = ma (Euler's equations):
   * -> τ = I * α + ω x (I * ω)
   *
   * Since this is constant in the local frame, we store it once.
   */
  public inertiaTensor: Mat3;

  /**
   * Inverse of the inertia tensor (I⁻¹).
   *
   * Pre-calculated for performance since we need it every step to compute angular acceleration:
   * -> α = I⁻¹ * (τ - ω x (I * ω))
   */
  public inverseInertiaTensor: Mat3;

  /**
   * Radius of the coin in meters (m).
   * Used for collision detection (disc shape).
   */
  public radius: number;

  /**
   * Thickness of the coin in meters (m).
   * Used for collision detection and edge landing logic.
   */
  public thickness: number;

  /**
   * Position of the center of mass in world space.
   * Represented by a 3D vector (x, y, z).
   */
  public position: Vec3;

  /**
   * Orientation of the body in world space.
   * Represented by a unit Quaternion, which avoids gimbal lock issues associated with Euler angles.
   */
  public orientation: Quaternion;

  /**
   * Linear velocity vector (m/s).
   * The rate of change of position: v = dr/dt
   */
  public linearVelocity: Vec3;

  /**
   * Angular velocity vector (rad/s).
   * The direction represents the axis of rotation, and magnitude is the speed in radians per second.
   */
  public angularVelocity: Vec3;

  constructor(
    mass: number,
    inertiaTensor: Mat3,
    radius: number,
    thickness: number,
    position: Vec3,
    orientation: Quaternion,
    linearVelocity: Vec3,
    angularVelocity: Vec3
  ) {
    this.mass = mass;
    this.inertiaTensor = inertiaTensor;
    const inv = inertiaTensor.inverse();
    if (!inv) {
      throw new Error('Inertia tensor is singular (non-invertible). This implies a non-physical mass distribution.');
    }
    
    this.inverseInertiaTensor = inv;
    this.radius = radius;
    this.thickness = thickness;
    this.position = position;
    this.orientation = orientation;
    this.linearVelocity = linearVelocity;
    this.angularVelocity = angularVelocity;
  }

  /**
   * Creates a deep copy of this rigid body state.
   *
   * Crucial for the RK4 integrator which needs to speculatively advance the state
   * (k1, k2, k3, k4 steps) without mutating the original state until the step is finalized.
   *
   * @returns A new RigidBody instance with identical properties.
   */
  public clone(): RigidBody {
    return new RigidBody(
      this.mass,
      this.inertiaTensor.clone(),
      this.radius,
      this.thickness,
      this.position.clone(),
      this.orientation.clone(),
      this.linearVelocity.clone(),
      this.angularVelocity.clone()
    );
  }
}
