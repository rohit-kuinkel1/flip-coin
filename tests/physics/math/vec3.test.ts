import { describe, it, expect } from 'vitest';
import { Vec3 } from '../../../src/physics/math/vec3';

describe('Vec3', () => {
  it('should create a vector with correct components', () => {
    /**
     * This is pretty self-explanatory I guess. If we pass in the components
     * in the correct order, we should get a vector with those components.
     * Not rocket science.
     */
    const v = new Vec3(1, 2, 3);
    expect(v.x).toBe(1);
    expect(v.y).toBe(2);
    expect(v.z).toBe(3);
  });

  it('should support static constants', () => {
    /**
     * This is also pretty self-explanatory.
     * We should get the static constants with the correct components.
     * We arent really testing a certain operation with this, we just want to
     * make sure that our initial definitions are still correct.
     */
    expect(Vec3.ZERO).toEqual(new Vec3(0, 0, 0));
    expect(Vec3.UP).toEqual(new Vec3(0, 1, 0));
    expect(Vec3.RIGHT).toEqual(new Vec3(1, 0, 0));
    expect(Vec3.FORWARD).toEqual(new Vec3(0, 0, 1));
  });

  it('should add vectors correctly', () => {
    const v1 = new Vec3(1, 2, 3);
    const v2 = new Vec3(4, 5, 6);
    const result = v1.add(v2);

    /**
     * The result of adding 2 vectors is a new vector where each component is the sum of the corresponding components of the input vectors.
     * So for 2 vectors v1 = (x1, y1, z1) and v2 = (x2, y2, z2), the result is:
     * -> v1 + v2 = (x1 + x2, y1 + y2, z1 + z2)
     * Hence,
     * -> v1 + v2 = (1 + 4, 2 + 5, 3 + 6)
     * -> v1 + v2 = (5, 7, 9)
     */
    expect(result.x).toBe(5);
    expect(result.y).toBe(7);
    expect(result.z).toBe(9);

    /**
     * When we add 2 vectors, the original vectors shouldnt change.
     * This is because we are using an immutable design pattern if you
     * see the constructor in src\physics\math\vec3.ts
     */
    expect(v1.x).toBe(1);
    expect(v2.x).toBe(4);
    expect(v1.y).toBe(2);
    expect(v2.y).toBe(5);
    expect(v1.z).toBe(3);
    expect(v2.z).toBe(6);
  });

  it('should subtract vectors correctly', () => {
    const v1 = new Vec3(4, 5, 6);
    const v2 = new Vec3(1, 2, 3);
    const result = v1.subtract(v2);

    /**
     * The result of subtracting 2 vectors is a new vector where each component is the difference of the corresponding components of the input vectors.
     * So for 2 vectors v1 = (x1, y1, z1) and v2 = (x2, y2, z2), the result is:
     * -> v1 - v2 = (x1 - x2, y1 - y2, z1 - z2)
     * Hence,
     * -> v1 - v2 = (4 - 1, 5 - 2, 6 - 3)
     * -> v1 - v2 = (3, 3, 3)
     */
    expect(result.x).toBe(3);
    expect(result.y).toBe(3);
    expect(result.z).toBe(3);

    /**
     * When we subtract 2 vectors, the original vectors shouldnt change.
     * This is because we are using an immutable design pattern if you
     * see the constructor in src\physics\math\vec3.ts
     */
    expect(v1.x).toBe(4);
    expect(v2.x).toBe(1);
    expect(v1.y).toBe(5);
    expect(v2.y).toBe(2);
    expect(v1.z).toBe(6);
    expect(v2.z).toBe(3);
  });

  it('should scale vectors correctly', () => {
    const v = new Vec3(1, -2, 3);
    const result = v.scale(2);

    /**
     * The result of scaling a vector is a new vector where each component is the product of the corresponding component of the input vector and the scale factor.
     * So for a vector v = (x, y, z) and a scale factor s, the result is:
     * -> v * s = (x * s, y * s, z * s)
     * Hence,
     * -> v * s = (1 * 2, -2 * 2, 3 * 2)
     * -> v * s = (2, -4, 6)
     */
    expect(result.x).toBe(2);
    expect(result.y).toBe(-4);
    expect(result.z).toBe(6);

    /**
     * When we scale a vector, the original vector shouldnt change.
     * This is because we are using an immutable design pattern if you
     * see the constructor in src\physics\math\vec3.ts
     */
    expect(v.x).toBe(1);
    expect(v.y).toBe(-2);
    expect(v.z).toBe(3);
  });

  it('should scale properly with negative scale factor', () => {
    const v = new Vec3(1, -2, 3);
    const result = v.scale(-2);

    /**
     * The result of scaling a vector is a new vector where each component is the product of the corresponding component of the input vector and the scale factor.
     * So for a vector v = (x, y, z) and a scale factor s, the result is:
     * -> v * s = (x * s, y * s, z * s)
     * Hence,
     * -> v * s = (1 * (-2), (-2) * (-2), 3 * (-2))
     * -> v * s = (-2, 4, -6)
     */
    expect(result.x).toBe(-2);
    expect(result.y).toBe(4);
    expect(result.z).toBe(-6);

    /**
     * When we scale a vector, the original vector shouldnt change.
     * This is because we are using an immutable design pattern if you
     * see the constructor in src\physics\math\vec3.ts
     */
    expect(v.x).toBe(1);
    expect(v.y).toBe(-2);
    expect(v.z).toBe(3);
  });

  it('should result in ZERO vector when scaled by 0', () => {
    const v = new Vec3(1, -2, 3);
    const result = v.scale(0);

    /**
     * The result of scaling a vector is a new vector where each component is the product of the corresponding component of the input vector and the scale factor.
     * So for a vector v = (x, y, z) and a scale factor s, the result is:
     * -> v * s = (x * s, y * s, z * s)
     * Hence,
     * -> v * s = (1 * 0, (-2) * 0, 3 * 0)
     * -> v * s = (0, 0, 0)
     *
     * Note: In JavaScript, -2 * 0 = -0 (negative zero). While Object.is(-0, 0)
     * returns false, the === operator treats them as equal. We use === via
     * comparing to literal 0 to sidestep this quirk. Thats the reason we use ===
     * instead of toBe(0) here.
     */
    expect(result.x === Vec3.ZERO.x).toBe(true);
    expect(result.y === Vec3.ZERO.y).toBe(true);
    expect(result.z === Vec3.ZERO.z).toBe(true);

    /**
     * When we scale a vector, the original vector shouldnt change.
     * This is because we are using an immutable design pattern if you
     * see the constructor in src\physics\math\vec3.ts
     */
    expect(v.x).toBe(1);
    expect(v.y).toBe(-2);
    expect(v.z).toBe(3);
  });

  it('should calculate dot product', () => {
    const v1 = new Vec3(1, 2, 3);
    const v2 = new Vec3(4, -5, 6);

    /**
     * The dot product is the sum of the products of the corresponding components.
     * So for 2 vectors v1 = (x1, y1, z1) and v2 = (x2, y2, z2), the dot product is:
     * -> v1 . v2 = x1 * x2 + y1 * y2 + z1 * z2
     * Hence,
     * -> v1 . v2 = (1 * 4) + (2 * (-5)) + (3 * 6) 
     * -> v1 . v2 =     4   +    (-10)   +    18
     * -> v1 . v2 = -6 + 18 
     * -> v1 . v2 = 12
     */
    expect(v1.dotProduct(v2)).toBe(12);

    /**
     * When we multiply 2 vectors to get the dot product, the original vectors shouldnt change.
     * This is because we are using an immutable design pattern if you
     * see the constructor in src\physics\math\vec3.ts
     */
    expect(v1.x).toBe(1);
    expect(v1.y).toBe(2);
    expect(v1.z).toBe(3);
    expect(v2.x).toBe(4);
    expect(v2.y).toBe(-5);
    expect(v2.z).toBe(6);
  });

  it('should calculate cross product', () => {
    const v1 = Vec3.RIGHT;
    const v2 = Vec3.UP;
  
    /**
     *  The result of a cross product is a vector that is perpendicular to both input vectors, meaning
     *  the resulting vector will make a 90 degree angle with both input vectors.
     *  
     *  Right CROSS Up = Forward 
     * 
     *  In right-handed system with Y up, Z forward depends on convention, 
     *  but traditionally Z is out of screen or forward and X is then to the right, see the image
     *  illustrated in src\physics\math\vec3.ts.
     * 
     *  So, here: 
     *  x = 1, y = 0, z = 0
     *  x = 0, y = 1, z = 0
     *  cx = 0*0 - 0*1 = 0
     *  cy = 0*0 - 1*0 = 0
     *  cz = 1*1 - 0*0 = 1
     *  So (0, 0, 1) which is FORWARD
     */
    expect(v1.crossProduct(v2)).toEqual(Vec3.FORWARD);
    
    /**
     * Anti commutative property check.
     * This basically means that the order of the vectors matters and
     * when we reverse the order, we get the negative of the result. So
     * if you do v2 cross v1 and get v3, then v1 cross v2 should be -v3.
     * Note that the result is still perpendicular to both input vectors, just
     * now its pointing in the opposite direction. So if v1 cross v2 pointed
     * say directly in front of you (face forward), then v2 cross v1 would point
     * directly behind you (face backward).
     */
    expect(v2.crossProduct(v1)).toEqual(new Vec3(0, 0, -1));
  });

  it('should calculate magnitude', () => {
    const v = new Vec3(3, 4, 0);

    /**
     * Magnitude is basically the length of the vector. Normally to find
     * the magnitude, we would firstly find the magnitude sqaure and then 
     * just square root the result to get the magnitude.
     * 
     * So magnitude = sqrt(x^2 + y^2 + z^2)
     * 
     * In this case, we have x = 3, y = 4, z = 0
     * So magnitude = sqrt(3^2 + 4^2 + 0^2) = sqrt(9 + 16 + 0) = sqrt(25) = 5
     */
    expect(v.magnitudeSquare()).toBe(25);
    expect(v.magnitude()).toBe(5);
  });

  it('should normalize vectors', () => {
    const v = new Vec3(3, 0, 0);
    const n = v.normalize();

    /**
     * Normalization is the process of scaling a vector to have a magnitude of 1 while maintaining its direction.
     * In simple words, we just find the magnitude of the vector and divide each axial component by it such that 
     * it results in a unit vector (magnitude of 1).
     * 
     * So if we have a vector v = (x, y, z), then its normalized form is given by:
     * -> v_normalized = (x / |v|, y / |v|, z / |v|)
     * 
     * Where |v| is the magnitude of the vector v.
     * 
     * In this case, we have v = (3, 0, 0)
     * So v_normalized = (3 / 3, 0 / 3, 0 / 3) = (1, 0, 0)
     */
    expect(n.x).toBe(1);
    expect(n.y).toBe(0);
    expect(n.z).toBe(0);    
  });

  it('should handle zero vector normalization', () => {
    /**
     * When we normalize a zero vector, we get a zero vector.
     * This is because the magnitude of a zero vector is 0 since 0^2 + 0^2 + 0^2 = 0, 
     * and when we divide 0 by 0, we get 0.
     */
    expect(Vec3.ZERO.normalize()).toEqual(Vec3.ZERO);
  });

  it('should normalize the pre-defined vectors properly', () => {
    /**
     * Same idea here as well just like the zero vector normalization with
     * the difference that we are normalizing a unit vector here so the magnitude
     * is already 1 and when we divide 1 by 1, we get 1, when 0 is divided by 1, we get 0,
     * so the vectors will remain the same.
     */
    expect(Vec3.UP.normalize()).toEqual(Vec3.UP);
    expect(Vec3.RIGHT.normalize()).toEqual(Vec3.RIGHT);
    expect(Vec3.FORWARD.normalize()).toEqual(Vec3.FORWARD);
  });

  it('should calculate distance', () => {
    const v1 = new Vec3(0, 0, 0);
    const v2 = new Vec3(0, 3, 4);
    
    /**
     * Distance is the length of the vector between two points.
     * 
     * So if we have two points p1 = (x1, y1, z1) and p2 = (x2, y2, z2), then the distance between them is given by:
     * -> distance = sqrt((x2 - x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)
     * 
     * In this case, we have p1 = (0, 0, 0) and p2 = (0, 3, 4)
     * So distance = sqrt((0 - 0)^2 + (3 - 0)^2 + (4 - 0)^2) = sqrt(0 + 9 + 16) = sqrt(25) = 5
     */
    expect(v1.distanceTo(v2)).toBe(5);
    expect(v1.distanceToSquare(v2)).toBe(25);
  });

  it('should check approximate equality', () => {
    const v1 = new Vec3(1, 1, 1);
    const v2 = new Vec3(1.00000001, 1, 1);
    const v3 = new Vec3(1.1, 1, 1);
    
    /**
     * Approximate equality is used when we want to check if two vectors are equal
     * within a certain tolerance. This is useful when we are working with floating point
     * numbers since they can be imprecise.
     * 
     * So if we have two vectors v1 = (x1, y1, z1) and v2 = (x2, y2, z2), then v1 is approximately equal to v2 if:
     * -> |x1 - x2| < epsilon
     * -> |y1 - y2| < epsilon
     * -> |z1 - z2| < epsilon
     * 
     * Where epsilon is the tolerance.
     * 
     * In this case, we have v1 = (1, 1, 1) and v2 = (1.00000001, 1, 1)
     * So v1 is approximately equal to v2 since the difference between the x components is less than the tolerance.
     */
    expect(v1.equalsApprox(v2)).toBe(true);
    expect(v1.equalsApprox(v3)).toBe(false);
  });
});
