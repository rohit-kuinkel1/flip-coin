import { describe, it, expect } from 'vitest';
import { Vec3 } from '../../src/physics/math/vec3';
import { Mat3 } from '../../src/physics/math/mat3';
import { Quaternion } from '../../src/physics/math/quaternion';
import { RigidBody } from '../../src/physics/rigid-body';
import {
    detectCollision,
    applyCollisionResponse,
    handleCollision,
} from '../../src/physics/collision';
import { DEFAULT_COLLISION_CONFIG } from '../../src/physics/types/collision-config';

describe('Collision Constants', () => {
    it('should define realistic coefficient of restitution', () => {
        /**
         * Restitution of 0.5 is typical for metal-on-hard-surface collisions.
         * This means the bounce retains 50% of the incoming velocity.
         *
         * Range check: 0 (perfectly inelastic) to 1 (perfectly elastic).
         * Metals on hard surfaces are typically 0.3-0.7.
         */
        expect(DEFAULT_COLLISION_CONFIG.restitution).toBeGreaterThanOrEqual(0);
        expect(DEFAULT_COLLISION_CONFIG.restitution).toBeLessThanOrEqual(1);
        expect(DEFAULT_COLLISION_CONFIG.restitution).toBeCloseTo(0.5, 1);
    });

    it('should define realistic coefficient of friction', () => {
        /**
         * Friction of 0.3 is typical for metal on wood/table surfaces.
         * This opposes tangential sliding motion during contact.
         *
         * Range check: 0 (frictionless) to ~1 (very high friction).
         * Metal on wood is typically 0.2-0.5.
         */
        expect(DEFAULT_COLLISION_CONFIG.friction).toBeGreaterThanOrEqual(0);
        expect(DEFAULT_COLLISION_CONFIG.friction).toBeLessThan(1);
        expect(DEFAULT_COLLISION_CONFIG.friction).toBeCloseTo(0.3, 1);
    });

    it('should define reasonable penetration tolerance', () => {
        /**
         * Penetration tolerance should be small (sub-millimeter) but not so small
         * that floating-point errors cause false positives.
         *
         * 0.1mm (0.0001m) is a good balance: imperceptible to the eye but large
         * enough to avoid jitter from numerical noise.
         */
        expect(DEFAULT_COLLISION_CONFIG.penetrationTolerance).toBeGreaterThan(0);
        expect(DEFAULT_COLLISION_CONFIG.penetrationTolerance).toBeLessThan(0.001); // Less than 1mm
        expect(DEFAULT_COLLISION_CONFIG.penetrationTolerance).toBeCloseTo(0.0001, 5);
    });

    it('should have all required collision config properties', () => {
        /**
         * The default config should contain all collision-related constants,
         * making it easy to override just one parameter.
         */
        expect(DEFAULT_COLLISION_CONFIG).toHaveProperty('restitution');
        expect(DEFAULT_COLLISION_CONFIG).toHaveProperty('friction');
        expect(DEFAULT_COLLISION_CONFIG).toHaveProperty('penetrationTolerance');
    });
});

describe('detectCollision', () => {
    /**
     * Helper function to create a test coin body.
     */
    function createCoin(options?: {
        position?: Vec3;
        orientation?: Quaternion;
        thickness?: number;
    }): RigidBody {
        const mass = 0.00567; // US quarter
        const radius = 0.012;
        const thickness = options?.thickness ?? 0.002;

        /**
         * For a thin disc, the inertia tensor is diagonal:
         * -> Ixx = Izz = (1/4) * m * r² + (1/12) * m * h²
         * -> Iyy = (1/2) * m * r²
         */
        const r2 = radius * radius;
        const h2 = thickness * thickness;
        const Ixx = (0.25 * mass * r2) + (mass * h2 / 12);
        const Iyy = 0.5 * mass * r2;
        const Izz = Ixx;

        const inertia = new Mat3(
            Ixx, 0, 0,
            0, Iyy, 0,
            0, 0, Izz
        );

        return new RigidBody(
            mass,
            inertia,
            radius,
            thickness,
            options?.position ?? new Vec3(0, 0.1, 0),
            options?.orientation ?? Quaternion.IDENTITY,
            Vec3.ZERO,
            Vec3.ZERO
        );
    }

    it('should detect no collision when coin is well above ground', () => {
        /**
         * Coin at y = 1m with thickness = 0.002m
         * -> Lowest point = 1 - 0.001 = 0.999m > 0
         * -> No collision expected
         */
        const coin = createCoin({ position: new Vec3(0, 1, 0) });
        const result = detectCollision(coin);

        expect(result.colliding).toBe(false);
        expect(result.normal).toBeUndefined();
        expect(result.penetrationDepth).toBeUndefined();
    });

    it('should detect collision when coin penetrates ground', () => {
        /**
         * Coin at y = 0 with thickness = 0.002m (lying flat)
         * -> Lowest point = 0 - 0.001 = -0.001m < 0
         * -> Penetration depth = 0 - (-0.001) = 0.001m
         * -> Collision detected
         */
        const coin = createCoin({ position: new Vec3(0, 0, 0) });
        const result = detectCollision(coin);

        expect(result.colliding).toBe(true);
        expect(result.normal).toBeDefined();
        expect(result.normal?.equals(Vec3.UP)).toBe(true);
        expect(result.penetrationDepth).toBeCloseTo(0.001, 6);
    });

    it('should detect collision at exact ground level (y = thickness/2)', () => {
        /**
         * Coin at y = 0.001m with thickness = 0.002m
         * -> Lowest point = 0.001 - 0.001 = 0m (exactly on ground)
         * -> Penetration depth = 0m
         * -> Below penetration tolerance, so no collision reported
         */
        const coin = createCoin({ position: new Vec3(0, 0.001, 0) });
        const result = detectCollision(coin);

        /**
         * With default tolerance of 0.0001m, a penetration of 0m is within tolerance.
         * This prevents jitter when the coin is resting on the ground.
         */
        expect(result.colliding).toBe(false);
    });

    it('should ignore penetrations below tolerance threshold', () => {
        /**
         * Coin with a tiny penetration (e.g., 0.00005m = 0.05mm)
         * -> This is below the default tolerance of 0.0001m
         * -> Should be treated as "no collision" to avoid jitter
         */
        // Position at 0.00095 -> penetration is 0.00005
        const coin = createCoin({ position: new Vec3(0, 0.00095, 0) });
        const result = detectCollision(coin, { penetrationTolerance: 0.0001 });

        /**
         * Lowest point = 0.00095 - 0.001 = -0.00005m
         * Penetration = 0.00005m
         */
        expect(result.colliding).toBe(false);
    });

    it('should use custom penetration tolerance when provided', () => {
        /**
         * Test that we can override the penetration tolerance.
         * A coin slightly penetrating should be ignored with high tolerance
         * but detected with low tolerance.
         */
        // Position at 0.0005 -> penetration is 0.0005 (0.5mm)
        const coin = createCoin({ position: new Vec3(0, 0.0005, 0) });

        /**
         * Lowest point = 0.0005 - 0.001 = -0.0005m
         * Penetration depth = 0.0005m
         */

        const strictResult = detectCollision(coin, { penetrationTolerance: 0.0001 });
        expect(strictResult.colliding).toBe(true);

        const lenientResult = detectCollision(coin, { penetrationTolerance: 0.001 });
        expect(lenientResult.colliding).toBe(false);
    });

    it('should correctly compute contact point', () => {
        /**
         * Coin at (1, 0, 2) penetrating ground
         * -> Contact point should be at (1, 0, 2) projected onto ground plane
         * -> Result: (1, 0, 2)
         */
        const coin = createCoin({ position: new Vec3(1, 0, 2) });
        const result = detectCollision(coin);

        expect(result.colliding).toBe(true);
        expect(result.contactPoint).toBeDefined();
        expect(result.contactPoint?.x).toBeCloseTo(1, 6);
        expect(result.contactPoint?.y).toBeCloseTo(0, 6); // On ground plane
        expect(result.contactPoint?.z).toBeCloseTo(2, 6);
    });

    it('should account for coin orientation when detecting collision', () => {
        /**
         * Coin tilted 90° around X-axis (standing on edge).
         * When the coin is tilted, its "up" direction changes, affecting
         * the lowest point calculation.
         *
         * With coin at y = 0.01 and tilted 90°:
         * -> Local up = (0, 1, 0) rotates to (0, 0, 1) in world space
         * -> Lowest point = (0, 0.01, 0) - (0, 0, 0.001) = (0, 0.01, -0.001)
         * -> Lowest y = 0.01, so no collision expected
         */
        const tiltedOrientation = Quaternion.fromAxisAngle(Vec3.RIGHT, Math.PI / 2);
        const coin = createCoin({
            position: new Vec3(0, 0.01, 0),
            orientation: tiltedOrientation,
        });

        const result = detectCollision(coin);

        /**
         * The coin is standing on its edge, with center at y = 0.01.
         * The "thickness" now extends in the Z direction, not Y.
         * So the lowest Y point is just the center Y = 0.01 > 0.
         */
        expect(result.colliding).toBe(false);
    });

    it('should detect collision for tilted coin close to ground', () => {
        /**
         * Coin tilted 45° and positioned so its lowest point touches ground.
         *
         * This tests that orientation is correctly factored into the collision check.
         */
        const tilt = Quaternion.fromAxisAngle(Vec3.RIGHT, Math.PI / 4); // 45° tilt
        const coin = createCoin({
            position: new Vec3(0, 0, 0),
            orientation: tilt,
            thickness: 0.002, // matches default now
        });

        /**
         * When tilted 45°, the "up" vector is at an angle.
         * up_world ≈ (0, 0.707, 0.707) (pointing up and forward)
         * Lowest point = (0, 0, 0) - (0, 0.707, 0.707) * 0.001
         * Lowest y ≈ -0.0007m < 0
         */
        const result = detectCollision(coin);
        expect(result.colliding).toBe(true);
    });

    it('should always provide upward normal for ground collisions', () => {
        /**
         * Ground plane normal is always (0, 1, 0) regardless of coin orientation.
         * This is because the ground plane is defined by the Y axis and not
         * by the coin's orientation or the other axes.
         */
        const coin = createCoin({ position: new Vec3(0, 0, 0) });
        const result = detectCollision(coin);

        expect(result.colliding).toBe(true);
        expect(result.normal?.equals(Vec3.UP)).toBe(true);
    });

    it('should handle coin exactly at rest position (just touching)', () => {
        /**
         * Coin with lowest point exactly at y = 0 + tolerance.
         * This simulates a coin that has settled and is resting on the ground.
         */
        const restY = 0.001 + 0.00015; // thickness/2 + slight above tolerance
        const coin = createCoin({ position: new Vec3(0, restY, 0) });

        const result = detectCollision(coin, { penetrationTolerance: 0.0001 });

        /**
         * Lowest point = 0.00115 - 0.001 = 0.00015m
         * Penetration = -0.00015m (above ground)
         * Should not collide.
         */
        expect(result.colliding).toBe(false);
    });

    it('should compute correct penetration depth for various positions', () => {
        /**
         * Test that penetration depth calculation is accurate.
         */

        /**
         * Coin deeply underground (y = -0.5)
         * Lowest point = -0.5 - 0.001 = -0.501
         * Penetration = 0.501
         */
        const deepCoin = createCoin({ position: new Vec3(0, -0.5, 0) });
        const deepResult = detectCollision(deepCoin);
        expect(deepResult.penetrationDepth).toBeCloseTo(0.501, 3);

        /**
         * Coin barely penetrating (y = 0.0005)
         * Lowest point = 0.0005 - 0.001 = -0.0005
         * Penetration = 0.0005
         */
        const shallowCoin = createCoin({ position: new Vec3(0, 0.0005, 0) });
        const shallowResult = detectCollision(shallowCoin);
        expect(shallowResult.penetrationDepth).toBeCloseTo(0.0005, 6);
    });

    it('should work with non-standard coin thickness', () => {
        /**
         * Test collision detection with a thicker coin.
         */
        const thickCoin = createCoin({
            position: new Vec3(0, 0.005, 0),
            thickness: 0.01, // 10mm thick coin
        });

        /**
         * Lowest point = 0.005 - 0.005 = 0m (exactly on ground)
         * Below tolerance, so no collision.
         */
        const result = detectCollision(thickCoin);
        expect(result.colliding).toBe(false);

        /**
         * Now move it down slightly
         */
        thickCoin.position = new Vec3(0, 0.004, 0);
        const result2 = detectCollision(thickCoin);

        /**
         * Lowest point = 0.004 - 0.005 = -0.001m
         * Penetration = 0.001m > tolerance
         */
        expect(result2.colliding).toBe(true);
        expect(result2.penetrationDepth).toBeCloseTo(0.001, 6);
    });
});

describe('applyCollisionResponse', () => {
    function createCoin(options?: {
        position?: Vec3;
        linearVelocity?: Vec3;
        angularVelocity?: Vec3;
    }): RigidBody {
        const mass = 0.00567;
        const radius = 0.012;
        const thickness = 0.002;

        const r2 = radius * radius;
        const h2 = thickness * thickness;
        const Ixx = (0.25 * mass * r2) + (mass * h2 / 12);
        const Iyy = 0.5 * mass * r2;
        const Izz = Ixx;

        const inertia = new Mat3(
            Ixx, 0, 0,
            0, Iyy, 0,
            0, 0, Izz
        );

        return new RigidBody(
            mass,
            inertia,
            radius,
            thickness,
            options?.position ?? new Vec3(0, 0, 0),
            Quaternion.IDENTITY,
            options?.linearVelocity ?? Vec3.ZERO,
            options?.angularVelocity ?? Vec3.ZERO
        );
    }

    it('should not modify body when no collision detected', () => {
        /**
         * If collision.colliding = false, response should be a no-op.
         */
        const coin = createCoin({
            linearVelocity: new Vec3(1, 2, 3),
            angularVelocity: new Vec3(10, 20, 30),
        });

        const originalLinearVel = coin.linearVelocity.clone();
        const originalAngularVel = coin.angularVelocity.clone();

        applyCollisionResponse(coin, { colliding: false });

        expect(coin.linearVelocity.equals(originalLinearVel)).toBe(true);
        expect(coin.angularVelocity.equals(originalAngularVel)).toBe(true);
    });

    it('should apply restitution to normal velocity when moving into ground', () => {
        /**
         * Coin dropping straight down with v = (0, -4, 0) and e = 0.5
         * -> v_n = -4 m/s (downward)
         * -> v_n_after = -0.5 * (-4) = 2 m/s (upward)
         * -> Expected: (0, 2, 0)
         */
        const coin = createCoin({
            linearVelocity: new Vec3(0, -4, 0),
        });

        const collision = {
            colliding: true,
            normal: Vec3.UP,
            penetrationDepth: 0.001,
            contactPoint: new Vec3(0, 0, 0),
        };

        applyCollisionResponse(coin, collision, { restitution: 0.5 });

        expect(coin.linearVelocity.x).toBeCloseTo(0, 6);
        expect(coin.linearVelocity.y).toBeCloseTo(2, 6);
        expect(coin.linearVelocity.z).toBeCloseTo(0, 6);
    });

    it('should not apply restitution when moving away from ground', () => {
        /**
         * Coin already moving upward with v = (0, 3, 0)
         * -> No restitution needed, keep velocity as-is
         */
        const coin = createCoin({
            linearVelocity: new Vec3(0, 3, 0),
        });

        const collision = {
            colliding: true,
            normal: Vec3.UP,
            penetrationDepth: 0.0001,
            contactPoint: new Vec3(0, 0, 0),
        };

        applyCollisionResponse(coin, collision);

        /**
         * Velocity should remain upward (no bounce applied).
         */
        expect(coin.linearVelocity.y).toBeCloseTo(3, 6);
    });

    it('should apply friction to tangential velocity', () => {
        /**
         * Coin sliding along ground with v = (5, -1, 0) and μ = 0.3
         * -> Normal component: (0, -1, 0)
         * -> Tangential component: (5, 0, 0)
         * -> After friction: (5 * 0.7, bounce, 0) = (3.5, bounce, 0)
         * -> After restitution (e=0.5): (3.5, 0.5, 0)
         */
        const coin = createCoin({
            linearVelocity: new Vec3(5, -1, 0),
        });

        const collision = {
            colliding: true,
            normal: Vec3.UP,
            penetrationDepth: 0.001,
            contactPoint: new Vec3(0, 0, 0),
        };

        applyCollisionResponse(coin, collision, {
            restitution: 0.5,
            friction: 0.3,
        });

        /**
         * Tangential (X) reduced by 30%: 5 * 0.7 = 3.5
         * Normal (Y) bounced: -1 * -0.5 = 0.5
         */
        expect(coin.linearVelocity.x).toBeCloseTo(3.5, 5);
        expect(coin.linearVelocity.y).toBeCloseTo(0.5, 5);
        expect(coin.linearVelocity.z).toBeCloseTo(0, 5);
    });

    it('should apply angular friction damping', () => {
        /**
         * Coin spinning with ω = (10, 50, 20) rad/s and μ = 0.3
         * -> After friction: ω * 0.7 = (7, 35, 14)
         */
        const coin = createCoin({
            angularVelocity: new Vec3(10, 50, 20),
        });

        const collision = {
            colliding: true,
            normal: Vec3.UP,
            penetrationDepth: 0.001,
            contactPoint: new Vec3(0, 0, 0),
        };

        applyCollisionResponse(coin, collision, { friction: 0.3 });

        expect(coin.angularVelocity.x).toBeCloseTo(7, 5);
        expect(coin.angularVelocity.y).toBeCloseTo(35, 5);
        expect(coin.angularVelocity.z).toBeCloseTo(14, 5);
    });

    it('should correct position to remove penetration', () => {
        /**
         * Coin at (0, -0.005, 0) with penetration depth = 0.006m
         * -> Position should be corrected by moving up by penetration depth
         * -> New position: (0, -0.005 + 0.006, 0) = (0, 0.001, 0)
         */
        const coin = createCoin({
            position: new Vec3(0, -0.005, 0),
        });

        const collision = {
            colliding: true,
            normal: Vec3.UP,
            penetrationDepth: 0.006,
            contactPoint: new Vec3(0, 0, 0),
        };

        applyCollisionResponse(coin, collision);

        expect(coin.position.x).toBeCloseTo(0, 6);
        expect(coin.position.y).toBeCloseTo(0.001, 6);
        expect(coin.position.z).toBeCloseTo(0, 6);
    });

    it('should respect custom restitution coefficient', () => {
        /**
         * Test bouncing with different restitution values.
         */

        /**
         * Perfect bounce (e = 1.0)
         */
        const bouncyCoin = createCoin({
            linearVelocity: new Vec3(0, -5, 0),
        });
        const bouncyCollision = {
            colliding: true,
            normal: Vec3.UP,
            penetrationDepth: 0.001,
            contactPoint: Vec3.ZERO,
        };
        applyCollisionResponse(bouncyCoin, bouncyCollision, { restitution: 1.0 });
        expect(bouncyCoin.linearVelocity.y).toBeCloseTo(5, 5);

        /**
         * No bounce (e = 0.0)
         */
        const stickyCoin = createCoin({
            linearVelocity: new Vec3(0, -5, 0),
        });
        const stickyCollision = {
            colliding: true,
            normal: Vec3.UP,
            penetrationDepth: 0.001,
            contactPoint: Vec3.ZERO,
        };
        applyCollisionResponse(stickyCoin, stickyCollision, { restitution: 0.0 });
        expect(stickyCoin.linearVelocity.y).toBeCloseTo(0, 5);
    });

    it('should respect custom friction coefficient', () => {
        /**
         * Test friction with different coefficients.
         */
        const velocity = new Vec3(10, -1, 0);

        /**
         * No friction (μ = 0)
         */
        const frictionlessCoin = createCoin({ linearVelocity: velocity.clone() });
        const collision1 = {
            colliding: true,
            normal: Vec3.UP,
            penetrationDepth: 0.001,
            contactPoint: Vec3.ZERO,
        };
        applyCollisionResponse(frictionlessCoin, collision1, { friction: 0 });
        expect(frictionlessCoin.linearVelocity.x).toBeCloseTo(10, 5); // No reduction

        /**
         * High friction (μ = 0.8)
         */
        const highFrictionCoin = createCoin({ linearVelocity: velocity.clone() });
        const collision2 = {
            colliding: true,
            normal: Vec3.UP,
            penetrationDepth: 0.001,
            contactPoint: Vec3.ZERO,
        };
        applyCollisionResponse(highFrictionCoin, collision2, { friction: 0.8 });
        expect(highFrictionCoin.linearVelocity.x).toBeCloseTo(2, 5); // 10 * 0.2 = 2
    });

    it('should handle diagonal velocity correctly', () => {
        /**
         * Coin moving at 45° angle: v = (3, -3, 0)
         * -> Speed = sqrt(9 + 9) ≈ 4.24 m/s
         * -> Normal component: v_n = (0, -3, 0)
         * -> Tangential component: v_t = (3, 0, 0)
         * -> After restitution (e=0.5): v_n = (0, 1.5, 0)
         * -> After friction (μ=0.3): v_t = (2.1, 0, 0)
         * -> Result: (2.1, 1.5, 0)
         */
        const coin = createCoin({
            linearVelocity: new Vec3(3, -3, 0),
        });

        const collision = {
            colliding: true,
            normal: Vec3.UP,
            penetrationDepth: 0.001,
            contactPoint: Vec3.ZERO,
        };

        applyCollisionResponse(coin, collision, {
            restitution: 0.5,
            friction: 0.3,
        });

        expect(coin.linearVelocity.x).toBeCloseTo(2.1, 5);
        expect(coin.linearVelocity.y).toBeCloseTo(1.5, 5);
        expect(coin.linearVelocity.z).toBeCloseTo(0, 5);
    });

    it('should handle bouncing with 3D tangential velocity', () => {
        /**
         * Coin moving with velocity in all three dimensions.
         */
        const coin = createCoin({
            linearVelocity: new Vec3(2, -4, 1),
        });

        const collision = {
            colliding: true,
            normal: Vec3.UP,
            penetrationDepth: 0.001,
            contactPoint: Vec3.ZERO,
        };

        applyCollisionResponse(coin, collision, {
            restitution: 0.5,
            friction: 0.3,
        });

        /**
         * Normal: (0, -4, 0) -> (0, 2, 0) after restitution
         * Tangential: (2, 0, 1) -> (1.4, 0, 0.7) after friction
         * Result: (1.4, 2, 0.7)
         */
        expect(coin.linearVelocity.x).toBeCloseTo(1.4, 5);
        expect(coin.linearVelocity.y).toBeCloseTo(2, 5);
        expect(coin.linearVelocity.z).toBeCloseTo(0.7, 5);
    });

    it('should combine all effects realistically for a coin flip bounce', () => {
        /**
         * Realistic coin flip scenario:
         * - Coin falling with slight horizontal drift
         * - Spinning rapidly
         * - Bounces and loses energy to restitution and friction
         */
        const coin = createCoin({
            position: new Vec3(0.1, -0.002, 0.05),
            linearVelocity: new Vec3(0.5, -2, 0.3),
            angularVelocity: new Vec3(15, 100, 20),
        });

        const collision = {
            colliding: true,
            normal: Vec3.UP,
            penetrationDepth: 0.003,
            contactPoint: new Vec3(0.1, 0, 0.05),
        };

        const originalY = coin.position.y;

        applyCollisionResponse(coin, collision, {
            restitution: 0.5,
            friction: 0.3,
        });

        /**
         * Normal velocity should reverse and reduce (bounce up).
         */
        expect(coin.linearVelocity.y).toBeGreaterThan(0);
        expect(coin.linearVelocity.y).toBeLessThan(2); // Less than original due to restitution

        /**
         * Tangential velocity should be dampened by friction.
         */
        expect(coin.linearVelocity.x).toBeCloseTo(0.5 * 0.7, 5);
        expect(coin.linearVelocity.z).toBeCloseTo(0.3 * 0.7, 5);

        /**
         * Angular velocity should be dampened.
         */
        expect(coin.angularVelocity.x).toBeCloseTo(15 * 0.7, 5);
        expect(coin.angularVelocity.y).toBeCloseTo(100 * 0.7, 5);
        expect(coin.angularVelocity.z).toBeCloseTo(20 * 0.7, 5);

        /**
         * Position should be corrected upward by penetration depth.
         */
        expect(coin.position.y).toBeCloseTo(originalY + 0.003, 6);
    });
});

describe('handleCollision', () => {
    function createCoin(options?: {
        position?: Vec3;
        linearVelocity?: Vec3;
    }): RigidBody {
        const mass = 0.00567;
        const radius = 0.012;
        const thickness = 0.002;

        const r2 = radius * radius;
        const h2 = thickness * thickness;
        const Ixx = (0.25 * mass * r2) + (mass * h2 / 12);
        const Iyy = 0.5 * mass * r2;
        const Izz = Ixx;

        const inertia = new Mat3(
            Ixx, 0, 0,
            0, Iyy, 0,
            0, 0, Izz
        );

        return new RigidBody(
            mass,
            inertia,
            radius,
            thickness,
            options?.position ?? new Vec3(0, 0.1, 0),
            Quaternion.IDENTITY,
            options?.linearVelocity ?? Vec3.ZERO,
            Vec3.ZERO
        );
    }

    it('should combine detection and response in one call', () => {
        /**
         * handleCollision is a convenience wrapper that does:
         * 1. Detect collision
         * 2. Apply response if collision found
         * 3. Return collision result
         */
        const coin = createCoin({
            position: new Vec3(0, 0, 0),
            linearVelocity: new Vec3(1, -2, 0),
        });

        const result = handleCollision(coin, {
            restitution: 0.5,
            friction: 0.3,
        });

        /**
         * Should detect collision.
         */
        expect(result.colliding).toBe(true);

        /**
         * Should apply response (velocity modified).
         */
        expect(coin.linearVelocity.y).toBeGreaterThan(0); // Bounced up
        expect(coin.linearVelocity.x).toBeLessThan(1); // Friction applied
    });

    it('should return collision result for debugging/bounce counting', () => {
        /**
         * The returned CollisionResult can be used to count bounces or log collisions.
         */
        const coin = createCoin({
            position: new Vec3(0, 0, 0),
        });

        const result = handleCollision(coin);

        expect(result).toHaveProperty('colliding');
        expect(result).toHaveProperty('normal');
        expect(result).toHaveProperty('penetrationDepth');
        expect(result).toHaveProperty('contactPoint');
    });

    it('should do nothing when no collision detected', () => {
        /**
         * Coin well above ground should not be modified.
         */
        const coin = createCoin({
            position: new Vec3(0, 1, 0),
            linearVelocity: new Vec3(1, -2, 3),
        });

        const originalVel = coin.linearVelocity.clone();
        const result = handleCollision(coin);

        expect(result.colliding).toBe(false);
        expect(coin.linearVelocity.equals(originalVel)).toBe(true);
    });

    it('should use provided config for both detection and response', () => {
        /**
         * Custom config should affect both detection and response.
         */
        const coin = createCoin({
            position: new Vec3(0, 0.0006, 0), // Slightly penetrating
            linearVelocity: new Vec3(5, -3, 0),
        });

        /**
         * With strict tolerance, should detect collision.
         */
        const strictResult = handleCollision(coin, {
            penetrationTolerance: 0.0001,
            restitution: 0.8,
            friction: 0.1,
        });

        expect(strictResult.colliding).toBe(true);
        expect(coin.linearVelocity.y).toBeCloseTo(2.4, 5); // -3 * -0.8 = 2.4
    });

    it('should work for multiple sequential bounces', () => {
        /**
         * Simulate multiple bounces in sequence to verify the system
         * progressively loses energy.
         */
        const coin = createCoin({
            position: new Vec3(0, 0, 0),
            linearVelocity: new Vec3(0, -10, 0),
        });

        const bounceCount = [];
        let iterations = 0;
        const maxIterations = 1000; // Increased to capture multiple bounces (one hop takes ~1s)

        while (iterations < maxIterations) {
            const collision = handleCollision(coin, {
                restitution: 0.5,
                friction: 0.2,
            });

            if (collision.colliding) {
                // Only count the bounce if we have significant upward velocity
                // This filters out "resting" contact and discrete integration noise
                // Gravity delta per frame is ~0.1 m/s (approx 1% of initial 10m/s)
                if (coin.linearVelocity.y > 1.0) {
                    bounceCount.push(coin.linearVelocity.y);
                }
            }

            /**
             * Simulate a timestep: move coin
             */
            coin.position = coin.position.add(coin.linearVelocity.scale(0.01));
            coin.linearVelocity = coin.linearVelocity.add(
                Vec3.UP.scale(-9.81 * 0.01)
            );

            /**
             * Stop if velocity is very small (coin has settled).
             */
            if (Math.abs(coin.linearVelocity.y) < 0.01 && coin.position.y < 0.06) {
                break;
            }

            iterations++;
        }

        /**
         * Should have multiple bounces.
         */
        expect(bounceCount.length).toBeGreaterThan(1);

        /**
         * Each bounce should have lower velocity (energy loss).
         */
        for (let i = 1; i < bounceCount.length; i++) {
            expect(bounceCount[i]).toBeLessThan(bounceCount[i - 1]!);
        }
    });
});
