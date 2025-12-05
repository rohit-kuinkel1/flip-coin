import { describe, it, expect } from 'vitest';
import { Quaternion } from '../../../src/physics/math/quaternion';
import { Vec3 } from '../../../src/physics/math/vec3';

describe('Quaternion', () => {
  describe('Construction and Constants', () => {
    it('creates a quaternion with supplied components', () => {
      /**
       * When we create a quaternion with 4 components (w, x, y, z),
       * we should be able to access each component directly.
       * 
       * A quaternion is represented as q = w + xi + yj + zk where:
       * - w is the scalar (real) part
       * - (x, y, z) is the vector (imaginary) part
       * 
       * For q = (1, 2, 3, 4):
       * → w = 1 (scalar part)
       * → x = 2, y = 3, z = 4 (vector part)
       */
      const q = new Quaternion(1, 2, 3, 4);

      expect(q.w).toBe(1);
      expect(q.x).toBe(2);
      expect(q.y).toBe(3);
      expect(q.z).toBe(4);
    });

    it('exposes the identity quaternion', () => {
      /**
       * The identity quaternion represents zero rotation (no rotation at all).
       * It's the multiplicative identity for quaternion multiplication.
       * 
       * Identity quaternion:
       * → q = (1, 0, 0, 0)
       * → w = 1, x = y = z = 0
       * 
       * Properties:
       * → q × identity = q
       * → identity × q = q
       * → Rotating any vector by identity leaves it unchanged
       */
      expect(Quaternion.IDENTITY.w).toBe(1);
      expect(Quaternion.IDENTITY.x).toBe(0);
      expect(Quaternion.IDENTITY.y).toBe(0);
      expect(Quaternion.IDENTITY.z).toBe(0);
    });
  });

  describe('Magnitude and Normalization', () => {
    it('computes magnitude and magnitude square', () => {
      const q = new Quaternion(1, 2, 2, 0);

      /**
       * The magnitude (norm) of a quaternion follows:
       * → |q| = sqrt(w² + x² + y² + z²)
       * 
       * For q = (1, 2, 2, 0):
       * → |q|² = 1² + 2² + 2² + 0²
       * → |q|² = 1 + 4 + 4 + 0
       * → |q|² = 9
       * → |q| = sqrt(9) = 3
       * 
       * The magnitude squared is computed first as it's faster
       * (avoids the square root operation) and is often sufficient
       * for comparisons.
       */
      expect(q.magnitudeSquare()).toBe(9);
      expect(q.magnitude()).toBe(3);
    });

    it('normalizes and keeps canonical sign', () => {
      const q = new Quaternion(-2, 0, 0, 0);
      const normalized = q.normalize();

      /**
       * Normalization produces a unit quaternion (magnitude = 1):
       * → q_norm = q / |q|
       * 
       * For q = (-2, 0, 0, 0):
       * → |q| = sqrt((-2)² + 0² + 0² + 0²) = sqrt(4) = 2
       * → q_norm = (-2/2, 0/2, 0/2, 0/2)
       * → q_norm = (-1, 0, 0, 0) before canonicalization
       * 
       * Sign canonicalization:
       * Since q and -q represent the same rotation, we canonicalize
       * by ensuring w ≥ 0. This stabilizes long integrations and
       * prevents sign flipping during numerical operations.
       * 
       * → If w < 0, flip all components
       * → Final result: (1, 0, 0, 0)
       */
      expect(normalized.w).toBe(1);
      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
      expect(normalized.z).toBe(0);

      /**
       * Original quaternion should remain unchanged (immutability).
       */
      expect(q.w).toBe(-2);
    });

    it('returns identity when normalizing zero quaternion', () => {
      /**
       * The zero quaternion (0, 0, 0, 0) has magnitude 0:
       * → |q| = sqrt(0² + 0² + 0² + 0²) = 0
       * 
       * Normalizing would require division by zero, which is undefined.
       * To prevent NaN propagation in physics state, we return the
       * identity quaternion instead, which represents no rotation.
       * 
       * This is a safe fallback that keeps simulations stable.
       */
      const zero = new Quaternion(0, 0, 0, 0);
      expect(zero.normalize().equals(Quaternion.IDENTITY)).toBe(true);
    });
  });

  describe('Conjugate and Inverse', () => {
    it('computes conjugate without mutating original', () => {
      const q = new Quaternion(1, 2, 3, 4);
      const c = q.conjugate();

      /**
       * The conjugate of a quaternion flips the sign of the vector part:
       * → q* = (w, -x, -y, -z)
       * 
       * For q = (1, 2, 3, 4):
       * → q* = (1, -2, -3, -4)
       * 
       * The conjugate is used in:
       * - Computing the inverse: q⁻¹ = q* / |q|²
       * - Vector rotation: v' = q × v × q*
       * - Reversing rotations
       */
      expect(c.equals(new Quaternion(1, -2, -3, -4))).toBe(true);

      /**
       * Original quaternion should remain unchanged (immutability).
       */
      expect(q.equals(new Quaternion(1, 2, 3, 4))).toBe(true);
    });

    it('returns null inverse for zero quaternion', () => {
      /**
       * The inverse of a quaternion is:
       * → q⁻¹ = q* / |q|²
       * 
       * For the zero quaternion:
       * → |q|² = 0² + 0² + 0² + 0² = 0
       * 
       * Since division by zero is undefined, there is no inverse.
       * We return null to signal this error condition.
       */
      expect(new Quaternion(0, 0, 0, 0).inverse()).toBeNull();
    });

    it('computes inverse for non-zero quaternion and clamps near-zero components', () => {
      const q = new Quaternion(2, 0, 0, 0);
      const inv = q.inverse();

      /**
       * The inverse formula for a quaternion:
       * → q⁻¹ = q* / |q|²
       * 
       * For q = (2, 0, 0, 0):
       * → |q|² = 2² + 0² + 0² + 0² = 4
       * → q* = (2, -0, -0, -0) = (2, 0, 0, 0)
       * → q⁻¹ = (2/4, 0/4, 0/4, 0/4)
       * → q⁻¹ = (0.5, 0, 0, 0)
       * 
       * Note: Values very close to zero (like -0 from floating point)
       * are clamped to exactly 0 to avoid sign issues.
       * 
       * Verification that q × q⁻¹ = identity:
       * → This should give us (1, 0, 0, 0) within floating point precision
       */
      expect(inv).not.toBeNull();
      expect(inv!.w).toBeCloseTo(0.5, 10);
      expect(inv!.x).toBe(0);
      expect(inv!.y).toBe(0);
      expect(inv!.z).toBe(0);

      const product = q.multiply(inv!);
      const reverseProduct = inv!.multiply(q);

      expect(product.equalsApprox(Quaternion.IDENTITY)).toBe(true);
      expect(reverseProduct.equalsApprox(Quaternion.IDENTITY)).toBe(true);
    });

    it('matches conjugate for unit quaternions', () => {
      const q = new Quaternion(1, 2, 3, 4).normalize();
      const inv = q.inverse();
      const conj = q.conjugate();

      /**
       * For a unit quaternion (|q| = 1):
       * → q⁻¹ = q* / |q|²
       * → q⁻¹ = q* / 1
       * → q⁻¹ = q*
       * 
       * This is a special case that allows us to compute the inverse
       * much more efficiently (just negate the vector part) without
       * any division. Physics integrators often keep quaternions
       * unit-length specifically to exploit this.
       */
      expect(inv).not.toBeNull();
      expect(inv!.equalsApprox(conj)).toBe(true);
    });
  });

  describe('Multiplication', () => {
    it('uses identity as neutral element', () => {
      const q = new Quaternion(1, 2, 3, 4);

      /**
       * The identity quaternion is the multiplicative identity:
       * → q × I = q (right identity)
       * → I × q = q (left identity)
       * 
       * This guarantees safe composition of rotations where
       * multiplying by identity doesn't change the rotation.
       */
      expect(q.multiply(Quaternion.IDENTITY).equalsApprox(q)).toBe(true);
      expect(Quaternion.IDENTITY.multiply(q).equalsApprox(q)).toBe(true);
    });

    it('is non-commutative', () => {
      const q1 = new Quaternion(1, 2, 3, 4).normalize();
      const q2 = new Quaternion(5, 6, 7, 8).normalize();

      /**
       * Quaternion multiplication is NOT commutative:
       * → q1 × q2 ≠ q2 × q1 (in general)
       * 
       * This mirrors the fact that 3D rotations don't commute:
       * rotating 90° around X then 90° around Y gives a different
       * result than rotating 90° around Y then 90° around X.
       * 
       * This is critical for physics where the order of operations
       * absolutely matters.
       */
      const q1q2 = q1.multiply(q2);
      const q2q1 = q2.multiply(q1);

      expect(q1q2.equals(q2q1)).toBe(false);
    });

    it('is associative', () => {
      const q1 = Quaternion.fromAxisAngle(Vec3.RIGHT, Math.PI / 6);
      const q2 = Quaternion.fromAxisAngle(Vec3.UP, Math.PI / 4);
      const q3 = Quaternion.fromAxisAngle(Vec3.FORWARD, Math.PI / 3);

      /**
       * Quaternion multiplication IS associative:
       * → (q1 × q2) × q3 = q1 × (q2 × q3)
       * 
       * This means we can chain rotations in any grouping and
       * get the same result. It's essential for stable rotation
       * composition in physics engines.
       */
      const left = q1.multiply(q2).multiply(q3);
      const right = q1.multiply(q2.multiply(q3));

      expect(left.equalsApprox(right)).toBe(true);
    });

    it('preserves unit magnitude when multiplying unit quaternions', () => {
      const q1 = new Quaternion(1, 2, 3, 4).normalize();
      const q2 = new Quaternion(5, 6, 7, 8).normalize();
      const product = q1.multiply(q2);

      /**
       * When multiplying two unit quaternions:
       * → |q1| = 1, |q2| = 1
       * → |q1 × q2| = |q1| × |q2| = 1 × 1 = 1
       * 
       * This property is crucial because valid rotations are
       * represented by unit quaternions. The product of two
       * rotations should also be a valid rotation.
       * 
       * This keeps us on the unit hypersphere in 4D space,
       * preventing drift during numerical integration.
       */
      expect(product.magnitude()).toBeCloseTo(1, 10);
    });
  });

  describe('Vector Rotation', () => {
    it('rotates 90 degrees around Z', () => {
      const q = Quaternion.fromAxisAngle(Vec3.FORWARD, Math.PI / 2);
      const rotated = q.rotateVector(Vec3.RIGHT);

      /**
       * Rotating a vector by a quaternion uses the formula:
       * → v' = q × v × q*
       * 
       * Where v is treated as a quaternion (0, vx, vy, vz).
       * 
       * Test case: Rotate RIGHT (1, 0, 0) by 90° around Z-axis (FORWARD)
       * 
       * Expected result: RIGHT rotated 90° around Z should give UP
       * → (1, 0, 0) rotated 90° around (0, 0, 1) → (0, 1, 0)
       * 
       * This validates the quaternion rotation formula is correctly
       * implemented.
       */
      expect(rotated.equalsApprox(Vec3.UP)).toBe(true);
    });

    it('preserves magnitude during rotation', () => {
      const v = new Vec3(3, 4, 12);
      const q = Quaternion.fromAxisAngle(new Vec3(1, 1, 1), Math.PI / 3);
      const rotated = q.rotateVector(v);

      /**
       * Rotations are length-preserving transformations:
       * → |v'| = |v|
       * 
       * For v = (3, 4, 12):
       * → |v| = sqrt(3² + 4² + 12²) = sqrt(9 + 16 + 144) = sqrt(169) = 13
       * 
       * After rotation by any angle around any axis:
       * → |v'| should still equal 13
       * 
       * This is essential for physics: rotating a velocity or force
       * vector shouldn't change its magnitude, only its direction.
       */
      expect(rotated.magnitude()).toBeCloseTo(v.magnitude(), 10);
    });

    it('matches sequential rotations with composed quaternion', () => {
      const q1 = Quaternion.fromAxisAngle(Vec3.RIGHT, Math.PI / 4);
      const q2 = Quaternion.fromAxisAngle(Vec3.UP, Math.PI / 6);
      const composed = q2.multiply(q1);

      const v = new Vec3(1, 2, 3);
      const step = q2.rotateVector(q1.rotateVector(v));
      const direct = composed.rotateVector(v);

      /**
       * Composition property of quaternion rotations:
       * → (q2 × q1) rotates v = q2 rotates (q1 rotates v)
       * 
       * In other words:
       * → v'' = (q2 × q1) × v × (q2 × q1)*
       * Should equal:
       * → v' = q1 × v × q1*
       * → v'' = q2 × v' × q2*
       * 
       * This verifies that quaternion multiplication correctly
       * composes rotations, which is fundamental for chaining
       * transformations in physics (e.g., body rotation followed
       * by world rotation).
       * 
       * Note: Order matters! q2 × q1 means "apply q1 first, then q2"
       */
      expect(direct.equalsApprox(step)).toBe(true);
    });
  });

  describe('Axis-Angle Conversion', () => {
    it('creates quaternion from non-normalized axis', () => {
      const axis = new Vec3(0, 0, 5);
      const normalizedAxis = Vec3.FORWARD;
      const angle = Math.PI / 2;

      /**
       * The fromAxisAngle method should normalize the axis internally:
       * 
       * For axis = (0, 0, 5):
       * → |axis| = sqrt(0² + 0² + 5²) = 5
       * → normalized = (0/5, 0/5, 5/5) = (0, 0, 1) = FORWARD
       * 
       * Converting from axis-angle to quaternion:
       * → q = (cos(θ/2), sin(θ/2) × axis_normalized)
       * 
       * For θ = 90° = π/2:
       * → q = (cos(π/4), sin(π/4) × (0, 0, 1))
       * → q = (√2/2, 0, 0, √2/2)
       * 
       * Both unnormalized (0, 0, 5) and normalized (0, 0, 1) axes
       * should produce the same quaternion.
       */
      const q1 = Quaternion.fromAxisAngle(axis, angle);
      const q2 = Quaternion.fromAxisAngle(normalizedAxis, angle);

      expect(q1.equalsApprox(q2)).toBe(true);
    });

    it('round-trips axis-angle', () => {
      const axis = new Vec3(1, 1, 0).normalize();
      const angle = Math.PI / 3;

      /**
       * Round-trip conversion test:
       * → axis-angle → quaternion → axis-angle
       * 
       * For axis = (1, 1, 0) normalized = (√2/2, √2/2, 0) and angle = π/3:
       * 
       * Step 1: Convert to quaternion
       * → q = (cos(π/6), sin(π/6) × (√2/2, √2/2, 0))
       * → q = (√3/2, √2/4, √2/4, 0)
       * 
       * Step 2: Convert back to axis-angle
       * Should recover:
       * → axis = (√2/2, √2/2, 0)
       * → angle = π/3
       * 
       * This is essential for interoperability with systems that
       * store rotations as axis-angle (e.g., animation systems,
       * physics constraints).
       */
      const q = Quaternion.fromAxisAngle(axis, angle);
      const { axis: recoveredAxis, radians } = q.toAxisAngle();
      const rebuilt = Quaternion.fromAxisAngle(recoveredAxis, radians);

      expect(recoveredAxis.equalsApprox(axis)).toBe(true);
      expect(radians).toBeCloseTo(angle, 10);
      expect(rebuilt.equalsApprox(q)).toBe(true);
    });
  });

  describe('Derivative and Integration', () => {
    it('computes derivative for constant angular velocity', () => {
      const omega = new Vec3(0, 10, 0);
      const derivative = Quaternion.IDENTITY.derivative(omega);

      /**
       * The quaternion derivative with respect to time is:
       * → dq/dt = 0.5 × ω_quat × q
       * 
       * Where ω_quat is the angular velocity as a pure quaternion (0, ωx, ωy, ωz).
       * 
       * For q = IDENTITY = (1, 0, 0, 0) and ω = (0, 10, 0):
       * → ω_quat = (0, 0, 10, 0)
       * 
       * Quaternion multiplication ω_quat × q:
       * → (0, 0, 10, 0) × (1, 0, 0, 0)
       * Using q1 × q2 = (w1w2 - v1·v2, w1v2 + w2v1 + v1×v2):
       * → w = 0×1 - (0×0 + 10×0 + 0×0) = 0
       * → x = 0×0 + 1×0 + [(0, 10, 0) × (0, 0, 0)] = 0
       * → y = 0×0 + 1×10 + 0 = 10
       * → z = 0×0 + 1×0 + 0 = 0
       * → Result = (0, 0, 10, 0)
       * 
       * Therefore:
       * → dq/dt = 0.5 × (0, 0, 10, 0)
       * → dq/dt = (0, 0, 5, 0)
       */
      expect(derivative.w).toBeCloseTo(0, 10);
      expect(derivative.x).toBeCloseTo(0, 10);
      expect(derivative.y).toBeCloseTo(5, 10);
      expect(derivative.z).toBeCloseTo(0, 10);
    });

    it('integrates one full revolution back to identity (within tolerance)', () => {
      const omega = new Vec3(0, 0, 2 * Math.PI);
      const dt = 0.001;
      let q = Quaternion.IDENTITY;

      /**
       * Numerical integration of orientation over time using Euler method:
       * → q(t + dt) = normalize(q(t) + dq/dt × dt)
       * 
       * For a full revolution (2π radians) around Z-axis over 1 second:
       * → ω = (0, 0, 2π) rad/s
       * → Total rotation = 2π radians = 360°
       * 
       * After one complete revolution, the orientation should return
       * to identity (within numerical precision).
       * 
       * Integration steps (Euler method):
       * 1. Compute dq/dt = 0.5 × ω_quat × q
       * 2. Update: q_new = q + dq/dt × dt
       * 3. Normalize to maintain unit quaternion
       * 4. Repeat for t = 0 to 1 second
       * 
       * Expected result: q ≈ (1, 0, 0, 0) after 1000 steps
       * 
       * Note: We use a tolerance of 1e-3 because Euler integration
       * accumulates error. More sophisticated integrators (RK4) would
       * be more accurate but this tests the basic derivative formula.
       */
      for (let t = 0; t < 1; t += dt) {
        const dq = q.derivative(omega);
        q = new Quaternion(
          q.w + dq.w * dt,
          q.x + dq.x * dt,
          q.y + dq.y * dt,
          q.z + dq.z * dt
        ).normalize();
      }

      const tolerance = 1e-3;
      expect(q.equalsApprox(Quaternion.IDENTITY, tolerance)).toBe(true);
    });
  });

  describe('Immutability', () => {
    it('does not mutate operands during operations', () => {
      const q1 = new Quaternion(1, 2, 3, 4);
      const q2 = new Quaternion(0.5, -1, 2, -2);

      /**
       * All quaternion operations should return new instances
       * without modifying the original quaternions.
       * 
       * This immutability is crucial for:
       * - Deterministic physics state
       * - Preventing side effects in calculations
       * - Enabling safe concurrent access
       * - Making code easier to reason about
       * 
       * We verify that normalize(), conjugate(), and multiply()
       * all preserve the original quaternions.
       */
      q1.normalize();
      q1.conjugate();
      q1.multiply(q2);

      expect(q1.equals(new Quaternion(1, 2, 3, 4))).toBe(true);
      expect(q2.equals(new Quaternion(0.5, -1, 2, -2))).toBe(true);
    });
  });
});
