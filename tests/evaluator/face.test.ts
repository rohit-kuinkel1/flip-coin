import { describe, it, expect } from 'vitest';
import { determineFace } from '../../src/evaluator/face';
import { RigidBody } from '../../src/physics/rigid-body';
import { Vec3 } from '../../src/physics/math/vec3';
import { Quaternion } from '../../src/physics/math/quaternion';
import { Mat3 } from '../../src/physics/math/mat3';

describe('determineFace', () => {
    /**
     * Test Suite for Coin Face Determination
     *
     * Core Concepts:
     * - The coin's local "Up" vector is (0, 1, 0).
     * - We compare this local Up vector (rotated by the coin's orientation) with the World Up vector (0, 1, 0).
     * - The relationship is determined by the dot product (cosine of the angle).
     *
     * Thresholds:
     * - Default edge threshold: 0.1 (corresponding to ~84° tilt).
     * - Heads: Dot product > threshold (Facing mostly Up).
     * - Tails: Dot product < -threshold (Facing mostly Down).
     * - Edge: |Dot product| <= threshold (Side facing).
     *
     * Test Coverage:
     * 1. Basic aligned orientations (perfect Up/Down/Side).
     * 2. Tilted orientations still within Heads/Tails range.
     * 3. Custom thresholds for stricter/looser edge detection.
     * 4. Boundary conditions (e.g. 89° tilt).
     */

    function createCoinWithOrientation(orientation: Quaternion): RigidBody {
        const mass = 0.005;
        const inertia = Mat3.IDENTITY;
        const radius = 0.01;
        const thickness = 0.002;
        const position = Vec3.ZERO;
        const linearVelocity = Vec3.ZERO;
        const angularVelocity = Vec3.ZERO;

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

    it('should identify HEADS when coin is flat facing up', () => {
        const coin = createCoinWithOrientation(Quaternion.IDENTITY);
        const result = determineFace(coin);
        expect(result).toBe('HEADS');
    });

    it('should identify TAILS when coin is flat facing down', () => {
        const flip = Quaternion.fromAxisAngle(Vec3.RIGHT, Math.PI);
        const coin = createCoinWithOrientation(flip);
        const result = determineFace(coin);
        expect(result).toBe('TAILS');
    });

    it('should identify EDGE when coin is standing vertically', () => {
        const edge = Quaternion.fromAxisAngle(Vec3.RIGHT, Math.PI / 2);
        const coin = createCoinWithOrientation(edge);
        const result = determineFace(coin);
        expect(result).toBe('EDGE');
    });

    it('should identify HEADS even with slight tilt', () => {
        const tilt = Quaternion.fromAxisAngle(Vec3.RIGHT, Math.PI / 4);
        const coin = createCoinWithOrientation(tilt);
        const result = determineFace(coin);
        expect(result).toBe('HEADS');
    });

    it('should identify TAILS even with slight tilt', () => {
        const tilt = Quaternion.fromAxisAngle(Vec3.RIGHT, 3 * Math.PI / 4);
        const coin = createCoinWithOrientation(tilt);
        const result = determineFace(coin);
        expect(result).toBe('TAILS');
    });

    it('should respect custom edge threshold', () => {
        const angle = 80 * (Math.PI / 180);
        const orientation = Quaternion.fromAxisAngle(Vec3.RIGHT, angle);
        const coin = createCoinWithOrientation(orientation);

        expect(determineFace(coin)).toBe('HEADS');

        expect(determineFace(coin, { edgeThreshold: 0.2 })).toBe('EDGE');
    });

    it('should handle extreme edge cases correctly', () => {
        const angle = 89 * (Math.PI / 180);
        const orientation = Quaternion.fromAxisAngle(Vec3.RIGHT, angle);
        const coin = createCoinWithOrientation(orientation);

        expect(determineFace(coin)).toBe('EDGE');
    });
});
