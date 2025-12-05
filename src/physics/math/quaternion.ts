import { Vec3 } from './vec3';

/**
 * A quaternion class for representing 3D rotations.
 *
 * ## What is a Quaternion?
 *
 * Quaternions are a mathematical system that extends complex numbers into four dimensions.
 * Think of them as an elegant way to encode 3D rotations that avoids many problems with other
 * rotation representations like Euler angles or rotation matrices.
 *
 * A quaternion has four components: q = w + xi + yj + zk
 * - w is the scalar (real) part which controls "how much rotation"
 * - (x, y, z) is the vector (imaginary) part which controls the "rotation axis direction"
 * - i, j, k are imaginary units satisfying: i² = j² = k² = ijk = -1
 *
 * ## Analogy: The Globe
 *
 * Imagine you're holding a globe and want to describe how to rotate it:
 *
 * Traditional approach with Euler angles: "First rotate 45° around the North-South axis,
 * then tilt 30° forward, then spin 60° to the left."
 * → Problem: The order matters! Different orders give different results (gimbal lock).
 * → Like following directions: "turn left then forward" ≠ "forward then turn left"
 *
 * Quaternion approach: "Rotate 87° around this specific diagonal axis that points
 * from the South Pole towards Tokyo."
 * → Single, unambiguous rotation
 * → No interdependencies between axes
 * → Mathematically smooth and stable for physics calculations
 *
 * ## Why Use Quaternions for Physics?
 *
 * 1. No Gimbal Lock: Unlike Euler angles, quaternions never "lock up" when two
 *    rotation axes align. This is critical for a spinning coin that can tumble in
 *    any direction.
 *
 * 2. Smooth Interpolation: When a coin spins continuously, its orientation changes
 *    smoothly over time. Quaternions interpolate smoothly (unlike matrices or Euler
 *    angles which can "jump").
 *
 * 3. Numerical Stability: During thousands of physics integration steps which will happen
 *    in this case, small errors accumulate. Quaternions are easier to "fix" (just normalize to length 1)
 *    compared to rotation matrices (which require expensive orthogonalization). This means that we 
 *    don't need to do expensive orthogonalization and can keep the quaternion normalized which saves
 *    computation.
 *
 * ## Understanding the Components
 *
 * For a rotation of θ radians around axis (ax, ay, az):
 * → q = (cos(θ/2), sin(θ/2)×ax, sin(θ/2)×ay, sin(θ/2)×az)
 *
 * Why divide the angle by 2?
 * This is the mathematical magic of quaternions! The half-angle formula means:
 * - A 180° rotation: θ/2 = 90°, so w = cos(90°) = 0
 * - A 360° rotation: θ/2 = 180°, so w = cos(180°) = -1
 * - A 0° rotation (identity): θ/2 = 0°, so w = cos(0°) = 1, (x,y,z) = (0,0,0)
 *
 * Concrete example: 
 * 90° rotation around the Z-axis (like a door hinge)
 * - Axis: (0, 0, 1) — pointing straight up
 * - Angle: 90° = π/2 radians
 * - Half-angle: π/4 radians
 * → w = cos(π/4) ≈ 0.707
 * → x = sin(π/4) × 0 = 0
 * → y = sin(π/4) × 0 = 0
 * → z = sin(π/4) × 1 ≈ 0.707
 * → q ≈ (0.707, 0, 0, 0.707)
 *
 * If you apply this quaternion to a point at (1, 0, 0), it rotates to (0, 1, 0).
 * Just like a door swinging 90° on its hinges
 *
 * ## Unit Quaternions
 *
 * For rotations, we ALWAYS use unit quaternions (magnitude = 1):
 * → |q| = sqrt(w² + x² + y² + z²) = 1
 *
 * Why? Because only unit quaternions represent pure rotations without scaling.
 * A non-unit quaternion would rotate AND stretch/shrink the object, which is
 * not what we want for rigid body physics.
 *
 * If numerical errors cause the magnitude to drift (e.g., after many integration
 * steps), we simply call normalize() to snap it back to length 1.
 *
 * ## Quaternion Multiplication = Rotation Composition
 *
 * When you multiply two quaternions q₁ × q₂, you're combining their rotations:
 * → "First rotate by q₂, then rotate by q₁"
 *
 * Example: Spinning coin physics
 * - q₁ = current orientation of the coin
 * - q₂ = small rotation from angular velocity over time step dt
 * - q₁ × q₂ = new orientation after dt seconds
 *
 * Important: Quaternion multiplication is NOT commutative!
 * → q₁ × q₂ ≠ q₂ × q₁ (order matters, just like physical rotations)
 *
 * ## The Sign Ambiguity
 *
 * Here's a quirk: q and -q represent the SAME rotation!
 * → (w, x, y, z) and (-w, -x, -y, -z) rotate objects identically
 *
 * Why? It's like going 90° clockwise vs. 270° counter-clockwise — same end result.
 * To avoid confusion, we canonicalize by ensuring w ≥ 0 (flip the sign if w < 0).
 *
 * ## Rotating a Vector
 *
 * To rotate a vector v by quaternion q:
 * → v' = q × v × q*
 *
 * Where:
 * - v is treated as a quaternion (0, v.x, v.y, v.z)
 * - q* is the conjugate of q (flip the sign of x, y, z)
 * - × is quaternion multiplication
 *
 * This "sandwich" formula is beautiful: the quaternion q "wraps around" the vector,
 * rotating it, then q* "unwraps" it back to vector form.
 *
 * ## Summary
 *
 * Think of a quaternion as a compact, numerically-friendly way to say:
 * "Rotate this much (w) around this axis direction (x, y, z)"
 *
 * For a physics engine simulating a tumbling coin, quaternions give us:
 * - No gimbal lock artifacts
 * - Smooth, stable integration over time
 * - Easy composition of rotations
 * - Compact representation (4 numbers instead of 9)
 *
 * Like Vec3 and Mat3, this class is immutable where all operations return new instances.
 *
 * TLDR: Quaternions are a compact, numerically-friendly way to represent rotations that are a bit
 * more complex than Euler angles or rotation matrices, yes, but they save a lot of computation
 * and are numerically stable.
 */
export class Quaternion {
  public readonly w: number;
  public readonly x: number;
  public readonly y: number;
  public readonly z: number;

  /**
   * Creates a new quaternion with the given components.
   *
   * The quaternion is represented as q = w + xi + yj + zk.
   *
   * @param w Scalar (real) component
   * @param x X component of the vector (imaginary) part
   * @param y Y component of the vector (imaginary) part
   * @param z Z component of the vector (imaginary) part
   */
  constructor(w: number, x: number, y: number, z: number) {
    this.w = w;
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Tolerance for floating point comparison.
   * Used in approximate equality checks to handle accumulated numerical errors.
   * This is needed because floating point calculations can accumulate errors so
   * we need a tolerance with which we basically say that the difference of this
   * much that results during a floating point calculation is considered to be
   * zero. Think of it like a margin of error thats accepted.
   */
  public static readonly TOLERANCE = 1e-6;

  /**
   * The identity quaternion: represents no rotation.
   *
   * q = (1, 0, 0, 0)
   *
   * Properties:
   * -> q × IDENTITY = q (right identity)
   * -> IDENTITY × q = q (left identity)
   * -> Rotating any vector by IDENTITY leaves it unchanged
   */
  public static readonly IDENTITY = new Quaternion(1, 0, 0, 0);

  /**
   * Computes the squared magnitude (norm²) of the quaternion.
   *
   * For a quaternion q = (w, x, y, z):
   * -> |q|² = w² + x² + y² + z²
   *
   * Example: |(1, 2, 3, 4)|² = 1² + 2² + 3² + 4² = 1 + 4 + 9 + 16 = 30
   *
   * This is faster than magnitude() because it avoids the square root.
   * Use this for magnitude comparisons where exact length isn't needed.
   */
  public magnitudeSquare(): number {
    return (
      this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z
    );
  }

  /**
   * Computes the magnitude (norm) of the quaternion.
   *
   * For a quaternion q = (w, x, y, z):
   * -> |q| = sqrt(w² + x² + y² + z²)
   *
   * Example: |(1, 2, 2, 0)| = sqrt(1 + 4 + 4 + 0) = sqrt(9) = 3
   *
   * For rotation quaternions, the magnitude should always be 1 (unit quaternion).
   * If the magnitude drifts due to numerical errors, use normalize() to fix it.
   */
  public magnitude(): number {
    return Math.sqrt(this.magnitudeSquare());
  }

  /**
   * Ensures extremely small values that originate from floating point round-off
   * are treated as exact zeros to avoid negative-zero artifacts.
   *
   * For a component c:
   * -> clamp(c) = 0            if |c| < TOLERANCE
   * -> clamp(c) = c            otherwise
   *
   * Example: c = -1e-9 with TOLERANCE = 1e-6
   * -> |c| = 0.000000001 < 0.000001
   * -> clamp(c) = 0 (prevents -0 from propagating)
   */
  private static clampComponent(value: number): number {
    return Math.abs(value) < Quaternion.TOLERANCE 
    ? 0 
    : value;
  }

  /**
   * Returns a normalized unit quaternion (magnitude = 1) in the same "direction".
   *
   * Normalization scales a quaternion so its magnitude becomes 1 while preserving
   * the rotation it represents.
   *
   * For a quaternion q = (w, x, y, z):
   * -> q_normalized = (w/|q|, x/|q|, y/|q|, z/|q|)
   *
   * Example: normalize(2, 0, 0, 0)
   * -> |q| = sqrt(4 + 0 + 0 + 0) = 2
   * -> q_normalized = (2/2, 0/2, 0/2, 0/2) = (1, 0, 0, 0) = IDENTITY
   *
   * If the quaternion is zero, returns IDENTITY to avoid division by zero.
   * This prevents NaNs from propagating through the physics simulation.
   *
   * We also canonicalize the sign so that the scalar part w >= 0.
   * Quaternions q and -q encode the same rotation; enforcing w >= 0
   * yields a stable representative after long integrations.
   */
  public normalize(): Quaternion {
    const m = this.magnitude();

    if (m === 0) {
      return Quaternion.IDENTITY;
    }

    /**
     * normalizing simply means that we divide all components by the magnitude
     * of the quaternion. This ensures that the quaternion has a magnitude of 1
     * that is needed for it to be a unit quaternion.
     */
    const normalized = new Quaternion(
      this.w / m,
      this.x / m,
      this.y / m,
      this.z / m
    );

    /**
     * If the scalar part w is negative, we flip the sign of all components
     * to ensure w >= 0. This canonicalizes the quaternion to a stable
     * representative after long integrations. Else we simply return the 
     * normalized quaternion.
     */
    return normalized.w < 0 
    ? new Quaternion(
        Quaternion.clampComponent(-normalized.w),
        Quaternion.clampComponent(-normalized.x),
        Quaternion.clampComponent(-normalized.y),
        Quaternion.clampComponent(-normalized.z)
    )
    : new Quaternion(
      Quaternion.clampComponent(normalized.w),
      Quaternion.clampComponent(normalized.x),
      Quaternion.clampComponent(normalized.y),
      Quaternion.clampComponent(normalized.z)
    );
   
  }

  /**
   * Computes the conjugate of this quaternion.
   *
   * For a quaternion q = (w, x, y, z), the conjugate q* is:
   * -> q* = (w, -x, -y, -z)
   *
   * The conjugate negates the vector part while keeping the scalar part unchanged.
   *
   * Example: (2, 3, 4, 5)* = (2, -3, -4, -5)
   *
   * Properties:
   * -> (q*)* = q (conjugate of conjugate is original)
   * -> (q₁ × q₂)* = q₂* × q₁* (conjugate reverses multiplication order)
   * -> For unit quaternions: q* = q⁻¹ (conjugate equals inverse)
   *
   * This is essential for rotating vectors: v' = q × v × q*
   */
  public conjugate(): Quaternion {
    return new Quaternion(this.w, -this.x, -this.y, -this.z);
  }

  /**
   * Computes the inverse (reciprocal) of this quaternion.
   *
   * For a quaternion q, the inverse q⁻¹ satisfies:
   * -> q × q⁻¹ = IDENTITY
   * -> q⁻¹ × q = IDENTITY
   *
   * The inverse is computed as:
   * -> q⁻¹ = q* / |q|²
   *
   * Where q* is the conjugate and |q|² is the squared magnitude.
   *
   * Example: For q = (2, 0, 0, 0):
   * -> |q|² = 4
   * -> q* = (2, 0, 0, 0)
   * -> q⁻¹ = (2/4, 0/4, 0/4, 0/4) = (0.5, 0, 0, 0)
   *
   * For unit quaternions (|q| = 1), the inverse equals the conjugate:
   * -> q⁻¹ = q* (much faster!)
   *
   * Returns null if the quaternion is zero (no inverse exists).
   */
  public inverse(): Quaternion | null {
    const mSq = this.magnitudeSquare();

    if (Math.abs(mSq) < Quaternion.TOLERANCE) {
      return null;
    }

    const invMSq = 1 / mSq;
    const conj = this.conjugate();

    const w = conj.w * invMSq;
    const x = conj.x * invMSq;
    const y = conj.y * invMSq;
    const z = conj.z * invMSq;

    /**
     * here, we need to clamp the components to prevent floating point errors.
     * clampComponent makes use of the TOLERANCE constant to ensure that the value
     * that we pass as parameter is not too small, if it is smaller than the threshold
     * we defined in the TOLERANCE constant, we return 0, otherwise we return the value.
     */
    return new Quaternion(
      Quaternion.clampComponent(w),
      Quaternion.clampComponent(x),
      Quaternion.clampComponent(y),
      Quaternion.clampComponent(z)
    );
  }

  /**
   * Multiplies this quaternion by another (Hamilton product).
   *
   * Quaternion multiplication is the fundamental operation for composing rotations.
   * If q₁ represents rotation A and q₂ represents rotation B, then q₁ × q₂
   * represents "first apply B, then apply A" (right-to-left composition).
   *
   * For quaternions q₁ = (w₁, x₁, y₁, z₁) and q₂ = (w₂, x₂, y₂, z₂):
   * -> w = w₁w₂ - x₁x₂ - y₁y₂ - z₁z₂
   * -> x = w₁x₂ + x₁w₂ + y₁z₂ - z₁y₂
   * -> y = w₁y₂ - x₁z₂ + y₁w₂ + z₁x₂
   * -> z = w₁z₂ + x₁y₂ - y₁x₂ + z₁w₂
   *
   * Example: IDENTITY × (0, 1, 0, 0) = (0, 1, 0, 0)
   * -> w = 1×0 - 0×1 - 0×0 - 0×0 = 0
   * -> x = 1×1 + 0×0 + 0×0 - 0×0 = 1
   * -> y = 1×0 - 0×0 + 0×0 + 0×1 = 0
   * -> z = 1×0 + 0×0 - 0×1 + 0×0 = 0
   * -> Result: (0, 1, 0, 0) ✓
   *
   * Properties:
   * -> NOT commutative: q₁ × q₂ ≠ q₂ × q₁ (order matters!)
   * -> Associative: (q₁ × q₂) × q₃ = q₁ × (q₂ × q₃)
   * -> |q₁ × q₂| = |q₁| × |q₂| (magnitudes multiply)
   *
   * @returns A new Quaternion representing the composed rotation.
   */
  public multiply(other: Quaternion): Quaternion {
    const w1 = this.w,
      x1 = this.x,
      y1 = this.y,
      z1 = this.z;
    const w2 = other.w,
      x2 = other.x,
      y2 = other.y,
      z2 = other.z;

    return new Quaternion(
      w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
      w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
      w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
      w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2
    );
  }

  /**
   * Rotates a vector by this quaternion.
   *
   * To rotate a vector v by quaternion q, we use the formula:
   * -> v' = q × v × q*
   *
   * Where:
   * - v is treated as a quaternion (0, v.x, v.y, v.z)
   * - q* is the conjugate of q
   * - × is quaternion multiplication
   *
   * This is derived from the Rodrigues rotation formula and is more efficient
   * than converting the quaternion to a matrix for a single rotation.
   *
   * Example: Rotate (1, 0, 0) by 90° around Z-axis
   * -> q = (cos(45°), 0, 0, sin(45°)) ≈ (0.707, 0, 0, 0.707)
   * -> v = (0, 1, 0, 0) as quaternion
   * -> q × v × q* = (0, 0, 1, 0)
   * -> Result: (0, 1, 0) which is Vec3.UP
   *
   * Note: This assumes q is a unit quaternion. Non-unit quaternions will
   * also scale the vector, which is usually not desired for rotations.
   *
   * @param vector The vector to rotate
   * @returns A new Vec3 representing the rotated vector
   */
  public rotateVector(vector: Vec3): Vec3 {
    /**
     * Treat the vector as a quaternion with w = 0.
     * Then we compute q × v × q* and the result is a quaternion with w ≈ 0.
     * so we can extract the vector part and return it as a Vec3.
     */
    const vQuat = new Quaternion(0, vector.x, vector.y, vector.z);
    const qConj = this.conjugate();
    const rotated = this.multiply(vQuat).multiply(qConj);

    return new Vec3(rotated.x, rotated.y, rotated.z);
  }

  /**
   * Creates a quaternion from an axis-angle representation.
   *
   * An axis-angle rotation is specified by:
   * - axis: A unit vector (x, y, z) representing the rotation axis
   * - angle: The rotation amount in radians (following right-hand rule)
   *
   * The corresponding unit quaternion is:
   * -> q = (cos(θ/2), sin(θ/2) × axis.x, sin(θ/2) × axis.y, sin(θ/2) × axis.z)
   *
   * Example: 180° rotation around X-axis (π radians)
   * -> axis = (1, 0, 0)
   * -> θ/2 = π/2
   * -> cos(π/2) = 0, sin(π/2) = 1
   * -> q = (0, 1×1, 1×0, 1×0) = (0, 1, 0, 0)
   *
   * The axis is automatically normalized before conversion, so you don't
   * need to normalize it yourself.
   *
   * @param axis The rotation axis (will be normalized)
   * @param radians The rotation angle in radians
   * @returns A new unit Quaternion representing the rotation
   */
  public static fromAxisAngle(axis: Vec3, radians: number): Quaternion {
    const normalizedAxis = axis.normalize();
    const halfAngle = radians / 2;
    const sinHalf = Math.sin(halfAngle);
    const cosHalf = Math.cos(halfAngle);

    return new Quaternion(
      cosHalf,
      normalizedAxis.x * sinHalf,
      normalizedAxis.y * sinHalf,
      normalizedAxis.z * sinHalf
    );
  }

  /**
   * Converts this quaternion to axis-angle representation.
   *
   * For a unit quaternion q = (w, x, y, z), we extract:
   * - angle: The rotation amount in radians
   * - axis: The unit vector representing the rotation axis
   *
   * The conversion formulas are:
   * -> angle = 2 × acos(w)
   * -> axis = (x, y, z) / sin(angle/2)
   *
   * Example: For q = (0.707, 0.707, 0, 0) [90° around X]:
   * -> angle = 2 × acos(0.707) ≈ 2 × 0.7854 ≈ 1.571 ≈ π/2 (90°)
   * -> sin(angle/2) = sin(π/4) ≈ 0.707
   * -> axis = (0.707/0.707, 0/0.707, 0/0.707) = (1, 0, 0)
   *
   * Special cases:
   * - If the quaternion is IDENTITY (no rotation), returns angle=0, axis=(0,1,0)
   * - If sin(angle/2) ≈ 0, the axis is undefined; we return Vec3.UP as default
   *
   * @returns An object with `axis` (Vec3) and `radians` (number)
   */
  public toAxisAngle(): { axis: Vec3; radians: number } {
    /**
     * Normalize first to ensure we're working with a unit quaternion.
     * Then we clamp w to [-1, 1] to handle floating point errors in acos.
     * If the rotation is very small (near-zero angle), the axis is undefined.
     * Return a default axis (Y-up) with zero rotation.
     * Finally, we extract the axis by normalizing the vector part.
     */
    const q = this.normalize();

    const w = Math.max(-1, Math.min(1, q.w));
    const radians = 2 * Math.acos(w);

    const sinHalfAngle = Math.sqrt(1 - w * w);
    if (sinHalfAngle < Quaternion.TOLERANCE) {
      return {
        axis: Vec3.UP,
        radians: 0,
      };
    }

    const axis = new Vec3(
      q.x / sinHalfAngle,
      q.y / sinHalfAngle,
      q.z / sinHalfAngle
    );

    return { axis, radians };
  }

  /**
   * Computes the quaternion derivative for angular velocity integration.
   *
   * In physics simulation, we need to update the orientation quaternion based
   * on the current angular velocity. The time derivative of a quaternion q
   * rotating with angular velocity ω is:
   *
   * -> dq/dt = (1/2) × ω_quat × q
   *
   * Where ω_quat is the angular velocity represented as a quaternion (0, ω.x, ω.y, ω.z).
   *
   * This derivative is used in the RK4 integrator to update orientation:
   * -> q(t + dt) ≈ q(t) + (dq/dt) × dt
   *
   * Example: If a coin is spinning with ω = (0, 10, 0) rad/s (around Y-axis):
   * -> ω_quat = (0, 0, 10, 0)
   * -> For q = IDENTITY = (1, 0, 0, 0):
   * -> dq/dt = (1/2) × (0, 0, 10, 0) × (1, 0, 0, 0)
   * -> dq/dt = (1/2) × (0, 0, 10, 0)
   * -> dq/dt = (0, 0, 5, 0)
   *
   * This tells us that the quaternion is changing at a rate of (0, 0, 5, 0) per second.
   *
   * @param angularVelocity The angular velocity vector in radians/second
   * @returns A new Quaternion representing dq/dt
   */
  public derivative(angularVelocity: Vec3): Quaternion {
    const omegaQuat = new Quaternion(
      0,
      angularVelocity.x,
      angularVelocity.y,
      angularVelocity.z
    );

    const product = omegaQuat.multiply(this);

    return new Quaternion(
      product.w * 0.5,
      product.x * 0.5,
      product.y * 0.5,
      product.z * 0.5
    );
  }

  /**
   * Creates a copy of this quaternion.
   *
   * While the class is immutable, explicit cloning can be useful for
   * clarity in certain contexts.
   */
  public clone(): Quaternion {
    return new Quaternion(this.w, this.x, this.y, this.z);
  }

  /**
   * Checks for strict equality with another quaternion.
   *
   * Uses exact floating point comparison. Be wary of floating point errors.
   */
  public equals(other: Quaternion): boolean {
    return (
      this.w === other.w &&
      this.x === other.x &&
      this.y === other.y &&
      this.z === other.z
    );
  }

  /**
   * Checks if two quaternions are approximately equal within a tolerance.
   *
   * For each component, checks if |q1[i] - q2[i]| < tolerance.
   *
   * This is essential when comparing quaternions after numerical operations
   * where floating point errors accumulate.
   *
   * Note: Two quaternions q and -q represent the same rotation (they are
   * equivalent). This method does NOT account for that; it only checks
   * component-wise similarity. If you need to check rotation equivalence,
   * you should also test equals(-q).
   *
   * Example: (0.707, 0.707, 0, 0) ≈ (0.70700001, 0.707, 0, 0) with tolerance 1e-6 → true
   *
   * @param other The quaternion to compare against
   * @param tolerance Maximum allowed difference per component
   * @returns True if all components are within tolerance
   */
  public equalsApprox(
    other: Quaternion,
    tolerance = Quaternion.TOLERANCE
  ): boolean {
    return (
      Math.abs(this.w - other.w) < tolerance &&
      Math.abs(this.x - other.x) < tolerance &&
      Math.abs(this.y - other.y) < tolerance &&
      Math.abs(this.z - other.z) < tolerance
    );
  }

  /**
   * Converts the quaternion to a flat array.
   *
   * Returns [w, x, y, z]
   *
   * Useful for:
   * - Serialization
   * - Passing to WebGL/graphics APIs
   * - Debugging and logging
   */
  public toArray(): number[] {
    return [this.w, this.x, this.y, this.z];
  }

  /**
   * Creates a quaternion from a flat array.
   *
   * The array must have exactly 4 elements in order: [w, x, y, z]
   *
   * @param elements Array of 4 numbers
   * @returns A new Quaternion from the array elements
   * @throws Error if array doesn't have exactly 4 elements
   */
  public static fromArray(elements: number[]): Quaternion {
    if (elements.length !== 4) {
      throw new Error(
        `Quaternion.fromArray requires exactly 4 elements, got ${elements.length}`
      );
    }

    return new Quaternion(
      elements[0]!,
      elements[1]!,
      elements[2]!,
      elements[3]!
    );
  }
}
