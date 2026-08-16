const DEFAULT_TIMEOUT_MS = 2_000;

export async function syncAuthoritativePlayerStates(options) {
  validateOptions(options);
  await Promise.all([...options.sessionPlayers].map(([session, playerId]) => syncPlayerState(session, playerId, options)));
}

async function syncPlayerState(session, playerId, options) {
  const cancellation = createStateCancellation(options.signal, options.timeoutMS);
  try {
    const state = await options.readState({ session, signal: cancellation.signal });
    options.applyState(playerId, state);
  } catch (error) {
    if (!options.signal?.aborted && !options.isMissingSessionError(error)) {
      reportWarning(options, session, error);
    }
  } finally {
    cancellation.dispose();
  }
}

function validateOptions(options) {
  if (!options || typeof options !== "object") throw new TypeError("State sync options are required");
  if (!(options.sessionPlayers instanceof Map)) throw new TypeError("State sync requires session players");
  if (typeof options.readState !== "function") throw new TypeError("State sync requires a state reader");
  if (typeof options.applyState !== "function") throw new TypeError("State sync requires a state applier");
  if (!options.logger || typeof options.logger.warn !== "function") throw new TypeError("State sync requires a logger");
  if (options.warningLogger !== undefined && typeof options.warningLogger?.warn !== "function") throw new TypeError("State sync warningLogger must provide warn");
  if (typeof options.isMissingSessionError !== "function") throw new TypeError("State sync requires an error classifier");
  if (!Number.isInteger(options.timeoutMS) || options.timeoutMS < 1) throw new TypeError("State sync timeout must be a positive integer");
  if (options.signal !== undefined && (!options.signal || typeof options.signal.addEventListener !== "function")) throw new TypeError("State sync signal must be an AbortSignal");
}

function reportWarning(options, session, error) {
  if (options.warningLogger) {
    options.warningLogger.warn(session, error);
    return;
  }
  options.logger.warn(`[demo] state sync failed for ${session}: ${formatError(error)}`);
}

function createStateCancellation(parentSignal, timeoutMS) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(parentSignal.reason);
  if (parentSignal?.aborted) onAbort();
  else parentSignal?.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMS);
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      parentSignal?.removeEventListener("abort", onAbort);
    },
  };
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

export const DEFAULT_AUTHORITATIVE_STATE_SYNC_TIMEOUT_MS = DEFAULT_TIMEOUT_MS;
