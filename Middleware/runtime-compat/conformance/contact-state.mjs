const CUBE_AXES = Object.freeze([
  Object.freeze([1, 0, 0]),
  Object.freeze([-1, 0, 0]),
  Object.freeze([0, 1, 0]),
  Object.freeze([0, -1, 0]),
  Object.freeze([0, 0, 1]),
  Object.freeze([0, 0, -1]),
]);

export function unpackCubeAxis(axis) {
  if (!Number.isInteger(axis) || axis < 0 || axis >= CUBE_AXES.length) return Object.freeze([0, 0, 0]);
  return CUBE_AXES[axis];
}

export function reconstructActiveContacts(record, entityIndex = new Map()) {
  requireRecord(record);
  const entityContacts = (record.body ?? []).flatMap(contact => {
    const other = entityIndex.get(contact.otherId);
    if (!other) return [];
    return [Object.freeze({
      other,
      axis: vector(contact.nx, contact.ny, contact.nz),
      force: vector(contact.fx, contact.fy, contact.fz),
    })];
  });
  const voxelContacts = (record.voxel ?? []).map(contact => Object.freeze({
    x: finite(contact.x),
    y: finite(contact.y),
    z: finite(contact.z),
    voxel: finite(contact.b),
    axis: unpackCubeAxis(contact.axis),
    force: vector(contact.fx, contact.fy, contact.fz),
  }));
  const fluidVoxels = record.fluidVoxels ?? [];
  const fluidVolumeFraction = record.fluidVolumeFraction ?? [];
  const fluidContacts = fluidVoxels.slice(0, Math.min(fluidVoxels.length, fluidVolumeFraction.length)).map((voxel, index) => Object.freeze({
    voxel: finite(voxel),
    volume: finite(fluidVolumeFraction[index]),
  }));
  return Object.freeze({
    id: record.id,
    entityContacts: Object.freeze(entityContacts),
    voxelContacts: Object.freeze(voxelContacts),
    fluidContacts: Object.freeze(fluidContacts),
    contactForce: null,
    compatibility: Object.freeze({
      canonical: "partial",
      unresolved: Object.freeze(["contactForce aggregation"]),
    }),
  });
}

export function reconstructSolverContactForce(points, inverseDeltaTime) {
  const scale = finite(inverseDeltaTime);
  return Object.freeze(points.reduce((force, point) => {
    const normal = basis(point.normal, "normal");
    const tangent = basis(point.tangent, "tangent");
    const binormal = basis(point.binormal, "binormal");
    const normalImpulse = finite(point.normalImpulse);
    const tangentImpulse = finite(point.tangentImpulse);
    const binormalImpulse = finite(point.binormalImpulse);
    force[0] += (normal[0] * normalImpulse + tangent[0] * tangentImpulse + binormal[0] * binormalImpulse) * scale;
    force[1] += (normal[1] * normalImpulse + tangent[1] * tangentImpulse + binormal[1] * binormalImpulse) * scale;
    force[2] += (normal[2] * normalImpulse + tangent[2] * tangentImpulse + binormal[2] * binormalImpulse) * scale;
    return force;
  }, [0, 0, 0]));
}

export function projectBodyContactPair(firstId, secondId, normal, force) {
  const axis = basis(normal, "normal");
  const value = basis(force, "force");
  return Object.freeze([
    Object.freeze({ otherId: secondId, axis: vector(-axis[0], -axis[1], -axis[2]), force: vector(value[0], value[1], value[2]) }),
    Object.freeze({ otherId: firstId, axis: vector(axis[0], axis[1], axis[2]), force: vector(-value[0], -value[1], -value[2]) }),
  ]);
}

export function compactVoxelContactForces(contacts, cutoff = 0.001) {
  const threshold = finite(cutoff);
  const retained = [];
  for (let index = 0; index < contacts.length;) {
    const start = index++;
    const first = contacts[start];
    const coordinate = axisCoordinate(first);
    const sum = [finite(first.fx), finite(first.fy), finite(first.fz)];
    while (index < contacts.length && contacts[index].axis === first.axis && axisCoordinate(contacts[index]) === coordinate) {
      sum[0] += finite(contacts[index].fx);
      sum[1] += finite(contacts[index].fy);
      sum[2] += finite(contacts[index].fz);
      index += 1;
    }
    if (Math.abs(sum[0]) <= threshold && Math.abs(sum[1]) <= threshold && Math.abs(sum[2]) <= threshold) continue;
    const count = index - start;
    const average = sum.map(component => component / count);
    for (let cursor = start; cursor < index; cursor += 1) retained.push(Object.freeze({ ...contacts[cursor], fx: average[0], fy: average[1], fz: average[2] }));
  }
  return Object.freeze(retained);
}

function requireRecord(value) {
  if (!value || typeof value !== "object" || !Number.isInteger(value.id) || value.id < 0) {
    throw new TypeError("ContactRecord requires a non-negative integer id");
  }
}

function vector(x, y, z) {
  return Object.freeze([finite(x), finite(y), finite(z)]);
}

function basis(value, label) {
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`${label} must contain three components`);
  return value.map(finite);
}

function axisCoordinate(contact) {
  const axis = finite(contact.axis);
  if (axis === 1 || axis === -1) return finite(contact.x);
  if (axis === 2 || axis === -2) return finite(contact.y);
  return finite(contact.z);
}

function finite(value) {
  if (!Number.isFinite(value)) throw new TypeError("Contact components must be finite numbers");
  return Object.is(value, -0) ? 0 : value;
}
