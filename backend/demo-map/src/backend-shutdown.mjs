export const DEFAULT_BACKEND_SHUTDOWN_TIMEOUT_MS = 5_000;

export async function stopBackendProcess(options) {
  validateOptions(options);
  if (hasExited(options.child)) return "exited";

  const exited = waitForExit(options.child);
  if (!sendSignal(options, "SIGTERM")) return "unavailable";
  if (await waitForExitOrTimeout(exited, options.timeoutMS)) return "graceful";

  options.logger.warn(`[demo] Player backend did not exit within ${options.timeoutMS}ms; forcing termination`);
  if (!sendSignal(options, "SIGKILL")) return "force-unavailable";
  await exited;
  return "forced";
}

function validateOptions(options) {
  if (!options || typeof options !== "object") throw new TypeError("Backend shutdown options are required");
  if (!options.child || typeof options.child.once !== "function" || typeof options.child.kill !== "function") throw new TypeError("Backend shutdown requires a child process");
  if (!options.logger || typeof options.logger.warn !== "function") throw new TypeError("Backend shutdown requires logger.warn");
  if (!Number.isInteger(options.timeoutMS) || options.timeoutMS < 1) throw new TypeError("Backend shutdown timeout must be a positive integer");
}

function hasExited(child) {
  return (child.exitCode !== undefined && child.exitCode !== null) || (child.signalCode !== undefined && child.signalCode !== null);
}

function waitForExit(child) {
  if (hasExited(child)) return Promise.resolve();
  return new Promise(resolve => child.once("exit", resolve));
}

function waitForExitOrTimeout(exited, timeoutMS) {
  return new Promise(resolve => {
    const timeout = setTimeout(() => resolve(false), timeoutMS);
    exited.then(() => {
      clearTimeout(timeout);
      resolve(true);
    });
  });
}

function sendSignal(options, signal) {
  try {
    if (options.child.kill(signal)) return true;
    options.logger.warn(`[demo] Player backend rejected ${signal} during shutdown`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options.logger.warn(`[demo] Player backend ${signal} failed during shutdown: ${message}`);
  }
  return false;
}
