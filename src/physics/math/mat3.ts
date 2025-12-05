import { Vec3 } from './vec3';

/**
 * A 3x3 matrix class for 3D transformations and physics calculations.
 *
 * Matrices are stored in row-major order, meaning the first index is the row
 * and the second index is the column. This matches standard mathematical notation
 * where M[i][j] refers to row i, column j.
 *
 * Visual representation of our matrix layout:
 *
 *     | m00  m01  m02 |   | row 0 |
 * M = | m10  m11  m12 | = | row 1 |
 *     | m20  m21  m22 |   | row 2 |
 *
 * The 3x3 matrix is fundamental to the physics simulation for:
 * - Inertia tensor representation (how mass is distributed in a rotating body)
 * - Rotation matrices (converting between coordinate frames)
 * - Tensor operations in rigid body dynamics
 *
 * Like Vec3, this class is immutable — all operations return new instances.
 * This ensures deterministic physics state and prevents side effects.
 */
export class Mat3 {
  /**
   * Internal storage: 9 elements in row-major order stored as individual fields.
   * 
   * Using explicit fields instead of an array avoids TypeScript's array index
   * type uncertainty and provides better type safety.
   * 
   * Layout:
   * -> m00, m01, m02 = row 0
   * -> m10, m11, m12 = row 1
   * -> m20, m21, m22 = row 2
   */
  private readonly m00: number;
  private readonly m01: number;
  private readonly m02: number;

  private readonly m10: number;
  private readonly m11: number;
  private readonly m12: number;

  private readonly m20: number;
  private readonly m21: number;
  private readonly m22: number;

  /**
   * Creates a new 3x3 matrix from 9 elements in row-major order.
   *
   * The elements are specified row by row, left to right:
   * -> new Mat3(m00, m01, m02, m10, m11, m12, m20, m21, m22)
   *
   * Example: Identity matrix
   * -> new Mat3(1, 0, 0,  0, 1, 0,  0, 0, 1)
   *
   * Corresponds to:
   *     | 1  0  0 |
   *     | 0  1  0 |
   *     | 0  0  1 |
   */
  constructor(
    m00: number, m01: number, m02: number,
    m10: number, m11: number, m12: number,
    m20: number, m21: number, m22: number
  ) {
    this.m00 = m00; this.m01 = m01; this.m02 = m02;
    this.m10 = m10; this.m11 = m11; this.m12 = m12;
    this.m20 = m20; this.m21 = m21; this.m22 = m22;
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
   * The identity matrix: multiplying by this leaves vectors unchanged.
   *
   *     | 1  0  0 |
   * I = | 0  1  0 |
   *     | 0  0  1 |
   *
   * Properties:
   * -> M × I = M (identity is a right identity)
   * -> I × M = M (identity is a left identity)
   * -> I × v = v (leaves vectors unchanged)
   *
   * The identity matrix is its own inverse and its own transpose.
   */
  public static readonly IDENTITY = new Mat3(
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  );

  /**
   * The zero matrix: all elements are zero.
   *
   *     | 0  0  0 |
   * O = | 0  0  0 |
   *     | 0  0  0 |
   *
   * Useful for initializing accumulators or representing null transformations.
   * Note: The zero matrix is singular (non-invertible) with determinant = 0.
   */
  public static readonly ZERO = new Mat3(
    0, 0, 0,
    0, 0, 0,
    0, 0, 0
  );

  /**
   * Gets an element at the specified row and column.
   *
   * For a matrix M, element access is:
   * -> M.get(row, col) = M[row][col]
   *
   * Example: For identity matrix I, I.get(1, 1) = 1, I.get(0, 1) = 0
   *
   * @param row Row index (0, 1, or 2)
   * @param col Column index (0, 1, or 2)
   * @returns The element at position [row, col]
   */
  public get(row: number, col: number): number {
    const index = row * 3 + col;
    switch (index) {
      case 0: return this.m00;
      case 1: return this.m01;
      case 2: return this.m02;
      case 3: return this.m10;
      case 4: return this.m11;
      case 5: return this.m12;
      case 6: return this.m20;
      case 7: return this.m21;
      case 8: return this.m22;
      default: return 0;
    }
  }

  /**
   * Adds another matrix element-wise.
   *
   * For two matrices A and B, the sum C = A + B is:
   * -> C[i][j] = A[i][j] + B[i][j]
   *
   * Example:
   * | 1  2  3 |   | 9  8  7 |   | 10  10  10 |
   * | 4  5  6 | + | 6  5  4 | = | 10  10  10 |
   * | 7  8  9 |   | 3  2  1 |   | 10  10  10 |
   *
   * Note: Matrix addition is commutative: A + B = B + A
   *
   * @returns A new Mat3 representing the element-wise sum.
   */
  public add(matrix: Mat3): Mat3 {
    return new Mat3(
      this.m00 + matrix.m00, this.m01 + matrix.m01, this.m02 + matrix.m02,
      this.m10 + matrix.m10, this.m11 + matrix.m11, this.m12 + matrix.m12,
      this.m20 + matrix.m20, this.m21 + matrix.m21, this.m22 + matrix.m22
    );
  }

  /**
   * Subtracts another matrix element-wise.
   *
   * For two matrices A and B, the difference C = A - B is:
   * -> C[i][j] = A[i][j] - B[i][j]
   *
   * Example:
   * | 10  10  10 |   | 9  8  7 |   | 1  2  3 |
   * | 10  10  10 | - | 6  5  4 | = | 4  5  6 |
   * | 10  10  10 |   | 3  2  1 |   | 7  8  9 |
   *
   * Note: Matrix subtraction is NOT commutative: A - B ≠ B - A
   *
   * @returns A new Mat3 representing the element-wise difference.
   */
  public subtract(matrix: Mat3): Mat3 {
    return new Mat3(
      this.m00 - matrix.m00, this.m01 - matrix.m01, this.m02 - matrix.m02,
      this.m10 - matrix.m10, this.m11 - matrix.m11, this.m12 - matrix.m12,
      this.m20 - matrix.m20, this.m21 - matrix.m21, this.m22 - matrix.m22
    );
  }

  /**
   * Scales all elements by a scalar value.
   *
   * For a matrix A and scalar k, the scaled matrix B = k × A is:
   * -> B[i][j] = k × A[i][j]
   *
   * Example: 2 × | 1  2  3 |   | 2   4   6 |
   *              | 4  5  6 | = | 8  10  12 |
   *              | 7  8  9 |   | 14 16  18 |
   *
   * Note: Scaling affects the determinant: det(k × A) = k³ × det(A)
   * This is important when computing inverse inertia tensors.
   *
   * @returns A new Mat3 with each element multiplied by the scalar.
   */
  public scale(scalar: number): Mat3 {
    return new Mat3(
      this.m00 * scalar, this.m01 * scalar, this.m02 * scalar,
      this.m10 * scalar, this.m11 * scalar, this.m12 * scalar,
      this.m20 * scalar, this.m21 * scalar, this.m22 * scalar
    );
  }

  /**
   * Multiplies this matrix by another matrix (standard matrix multiplication).
   *
   * For two 3×3 matrices A and B, the product C = A × B is computed as:
   * -> C[i][j] = Σ(k=0 to 2) A[i][k] × B[k][j]
   *
   * Each element in row i, column j of the result is the dot product of
   * row i of A with column j of B.
   *
   * Example: Multiplying identity by any matrix returns that matrix.
   *
   * | 1  0  0 |   | a  b  c |   | a  b  c |
   * | 0  1  0 | × | d  e  f | = | d  e  f |
   * | 0  0  1 |   | g  h  i |   | g  h  i |
   *
   * Detailed calculation for element C[0][0]:
   * -> C[0][0] = A[0][0]×B[0][0] + A[0][1]×B[1][0] + A[0][2]×B[2][0]
   * -> C[0][0] = 1×a + 0×d + 0×g = a
   *
   * Matrix multiplication is:
   * - Associative: (A × B) × C = A × (B × C)
   * - NOT commutative: A × B ≠ B × A (in general)
   * - Distributive: A × (B + C) = A×B + A×C
   *
   * @returns A new Mat3 representing the matrix product.
   */
  public multiply(matrix: Mat3): Mat3 {
    const a = this;
    const b = matrix;

    return new Mat3(
      a.m00*b.m00 + a.m01*b.m10 + a.m02*b.m20,
      a.m00*b.m01 + a.m01*b.m11 + a.m02*b.m21,
      a.m00*b.m02 + a.m01*b.m12 + a.m02*b.m22,

      a.m10*b.m00 + a.m11*b.m10 + a.m12*b.m20,
      a.m10*b.m01 + a.m11*b.m11 + a.m12*b.m21,
      a.m10*b.m02 + a.m11*b.m12 + a.m12*b.m22,

      a.m20*b.m00 + a.m21*b.m10 + a.m22*b.m20,
      a.m20*b.m01 + a.m21*b.m11 + a.m22*b.m21,
      a.m20*b.m02 + a.m21*b.m12 + a.m22*b.m22
    );
  }

  /**
   * Transforms a Vec3 by this matrix (matrix-vector multiplication).
   *
   * For a matrix M and vector v, the transformed vector u = M × v is:
   * -> u.x = M[0][0]×v.x + M[0][1]×v.y + M[0][2]×v.z
   * -> u.y = M[1][0]×v.x + M[1][1]×v.y + M[1][2]×v.z
   * -> u.z = M[2][0]×v.x + M[2][1]×v.y + M[2][2]×v.z
   *
   * Example: Rotating vector (1, 0, 0) by 90° around Z-axis:
   *
   * Rotation matrix for 90° around Z:
   * | cos(90°)  -sin(90°)  0 |   |  0  -1  0 |
   * | sin(90°)   cos(90°)  0 | = |  1   0  0 |
   * |    0          0      1 |   |  0   0  1 |
   *
   * Applying to vector (1, 0, 0):
   * -> x' = 0×1 + (-1)×0 + 0×0 = 0
   * -> y' = 1×1 + 0×0 + 0×0 = 1
   * -> z' = 0×1 + 0×0 + 1×0 = 0
   * -> Result: (0, 1, 0)
   *
   * This is essential for:
   * - Transforming angular velocity to body frame
   * - Applying inertia tensor to angular velocity
   * - Converting vectors between coordinate systems
   *
   * @returns A new Vec3 representing the transformed vector.
   */
  public multiplyVec3(vector: Vec3): Vec3 {
    return new Vec3(
      this.m00 * vector.x + this.m01 * vector.y + this.m02 * vector.z,
      this.m10 * vector.x + this.m11 * vector.y + this.m12 * vector.z,
      this.m20 * vector.x + this.m21 * vector.y + this.m22 * vector.z
    );
  }

  /**
   * Computes the transpose of this matrix (rows become columns).
   *
   * For a matrix M, the transpose Mᵀ is:
   * -> Mᵀ[i][j] = M[j][i]
   *
   * Visual transformation:
   * | a  b  c |ᵀ   | a  d  g |
   * | d  e  f |  = | b  e  h |
   * | g  h  i |    | c  f  i |
   *
   * Properties:
   * -> (Aᵀ)ᵀ = A (transpose of transpose is original)
   * -> (A + B)ᵀ = Aᵀ + Bᵀ
   * -> (A × B)ᵀ = Bᵀ × Aᵀ (note the reversal!)
   * -> det(Aᵀ) = det(A)
   *
   * For rotation matrices R: Rᵀ = R⁻¹ (transpose equals inverse)
   * This makes transposing much cheaper than general inversion.
   *
   * @returns A new Mat3 representing the transpose.
   */
  public transpose(): Mat3 {
    return new Mat3(
      this.m00, this.m10, this.m20,
      this.m01, this.m11, this.m21,
      this.m02, this.m12, this.m22
    );
  }

  /**
   * Computes the determinant of this matrix.
   *
   * For a 3×3 matrix:
   * | a  b  c |
   * | d  e  f |
   * | g  h  i |
   *
   * The determinant is calculated using the rule of Sarrus (cofactor expansion):
   * -> det = a(ei - fh) - b(di - fg) + c(dh - eg)
   *
   * Expanded:
   * -> det = aei + bfg + cdh - ceg - bdi - afh
   *
   * Example: Determinant of identity matrix
   * | 1  0  0 |
   * | 0  1  0 |
   * | 0  0  1 |
   * -> det = 1(1×1 - 0×0) - 0(0×1 - 0×0) + 0(0×0 - 1×0)
   * -> det = 1(1) - 0 + 0 = 1
   *
   * Geometric interpretation:
   * - |det| = volume scale factor of the transformation
   * - det < 0 means the transformation reverses orientation (mirror/reflection)
   * - det = 0 means the matrix is singular (collapses space, non-invertible)
   *
   * @returns The scalar determinant value.
   */
  public determinant(): number {
    return (
      this.m00 * (this.m11 * this.m22 - this.m12 * this.m21) -
      this.m01 * (this.m10 * this.m22 - this.m12 * this.m20) +
      this.m02 * (this.m10 * this.m21 - this.m11 * this.m20)
    );
  }

  /**
   * Computes the inverse of this matrix, if it exists.
   *
   * For a matrix M, the inverse M⁻¹ satisfies:
   * -> M × M⁻¹ = I (identity)
   * -> M⁻¹ × M = I
   *
   * The inverse is computed using the adjugate (adjoint) method:
   * -> M⁻¹ = (1/det) × adj(M)
   *
   * Where adj(M) is the transpose of the cofactor matrix.
   *
   * For a 3×3 matrix:
   * | a  b  c |
   * | d  e  f |
   * | g  h  i |
   *
   * Cofactor matrix (minors with alternating signs):
   * | +(ei-fh)  -(di-fg)  +(dh-eg) |
   * | -(bi-ch)  +(ai-cg)  -(ah-bg) |
   * | +(bf-ce)  -(af-cd)  +(ae-bd) |
   *
   * Adjugate = transpose of cofactor matrix.
   *
   * Example: Inverse of a diagonal matrix
   * | 2  0  0 |⁻¹   | 0.5   0    0  |
   * | 0  4  0 |   = |  0   0.25  0  |
   * | 0  0  5 |     |  0    0   0.2 |
   *
   * The inverse is essential for:
   * - Computing angular velocity from angular momentum: ω = I⁻¹ × L
   * - Solving linear systems
   * - Undoing transformations
   *
   * @returns A new Mat3 representing the inverse, or null if singular.
   */
  public inverse(): Mat3 | null {
    const det = this.determinant();

    if (Math.abs(det) < Mat3.TOLERANCE) {
      return null;
    }

    /**
     * Compute the cofactors.
     *
     * For element at position (i, j), the cofactor is:
     * -> (-1)^(i+j) × minor(i, j)
     *
     * Where minor(i, j) is the determinant of the 2×2 matrix
     * obtained by deleting row i and column j.
     */
    const c00 = this.m11 * this.m22 - this.m12 * this.m21;
    const c01 = -(this.m10 * this.m22 - this.m12 * this.m20);
    const c02 = this.m10 * this.m21 - this.m11 * this.m20;

    const c10 = -(this.m01 * this.m22 - this.m02 * this.m21);
    const c11 = this.m00 * this.m22 - this.m02 * this.m20;
    const c12 = -(this.m00 * this.m21 - this.m01 * this.m20);

    const c20 = this.m01 * this.m12 - this.m02 * this.m11;
    const c21 = -(this.m00 * this.m12 - this.m02 * this.m10);
    const c22 = this.m00 * this.m11 - this.m01 * this.m10;

    const invDet = 1 / det;

    /**
     * The inverse is the transpose of the cofactor matrix divided by det.
     * Notice we're returning in transposed order (c00, c10, c20, ...).
     */
    return new Mat3(
      c00 * invDet, c10 * invDet, c20 * invDet,
      c01 * invDet, c11 * invDet, c21 * invDet,
      c02 * invDet, c12 * invDet, c22 * invDet
    );
  }

  /**
   * Creates a diagonal matrix from three values.
   *
   * A diagonal matrix has non-zero elements only on the main diagonal:
   * | d1   0   0 |
   * |  0  d2   0 |
   * |  0   0  d3 |
   *
   * Properties of diagonal matrices:
   * -> det(D) = d1 × d2 × d3
   * -> D⁻¹ = diag(1/d1, 1/d2, 1/d3) if all di ≠ 0
   * -> D₁ × D₂ = D₂ × D₁ (diagonal matrices commute)
   *
   * Used to represent:
   * - Principal inertia tensors (when aligned with principal axes)
   * - Scaling transformations
   * - Simple physical properties along orthogonal axes
   *
   * @returns A new diagonal Mat3.
   */
  public static diagonal(d1: number, d2: number, d3: number): Mat3 {
    return new Mat3(
      d1, 0, 0,
      0, d2, 0,
      0, 0, d3
    );
  }

  /**
   * Creates a rotation matrix around the X axis.
   *
   * For a rotation of θ radians around the X axis:
   *
   * | 1     0        0    |
   * | 0   cos(θ)  -sin(θ) |
   * | 0   sin(θ)   cos(θ) |
   *
   * This rotates vectors in the Y-Z plane. Looking down the positive X axis
   * (towards origin), positive rotation is counter-clockwise.
   *
   * Example: Rotate Vec3.UP (0, 1, 0) by 90° around X:
   * -> cos(90°) = 0, sin(90°) = 1
   * -> x' = 1×0 + 0×1 + 0×0 = 0
   * -> y' = 0×0 + 0×1 + (-1)×0 = 0
   * -> z' = 0×0 + 1×1 + 0×0 = 1
   * -> Result: (0, 0, 1) = Vec3.FORWARD
   *
   * @param radians Rotation angle in radians.
   * @returns A new rotation Mat3.
   */
  public static rotationX(radians: number): Mat3 {
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    return new Mat3(
      1, 0, 0,
      0, c, -s,
      0, s, c
    );
  }

  /**
   * Creates a rotation matrix around the Y axis.
   *
   * For a rotation of θ radians around the Y axis:
   *
   * |  cos(θ)  0  sin(θ) |
   * |    0     1    0    |
   * | -sin(θ)  0  cos(θ) |
   *
   * This rotates vectors in the X-Z plane. Looking down the positive Y axis
   * (towards origin), positive rotation is counter-clockwise.
   *
   * Example: Rotate Vec3.FORWARD (0, 0, 1) by 90° around Y:
   * -> cos(90°) = 0, sin(90°) = 1
   * -> x' = 0×0 + 0×0 + 1×1 = 1
   * -> y' = 0×0 + 1×0 + 0×1 = 0
   * -> z' = (-1)×0 + 0×0 + 0×1 = 0
   * -> Result: (1, 0, 0) = Vec3.RIGHT
   *
   * @param radians Rotation angle in radians.
   * @returns A new rotation Mat3.
   */
  public static rotationY(radians: number): Mat3 {
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    return new Mat3(
      c, 0, s,
      0, 1, 0,
      -s, 0, c
    );
  }

  /**
   * Creates a rotation matrix around the Z axis.
   *
   * For a rotation of θ radians around the Z axis:
   *
   * | cos(θ)  -sin(θ)  0 |
   * | sin(θ)   cos(θ)  0 |
   * |   0        0     1 |
   *
   * This rotates vectors in the X-Y plane. Looking down the positive Z axis
   * (towards origin), positive rotation is counter-clockwise.
   *
   * Example: Rotate Vec3.RIGHT (1, 0, 0) by 90° around Z:
   * -> cos(90°) = 0, sin(90°) = 1
   * -> x' = 0×1 + (-1)×0 + 0×0 = 0
   * -> y' = 1×1 + 0×0 + 0×0 = 1
   * -> z' = 0×1 + 0×0 + 1×0 = 0
   * -> Result: (0, 1, 0) = Vec3.UP
   *
   * @param radians Rotation angle in radians.
   * @returns A new rotation Mat3.
   */
  public static rotationZ(radians: number): Mat3 {
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    return new Mat3(
      c, -s, 0,
      s, c, 0,
      0, 0, 1
    );
  }

  /**
   * Creates a skew-symmetric (antisymmetric) matrix from a vector.
   *
   * For a vector v = (x, y, z), the skew-symmetric matrix [v]× is:
   *
   * |  0  -z   y |
   * |  z   0  -x |
   * | -y   x   0 |
   *
   * This matrix has the property that for any vector u:
   * -> [v]× × u = v × u (cross product!)
   *
   * Example: For v = (1, 2, 3):
   *
   * |  0  -3   2 |
   * |  3   0  -1 |
   * | -2   1   0 |
   *
   * Verifying with u = (1, 0, 0):
   * -> [v]× × u = (0×1 + (-3)×0 + 2×0, 3×1 + 0×0 + (-1)×0, (-2)×1 + 1×0 + 0×0)
   * ->         = (0, 3, -2)
   * -> v × u   = (2×0 - 3×0, 3×1 - 1×0, 1×0 - 2×1)
   * ->         = (0, 3, -2) ✓
   *
   * Properties:
   * -> [v]×ᵀ = -[v]× (transpose is negative)
   * -> The diagonal is always zero
   *
   * This is used in physics for:
   * - Angular velocity to velocity transformation
   * - Rodrigues' rotation formula
   * - Rigid body dynamics equations
   *
   * @param vector The vector to create the skew-symmetric matrix from.
   * @returns A new skew-symmetric Mat3.
   */
  public static skewSymmetric(vector: Vec3): Mat3 {
    return new Mat3(
      0, -vector.z, vector.y,
      vector.z, 0, -vector.x,
      -vector.y, vector.x, 0
    );
  }

  /**
   * Creates a copy of this matrix.
   *
   * While the class is immutable, explicit cloning can be useful for
   * clarity in certain contexts.
   */
  public clone(): Mat3 {
    return new Mat3(
      this.m00, this.m01, this.m02,
      this.m10, this.m11, this.m12,
      this.m20, this.m21, this.m22
    );
  }

  /**
   * Checks for strict element-wise equality with another matrix.
   *
   * Uses exact floating point comparison. Be wary of precision issues.
   */
  public equals(matrix: Mat3): boolean {
    return (
      this.m00 === matrix.m00 && this.m01 === matrix.m01 && this.m02 === matrix.m02 &&
      this.m10 === matrix.m10 && this.m11 === matrix.m11 && this.m12 === matrix.m12 &&
      this.m20 === matrix.m20 && this.m21 === matrix.m21 && this.m22 === matrix.m22
    );
  }

  /**
   * Checks if two matrices are approximately equal within a tolerance.
   *
   * For each element, checks if |A[i][j] - B[i][j]| < tolerance.
   *
   * This is essential when comparing matrices after numerical operations
   * where floating point errors accumulate.
   *
   * Example: After many rotations, a matrix that should be identity
   * might have elements like 1.0000000001 or -0.0000000001.
   *
   * @param matrix The matrix to compare against.
   * @param tolerance Maximum allowed difference per element.
   * @returns True if all elements are within tolerance.
   */
  public equalsApprox(matrix: Mat3, tolerance = Mat3.TOLERANCE): boolean {
    return (
      Math.abs(this.m00 - matrix.m00) < tolerance &&
      Math.abs(this.m01 - matrix.m01) < tolerance &&
      Math.abs(this.m02 - matrix.m02) < tolerance &&
      Math.abs(this.m10 - matrix.m10) < tolerance &&
      Math.abs(this.m11 - matrix.m11) < tolerance &&
      Math.abs(this.m12 - matrix.m12) < tolerance &&
      Math.abs(this.m20 - matrix.m20) < tolerance &&
      Math.abs(this.m21 - matrix.m21) < tolerance &&
      Math.abs(this.m22 - matrix.m22) < tolerance
    );
  }

  /**
   * Converts the matrix to a flat array in row-major order.
   *
   * Returns [m00, m01, m02, m10, m11, m12, m20, m21, m22]
   *
   * Useful for:
   * - Serialization
   * - Passing to WebGL/graphics APIs
   * - Debugging and logging
   */
  public toArray(): number[] {
    return [
      this.m00, this.m01, this.m02,
      this.m10, this.m11, this.m12,
      this.m20, this.m21, this.m22
    ];
  }

  /**
   * Creates a matrix from a flat array in row-major order.
   *
   * The array must have exactly 9 elements in order:
   * [m00, m01, m02, m10, m11, m12, m20, m21, m22]
   *
   * @param elements Array of 9 numbers in row-major order.
   * @returns A new Mat3 from the array elements.
   * @throws Error if array doesn't have exactly 9 elements.
   */
  public static fromArray(elements: number[]): Mat3 {
    if (elements.length !== 9) {
      throw new Error(`Mat3.fromArray requires exactly 9 elements, got ${elements.length}`);
    }

    return new Mat3(
      elements[0]!, elements[1]!, elements[2]!,
      elements[3]!, elements[4]!, elements[5]!,
      elements[6]!, elements[7]!, elements[8]!
    );
  }

  /**
   * Returns the trace of the matrix (sum of diagonal elements).
   *
   * For a matrix M:
   * -> trace(M) = M[0][0] + M[1][1] + M[2][2]
   *
   * Example: trace(Identity) = 1 + 1 + 1 = 3
   *
   * Properties:
   * -> trace(A + B) = trace(A) + trace(B)
   * -> trace(kA) = k × trace(A)
   * -> trace(AB) = trace(BA)
   * -> For rotation matrix R: trace(R) = 1 + 2cos(θ), where θ is rotation angle
   *
   * The trace is invariant under similarity transformations and
   * equals the sum of eigenvalues.
   *
   * @returns The scalar trace value.
   */
  public trace(): number {
    return this.m00 + this.m11 + this.m22;
  }
}
