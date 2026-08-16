export function readPortEnv(environment, name, fallback) {
  const port = readPositiveIntegerEnv(environment, name, fallback);
  if (port > 65_535) throw new Error(`${name} must be a valid TCP port`);
  return port;
}

export function readPositiveIntegerEnv(environment, name, fallback) {
  const value = environment[name];
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new Error(`${name} must be a positive integer`);
  return number;
}

export function readUnsignedIdMapEnv(environment, name) {
  const value = environment[name];
  if (value === undefined) return {};
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`${name} must be valid JSON`, { cause: error });
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${name} must be a JSON object`);
  if (Object.entries(parsed).some(([key, id]) => key.length === 0 || !Number.isSafeInteger(id) || id < 1 || id > 0xffffffff)) {
    throw new Error(`${name} must map non-empty names to nonzero unsigned 32-bit ids`);
  }
  return parsed;
}

export function readOptionalNonEmptyStringEnv(environment, name) {
  const value = environment[name];
  if (value === undefined) return undefined;
  if (value.length === 0) throw new Error(`${name} must not be empty`);
  return value;
}

export function readBooleanFlagEnv(environment, name, fallback = false) {
  const value = environment[name];
  if (value === undefined) return fallback;
  if (value === "1") return true;
  if (value === "0") return false;
  throw new Error(`${name} must be 0 or 1`);
}
