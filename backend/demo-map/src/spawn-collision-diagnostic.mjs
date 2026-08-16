export function diagnoseSpawnCollision(collisionWorld, spawn, playerBodyProfile) {
  if (!collisionWorld || typeof collisionWorld.querySolidContacts !== "function") {
    throw new TypeError("Spawn collision diagnostic requires a collision world");
  }
  const position = vectorObject(spawn, "spawn");
  const shapeHalfExtents = vectorObject(playerBodyProfile?.shapeHalfExtents, "player shapeHalfExtents");
  const contacts = collisionWorld.querySolidContacts({ position, shapeHalfExtents });
  return Object.freeze({
    status: "partial",
    origin: playerBodyProfile?.origin ?? null,
    solidOverlap: contacts.length > 0,
    contactCount: contacts.length,
    contactIds: Object.freeze(contacts.map(contact => contact.id)),
  });
}

function vectorObject(value, field) {
  const parts = Array.isArray(value) ? value : [value?.x, value?.y, value?.z];
  if (parts.length !== 3 || !parts.every(Number.isFinite)) throw new TypeError(`Spawn collision diagnostic ${field} must be a finite vector`);
  return Object.freeze({ x: parts[0], y: parts[1], z: parts[2] });
}
