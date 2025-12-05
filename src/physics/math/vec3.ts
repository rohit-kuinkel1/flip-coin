export class Vec3 {
  public readonly x: number;
  public readonly y: number;
  public readonly z: number;

  /**
   * Creates a new 3D vector.
   *
   * We use an immutable design pattern where all operations return new instances.
   * This prevents side effects and makes the physics state easier to reason about,
   * which is critical for a deterministic simulation.
   */
  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Commonly-used constant vectors for convenience.
   *
   * ZERO is useful for initializing velocities or positions at the origin.
   * UP, RIGHT, and FORWARD define the positive orthonormal basis for our
   * coordinate system (Y-up, right-handed). UP is especially important for
   * ground plane normals and orientation checks in the physics simulation.
   *
   * Negative counterparts (DOWN, LEFT, BACKWARD) are intentionally omitted.
   * They can be derived via .scale(-1) when needed. Gravity, for example,
   * is expressed as UP.scale(-9.81). This keeps the API minimal and avoids
   * redundant constants for directions that are always relative to their
   * positive basis vector.
   */
  public static readonly ZERO = new Vec3(0, 0, 0);

  /**
    * Consider the 3d axis being drawn like this where the FORWARD vector, so Vec3(0, 0, 1) is
    * pointing directly out of the screen, just like a finger pointing directly in front of your eyes.
    * Then, the RIGHT vector, so Vec3(1, 0, 0) is pointing to the right, and the UP vector,
    * so Vec3(0, 1, 0) is pointing up and these can be clearly seen in the illustration below.
    * 
    *          Y
    *          |
    *          |
    *          |
    *          |
    *          |______________ X
    * 
   */
  public static readonly UP = new Vec3(0, 1, 0);
  public static readonly RIGHT = new Vec3(1, 0, 0);
  public static readonly FORWARD = new Vec3(0, 0, 1);

  /**
   * Tolerance for floating point comparison.
   * This is used to avoid floating point errors in physics calculations since
   * floating point numbers are not exact and a small value for tolerance is to
   * be defined such that we "accept" the error.
   */
  public static readonly TOLERANCE = 1e-6;

  /**
   * Adds another vector to this one, component by component.
   *
   * For two vectors v1 = (x1, y1, z1) and v2 = (x2, y2, z2), the sum is:
   * -> v1 + v2 = (x1 + x2, y1 + y2, z1 + z2)
   *
   * Example: (1, 2, 3) + (4, 5, 6) = (5, 7, 9)
   *
   * @returns A new Vec3 representing the element-wise sum.
   */
  public add(vector: Vec3): Vec3 {
    return new Vec3(this.x + vector.x, this.y + vector.y, this.z + vector.z);
  }

  /**
   * Subtracts another vector from this one, component by component.
   *
   * For two vectors v1 = (x1, y1, z1) and v2 = (x2, y2, z2), the difference is:
   * -> v1 - v2 = (x1 - x2, y1 - y2, z1 - z2)
   *
   * Example: (4, 5, 6) - (1, 2, 3) = (3, 3, 3)
   *
   * @returns A new Vec3 representing the element-wise difference.
   */
  public subtract(vector: Vec3): Vec3 {
    return new Vec3(this.x - vector.x, this.y - vector.y, this.z - vector.z);
  }

  /**
   * Scales this vector by a scalar value, multiplying each component.
   *
   * For a vector v = (x, y, z) and scalar k:
   * -> k * v = (k * x, k * y, k * z)
   *
   * Example: 2 * (1, -2, 3) = (2, -4, 6)
   *
   * This is useful for computing forces (F = m * a), velocities, or deriving
   * negative direction vectors like DOWN = UP.scale(-1).
   *
   * @returns A new Vec3 with each component multiplied by the scalar.
   */
  public scale(factor: number): Vec3 {
    return new Vec3(this.x * factor, this.y * factor, this.z * factor);
  }

  /**
   * Computes the dot product (scalar product) with another vector.
   *
   * For two vectors v1 = (x1, y1, z1) and v2 = (x2, y2, z2), the dot product is:
   * -> v1 · v2 = x1 * x2 + y1 * y2 + z1 * z2
   *
   * Example: (1, 2, 3) · (4, -5, 6)
   * -> = (1 * 4) + (2 * -5) + (3 * 6)
   * -> = 4 + (-10) + 18
   * -> = 12
   *
   * The dot product relates to the cosine of the angle between vectors:
   * -> v1 · v2 = |v1| * |v2| * cos(θ)
   *
   * This is essential for projecting vectors onto axes or calculating work/energy.
   */
  public dotProduct(vector: Vec3): number {
    return this.x * vector.x 
    + this.y * vector.y 
    + this.z * vector.z;
  }

  /**
   * Computes the cross product with another vector.
   *
   * For two vectors v1 = (x1, y1, z1) and v2 = (x2, y2, z2), the cross product is:
   * -> v1 × v2 = (y1*z2 - z1*y2, z1*x2 - x1*z2, x1*y2 - y1*x2)
   *
   * The result is a vector perpendicular to both input vectors, with magnitude
   * equal to the area of the parallelogram they span.
   *
   * Example: RIGHT × UP = (1,0,0) × (0,1,0)
   * -> cx = 0*0 - 0*1 = 0
   * -> cy = 0*0 - 1*0 = 0
   * -> cz = 1*1 - 0*0 = 1
   * -> Result: (0, 0, 1) = FORWARD
   *
   * The cross product is anti-commutative: v1 × v2 = -(v2 × v1).
   * This is crucial for calculating torque (τ = r × F), angular momentum,
   * and surface normals.
   */
  public crossProduct(vector: Vec3): Vec3 {
    return new Vec3(
      this.y * vector.z - this.z * vector.y,
      this.z * vector.x - this.x * vector.z,
      this.x * vector.y - this.y * vector.x
    );
  }

  /**
   * Computes the squared magnitude (length²) of the vector.
   *
   * For a vector v = (x, y, z):
   * -> |v|² = x² + y² + z²
   *
   * Example: |(3, 4, 0)|² = 3² + 4² + 0² = 9 + 16 + 0 = 25
   *
   * This is faster than magnitude() because it avoids the square root.
   * Use this for distance comparisons where exact length isn't needed.
   */
  public magnitudeSquare(): number {
    return this.x * this.x 
    + this.y * this.y 
    + this.z * this.z;
  }

  /**
   * Computes the magnitude (length) of the vector using the Euclidean formula.
   *
   * For a vector v = (x, y, z):
   * -> |v| = sqrt(x² + y² + z²)
   *
   * Example: |(3, 4, 0)| = sqrt(9 + 16 + 0) = sqrt(25) = 5
   */
  public magnitude(): number {
    return Math.sqrt(this.magnitudeSquare());
  }

  /**
   * Returns a normalized unit vector (length 1) in the same direction.
   *
   * Normalization scales a vector so its magnitude becomes 1 while preserving direction.
   * For a vector v = (x, y, z):
   * -> v_normalized = (x / |v|, y / |v|, z / |v|)
   *
   * Example: normalize(3, 0, 0)
   * -> |v| = sqrt(9 + 0 + 0) = 3
   * -> v_normalized = (3/3, 0/3, 0/3) = (1, 0, 0)
   *
   * If the vector is zero length, returns ZERO to avoid division by zero errors
   * or NaNs, which would propagate and destroy the physics state.
   */
  public normalize(): Vec3 {
    const m = this.magnitude();
   
    return (m===0)
    ? Vec3.ZERO 
    : this.scale(1 / m);
  }

  /**
   * Computes the Euclidean distance to another point/vector.
   *
   * For two points p1 = (x1, y1, z1) and p2 = (x2, y2, z2):
   * -> distance = sqrt((x2 - x1)² + (y2 - y1)² + (z2 - z1)²)
   *
   * Example: distance from (0, 0, 0) to (0, 3, 4)
   * -> = sqrt((0-0)² + (3-0)² + (4-0)²)
   * -> = sqrt(0 + 9 + 16)
   * -> = sqrt(25) = 5
   */
  public distanceTo(vector: Vec3): number { 
    return this.subtract(vector).magnitude();
  }

  /**
   * Computes the squared distance to another point/vector.
   *
   * Same as distanceTo() but skips the square root, making it faster
   * for comparisons where exact distance isn't needed.
   *
   * Example: distanceSquared from (0, 0, 0) to (0, 3, 4) = 25
   */
  public distanceToSquare(vector: Vec3): number {
    return this.subtract(vector).magnitudeSquare();
  }

  /**
   * Creates a copy of this vector.
   *
   * While the class is immutable, explicit cloning can be useful for
   * clarity in some contexts or if the implementation changes later.
   */
  public clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  /**
   * Checks for strict equality with another vector.
   *
   * Uses exact floating point comparison. Be wary of floating point errors
   * if using this for logic branching.
   */
  public equals(vector: Vec3): boolean {
    return this.x === vector.x 
    && this.y === vector.y 
    && this.z === vector.z;
  }

  /**
   * Checks if two vectors are approximately equal within a tolerance.
   *
   * For two vectors v1 and v2, they are approximately equal if:
   * -> distanceSquared(v1, v2) < tolerance²
   *
   * This accounts for floating point imprecision in physics calculations.
   * For example, after many RK4 integration steps, a value that should be
   * exactly 1.0 might become 1.0000000001 — this method handles that gracefully.
   *
   * Example: (1, 1, 1) ≈ (1.00000001, 1, 1) with tolerance 1e-6 → true
   */
  public equalsApprox(vector: Vec3, tolerance = Vec3.TOLERANCE): boolean {
    return this.distanceToSquare(vector) < tolerance * tolerance;
  }
}
