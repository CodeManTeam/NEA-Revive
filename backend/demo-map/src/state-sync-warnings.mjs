export const DEFAULT_STATE_SYNC_WARNING_INTERVAL_MS = 5_000;

export function createStateSyncWarningLogger(options) {
  validateOptions(options);
  const lastWarnings = new Map();

  return Object.freeze({
    warn(session, error) {
      const message = formatError(error);
      const key = `${session}\n${message}`;
      const now = options.now();
      const lastWarningAt = lastWarnings.get(key);

      if (lastWarningAt !== undefined && now - lastWarningAt < options.intervalMS) {
        return false;
      }

      lastWarnings.set(key, now);
      options.logger.warn(`[demo] state sync failed for ${session}: ${message}`);
      return true;
    },
  });
}

function validateOptions(options) {
  if (!options || typeof options !== "object") {
    throw new Error("State sync warning logger options are required");
  }
  if (!options.logger || typeof options.logger.warn !== "function") {
    throw new Error("State sync warning logger requires logger.warn");
  }
  if (typeof options.now !== "function") {
    throw new Error("State sync warning logger requires now");
  }
  if (!Number.isInteger(options.intervalMS) || options.intervalMS < 1) {
    throw new Error("State sync warning interval must be a positive integer");
  }
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
