export const DEFAULT_CONTROL_RETRY_ATTEMPTS = 50;
export const DEFAULT_CONTROL_RETRY_DELAY_MS = 100;

export async function retryControlRequest(options) {
  validateOptions(options);
  for (let attempt = 0; attempt < options.maxAttempts; attempt += 1) {
    throwIfAborted(options.signal);
    try {
      return await options.request();
    } catch (error) {
      if (!options.shouldRetry(error) || attempt === options.maxAttempts - 1) throw error;
      await waitForRetry(options.signal, options.delayMS);
    }
  }
}

function validateOptions(options) {
  if (!options || typeof options.request !== "function" || typeof options.shouldRetry !== "function") {
    throw new TypeError("Control retry requires request and shouldRetry functions");
  }
  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1) throw new RangeError("Control retry maxAttempts must be a positive integer");
  if (!Number.isFinite(options.delayMS) || options.delayMS < 0) throw new RangeError("Control retry delayMS must be non-negative and finite");
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError(signal);
}

function waitForRetry(signal, delayMS) {
  if (!signal) return new Promise(resolve => setTimeout(resolve, delayMS));
  if (signal.aborted) return Promise.reject(abortError(signal));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, delayMS);
    const onAbort = () => {
      cleanup();
      reject(abortError(signal));
    };
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function abortError(signal) {
  return signal.reason instanceof Error ? signal.reason : new Error("Control retry cancelled");
}
