import { TextDecoder } from "node:util";

const ALLOWED_PROTOCOLS = Object.freeze(new Set(["http:", "https:"]));
const ALLOWED_METHODS = Object.freeze(new Set(["OPTIONS", "GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"]));
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const CLOSED_MESSAGE = "The GameHttpFetchResponse is closed";

export class GameHttpFetchResponse {
  #status;
  #statusText;
  #headers;
  #body;
  #closed = false;

  constructor(status, statusText, headers, body) {
    this.#status = Number(status);
    this.#statusText = String(statusText);
    this.#headers = headers;
    this.#body = body;
  }

  get ok() {
    return 200 <= this.#status && this.#status < 300;
  }

  get status() {
    return this.#status;
  }

  get statusText() {
    return this.#statusText;
  }

  get headers() {
    return this.#headers;
  }

  #consume() {
    if (this.#closed) throw new Error(CLOSED_MESSAGE);
    const body = this.#body;
    this.#body = null;
    return body;
  }

  async json() {
    const body = this.#consume();
    if (body === null) return null;
    return JSON.parse(new TextDecoder().decode(body));
  }

  async text() {
    const body = this.#consume();
    if (body === null) return "";
    return new TextDecoder().decode(body);
  }

  async arrayBuffer() {
    const body = this.#consume();
    return body === null ? new ArrayBuffer(0) : body;
  }

  async close() {
    this.#closed = true;
    this.#body = null;
  }
}

export function createRuntimeHttpClient(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required");
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const allowedOrigins = normalizeAllowedOrigins(options.allowedOrigins);
  const logger = options.logger ?? console;

  return {
    fetch: (url, requestOptions) => fetchExternal(fetchImpl, {
      url,
      requestOptions,
      maxResponseBytes,
      defaultTimeoutMs,
      allowedOrigins,
      logger,
    }),
  };
}

async function fetchExternal(fetchImpl, { url, requestOptions, maxResponseBytes, defaultTimeoutMs, allowedOrigins, logger }) {
  const target = new URL(String(url));
  if (!ALLOWED_PROTOCOLS.has(target.protocol)) throw new Error(`Unsupported protocol: ${target.protocol}`);
  if (!allowedOrigins.has(target.origin)) throw new Error(`HTTP origin is not allowed: ${target.origin}`);
  const method = normalizeMethod(requestOptions?.method);
  const timeout = normalizeTimeout(requestOptions?.timeout, defaultTimeoutMs);
  const headers = normalizeRequestHeaders(requestOptions?.headers);
  const body = normalizeBody(requestOptions?.body);
  const signal = AbortSignal.timeout(timeout);
  const startedAt = Date.now();
  logger.info(`[http] ${method} ${target.origin} timeout=${timeout}ms`);
  let nativeResponse;
  try {
    nativeResponse = await fetchImpl(target, { method, headers, body, signal, redirect: "error" });
  } catch (error) {
    throw new Error(`HTTP request failed: ${error?.name === "TimeoutError" ? `timed out after ${timeout}ms` : error?.message ?? error}`);
  }
  try {
    const buffer = await nativeResponse.arrayBuffer();
    if (buffer.byteLength > maxResponseBytes) throw new Error(`Response body exceeds the ${maxResponseBytes}-byte limit`);
    const responseHeaders = collectHeaders(nativeResponse.headers);
    logger.info(`[http] ${method} ${target.origin} -> ${nativeResponse.status} (${buffer.byteLength} bytes, ${Date.now() - startedAt}ms)`);
    return new GameHttpFetchResponse(nativeResponse.status, nativeResponse.statusText, responseHeaders, buffer);
  } catch (error) {
    if (nativeResponse?.body?.cancel) {
      try { await nativeResponse.body.cancel(); } catch { /* ignore */ }
    }
    throw error;
  }
}

function normalizeAllowedOrigins(origins) {
  if (origins === undefined) return new Set();
  if (!Array.isArray(origins)) throw new Error("HTTP allowedOrigins must be an array");
  return new Set(origins.map(origin => {
    const target = new URL(String(origin));
    if (!ALLOWED_PROTOCOLS.has(target.protocol) || target.pathname !== "/" || target.search || target.hash) {
      throw new Error(`Invalid HTTP allowed origin: ${origin}`);
    }
    return target.origin;
  }));
}

function normalizeMethod(method) {
  if (method === undefined) return "GET";
  const normalized = String(method).toUpperCase();
  if (!ALLOWED_METHODS.has(normalized)) throw new Error(`Unsupported request method: ${method}`);
  return normalized;
}

function normalizeTimeout(timeout, fallback) {
  if (timeout === undefined) return fallback;
  const value = Number(timeout);
  if (!Number.isFinite(value) || value <= 0) throw new Error("HTTP timeout must be a positive number");
  return Math.min(value, MAX_TIMEOUT_MS);
}

function normalizeRequestHeaders(headers) {
  if (headers === undefined) return {};
  if (headers === null || typeof headers !== "object" || Array.isArray(headers)) throw new Error("HTTP headers must be a plain object");
  const normalized = {};
  for (const [name, value] of Object.entries(headers)) {
    if (typeof name !== "string" || name.length === 0) throw new Error("HTTP header names must be non-empty strings");
    if (Array.isArray(value)) {
      normalized[name] = value.map(item => String(item));
    } else {
      normalized[name] = String(value);
    }
  }
  return normalized;
}

function normalizeBody(body) {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return body;
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) return body;
  throw new Error("HTTP body must be a string or an ArrayBuffer");
}

function collectHeaders(headers) {
  const collected = {};
  for (const [name, value] of headers) {
    const key = name.toLowerCase();
    if (Object.hasOwn(collected, key)) {
      collected[key] = Array.isArray(collected[key]) ? [...collected[key], value] : [collected[key], value];
    } else {
      collected[key] = value;
    }
  }
  return collected;
}
