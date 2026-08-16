import { GameQuaternion } from "./quaternion.mjs";
import { Vector3 } from "./vector3.mjs";

export function entityLookAtQuaternion(positionValue, targetValue, facingDirection = "Z", upValue = new Vector3(0, 1, 0), warn = message => console.warn(message)) {
  const position = Vector3.from(positionValue);
  const target = coerceVector3(targetValue, new Vector3(0, 0, 0));
  const up = coerceVector3(upValue, new Vector3(0, 1, 0));
  let facing = facingDirection;
  if (facing && !["X", "Y", "Z"].includes(facing)) {
    warn(`unexpected read '${JSON.stringify(facing)}', param "facingDirection" must be "X", "Y" or "Z"`);
    facing = "Z";
  }
  const normalizedUp = up.normalize();
  let currentZ = target.sub(position).normalize();
  if (currentZ.mag() === 0) currentZ = new Vector3(0, 0, 1);
  let currentX = normalizedUp.cross(currentZ);
  if (currentX.mag() === 0) {
    currentZ = Math.abs(up.z) === 1
      ? new Vector3(currentZ.x + 0.0001, currentZ.y, currentZ.z)
      : new Vector3(currentZ.x, currentZ.y, currentZ.z + 0.0001);
    currentZ = currentZ.normalize();
    currentX = normalizedUp.cross(currentZ);
  }
  const currentY = currentZ.cross(currentX);
  const matrix = facing === "X"
    ? [currentZ, currentY, currentX.scale(-1)]
    : facing === "Y"
      ? [currentX.scale(-1), currentZ, currentY]
      : [currentX, currentY, currentZ];
  const [x, y, z, w] = normalizeQuaternionArray(quaternionFromMat3(matrix));
  return new GameQuaternion(x, y, z, w);
}

export function rotateEntityLocal(positionValue, scaleValue, orientationValue, localPositionValue, axis, radians) {
  const position = Vector3.from(positionValue);
  const scale = Vector3.from(scaleValue);
  const orientation = orientationValue instanceof GameQuaternion ? orientationValue : new GameQuaternion(orientationValue.w, orientationValue.x, orientationValue.y, orientationValue.z);
  const localPosition = Vector3.from(localPositionValue);
  const angle = Number(radians);
  if (!Number.isFinite(angle)) throw new TypeError("rotateLocal radians must be finite");
  const before = applyHistoricalEntityTransform(localPosition, scale, orientation);
  let rotated;
  if (axis === "X") rotated = orientation.rotateX(angle);
  if (axis === "Y") rotated = orientation.rotateY(angle);
  if (axis === "Z") rotated = orientation.rotateZ(angle);
  if (!rotated) throw new TypeError("rotateLocal axis must be X, Y, or Z");
  const normalized = rotated.normalize();
  const after = applyHistoricalEntityTransform(localPosition, scale, normalized);
  return Object.freeze({ orientation: normalized, position: position.add(before).sub(after) });
}

export function scaleEntityLocal(positionValue, scaleValue, orientationValue, localPositionValue, nextScaleValue) {
  const position = Vector3.from(positionValue);
  const scale = Vector3.from(scaleValue);
  const orientation = orientationValue instanceof GameQuaternion ? orientationValue : new GameQuaternion(orientationValue.w, orientationValue.x, orientationValue.y, orientationValue.z);
  const localPosition = Vector3.from(localPositionValue);
  const nextScale = Vector3.from(nextScaleValue);
  const before = applyHistoricalEntityTransform(localPosition, scale, orientation);
  const after = applyHistoricalEntityTransform(localPosition, nextScale, orientation);
  return Object.freeze({ scale: nextScale, position: position.add(before).sub(after) });
}

export function applyHistoricalEntityTransform(localPositionValue, scaleValue, orientationValue) {
  const localPosition = Vector3.from(localPositionValue);
  const scale = Vector3.from(scaleValue);
  const orientation = orientationValue instanceof GameQuaternion ? orientationValue : new GameQuaternion(orientationValue.w, orientationValue.x, orientationValue.y, orientationValue.z);
  const qx = orientation.w;
  const qy = orientation.x;
  const qz = orientation.y;
  const qw = orientation.z;
  const x2 = qx + qx;
  const y2 = qy + qy;
  const z2 = qz + qz;
  const xx = qx * x2;
  const yx = qy * x2;
  const yy = qy * y2;
  const zx = qz * x2;
  const zy = qz * y2;
  const zz = qz * z2;
  const wx = qw * x2;
  const wy = qw * y2;
  const wz = qw * z2;
  const scaledX = scale.x * localPosition.x;
  const scaledY = scale.y * localPosition.y;
  const scaledZ = scale.z * localPosition.z;
  return new Vector3(
    scaledX * (1 - yy - zz) + scaledY * (yx - wz) + scaledZ * (zx + wy),
    scaledX * (yx + wz) + scaledY * (1 - xx - zz) + scaledZ * (zy - wx),
    scaledX * (zx - wy) + scaledY * (zy + wx) + scaledZ * (1 - xx - yy),
  );
}

function normalizeQuaternionArray(value) {
  const magnitude = Math.hypot(value[0], value[1], value[2], value[3]);
  if (magnitude === 0) return [0, 0, 0, 1];
  return value.map(component => component / magnitude);
}

function coerceVector3(value, fallback) {
  try {
    return Vector3.from(value);
  } catch {
    return fallback;
  }
}

function quaternionFromMat3(columns) {
  const m00 = columns[0].x;
  const m01 = columns[0].y;
  const m02 = columns[0].z;
  const m10 = columns[1].x;
  const m11 = columns[1].y;
  const m12 = columns[1].z;
  const m20 = columns[2].x;
  const m21 = columns[2].y;
  const m22 = columns[2].z;
  const trace = m00 + m11 + m22;
  if (trace > 0) {
    const root = Math.sqrt(trace + 1);
    const scale = 0.5 / root;
    return [ (m12 - m21) * scale, (m20 - m02) * scale, (m01 - m10) * scale, 0.5 * root ];
  }
  if (m00 > m11 && m00 > m22) {
    const root = Math.sqrt(1 + m00 - m11 - m22);
    const scale = 0.5 / root;
    return [0.5 * root, (m01 + m10) * scale, (m20 + m02) * scale, (m12 - m21) * scale];
  }
  if (m11 > m22) {
    const root = Math.sqrt(1 + m11 - m00 - m22);
    const scale = 0.5 / root;
    return [(m01 + m10) * scale, 0.5 * root, (m12 + m21) * scale, (m20 - m02) * scale];
  }
  const root = Math.sqrt(1 + m22 - m00 - m11);
  const scale = 0.5 / root;
  return [(m20 + m02) * scale, (m12 + m21) * scale, 0.5 * root, (m01 - m10) * scale];
}
