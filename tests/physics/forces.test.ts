import { describe, it, expect } from 'vitest';
import { Vec3 } from '../../src/physics/math/vec3';
import { Mat3 } from '../../src/physics/math/mat3';
import { Quaternion } from '../../src/physics/math/quaternion';
import { RigidBody } from '../../src/physics/rigid-body';
import {
    computeGravityForce,
    computeLinearDragForce,
    computeAngularDragTorque,
    computeForces,
} from '../../src/physics/forces';
import { DEFAULT_FORCE_CONFIG } from '../../src/physics/types/force-config';

describe('Force Constants', () => {
    it('should define standard gravitational acceleration', () => {
        /**
         * Earth's surface gravity is approximately 9.81 m/s².
         * This is a well-known physical constant.
         */
        expect(DEFAULT_FORCE_CONFIG.gravity).toBeCloseTo(9.81, 2);
    });

    it('should define reasonable default air density', () => {
        /**
         * Air density at sea level and 20°C is approximately 1.2 kg/m³.
         * This is the standard value used in aerodynamics calculations.
         */
        expect(DEFAULT_FORCE_CONFIG.airDensity).toBeCloseTo(1.2, 1);
    });

    it('should define drag coefficient in expected range for tumbling disc', () => {
        /**
         * Drag coefficient for a tumbling thin disc is typically 1.1-1.3.
         * Our default of 1.17 should fall within this range.
         */
        expect(DEFAULT_FORCE_CONFIG.dragCoefficient).toBeGreaterThanOrEqual(1.1);
        expect(DEFAULT_FORCE_CONFIG.dragCoefficient).toBeLessThanOrEqual(1.3);
    });

    it('should define a small positive angular damping coefficient', () => {
        /**
         * Angular damping should be positive (opposes rotation) and small enough
         * that spin persists through a typical coin flip (~0.5s).
         */
        expect(DEFAULT_FORCE_CONFIG.angularDamping).toBeGreaterThan(0);
        expect(DEFAULT_FORCE_CONFIG.angularDamping).toBeLessThan(0.01);
    });

    it('should have all required force config properties', () => {
        /**
         * The default config should contain all force-related constants,
         * making it easy to override just one parameter.
         */
        expect(DEFAULT_FORCE_CONFIG).toHaveProperty('gravity');
        expect(DEFAULT_FORCE_CONFIG).toHaveProperty('airDensity');
        expect(DEFAULT_FORCE_CONFIG).toHaveProperty('dragCoefficient');
        expect(DEFAULT_FORCE_CONFIG).toHaveProperty('angularDamping');
    });
});

describe('computeGravityForce', () => {
    it('should compute gravity force as mass times acceleration', () => {
        /**
         * Newton's law: F = m * g
         *
         * For mass = 1 kg:
         * -> F = 1.0 * 9.81 = 9.81 N downward
         * -> Vector: (0, -9.81, 0)
         */
        const force = computeGravityForce(1.0);

        expect(force.x).toBeCloseTo(0);
        expect(force.y).toBeCloseTo(-9.81, 2);
        expect(force.z).toBeCloseTo(0);
    });

    it('should scale linearly with mass', () => {
        /**
         * Gravity force doubles when mass doubles.
         *
         * For mass = 2 kg:
         * -> F = 2.0 * 9.81 = 19.62 N downward
         */
        const force = computeGravityForce(2.0);

        expect(force.y).toBeCloseTo(-19.62, 2);
    });

    it('should use custom gravity when provided', () => {
        /**
         * On the Moon, g ≈ 1.62 m/s². The function should use this custom value.
         *
         * For mass = 1 kg on the Moon:
         * -> F = 1.0 * 1.62 = 1.62 N downward
         */
        const moonGravity = 1.62;
        const force = computeGravityForce(1.0, moonGravity);

        expect(force.y).toBeCloseTo(-1.62, 2);
    });

    it('should return zero force for zero mass', () => {
        /**
         * A massless object experiences no gravitational force.
         * This is a boundary case that should be handled gracefully.
         */
        const force = computeGravityForce(0);

        expect(force.equals(Vec3.ZERO)).toBe(true);
    });

    it('should compute realistic force for a US quarter', () => {
        /**
         * A US quarter has mass ≈ 5.67 grams = 0.00567 kg.
         *
         * -> F = 0.00567 * 9.81 ≈ 0.0556 N
         *
         * This is the weight of the coin—the force that makes it fall.
         */
        const quarterMass = 0.00567;
        const force = computeGravityForce(quarterMass);

        expect(force.y).toBeCloseTo(-0.0556, 3);
    });
});

describe('computeLinearDragForce', () => {
    it('should return zero drag for stationary object', () => {
        /**
         * No velocity means no drag. The drag formula includes v², so:
         * -> F_drag = -½ρCdA * 0² * v̂ = 0
         *
         * This also avoids division by zero when normalizing zero velocity.
         */
        const drag = computeLinearDragForce(Vec3.ZERO, 0.012);

        expect(drag.equals(Vec3.ZERO)).toBe(true);
    });

    it('should oppose the direction of motion', () => {
        /**
         * Drag force always acts opposite to velocity direction.
         * If moving in +X, drag should point in -X.
         */
        const velocity = new Vec3(5, 0, 0);
        const drag = computeLinearDragForce(velocity, 0.012);

        expect(drag.x).toBeLessThan(0);
        expect(drag.y).toBeCloseTo(0, 10);
        expect(drag.z).toBeCloseTo(0, 10);
    });

    it('should increase with velocity squared', () => {
        /**
         * Drag is proportional to v². Doubling velocity should quadruple drag.
         *
         * Let v1 = (3, 0, 0), v2 = (6, 0, 0)
         * -> |F2| / |F1| = (6²) / (3²) = 36 / 9 = 4
         */
        const v1 = new Vec3(3, 0, 0);
        const v2 = new Vec3(6, 0, 0);

        const drag1 = computeLinearDragForce(v1, 0.012);
        const drag2 = computeLinearDragForce(v2, 0.012);

        const ratio = drag2.magnitude() / drag1.magnitude();
        expect(ratio).toBeCloseTo(4.0, 1);
    });

    it('should increase with cross-sectional area (radius squared)', () => {
        /**
         * Drag is proportional to area = πr². Doubling radius quadruples area.
         *
         * Let r1 = 0.01m, r2 = 0.02m
         * -> A2 / A1 = (0.02² * π) / (0.01² * π) = 4
         * -> |F2| / |F1| = 4
         */
        const velocity = new Vec3(5, 0, 0);

        const drag1 = computeLinearDragForce(velocity, 0.01);
        const drag2 = computeLinearDragForce(velocity, 0.02);

        const ratio = drag2.magnitude() / drag1.magnitude();
        expect(ratio).toBeCloseTo(4.0, 1);
    });

    it('should scale linearly with air density', () => {
        /**
         * Doubling air density doubles drag.
         * This models thicker air at lower altitudes.
         */
        const velocity = new Vec3(5, 0, 0);

        const drag1 = computeLinearDragForce(velocity, 0.012, 1.0);
        const drag2 = computeLinearDragForce(velocity, 0.012, 2.0);

        const ratio = drag2.magnitude() / drag1.magnitude();
        expect(ratio).toBeCloseTo(2.0, 2);
    });

    it('should scale linearly with drag coefficient', () => {
        /**
         * Doubling drag coefficient doubles drag force.
         * A rougher surface would have higher Cd.
         */
        const velocity = new Vec3(5, 0, 0);

        const drag1 = computeLinearDragForce(velocity, 0.012, 1.2, 1.0);
        const drag2 = computeLinearDragForce(velocity, 0.012, 1.2, 2.0);

        const ratio = drag2.magnitude() / drag1.magnitude();
        expect(ratio).toBeCloseTo(2.0, 2);
    });

    it('should handle diagonal velocity correctly', () => {
        /**
         * For velocity (3, 4, 0), magnitude is 5 m/s.
         * Drag should point in (-3, -4, 0) direction (opposite), normalized.
         *
         * -> v̂ = (3/5, 4/5, 0) = (0.6, 0.8, 0)
         * -> Drag direction = (-0.6, -0.8, 0)
         *
         * The drag force should be anti-parallel to velocity.
         */
        const velocity = new Vec3(3, 4, 0);
        const drag = computeLinearDragForce(velocity, 0.012);

        const velUnit = velocity.normalize();
        const dragUnit = drag.normalize();

        /**
         * Dot product of opposite unit vectors should be -1.
         */
        expect(velUnit.dotProduct(dragUnit)).toBeCloseTo(-1.0, 5);
    });

    it('should compute realistic drag for a US quarter at typical flip speed', () => {
        /**
         * A US quarter (r = 0.012m) flying at 3 m/s through sea-level air:
         *
         * -> A = π * (0.012)² = 4.52e-4 m²
         * -> F = 0.5 * 1.2 * 1.17 * 4.52e-4 * 9
         * -> F ≈ 2.85e-3 N
         *
         * This is about 5% of the coin's weight (0.0556 N), which is physically
         * reasonable—drag is noticeable but gravity dominates.
         */
        const velocity = new Vec3(3, 0, 0);
        const drag = computeLinearDragForce(velocity, 0.012);

        const dragMagnitude = drag.magnitude();
        expect(dragMagnitude).toBeGreaterThan(0.001);
        expect(dragMagnitude).toBeLessThan(0.01);
    });
});

describe('computeAngularDragTorque', () => {
    it('should return zero torque for non-rotating body', () => {
        /**
         * No angular velocity means no angular drag.
         * -> τ = -k * 0 = 0
         */
        const torque = computeAngularDragTorque(Vec3.ZERO);

        expect(torque.equals(Vec3.ZERO)).toBe(true);
    });

    it('should oppose the direction of rotation', () => {
        /**
         * Angular drag always acts to slow rotation.
         * If spinning around +Y axis, torque should point in -Y direction.
         */
        const angularVelocity = new Vec3(0, 100, 0);
        const torque = computeAngularDragTorque(angularVelocity);

        expect(torque.x).toBeCloseTo(0, 10);
        expect(torque.y).toBeLessThan(0);
        expect(torque.z).toBeCloseTo(0, 10);
    });

    it('should scale linearly with angular velocity', () => {
        /**
         * Linear damping model: τ = -k * ω
         * Doubling ω doubles torque magnitude.
         */
        const w1 = new Vec3(0, 50, 0);
        const w2 = new Vec3(0, 100, 0);

        const torque1 = computeAngularDragTorque(w1);
        const torque2 = computeAngularDragTorque(w2);

        const ratio = torque2.magnitude() / torque1.magnitude();
        expect(ratio).toBeCloseTo(2.0, 5);
    });

    it('should scale linearly with damping coefficient', () => {
        /**
         * Doubling the damping coefficient doubles the torque.
         */
        const angularVelocity = new Vec3(0, 100, 0);

        const torque1 = computeAngularDragTorque(angularVelocity, 0.00001);
        const torque2 = computeAngularDragTorque(angularVelocity, 0.00002);

        const ratio = torque2.magnitude() / torque1.magnitude();
        expect(ratio).toBeCloseTo(2.0, 5);
    });

    it('should handle multi-axis rotation correctly', () => {
        /**
         * For ω = (10, 20, 30) and k = 0.00001:
         * -> τ = -0.00001 * (10, 20, 30) = (-0.0001, -0.0002, -0.0003)
         *
         * Each component is scaled independently.
         */
        const angularVelocity = new Vec3(10, 20, 30);
        const torque = computeAngularDragTorque(angularVelocity, 0.00001);

        expect(torque.x).toBeCloseTo(-0.0001, 6);
        expect(torque.y).toBeCloseTo(-0.0002, 6);
        expect(torque.z).toBeCloseTo(-0.0003, 6);
    });

    it('should produce small but non-zero torque at typical spin rates', () => {
        /**
         * At ω = 100 rad/s (about 16 revolutions per second):
         * -> τ = -0.00001 * 100 = -0.001 N⋅m
         *
         * This should be small enough that spin persists through a flip,
         * but large enough to accumulate over many timesteps.
         */
        const angularVelocity = new Vec3(0, 100, 0);
        const torque = computeAngularDragTorque(angularVelocity);

        expect(Math.abs(torque.y)).toBeCloseTo(0.001, 5);
    });
});

describe('computeForces', () => {
    /**
     * Test fixtures for a standard coin-like rigid body.
     *
     * Using a 1 kg mass for easier mental math in tests,
     * though real coins are much lighter (~5.67 grams for a quarter).
     */
    function createTestBody(options?: {
        mass?: number;
        radius?: number;
        linearVelocity?: Vec3;
        angularVelocity?: Vec3;
    }): RigidBody {
        const mass = options?.mass ?? 1.0;
        const radius = options?.radius ?? 0.012;

        /**
         * For a thin disc, the inertia tensor is diagonal:
         * -> Ixx = Iyy = (1/4) * m * r² + (1/12) * m * h²
         * -> Izz = (1/2) * m * r²
         *
         * For simplicity in tests, we use identity scaled by mass.
         */
        const inertia = Mat3.IDENTITY.scale(mass);

        return new RigidBody(
            mass,
            inertia,
            radius,
            0.002,
            new Vec3(0, 0.5, 0),
            Quaternion.IDENTITY,
            options?.linearVelocity ?? Vec3.ZERO,
            options?.angularVelocity ?? Vec3.ZERO
        );
    }

    it('should compute gravity force for stationary body', () => {
        /**
         * A body at rest should experience only gravitational force.
         * No velocity means no drag.
         */
        const body = createTestBody();
        const forces = computeForces(body);

        expect(forces.force.y).toBeCloseTo(-9.81, 2);
        expect(forces.force.x).toBe(0);
        expect(forces.force.z).toBe(0);
    });

    it('should return zero torque for non-rotating body', () => {
        /**
         * A body with no angular velocity experiences no angular drag.
         */
        const body = createTestBody();
        const forces = computeForces(body);

        expect(forces.torque.equals(Vec3.ZERO)).toBe(true);
    });

    it('should include drag force for moving body', () => {
        /**
         * A body moving horizontally should experience:
         * 1. Gravity (downward)
         * 2. Linear drag (opposing motion)
         *
         * Net horizontal force should be negative (opposing +X motion).
         */
        const body = createTestBody({ linearVelocity: new Vec3(5, 0, 0) });
        const forces = computeForces(body);

        expect(forces.force.x).toBeLessThan(0);
        expect(forces.force.y).toBeLessThan(0);
    });

    it('should include angular drag torque for spinning body', () => {
        /**
         * A spinning body should experience torque opposing its rotation.
         */
        const body = createTestBody({ angularVelocity: new Vec3(0, 100, 0) });
        const forces = computeForces(body);

        expect(forces.torque.y).toBeLessThan(0);
    });

    it('should combine all forces and torques', () => {
        /**
         * A moving, spinning body experiences all effects:
         * - Gravity (downward force)
         * - Linear drag (opposing velocity)
         * - Angular drag (opposing spin)
         */
        const body = createTestBody({
            linearVelocity: new Vec3(3, 2, 1),
            angularVelocity: new Vec3(50, 100, 30),
        });
        const forces = computeForces(body);

        /**
         * Y force should include gravity + vertical component of drag.
         */
        expect(forces.force.y).toBeLessThan(-9.0);

        /**
         * All torque components should oppose their respective angular velocity components.
         */
        expect(forces.torque.x).toBeLessThan(0);
        expect(forces.torque.y).toBeLessThan(0);
        expect(forces.torque.z).toBeLessThan(0);
    });

    it('should respect custom gravity configuration', () => {
        /**
         * Simulating on the Moon (g = 1.62 m/s²).
         */
        const body = createTestBody();
        const forces = computeForces(body, { gravity: 1.62 });

        expect(forces.force.y).toBeCloseTo(-1.62, 2);
    });

    it('should respect custom air density configuration', () => {
        /**
         * Compare drag at different air densities.
         * Higher density should produce more drag.
         */
        const body = createTestBody({ linearVelocity: new Vec3(5, 0, 0) });

        const normalAir = computeForces(body, { airDensity: 1.2 });
        const thickAir = computeForces(body, { airDensity: 2.4 });

        /**
         * Gravity is the same, but horizontal drag doubles.
         */
        expect(Math.abs(thickAir.force.x)).toBeGreaterThan(Math.abs(normalAir.force.x));
        expect(Math.abs(thickAir.force.x) / Math.abs(normalAir.force.x)).toBeCloseTo(2.0, 1);
    });

    it('should respect custom angular damping configuration', () => {
        /**
         * Higher angular damping should produce stronger opposing torque.
         */
        const body = createTestBody({ angularVelocity: new Vec3(0, 100, 0) });

        const normalDamping = computeForces(body, { angularDamping: 0.00001 });
        const strongDamping = computeForces(body, { angularDamping: 0.00002 });

        expect(Math.abs(strongDamping.torque.y)).toBeGreaterThan(Math.abs(normalDamping.torque.y));
        expect(Math.abs(strongDamping.torque.y) / Math.abs(normalDamping.torque.y)).toBeCloseTo(2.0, 2);
    });

    it('should use default config when no overrides provided', () => {
        /**
         * Calling computeForces with empty config should use all defaults.
         */
        const body = createTestBody({ linearVelocity: new Vec3(3, 0, 0) });

        const withDefaults = computeForces(body);
        const withExplicitDefaults = computeForces(body, {
            gravity: DEFAULT_FORCE_CONFIG.gravity,
            airDensity: DEFAULT_FORCE_CONFIG.airDensity,
            dragCoefficient: DEFAULT_FORCE_CONFIG.dragCoefficient,
            angularDamping: DEFAULT_FORCE_CONFIG.angularDamping,
        });

        expect(withDefaults.force.equals(withExplicitDefaults.force)).toBe(true);
        expect(withDefaults.torque.equals(withExplicitDefaults.torque)).toBe(true);
    });

    it('should produce physically reasonable forces for a realistic coin flip', () => {
        /**
         * Simulate a US quarter mid-flip:
         * - mass = 5.67g = 0.00567 kg
         * - radius = 12mm = 0.012m
         * - velocity ≈ (1, 3, 0) m/s (rising, moving horizontally)
         * - angular velocity ≈ (10, 100, 50) rad/s (tumbling)
         *
         * Expected behavior:
         * - Gravity dominates vertical motion (~0.056 N down)
         * - Drag is small but present (< 1% of gravity)
         * - Angular drag is tiny but non-zero
         */
        const quarterMass = 0.00567;
        const quarterRadius = 0.012;

        /**
         * For force calculations, the inertia tensor doesn't affect the results.
         * Forces (gravity, drag) depend on mass, velocity, and geometry.
         * The inertia tensor only matters for angular acceleration computed by the integrator.
         *
         * We use identity here for numerical stability in the RigidBody constructor,
         * which requires the tensor to be invertible. The actual coin inertia
         * (on the order of 1e-7 kg⋅m²) produces a determinant too small for
         * the tolerance check in Mat3.inverse().
         */
        const inertia = Mat3.IDENTITY;

        const quarter = new RigidBody(
            quarterMass,
            inertia,
            quarterRadius,
            0.00175,
            new Vec3(0, 0.4, 0),
            Quaternion.IDENTITY,
            new Vec3(1, 3, 0),
            new Vec3(10, 100, 50)
        );

        const forces = computeForces(quarter);

        /**
         * Gravity should be about 0.056 N down, with a small drag contribution.
         * When the coin is moving upward (positive Y velocity), drag opposes
         * this motion by adding a downward force component, making the total
         * Y force slightly more negative than pure gravity.
         *
         * We allow ±10% tolerance to account for this drag contribution.
         */
        const expectedGravity = -quarterMass * 9.81;
        expect(forces.force.y).toBeLessThan(expectedGravity * 0.9);
        expect(forces.force.y).toBeGreaterThan(expectedGravity * 1.1);

        /**
         * Total force magnitude should be dominated by gravity.
         */
        expect(forces.force.magnitude()).toBeLessThan(0.1);
        expect(forces.force.magnitude()).toBeGreaterThan(0.05);

        /**
         * Torque should be small but present.
         */
        expect(forces.torque.magnitude()).toBeGreaterThan(0);
        expect(forces.torque.magnitude()).toBeLessThan(0.01);
    });
});
