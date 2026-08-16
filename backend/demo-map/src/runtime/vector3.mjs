export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = finite(x, "x");
    this.y = finite(y, "y");
    this.z = finite(z, "z");
  }

  set(x, y, z) {
    this.x = finite(x, "x");
    this.y = finite(y, "y");
    this.z = finite(z, "z");
    return this;
  }

  copy(value) {
    return this.set(value.x, value.y, value.z);
  }

  add(value) {
    return new Vector3(this.x + value.x, this.y + value.y, this.z + value.z);
  }

  sub(value) {
    return new Vector3(this.x - value.x, this.y - value.y, this.z - value.z);
  }

  subtract(value) {
    return this.sub(value);
  }

  mul(value) {
    return new Vector3(this.x * value.x, this.y * value.y, this.z * value.z);
  }

  div(value) {
    return new Vector3(value.x === 0 ? 0 : this.x / value.x, value.y === 0 ? 0 : this.y / value.y, value.z === 0 ? 0 : this.z / value.z);
  }

  addEq(value) {
    return this.set(this.x + value.x, this.y + value.y, this.z + value.z);
  }

  subEq(value) {
    return this.set(this.x - value.x, this.y - value.y, this.z - value.z);
  }

  mulEq(value) {
    return this.set(this.x * value.x, this.y * value.y, this.z * value.z);
  }

  divEq(value) {
    return this.set(value.x === 0 ? 0 : this.x / value.x, value.y === 0 ? 0 : this.y / value.y, value.z === 0 ? 0 : this.z / value.z);
  }

  dot(value) {
    return this.x * value.x + this.y * value.y + this.z * value.z;
  }

  cross(value) {
    return new Vector3(this.y * value.z - this.z * value.y, this.z * value.x - this.x * value.z, this.x * value.y - this.y * value.x);
  }

  scale(factor) {
    return new Vector3(this.x * factor, this.y * factor, this.z * factor);
  }

  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  lerp(value, factor) {
    return new Vector3(this.x + (value.x - this.x) * factor, this.y + (value.y - this.y) * factor, this.z + (value.z - this.z) * factor);
  }

  mag() {
    return Math.sqrt(this.dot(this));
  }

  sqrMag() {
    return this.dot(this);
  }

  towards(value) {
    return value.sub(this);
  }

  distance(value) {
    return this.sub(value).mag();
  }

  normalize() {
    const squaredMagnitude = this.sqrMag();
    const inverseMagnitude = squaredMagnitude > 0 ? 1 / Math.sqrt(squaredMagnitude) : 0;
    return new Vector3(this.x * inverseMagnitude, this.y * inverseMagnitude, this.z * inverseMagnitude);
  }

  angle(value) {
    const squaredProduct = value.sqrMag() * this.sqrMag();
    const inverseMagnitudeProduct = squaredProduct > 0 ? 1 / Math.sqrt(squaredProduct) : 0;
    const cosine = inverseMagnitudeProduct * this.dot(value);
    if (cosine > 1) return 0;
    if (cosine < -1) return Math.PI;
    return Math.acos(cosine);
  }

  max(value) {
    return new Vector3(Math.max(this.x, value.x), Math.max(this.y, value.y), Math.max(this.z, value.z));
  }

  min(value) {
    return new Vector3(Math.min(this.x, value.x), Math.min(this.y, value.y), Math.min(this.z, value.z));
  }

  exactEquals(value) {
    return this.x === value.x && this.y === value.y && this.z === value.z;
  }

  equals(value) {
    return Math.abs(this.x - value.x) < VECTOR_EPSILON && Math.abs(this.y - value.y) < VECTOR_EPSILON && Math.abs(this.z - value.z) < VECTOR_EPSILON;
  }

  toArray() {
    return [this.x, this.y, this.z];
  }

  toString() {
    return `{ x:${this.x}, y:${this.y}, z:${this.z} }`;
  }

  static fromPolar(magnitude, phi, theta) {
    return new Vector3(magnitude * Math.sin(theta) * Math.sin(phi), magnitude * Math.cos(theta), magnitude * Math.sin(theta) * Math.cos(phi));
  }

  static from(value) {
    if (value instanceof Vector3) return new Vector3(value.x, value.y, value.z);
    if (Array.isArray(value) && value.length === 3) return new Vector3(value[0], value[1], value[2]);
    if (value && typeof value === "object") return new Vector3(value.x, value.y, value.z);
    throw new TypeError("Expected a Vector3-compatible value");
  }
}

export const GameVector3 = Vector3;

const VECTOR_EPSILON = 1e-6;

function finite(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`Vector3 ${label} must be finite`);
  return value;
}
