import { describe, it, expect } from 'vitest';
import { RigidBody } from '../../src/physics/rigid-body';
import { Vec3 } from '../../src/physics/math/vec3';
import { Mat3 } from '../../src/physics/math/mat3';
import { Quaternion } from '../../src/physics/math/quaternion';

describe('RigidBody', () => {
  /**
   * Common test fixtures used across multiple tests.
   * 
   * - mass: 1.0kg for simple F=a calculations
   * - inertia: 2*Identity for simple I^-1 = 0.5*Identity verification
   * - pos/orient: Standard starting conditions
   */
  const mass = 1.0;
  const radius = 0.5;
  const thickness = 0.1;
  const inertia = Mat3.IDENTITY.scale(2);
  const pos = new Vec3(0, 10, 0);
  const orient = Quaternion.IDENTITY;
  const linVel = new Vec3(1, 0, 0);
  const angVel = new Vec3(0, 1, 0);

  it('should initialize properties correctly', () => {
    const body = new RigidBody(
      mass,
      inertia,
      radius,
      thickness,
      pos,
      orient,
      linVel,
      angVel
    );

    expect(body.mass).toBe(mass);
    expect(body.radius).toBe(radius);
    expect(body.thickness).toBe(thickness);
    expect(body.position.equals(pos)).toBe(true);
    expect(body.orientation.equals(orient)).toBe(true);
    expect(body.linearVelocity.equals(linVel)).toBe(true);
    expect(body.angularVelocity.equals(angVel)).toBe(true);
    
    /**
     * Verify inertia tensor is stored correctly.
     */
    expect(body.inertiaTensor.equals(inertia)).toBe(true);
  });

  it('should calculate inverse inertia tensor on construction', () => {
    /**
     * If I = 2 * Identity, then I^-1 should be 0.5 * Identity.
     * 
     * [ 2 0 0 ]^-1   [ 0.5 0 0 ]
     * [ 0 2 0 ]    = [ 0 0.5 0 ]
     * [ 0 0 2 ]      [ 0 0 0.5 ]
     */
    const body = new RigidBody(
      mass,
      inertia, //diagonal [2,2,2]
      radius,
      thickness,
      pos,
      orient,
      linVel,
      angVel
    );

    const expectedInverse = Mat3.IDENTITY.scale(0.5);
    expect(body.inverseInertiaTensor.equals(expectedInverse)).toBe(true);
  });

  it('should create a deep copy when cloned', () => {
    const original = new RigidBody(
      mass,
      inertia,
      radius,
      thickness,
      pos, // (0, 10, 0)
      orient,
      linVel,
      angVel
    );

    const clone = original.clone();
    
    /**
     * Modify the clone's properties to ensure they are decoupled from the original.
     */
    clone.position = new Vec3(999, 999, 999);
    clone.mass = 50;

    expect(original.position.y).toBe(10);
    expect(original.mass).toBe(1.0);
  
    expect(clone.position.x).toBe(999);
    expect(clone.mass).toBe(50);
  });

  it('should throw if inertia tensor is singular (non-invertible)', () => {
    /**
     * Create a singular matrix (determinant = 0).
     * A matrix with a zero row cannot be inverted.
     */
    const singularInertia = new Mat3(
      1, 0, 0,
      0, 1, 0,
      0, 0, 0
    );

    expect(() => {
      new RigidBody(
        mass,
        singularInertia,
        radius,
        thickness,
        pos,
        orient,
        linVel,
        angVel
      );
    }).toThrow(/singular/);
  });
});
