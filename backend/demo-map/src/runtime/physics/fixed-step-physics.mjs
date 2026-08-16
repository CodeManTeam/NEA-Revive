const DEFAULT_GRAVITY = -20;
const DEFAULT_MAX_FALL_SPEED = 50;
const BOUNCE_THRESHOLD = 0.5;

export class FixedStepPlayerPhysics {
  constructor(world, options = {}) {
    this.world = world;
    this.gravity = finiteOption(options.gravity, DEFAULT_GRAVITY);
    this.maxFallSpeed = Math.abs(finiteOption(options.maxFallSpeed, DEFAULT_MAX_FALL_SPEED));
    this.stepHeight = Math.max(0, finiteOption(options.stepHeight, 1.25));
    this.daoWorldPhysics = null;
  }

  setDaoWorldPhysics(gravity, velocityDamping, tickRate) {
    const normalizedTickRate = Number(tickRate);
    if (!Number.isFinite(normalizedTickRate) || normalizedTickRate <= 0) throw new RangeError("tickRate must be positive and finite");
    this.daoWorldPhysics = Object.freeze({
      gravity: Number(gravity) || 0,
      velocityDamping: Number(velocityDamping) > 1e-6 ? Number(velocityDamping) : 0,
      tickRate: normalizedTickRate,
    });
  }

  step(body, deltaTime) {
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) throw new RangeError("deltaTime must be positive and finite");
    sanitize(body);
    const wasGrounded = body.grounded;
    if (this.daoWorldPhysics) applyDaoWorldPhysics(body, deltaTime, this.daoWorldPhysics, this.maxFallSpeed);
    else body.velocity.y = Math.max(-this.maxFallSpeed, body.velocity.y + this.gravity * deltaTime);
    body.grounded = false;
    const collisions = [];

    moveAxis(this.world, body, "y", body.velocity.y * deltaTime, deltaTime, collisions);
    for (const axis of ["x", "z"]) {
      const movement = body.velocity[axis] * deltaTime;
      const result = this.world.sweep(body, axis, movement);
      if (result.collisions.length > 0 && (body.grounded || wasGrounded) && this.stepHeight > 0) {
        if (tryStep(this.world, body, axis, movement, this.stepHeight, deltaTime, collisions)) continue;
      }
      applySweep(body, axis, movement, result, deltaTime, collisions);
    }

    const groundContacts = collisions.filter(contact => contact.normal.y === 1);
    if (groundContacts.length > 0 && body.grounded) applyGroundFriction(body, groundContacts, deltaTime);

    const nextContacts = new Map(collisions.map(contact => [contactKey(contact), contact]));
    const entered = [...nextContacts].filter(([key]) => !body.contacts.has(key)).map(([, contact]) => contact);
    const separated = [...body.contacts].filter(([key]) => !nextContacts.has(key)).map(([, contact]) => contact);
    body.contacts = nextContacts;

    const nextTriggers = new Map(this.world.queryTriggers(body).map(trigger => [trigger.id, trigger]));
    const triggerEntered = [...nextTriggers].filter(([key]) => !body.triggers.has(key)).map(([, trigger]) => trigger);
    const triggerLeft = [...body.triggers].filter(([key]) => !nextTriggers.has(key)).map(([, trigger]) => trigger);
    body.triggers = nextTriggers;
    const fluids = fluidState(this.world, body);
    return Object.freeze({
      collisions: Object.freeze(collisions),
      entered: Object.freeze(entered),
      separated: Object.freeze(separated),
      triggerEntered: Object.freeze(triggerEntered),
      triggerLeft: Object.freeze(triggerLeft),
      ...fluids,
    });
  }

  observe(body) {
    sanitize(body);
    body.grounded = this.world.sweep(body, "y", -0.05).collisions.some(contact => contact.normal.y === 1);
    const nextTriggers = new Map(this.world.queryTriggers(body).map(trigger => [trigger.id, trigger]));
    const triggerEntered = [...nextTriggers].filter(([key]) => !body.triggers.has(key)).map(([, trigger]) => trigger);
    const triggerLeft = [...body.triggers].filter(([key]) => !nextTriggers.has(key)).map(([, trigger]) => trigger);
    body.triggers = nextTriggers;
    const fluids = fluidState(this.world, body);
    return Object.freeze({
      collisions: Object.freeze([]),
      entered: Object.freeze([]),
      separated: Object.freeze([]),
      triggerEntered: Object.freeze(triggerEntered),
      triggerLeft: Object.freeze(triggerLeft),
      ...fluids,
    });
  }
}

function applyDaoWorldPhysics(body, deltaTime, physics, maxFallSpeed) {
  const deltaTicks = deltaTime * physics.tickRate;
  const velocityScale = physics.velocityDamping > 0 ? Math.exp(-physics.velocityDamping * deltaTicks) : 1;
  const accelerationFactor = physics.velocityDamping > 0
    ? (1 - velocityScale) / physics.velocityDamping
    : deltaTicks;
  body.velocity.x *= velocityScale;
  body.velocity.y = Math.max(
    -maxFallSpeed,
    velocityScale * body.velocity.y + physics.tickRate * accelerationFactor * physics.gravity,
  );
  body.velocity.z *= velocityScale;
}

function fluidState(world, body) {
  const nextFluids = new Map(world.queryFluidContacts(body).map(contact => [contact.id, contact]));
  const fluidEntered = [...nextFluids].filter(([key]) => !body.fluids.has(key)).map(([, contact]) => contact);
  const fluidLeft = [...body.fluids].filter(([key]) => !nextFluids.has(key)).map(([, contact]) => contact);
  body.fluids = nextFluids;
  return Object.freeze({
    fluids: Object.freeze([...nextFluids.values()]),
    fluidEntered: Object.freeze(fluidEntered),
    fluidLeft: Object.freeze(fluidLeft),
  });
}

function moveAxis(world, body, axis, movement, deltaTime, collisions) {
  const result = world.sweep(body, axis, movement);
  applySweep(body, axis, movement, result, deltaTime, collisions);
}

function applySweep(body, axis, movement, result, deltaTime, collisions) {
  body.position[axis] += result.amount;
  if (result.collisions.length === 0) return;
  const incoming = body.velocity[axis];
  const restitution = Math.max(...result.collisions.map(contact => contact.collider.material.restitution));
  if (axis === "y" && movement < 0) body.grounded = true;
  body.velocity[axis] = Math.abs(incoming) * restitution >= BOUNCE_THRESHOLD ? -incoming * restitution : 0;
  const force = (body.velocity[axis] - incoming) * body.mass / deltaTime / result.collisions.length;
  collisions.push(...result.collisions.map(contact => withForce(contact, axis, force)));
}

function tryStep(world, body, axis, movement, stepHeight, deltaTime, collisions) {
  const original = { x: body.position.x, y: body.position.y, z: body.position.z };
  const rise = world.sweep(body, "y", stepHeight);
  if (Math.abs(rise.amount - stepHeight) > 1e-7 || rise.collisions.length > 0) return false;
  body.position.y += rise.amount;
  const across = world.sweep(body, axis, movement);
  if (Math.abs(across.amount) <= 1e-7) {
    body.position.set(original.x, original.y, original.z);
    return false;
  }
  body.position[axis] += across.amount;
  const down = world.sweep(body, "y", -stepHeight);
  body.position.y += down.amount;
  if (down.collisions.length > 0) {
    body.grounded = true;
    collisions.push(...down.collisions.map(contact => withForce(contact, "y", 0)));
  }
  if (across.collisions.length > 0) {
    const incoming = body.velocity[axis];
    body.velocity[axis] = 0;
    const force = -incoming * body.mass / deltaTime / across.collisions.length;
    collisions.push(...across.collisions.map(contact => withForce(contact, axis, force)));
  }
  return true;
}

function applyGroundFriction(body, contacts, deltaTime) {
  const friction = Math.max(...contacts.map(contact => contact.collider.material.friction));
  const beforeX = body.velocity.x;
  const beforeZ = body.velocity.z;
  const multiplier = Math.exp(-Math.max(0, friction) * deltaTime);
  body.velocity.x *= multiplier;
  body.velocity.z *= multiplier;
  const forceX = (body.velocity.x - beforeX) * body.mass / deltaTime / contacts.length;
  const forceZ = (body.velocity.z - beforeZ) * body.mass / deltaTime / contacts.length;
  for (const contact of contacts) {
    contact.force.x += forceX;
    contact.force.z += forceZ;
  }
}

function withForce(contact, axis, component) {
  const force = { x: 0, y: 0, z: 0 };
  force[axis] = component;
  return { ...contact, force };
}

function sanitize(body) {
  for (const vector of [body.position, body.velocity]) {
    for (const axis of ["x", "y", "z"]) {
      if (!Number.isFinite(vector[axis])) vector[axis] = 0;
    }
  }
}

function contactKey(contact) {
  const { collider, normal } = contact;
  return `${collider.kind}:${collider.id}:${normal.x},${normal.y},${normal.z}`;
}

function finiteOption(value, fallback) {
  return value === undefined ? fallback : Number.isFinite(value) ? value : fallback;
}
