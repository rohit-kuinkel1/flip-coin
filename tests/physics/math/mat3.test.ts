import { describe, it, expect } from 'vitest';
import { Mat3 } from '../../../src/physics/math/mat3';
import { Vec3 } from '../../../src/physics/math/vec3';

describe('Mat3', () => {
  describe('Construction and Basic Access', () => {
    it('should create a matrix with correct elements', () => {
      /**
       * When we create a matrix with 9 elements in row-major order,
       * we should be able to access each element using the get(row, col) method.
       * 
       * Row-major order means:
       * -> new Mat3(a, b, c, d, e, f, g, h, i)
       * 
       * Creates:
       * | a  b  c |   | row 0 |
       * | d  e  f | = | row 1 |
       * | g  h  i |   | row 2 |
       */
      const m = new Mat3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      );

      expect(m.get(0, 0)).toBe(1);
      expect(m.get(0, 1)).toBe(2);
      expect(m.get(0, 2)).toBe(3);
      expect(m.get(1, 0)).toBe(4);
      expect(m.get(1, 1)).toBe(5);
      expect(m.get(1, 2)).toBe(6);
      expect(m.get(2, 0)).toBe(7);
      expect(m.get(2, 1)).toBe(8);
      expect(m.get(2, 2)).toBe(9);
    });

    it('should support static constants', () => {
      /**
       * Verify that our predefined constant matrices are correct.
       * 
       * Identity matrix:
       * | 1  0  0 |
       * | 0  1  0 |
       * | 0  0  1 |
       * 
       * Zero matrix:
       * | 0  0  0 |
       * | 0  0  0 |
       * | 0  0  0 |
       */
      expect(Mat3.IDENTITY.get(0, 0)).toBe(1);
      expect(Mat3.IDENTITY.get(1, 1)).toBe(1);
      expect(Mat3.IDENTITY.get(2, 2)).toBe(1);
      expect(Mat3.IDENTITY.get(0, 1)).toBe(0);
      expect(Mat3.IDENTITY.get(1, 2)).toBe(0);

      expect(Mat3.ZERO.get(0, 0)).toBe(0);
      expect(Mat3.ZERO.get(1, 1)).toBe(0);
      expect(Mat3.ZERO.get(2, 2)).toBe(0);
    });
  });

  describe('Element-wise Operations', () => {
    it('should add matrices correctly', () => {
      const a = new Mat3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      );
      const b = new Mat3(
        9, 8, 7,
        6, 5, 4,
        3, 2, 1
      );
      const result = a.add(b);

      /**
       * Matrix addition is element-wise:
       * -> (A + B)[i][j] = A[i][j] + B[i][j]
       * 
       * | 1  2  3 |   | 9  8  7 |   | 10  10  10 |
       * | 4  5  6 | + | 6  5  4 | = | 10  10  10 |
       * | 7  8  9 |   | 3  2  1 |   | 10  10  10 |
       */
      expect(result.get(0, 0)).toBe(10);
      expect(result.get(0, 1)).toBe(10);
      expect(result.get(0, 2)).toBe(10);
      expect(result.get(1, 0)).toBe(10);
      expect(result.get(1, 1)).toBe(10);
      expect(result.get(1, 2)).toBe(10);
      expect(result.get(2, 0)).toBe(10);
      expect(result.get(2, 1)).toBe(10);
      expect(result.get(2, 2)).toBe(10);

      /**
       * Original matrices should remain unchanged (immutability).
       */
      expect(a.get(0, 0)).toBe(1);
      expect(b.get(0, 0)).toBe(9);
    });

    it('should add matrices commutatively', () => {
      /**
       * Matrix addition is commutative:
       * -> A + B = B + A
       */
      const a = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      const b = new Mat3(9, 8, 7, 6, 5, 4, 3, 2, 1);

      expect(a.add(b).equals(b.add(a))).toBe(true);
    });

    it('should subtract matrices correctly', () => {
      const a = new Mat3(
        10, 10, 10,
        10, 10, 10,
        10, 10, 10
      );
      const b = new Mat3(
        9, 8, 7,
        6, 5, 4,
        3, 2, 1
      );
      const result = a.subtract(b);

      /**
       * Matrix subtraction is element-wise:
       * -> (A - B)[i][j] = A[i][j] - B[i][j]
       * 
       * | 10  10  10 |   | 9  8  7 |   | 1  2  3 |
       * | 10  10  10 | - | 6  5  4 | = | 4  5  6 |
       * | 10  10  10 |   | 3  2  1 |   | 7  8  9 |
       */
      expect(result.get(0, 0)).toBe(1);
      expect(result.get(0, 1)).toBe(2);
      expect(result.get(0, 2)).toBe(3);
      expect(result.get(1, 0)).toBe(4);
      expect(result.get(1, 1)).toBe(5);
      expect(result.get(1, 2)).toBe(6);
      expect(result.get(2, 0)).toBe(7);
      expect(result.get(2, 1)).toBe(8);
      expect(result.get(2, 2)).toBe(9);

      /**
       * Original matrices should remain unchanged (immutability).
       */
      expect(a.get(0, 0)).toBe(10);
      expect(b.get(0, 0)).toBe(9);
    });

    it('should return zero matrix when subtracting matrix from itself', () => {
      /**
       * A - A = 0 (zero matrix)
       */
      const a = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      const result = a.subtract(a);

      expect(result.equals(Mat3.ZERO)).toBe(true);
    });

    it('should scale matrix correctly', () => {
      const m = new Mat3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      );
      const result = m.scale(2);

      /**
       * Scalar multiplication multiplies each element:
       * -> (k × A)[i][j] = k × A[i][j]
       * 
       * 2 × | 1  2  3 |   |  2   4   6 |
       *     | 4  5  6 | = |  8  10  12 |
       *     | 7  8  9 |   | 14  16  18 |
       */
      expect(result.get(0, 0)).toBe(2);
      expect(result.get(0, 1)).toBe(4);
      expect(result.get(0, 2)).toBe(6);
      expect(result.get(1, 0)).toBe(8);
      expect(result.get(1, 1)).toBe(10);
      expect(result.get(1, 2)).toBe(12);
      expect(result.get(2, 0)).toBe(14);
      expect(result.get(2, 1)).toBe(16);
      expect(result.get(2, 2)).toBe(18);

      /**
       * Original matrix should remain unchanged (immutability).
       */
      expect(m.get(0, 0)).toBe(1);
    });

    it('should scale by zero to produce zero matrix', () => {
      /**
       * 0 × A = zero matrix
       */
      const m = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      const result = m.scale(0);

      expect(result.equals(Mat3.ZERO)).toBe(true);
    });

    it('should scale by one to produce same matrix', () => {
      /**
       * 1 × A = A
       */
      const m = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      const result = m.scale(1);

      expect(result.equals(m)).toBe(true);
    });

    it('should scale by negative factor correctly', () => {
      const m = new Mat3(
        1, -2, 3,
        -4, 5, -6,
        7, -8, 9
      );
      const result = m.scale(-1);

      /**
       * Scaling by -1 negates all elements:
       * -> (-1) × A[i][j] = -A[i][j]
       */
      expect(result.get(0, 0)).toBe(-1);
      expect(result.get(0, 1)).toBe(2);
      expect(result.get(0, 2)).toBe(-3);
      expect(result.get(1, 0)).toBe(4);
      expect(result.get(1, 1)).toBe(-5);
      expect(result.get(1, 2)).toBe(6);
      expect(result.get(2, 0)).toBe(-7);
      expect(result.get(2, 1)).toBe(8);
      expect(result.get(2, 2)).toBe(-9);
    });
  });

  describe('Matrix Multiplication', () => {
    it('should multiply matrices correctly', () => {
      const a = new Mat3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      );
      const b = new Mat3(
        9, 8, 7,
        6, 5, 4,
        3, 2, 1
      );
      const result = a.multiply(b);

      /**
       * Matrix multiplication: C = A × B where C[i][j] = Σ A[i][k] × B[k][j]
       * 
       * Computing each element of the result:
       * 
       * C[0][0] = 1×9 + 2×6 + 3×3 = 9 + 12 + 9 = 30
       * C[0][1] = 1×8 + 2×5 + 3×2 = 8 + 10 + 6 = 24
       * C[0][2] = 1×7 + 2×4 + 3×1 = 7 + 8 + 3 = 18
       * 
       * C[1][0] = 4×9 + 5×6 + 6×3 = 36 + 30 + 18 = 84
       * C[1][1] = 4×8 + 5×5 + 6×2 = 32 + 25 + 12 = 69
       * C[1][2] = 4×7 + 5×4 + 6×1 = 28 + 20 + 6 = 54
       * 
       * C[2][0] = 7×9 + 8×6 + 9×3 = 63 + 48 + 27 = 138
       * C[2][1] = 7×8 + 8×5 + 9×2 = 56 + 40 + 18 = 114
       * C[2][2] = 7×7 + 8×4 + 9×1 = 49 + 32 + 9 = 90
       * 
       * Result:
       * |  30   24   18 |
       * |  84   69   54 |
       * | 138  114   90 |
       */
      expect(result.get(0, 0)).toBe(30);
      expect(result.get(0, 1)).toBe(24);
      expect(result.get(0, 2)).toBe(18);
      expect(result.get(1, 0)).toBe(84);
      expect(result.get(1, 1)).toBe(69);
      expect(result.get(1, 2)).toBe(54);
      expect(result.get(2, 0)).toBe(138);
      expect(result.get(2, 1)).toBe(114);
      expect(result.get(2, 2)).toBe(90);
    });

    it('should preserve matrix when multiplied by identity', () => {
      /**
       * The identity matrix is the multiplicative identity:
       * -> A × I = A
       * -> I × A = A
       */
      const a = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);

      expect(a.multiply(Mat3.IDENTITY).equals(a)).toBe(true);
      expect(Mat3.IDENTITY.multiply(a).equals(a)).toBe(true);
    });

    it('should produce zero matrix when multiplied by zero', () => {
      /**
       * The zero matrix is the annihilator:
       * -> A × 0 = 0
       * -> 0 × A = 0
       */
      const a = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);

      expect(a.multiply(Mat3.ZERO).equals(Mat3.ZERO)).toBe(true);
      expect(Mat3.ZERO.multiply(a).equals(Mat3.ZERO)).toBe(true);
    });

    it('should demonstrate non-commutativity', () => {
      /**
       * Matrix multiplication is NOT commutative in general:
       * -> A × B ≠ B × A
       * 
       * This is extremely important in physics because the order
       * of rotations matters! Rotating around X then Y gives a
       * different result than rotating around Y then X.
       */
      const a = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      const b = new Mat3(9, 8, 7, 6, 5, 4, 3, 2, 1);

      const ab = a.multiply(b);
      const ba = b.multiply(a);

      expect(ab.equals(ba)).toBe(false);
    });

    it('should be associative', () => {
      /**
       * Matrix multiplication IS associative:
       * -> (A × B) × C = A × (B × C)
       */
      const a = new Mat3(1, 2, 0, 3, 4, 0, 0, 0, 1);
      const b = new Mat3(5, 6, 0, 7, 8, 0, 0, 0, 1);
      const c = new Mat3(2, 0, 1, 0, 2, 1, 0, 0, 1);

      const ab_c = a.multiply(b).multiply(c);
      const a_bc = a.multiply(b.multiply(c));

      expect(ab_c.equalsApprox(a_bc)).toBe(true);
    });
  });

  describe('Matrix-Vector Multiplication', () => {
    it('should transform vector by identity to same vector', () => {
      /**
       * The identity matrix leaves vectors unchanged:
       * -> I × v = v
       */
      const v = new Vec3(1, 2, 3);
      const result = Mat3.IDENTITY.multiplyVec3(v);

      expect(result.equals(v)).toBe(true);
    });

    it('should transform vector by zero to zero vector', () => {
      /**
       * The zero matrix collapses all vectors to zero:
       * -> 0 × v = (0, 0, 0)
       */
      const v = new Vec3(1, 2, 3);
      const result = Mat3.ZERO.multiplyVec3(v);

      expect(result.equals(Vec3.ZERO)).toBe(true);
    });

    it('should transform vector correctly', () => {
      const m = new Mat3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      );
      const v = new Vec3(1, 0, 0);
      const result = m.multiplyVec3(v);

      /**
       * Matrix-vector multiplication:
       * -> u = M × v
       * -> u.x = M[0][0]×v.x + M[0][1]×v.y + M[0][2]×v.z
       * -> u.y = M[1][0]×v.x + M[1][1]×v.y + M[1][2]×v.z
       * -> u.z = M[2][0]×v.x + M[2][1]×v.y + M[2][2]×v.z
       * 
       * For v = (1, 0, 0):
       * -> u.x = 1×1 + 2×0 + 3×0 = 1
       * -> u.y = 4×1 + 5×0 + 6×0 = 4
       * -> u.z = 7×1 + 8×0 + 9×0 = 7
       * 
       * Result: (1, 4, 7) which is the first column of the matrix!
       */
      expect(result.x).toBe(1);
      expect(result.y).toBe(4);
      expect(result.z).toBe(7);
    });

    it('should transform unit vectors to matrix columns', () => {
      /**
       * When you multiply a matrix by a unit basis vector,
       * you get the corresponding column of the matrix.
       * 
       * -> M × (1,0,0) = column 0
       * -> M × (0,1,0) = column 1
       * -> M × (0,0,1) = column 2
       * 
       * This is a fundamental property that helps visualize what
       * a matrix does: it maps the standard basis to its columns.
       */
      const m = new Mat3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      );

      const col0 = m.multiplyVec3(Vec3.RIGHT);
      const col1 = m.multiplyVec3(Vec3.UP);
      const col2 = m.multiplyVec3(Vec3.FORWARD);

      expect(col0.equals(new Vec3(1, 4, 7))).toBe(true);
      expect(col1.equals(new Vec3(2, 5, 8))).toBe(true);
      expect(col2.equals(new Vec3(3, 6, 9))).toBe(true);
    });
  });

  describe('Transpose', () => {
    it('should transpose matrix correctly', () => {
      const m = new Mat3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      );
      const t = m.transpose();

      /**
       * Transpose swaps rows and columns:
       * -> Mᵀ[i][j] = M[j][i]
       * 
       * | 1  2  3 |ᵀ   | 1  4  7 |
       * | 4  5  6 |  = | 2  5  8 |
       * | 7  8  9 |    | 3  6  9 |
       */
      expect(t.get(0, 0)).toBe(1);
      expect(t.get(0, 1)).toBe(4);
      expect(t.get(0, 2)).toBe(7);
      expect(t.get(1, 0)).toBe(2);
      expect(t.get(1, 1)).toBe(5);
      expect(t.get(1, 2)).toBe(8);
      expect(t.get(2, 0)).toBe(3);
      expect(t.get(2, 1)).toBe(6);
      expect(t.get(2, 2)).toBe(9);

      /**
       * Original matrix should remain unchanged (immutability).
       */
      expect(m.get(0, 1)).toBe(2);
    });

    it('should return identity when transposing identity', () => {
      /**
       * The identity matrix is symmetric:
       * -> Iᵀ = I
       */
      expect(Mat3.IDENTITY.transpose().equals(Mat3.IDENTITY)).toBe(true);
    });

    it('should return original when transposed twice', () => {
      /**
       * Transpose is its own inverse:
       * -> (Mᵀ)ᵀ = M
       */
      const m = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      expect(m.transpose().transpose().equals(m)).toBe(true);
    });

    it('should preserve diagonal elements', () => {
      /**
       * Diagonal elements dont move during transpose since:
       * -> Mᵀ[i][i] = M[i][i]
       */
      const m = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      const t = m.transpose();

      expect(t.get(0, 0)).toBe(m.get(0, 0));
      expect(t.get(1, 1)).toBe(m.get(1, 1));
      expect(t.get(2, 2)).toBe(m.get(2, 2));
    });
  });

  describe('Determinant', () => {
    it('should compute determinant of identity as 1', () => {
      /**
       * The determinant of the identity matrix is always 1:
       * -> det(I) = 1
       */
      expect(Mat3.IDENTITY.determinant()).toBe(1);
    });

    it('should compute determinant of zero matrix as 0', () => {
      /**
       * The determinant of the zero matrix is 0:
       * -> det(0) = 0
       * 
       * This makes sense because the zero matrix collapses all
       * vectors to a point (zero volume).
       */
      expect(Mat3.ZERO.determinant()).toBe(0);
    });

    it('should compute determinant of diagonal matrix as product of diagonals', () => {
      /**
       * For a diagonal matrix with elements d1, d2, d3:
       * -> det(D) = d1 × d2 × d3
       * 
       * | 2  0  0 |
       * | 0  3  0 |  -> det = 2 × 3 × 4 = 24
       * | 0  0  4 |
       */
      const d = Mat3.diagonal(2, 3, 4);
      expect(d.determinant()).toBe(24);
    });

    it('should compute determinant correctly for general matrix', () => {
      const m = new Mat3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 10
      );

      /**
       * Using the cofactor expansion formula:
       * det = a(ei - fh) - b(di - fg) + c(dh - eg)
       * 
       * For our matrix:
       * | 1  2  3  |
       * | 4  5  6  |
       * | 7  8  10 |
       * 
       * -> det = 1(5×10 - 6×8) - 2(4×10 - 6×7) + 3(4×8 - 5×7)
       * -> det = 1(50 - 48) - 2(40 - 42) + 3(32 - 35)
       * -> det = 1(2) - 2(-2) + 3(-3)
       * -> det = 2 + 4 - 9
       * -> det = -3
       */
      expect(m.determinant()).toBe(-3);
    });

    it('should return zero for singular matrix', () => {
      /**
       * A singular matrix has linearly dependent rows/columns.
       * Here row 3 = row 1 + row 2, so det = 0.
       * 
       * | 1  2  3 |
       * | 4  5  6 |
       * | 5  7  9 |  <- this is row1 + row2
       */
      const singular = new Mat3(
        1, 2, 3,
        4, 5, 6,
        5, 7, 9
      );
      expect(singular.determinant()).toBe(0);
    });

    it('should scale determinant by k³ when matrix is scaled by k', () => {
      /**
       * When a 3×3 matrix is scaled by k, its determinant is scaled by k³:
       * -> det(k × A) = k³ × det(A)
       * 
       * This is because each of the 3 rows is multiplied by k,
       * and the determinant is multilinear in the rows.
       */
      const m = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 10);
      const k = 2;

      const detM = m.determinant();
      const detScaled = m.scale(k).determinant();

      expect(detScaled).toBeCloseTo(k * k * k * detM, 10);
    });

    it('should have same determinant for matrix and its transpose', () => {
      /**
       * The determinant is invariant under transpose:
       * -> det(Mᵀ) = det(M)
       */
      const m = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 10);
      expect(m.transpose().determinant()).toBe(m.determinant());
    });
  });

  describe('Inverse', () => {
    it('should compute inverse of very small but non-singular matrix', () => {
      /**
       * Physically valid matrices (like inertia tensors of small objects)
       * can have very small determinants (e.g. 10^-25).
       * These should be invertible with the appropriate singularity threshold.
       */
      const val = 1e-8;
      const m = Mat3.diagonal(val, val, val);
      // det = 1e-24. old TOLERANCE was 1e-6.

      const inv = m.inverse();
      expect(inv).not.toBeNull();
      expect(inv!.get(0, 0)).toBeCloseTo(1e8, 1);
    });
    it('should compute inverse of identity as identity', () => {
      /**
       * The identity matrix is its own inverse:
       * -> I⁻¹ = I
       */
      const inv = Mat3.IDENTITY.inverse();
      expect(inv).not.toBeNull();
      expect(inv!.equals(Mat3.IDENTITY)).toBe(true);
    });

    it('should return null for singular matrix', () => {
      /**
       * A singular matrix (det = 0) has no inverse.
       * Row 3 = Row 1 + Row 2, so this matrix is singular.
       */
      const singular = new Mat3(
        1, 2, 3,
        4, 5, 6,
        5, 7, 9
      );
      expect(singular.inverse()).toBeNull();
    });

    it('should return null for zero matrix', () => {
      /**
       * The zero matrix is singular and has no inverse.
       */
      expect(Mat3.ZERO.inverse()).toBeNull();
    });

    it('should compute inverse of diagonal matrix correctly', () => {
      /**
       * For a diagonal matrix, the inverse has reciprocal diagonal elements:
       * 
       * | 2  0  0 |⁻¹   | 0.5   0     0   |
       * | 0  4  0 |   = |  0   0.25   0   |
       * | 0  0  5 |     |  0    0    0.2  |
       */
      const d = Mat3.diagonal(2, 4, 5);
      const inv = d.inverse();

      expect(inv).not.toBeNull();
      expect(inv!.get(0, 0)).toBeCloseTo(0.5, 10);
      expect(inv!.get(1, 1)).toBeCloseTo(0.25, 10);
      expect(inv!.get(2, 2)).toBeCloseTo(0.2, 10);

      /**
       * Note: In JavaScript, certain calculations produce -0 (negative zero).
       * While Object.is(-0, 0) returns false, the === operator treats them as equal.
       * We use === comparison to sidestep this quirk, just like in the Vec3 tests.
       */
      expect(inv!.get(0, 1) === 0).toBe(true);
      expect(inv!.get(1, 0) === 0).toBe(true);
      expect(inv!.get(0, 2) === 0).toBe(true);
      expect(inv!.get(2, 0) === 0).toBe(true);
      expect(inv!.get(1, 2) === 0).toBe(true);
      expect(inv!.get(2, 1) === 0).toBe(true);
    });

    it('should satisfy M × M⁻¹ = I', () => {
      /**
       * The fundamental property of the inverse:
       * -> M × M⁻¹ = I
       */
      const m = new Mat3(
        1, 2, 3,
        0, 1, 4,
        5, 6, 0
      );
      const inv = m.inverse();

      expect(inv).not.toBeNull();

      const product = m.multiply(inv!);
      expect(product.equalsApprox(Mat3.IDENTITY)).toBe(true);
    });

    it('should satisfy M⁻¹ × M = I', () => {
      /**
       * The inverse works on both sides:
       * -> M⁻¹ × M = I
       */
      const m = new Mat3(
        1, 2, 3,
        0, 1, 4,
        5, 6, 0
      );
      const inv = m.inverse();

      expect(inv).not.toBeNull();

      const product = inv!.multiply(m);
      expect(product.equalsApprox(Mat3.IDENTITY)).toBe(true);
    });

    it('should compute (M⁻¹)⁻¹ = M', () => {
      /**
       * The inverse of the inverse is the original matrix:
       * -> (M⁻¹)⁻¹ = M
       */
      const m = new Mat3(
        1, 2, 3,
        0, 1, 4,
        5, 6, 0
      );
      const inv = m.inverse();
      expect(inv).not.toBeNull();

      const invInv = inv!.inverse();
      expect(invInv).not.toBeNull();
      expect(invInv!.equalsApprox(m)).toBe(true);
    });

    it('should have det(M⁻¹) = 1/det(M)', () => {
      /**
       * The determinant of the inverse is the reciprocal of the original:
       * -> det(M⁻¹) = 1 / det(M)
       */
      const m = new Mat3(
        1, 2, 3,
        0, 1, 4,
        5, 6, 0
      );
      const detM = m.determinant();
      const inv = m.inverse();

      expect(inv).not.toBeNull();
      expect(inv!.determinant()).toBeCloseTo(1 / detM, 10);
    });
  });

  describe('Static Factory Methods', () => {
    it('should create diagonal matrix correctly', () => {
      const d = Mat3.diagonal(2, 3, 4);

      /**
       * Diagonal matrix has the given values on the main diagonal
       * and zeros elsewhere.
       * 
       * | 2  0  0 |
       * | 0  3  0 |
       * | 0  0  4 |
       */
      expect(d.get(0, 0)).toBe(2);
      expect(d.get(1, 1)).toBe(3);
      expect(d.get(2, 2)).toBe(4);
      expect(d.get(0, 1)).toBe(0);
      expect(d.get(0, 2)).toBe(0);
      expect(d.get(1, 0)).toBe(0);
      expect(d.get(1, 2)).toBe(0);
      expect(d.get(2, 0)).toBe(0);
      expect(d.get(2, 1)).toBe(0);
    });

    it('should create rotation matrix around X axis', () => {
      const halfPi = Math.PI / 2;
      const rotX = Mat3.rotationX(halfPi);

      /**
       * Rotating Vec3.UP (0, 1, 0) by 90° around X should give Vec3.FORWARD (0, 0, 1).
       * 
       * Rotation matrix:
       * | 1     0        0    |
       * | 0   cos(90°)  -sin(90°) |
       * | 0   sin(90°)   cos(90°) |
       * 
       * = | 1  0   0 |
       *   | 0  0  -1 |
       *   | 0  1   0 |
       * 
       * Applying to (0, 1, 0):
       * -> x' = 1×0 + 0×1 + 0×0 = 0
       * -> y' = 0×0 + 0×1 + (-1)×0 = 0
       * -> z' = 0×0 + 1×1 + 0×0 = 1
       * -> Result: (0, 0, 1) = FORWARD
       */
      const rotated = rotX.multiplyVec3(Vec3.UP);
      expect(rotated.equalsApprox(Vec3.FORWARD)).toBe(true);
    });

    it('should create rotation matrix around Y axis', () => {
      const halfPi = Math.PI / 2;
      const rotY = Mat3.rotationY(halfPi);

      /**
       * Rotating Vec3.FORWARD (0, 0, 1) by 90° around Y should give Vec3.RIGHT (1, 0, 0).
       * 
       * Rotation matrix:
       * |  cos(90°)  0  sin(90°) |   |  0  0  1 |
       * |    0       1    0      | = |  0  1  0 |
       * | -sin(90°)  0  cos(90°) |   | -1  0  0 |
       * 
       * Applying to (0, 0, 1):
       * -> x' = 0×0 + 0×0 + 1×1 = 1
       * -> y' = 0×0 + 1×0 + 0×1 = 0
       * -> z' = (-1)×0 + 0×0 + 0×1 = 0
       * -> Result: (1, 0, 0) = RIGHT
       */
      const rotated = rotY.multiplyVec3(Vec3.FORWARD);
      expect(rotated.equalsApprox(Vec3.RIGHT)).toBe(true);
    });

    it('should create rotation matrix around Z axis', () => {
      const halfPi = Math.PI / 2;
      const rotZ = Mat3.rotationZ(halfPi);

      /**
       * Rotating Vec3.RIGHT (1, 0, 0) by 90° around Z should give Vec3.UP (0, 1, 0).
       * 
       * Rotation matrix:
       * | cos(90°)  -sin(90°)  0 |   | 0  -1  0 |
       * | sin(90°)   cos(90°)  0 | = | 1   0  0 |
       * |   0          0       1 |   | 0   0  1 |
       * 
       * Applying to (1, 0, 0):
       * -> x' = 0×1 + (-1)×0 + 0×0 = 0
       * -> y' = 1×1 + 0×0 + 0×0 = 1
       * -> z' = 0×1 + 0×0 + 1×0 = 0
       * -> Result: (0, 1, 0) = UP
       */
      const rotated = rotZ.multiplyVec3(Vec3.RIGHT);
      expect(rotated.equalsApprox(Vec3.UP)).toBe(true);
    });

    it('should have rotation matrices with determinant 1', () => {
      /**
       * All rotation matrices are orthogonal with determinant +1.
       * (det = -1 would be a rotation + reflection)
       */
      const angle = 0.7; // arbitrary angle
      expect(Mat3.rotationX(angle).determinant()).toBeCloseTo(1, 10);
      expect(Mat3.rotationY(angle).determinant()).toBeCloseTo(1, 10);
      expect(Mat3.rotationZ(angle).determinant()).toBeCloseTo(1, 10);
    });

    it('should have rotation matrix transpose equal to inverse', () => {
      /**
       * For orthogonal matrices like rotations:
       * -> Rᵀ = R⁻¹
       * 
       * This is because rotation preserves lengths and angles.
       */
      const angle = 0.7;
      const r = Mat3.rotationX(angle);
      const rT = r.transpose();
      const rInv = r.inverse();

      expect(rInv).not.toBeNull();
      expect(rT.equalsApprox(rInv!)).toBe(true);
    });

    it('should create skew-symmetric matrix correctly', () => {
      const v = new Vec3(1, 2, 3);
      const skew = Mat3.skewSymmetric(v);

      /**
       * Skew-symmetric matrix from vector (x, y, z):
       * 
       * |  0  -z   y |   |  0  -3   2 |
       * |  z   0  -x | = |  3   0  -1 |
       * | -y   x   0 |   | -2   1   0 |
       */
      expect(skew.get(0, 0)).toBe(0);
      expect(skew.get(0, 1)).toBe(-3);
      expect(skew.get(0, 2)).toBe(2);
      expect(skew.get(1, 0)).toBe(3);
      expect(skew.get(1, 1)).toBe(0);
      expect(skew.get(1, 2)).toBe(-1);
      expect(skew.get(2, 0)).toBe(-2);
      expect(skew.get(2, 1)).toBe(1);
      expect(skew.get(2, 2)).toBe(0);
    });

    it('should make skew-symmetric matrix multiplication equivalent to cross product', () => {
      /**
       * The key property of skew-symmetric matrices:
       * -> [v]× × u = v × u (cross product!)
       * 
       * This allows us to express the cross product as matrix multiplication,
       * which is very useful in physics for computing ω × r.
       */
      const v = new Vec3(1, 2, 3);
      const u = new Vec3(4, 5, 6);

      const skew = Mat3.skewSymmetric(v);
      const matrixResult = skew.multiplyVec3(u);
      const crossResult = v.crossProduct(u);

      expect(matrixResult.equalsApprox(crossResult)).toBe(true);
    });

    it('should have skew-symmetric matrix transpose equal to negative', () => {
      /**
       * A skew-symmetric matrix satisfies:
       * -> Sᵀ = -S
       */
      const v = new Vec3(1, 2, 3);
      const s = Mat3.skewSymmetric(v);
      const sT = s.transpose();
      const negS = s.scale(-1);

      expect(sT.equals(negS)).toBe(true);
    });

    it('should have skew-symmetric matrix with zero diagonal', () => {
      /**
       * All skew-symmetric matrices have zeros on the diagonal.
       * This is because S[i][i] = -S[i][i] implies S[i][i] = 0.
       */
      const v = new Vec3(5, -3, 7);
      const s = Mat3.skewSymmetric(v);

      expect(s.get(0, 0)).toBe(0);
      expect(s.get(1, 1)).toBe(0);
      expect(s.get(2, 2)).toBe(0);
    });
  });

  describe('Trace', () => {
    it('should compute trace of identity as 3', () => {
      /**
       * trace(I) = 1 + 1 + 1 = 3
       */
      expect(Mat3.IDENTITY.trace()).toBe(3);
    });

    it('should compute trace of zero as 0', () => {
      /**
       * trace(0) = 0 + 0 + 0 = 0
       */
      expect(Mat3.ZERO.trace()).toBe(0);
    });

    it('should compute trace as sum of diagonal elements', () => {
      const m = new Mat3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      );

      /**
       * trace(M) = M[0][0] + M[1][1] + M[2][2]
       * -> trace = 1 + 5 + 9 = 15
       */
      expect(m.trace()).toBe(15);
    });

    it('should have trace invariant under transpose', () => {
      /**
       * trace(Mᵀ) = trace(M) because diagonal elements
       * dont change during transpose.
       */
      const m = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      expect(m.transpose().trace()).toBe(m.trace());
    });

    it('should compute rotation angle from trace', () => {
      /**
       * For a rotation matrix R:
       * -> trace(R) = 1 + 2cos(θ)
       * -> cos(θ) = (trace(R) - 1) / 2
       * 
       * We can verify this formula with a known rotation.
       */
      const angle = Math.PI / 3; // 60 degrees
      const r = Mat3.rotationZ(angle);
      const tr = r.trace();

      /**
       * trace = 1 + 2cos(π/3) = 1 + 2×0.5 = 2
       */
      const expectedTrace = 1 + 2 * Math.cos(angle);
      expect(tr).toBeCloseTo(expectedTrace, 10);
    });
  });

  describe('Array Conversion', () => {
    it('should convert to array correctly', () => {
      const m = new Mat3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      );
      const arr = m.toArray();

      /**
       * toArray returns elements in row-major order.
       */
      expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should create matrix from array correctly', () => {
      const arr = [9, 8, 7, 6, 5, 4, 3, 2, 1];
      const m = Mat3.fromArray(arr);

      expect(m.get(0, 0)).toBe(9);
      expect(m.get(0, 1)).toBe(8);
      expect(m.get(0, 2)).toBe(7);
      expect(m.get(1, 0)).toBe(6);
      expect(m.get(1, 1)).toBe(5);
      expect(m.get(1, 2)).toBe(4);
      expect(m.get(2, 0)).toBe(3);
      expect(m.get(2, 1)).toBe(2);
      expect(m.get(2, 2)).toBe(1);
    });

    it('should throw error for wrong array length', () => {
      expect(() => Mat3.fromArray([1, 2, 3])).toThrow();
      expect(() => Mat3.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toThrow();
    });

    it('should roundtrip through array conversion', () => {
      const m = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      const m2 = Mat3.fromArray(m.toArray());
      expect(m2.equals(m)).toBe(true);
    });
  });

  describe('Equality and Cloning', () => {
    it('should detect equal matrices', () => {
      const a = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      const b = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      expect(a.equals(b)).toBe(true);
    });

    it('should detect unequal matrices', () => {
      const a = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      const b = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 10);
      expect(a.equals(b)).toBe(false);
    });

    it('should detect approximately equal matrices', () => {
      const a = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      const b = new Mat3(
        1.0000001, 2.0000001, 3.0000001,
        4.0000001, 5.0000001, 6.0000001,
        7.0000001, 8.0000001, 9.0000001
      );
      expect(a.equalsApprox(b)).toBe(true);
    });

    it('should detect non-approximately equal matrices', () => {
      const a = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      const b = new Mat3(1.1, 2, 3, 4, 5, 6, 7, 8, 9);
      expect(a.equalsApprox(b)).toBe(false);
    });

    it('should clone matrix correctly', () => {
      const m = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
      const c = m.clone();

      expect(c.equals(m)).toBe(true);
      expect(c).not.toBe(m);
    });
  });

  describe('Rotation Composition', () => {
    it('should compose rotations correctly', () => {
      /**
       * Composing rotations by matrix multiplication.
       * 
       * Rotating RIGHT by 90° around Z gives UP:
       * -> (1,0,0) rotZ(90°) -> (0,1,0)
       * 
       * Then rotating UP by 90° around X gives FORWARD:
       * -> (0,1,0) rotX(90°) -> (0,0,1)
       * 
       * The combined rotation R = rotX(90°) × rotZ(90°) should
       * take RIGHT directly to FORWARD.
       */
      const halfPi = Math.PI / 2;
      const rotZ = Mat3.rotationZ(halfPi);
      const rotX = Mat3.rotationX(halfPi);

      const combined = rotX.multiply(rotZ);
      const result = combined.multiplyVec3(Vec3.RIGHT);

      expect(result.equalsApprox(Vec3.FORWARD)).toBe(true);
    });

    it('should return to original after full rotation', () => {
      /**
       * Rotating by 360° (2π radians) should return to identity.
       */
      const fullRotation = Mat3.rotationX(2 * Math.PI);
      expect(fullRotation.equalsApprox(Mat3.IDENTITY)).toBe(true);
    });

    it('should undo rotation with inverse rotation', () => {
      /**
       * Rotating by θ then by -θ should return to identity.
       */
      const theta = 0.7;
      const r = Mat3.rotationY(theta);
      const rInv = Mat3.rotationY(-theta);

      const product = r.multiply(rInv);
      expect(product.equalsApprox(Mat3.IDENTITY)).toBe(true);
    });
  });

  describe('Physics-Relevant Properties', () => {
    it('should work with inertia tensor-like matrices', () => {
      /**
       * In physics, the inertia tensor for a symmetric object is a diagonal matrix.
       * For a uniform cylinder rotating around its axis, the moments of inertia
       * are different along different axes.
       * 
       * This test verifies we can compute angular velocity from angular momentum:
       * -> ω = I⁻¹ × L
       */
      const inertiaTensor = Mat3.diagonal(2, 2, 1);
      const angularMomentum = new Vec3(4, 6, 3);

      const inverseInertia = inertiaTensor.inverse();
      expect(inverseInertia).not.toBeNull();

      const angularVelocity = inverseInertia!.multiplyVec3(angularMomentum);

      /**
       * ω = I⁻¹ × L = diag(1/2, 1/2, 1) × (4, 6, 3)
       * -> ω.x = (1/2) × 4 = 2
       * -> ω.y = (1/2) × 6 = 3
       * -> ω.z = 1 × 3 = 3
       */
      expect(angularVelocity.x).toBeCloseTo(2, 10);
      expect(angularVelocity.y).toBeCloseTo(3, 10);
      expect(angularVelocity.z).toBeCloseTo(3, 10);
    });

    it('should transform inertia tensor to different frame', () => {
      /**
       * When a rigid body rotates, its inertia tensor in world coordinates
       * is transformed by the rotation:
       * 
       * -> I_world = R × I_body × Rᵀ
       * 
       * For a rotation matrix R and body-frame inertia I_body.
       */
      const I_body = Mat3.diagonal(1, 2, 3);
      const R = Mat3.rotationZ(Math.PI / 4); // 45° rotation

      const I_world = R.multiply(I_body).multiply(R.transpose());

      /**
       * The transformed inertia tensor should:
       * 1. Be symmetric (I_world = I_worldᵀ)
       * 2. Have the same trace (trace is invariant under rotation)
       * 3. Have the same determinant (det is invariant under orthogonal transform)
       */
      expect(I_world.equalsApprox(I_world.transpose())).toBe(true);
      expect(I_world.trace()).toBeCloseTo(I_body.trace(), 10);
      expect(I_world.determinant()).toBeCloseTo(I_body.determinant(), 10);
    });
  });
});
