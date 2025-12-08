import { describe, it, expect } from 'vitest';
import { isStable } from '../../src/simulation/stability';
import { RigidBody } from '../../src/physics/rigid-body';
import { Vec3 } from '../../src/physics/math/vec3';
import { Quaternion } from '../../src/physics/math/quaternion';
import { Mat3 } from '../../src/physics/math/mat3';

describe('isStable', () => {
    /**
     * Test Suite for Stability Detection
     *
     * Default Thresholds:
     * - Linear Velocity: 0.01 m/s (1 cm/s)
     * - Angular Velocity: 0.1 rad/s (~5.7 deg/s)
     *
     * Test Coverage:
     * 1. Completely stationary body (0 velocities) -> Stable
     * 2. Velocities exceeding defaults -> Unstable
     * 3. Velocities just below defaults -> Stable
     * 4. Custom thresholds (relaxing the constraints) -> Stable where default would be unstable
     */

    function createCoin(velocities: { linear?: Vec3; angular?: Vec3 }): RigidBody {
        const mass = 0.005;
        const inertia = Mat3.IDENTITY;
        const radius = 0.01;
        const thickness = 0.002;
        const position = Vec3.ZERO;
        const orientation = Quaternion.IDENTITY;
        const linearVelocity = velocities.linear ?? Vec3.ZERO;
        const angularVelocity = velocities.angular ?? Vec3.ZERO;

        return new RigidBody(
            mass,
            inertia,
            radius,
            thickness,
            position,
            orientation,
            linearVelocity,
            angularVelocity
        );
    }

    it('should return true for a completely stationary body', () => {
        const coin = createCoin({});
        expect(isStable(coin)).toBe(true);
    });

    it('should return false if linear velocity exceeds threshold', () => {
        const coin = createCoin({
            linear: new Vec3(0.02, 0, 0)
        });
        expect(isStable(coin)).toBe(false);
    });

    it('should return false if angular velocity exceeds threshold', () => {
        const coin = createCoin({
            angular: new Vec3(0, 0.2, 0)
        });
        expect(isStable(coin)).toBe(false);
    });

    it('should return true if velocities are just below thresholds', () => {
        const coin = createCoin({
            linear: new Vec3(0.009, 0, 0),
            angular: new Vec3(0, 0.09, 0)
        });
        expect(isStable(coin)).toBe(true);
    });

    it('should respect custom linear threshold', () => {
        const coin = createCoin({
            linear: new Vec3(0.5, 0, 0)
        });

        expect(isStable(coin)).toBe(false);
        expect(isStable(coin, { linearVelocityThreshold: 1.0 })).toBe(true);
    });

    it('should respect custom angular threshold', () => {
        const coin = createCoin({
            angular: new Vec3(2.0, 0, 0)
        });

        expect(isStable(coin)).toBe(false);
        expect(isStable(coin, { angularVelocityThreshold: 3.0 })).toBe(true);
    });
});
