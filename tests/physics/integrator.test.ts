import { describe, it, expect } from 'vitest';
import { integrate } from '../../src/physics/integrator';
import { RigidBody } from '../../src/physics/rigid-body';
import { Vec3 } from '../../src/physics/math/vec3';
import { Mat3 } from '../../src/physics/math/mat3';
import { Quaternion } from '../../src/physics/math/quaternion';
import { DEFAULT_FORCE_CONFIG } from '../../src/physics/types/force-config';

describe('RK4 Integrator', () => {
    /**
     * Helper to create a standard body for testing.
     * Defaults to a 1kg, 1m radius sphere-like object at the origin.
     */
    const createBody = (params: Partial<RigidBody> = {}) => {
        return new RigidBody(
            params.mass || 1.0,
            params.inertiaTensor || Mat3.IDENTITY,
            params.radius || 0.5,
            params.thickness || 0.1,
            params.position || Vec3.ZERO,
            params.orientation || Quaternion.IDENTITY,
            params.linearVelocity || Vec3.ZERO,
            params.angularVelocity || Vec3.ZERO
        );
    };

    /**
     * Configuration that eliminates all external forces (gravity, drag).
     * This isolates the integrator's behavior for checks like conservation of momentum.
     */
    const NO_FORCES = {
        ...DEFAULT_FORCE_CONFIG,
        gravity: 0,
        airDensity: 0,
        dragCoefficient: 0,
        angularDamping: 0
    };

    it('should integrate linear velocity correctly (dx/dt = v)', () => {
        /**
         * 1. Setup: Body moving at constant 10 m/s along X axis with no forces.
         * 2. Action: Integrate for 1 second (100 steps of 0.01s).
         * 3. Assert: Position x should be 10 (velocity * time). Velocity should remain unchanged.
         */
        const body = createBody({
            linearVelocity: new Vec3(10, 0, 0)
        });

        for (let i = 0; i < 100; i++) {
            integrate(body, 0.01, NO_FORCES);
        }

        expect(body.position.x).toBeCloseTo(10, 5);
        expect(body.position.y).toBeCloseTo(0, 5);
        expect(body.linearVelocity.x).toBeCloseTo(10, 5);
    });

    it('should integrate constant acceleration correctly (force -> velocity -> position)', () => {
        /**
         * 1. Setup: 1kg Body starting at rest.
         * 2. Force: Constant gravity of 2.0 m/s² (downward in our logic context, here applied as +2.0 gravity param).
         *    Note: The physics engine treats `gravity` config as magnitude, typically applied -Y.
         *    Let's verify how the config is used. If gravity is just a scalar accel in -Y:
         * 
         *    Analytical solution for constant acceleration a = -g:
         *    v = a * t
         *    x = 0.5 * a * t²
         * 
         *    Here we run for 2.0 seconds.
         *    v = -2.0 * 2.0 = -4.0 m/s
         *    x = 0.5 * -2.0 * (2.0)² = -4.0 m
         */
        const body = createBody({ mass: 1.0 });
        const config = { ...NO_FORCES, gravity: 2.0 };

        for (let i = 0; i < 200; i++) {
            integrate(body, 0.01, config);
        }

        expect(body.linearVelocity.y).toBeCloseTo(-4.0, 4);
        expect(body.position.y).toBeCloseTo(-4.0, 4);
    });

    it('should integrate angular velocity (orientation update)', () => {
        /**
         * 1. Setup: Body rotating at 180 deg/sec (Math.PI rad/s) around Y axis.
         * 2. Action: Integrate for 0.5 seconds.
         * 3. Assert:
         *    - Total Rotation = 90 degrees (Math.PI / 2).
         *    - Quaternion should be (w=0.707, x=0, y=0.707, z=0), representing 90° about Y.
         *    - Angular velocity magnitude should remain constant (no damping).
         */
        const body = createBody({
            angularVelocity: new Vec3(0, Math.PI, 0)
        });

        for (let i = 0; i < 50; i++) {
            integrate(body, 0.01, NO_FORCES);
        }

        expect(body.angularVelocity.magnitude()).toBeCloseTo(Math.PI, 4);
        expect(body.orientation.w).toBeCloseTo(Math.SQRT1_2, 3);
        expect(body.orientation.y).toBeCloseTo(Math.SQRT1_2, 3);
        expect(body.orientation.x).toBeCloseTo(0, 3);
        expect(body.orientation.z).toBeCloseTo(0, 3);
    });

    it('should handle gyroscopic torque (Euler term)', () => {
        /**
         * Intermediate Axis Theorem / General Precession.
         * 
         * 1. Setup: Asymmetric inertia tensor (1, 2, 3) and off-axis initial angular velocity (1, 1, 1).
         * 2. Action: Integrate for a short burst (0.01s total) with high precision (dt=0.001).
         * 3. Assert:
         *    - Angular velocity direction MUST change (proof of gyroscopic effects).
         *    - Kinetic Energy (E = 0.5 * ω · Iω) must be approximately conserved.
         *      (RK4 is not symplectic so small drift < 2e-4 is expected).
         */
        const I = Mat3.diagonal(1, 2, 3);
        const w0 = new Vec3(1, 1, 1);

        const body = createBody({
            inertiaTensor: I,
            angularVelocity: w0
        });

        for (let i = 0; i < 10; i++) {
            integrate(body, 0.001, NO_FORCES);
        }

        const w1 = body.angularVelocity;
        const calculateEnergy = (v: Vec3) => 0.5 * v.dotProduct(I.multiplyVec3(v));
        const E0 = calculateEnergy(w0);
        const E1 = calculateEnergy(w1);

        expect(w1.equals(w0)).toBe(false);
        expect(Math.abs(E1 - E0)).toBeLessThan(2e-4);
    });

    it('should normalize quaternion to prevent drift', () => {
        /**
         * Numerical Stability of Orientation.
         * 
         * 1. Setup: Fast spinning body (173 rad/s total magnitude).
         * 2. Action: Integrate for 1 second (100 steps).
         * 3. Assert: Quaternion magnitude remains exactly 1.0 within float tolerance.
         *    Without normalization, integration errors would cause the quaternion to grow or shrink,
         *    breaking the rotation matrix math.
         */
        const body = createBody({
            angularVelocity: new Vec3(100, 100, 100)
        });

        for (let i = 0; i < 100; i++) {
            integrate(body, 0.01, NO_FORCES);
        }

        const mag = body.orientation.magnitude();
        expect(mag).toBeCloseTo(1.0, 10);
    });
});
