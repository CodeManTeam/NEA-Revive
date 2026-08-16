export const DEFAULT_CONTROL_REQUEST_TIMEOUT_MS = 2_000;

function makeControlUrl(port, path, query) {
  const url = new URL(`http://127.0.0.1:${port}${path}`);
  for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
  return url;
}

function createHeaders(token, hasBody) {
  return {
    authorization: `Bearer ${token}`,
    ...(hasBody ? { "content-type": "application/json" } : {}),
  };
}

async function requestControlBridge(options) {
  const hasBody = options.body !== undefined;
  const cancellation = createRequestCancellation(options.signal, options.timeoutMS);
  try {
    const response = await fetch(makeControlUrl(options.port, options.path, options.query), {
      method: options.method ?? "POST",
      headers: createHeaders(options.token, hasBody),
      ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
      signal: cancellation.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      throw new Error(result.error ?? `${options.errorMessage} with HTTP ${response.status}`);
    }
    return result;
  } finally {
    cancellation.dispose();
  }
}

function createRequestCancellation(parentSignal, timeoutMS) {
  if (timeoutMS === undefined) return { signal: parentSignal, dispose() {} };
  if (!Number.isInteger(timeoutMS) || timeoutMS < 1) throw new TypeError("Control request timeoutMS must be a positive integer");
  const controller = new AbortController();
  const onAbort = () => controller.abort(parentSignal.reason);
  if (parentSignal?.aborted) onAbort();
  else parentSignal?.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error(`Control request timed out after ${timeoutMS}ms`)), timeoutMS);
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      parentSignal?.removeEventListener("abort", onAbort);
    },
  };
}

export async function sendClientEventToBackend(options) {
  return requestControlBridge({ ...options, path: "/__nea/control/send-client-event", body: { session: options.session, event: options.event }, errorMessage: "Backend control bridge failed" });
}

export async function sendSoundCommandToBackend(options) {
  const result = await requestControlBridge({ ...options, path: "/__nea/control/sound-command", body: { command: options.command }, errorMessage: "Backend sound bridge failed" });
  return result.delivered;
}

export async function sendChatMessageToBackend(options) {
  return requestControlBridge({
    ...options,
    path: "/__nea/control/chat-message",
    body: { ...(options.session === undefined ? {} : { session: options.session }), message: options.message },
    errorMessage: "Backend chat bridge failed",
  });
}

export async function sendChatMessagesToBackend(options) {
  return requestControlBridge({ ...options, path: "/__nea/control/chat-message", body: { deliveries: options.deliveries }, errorMessage: "Backend chat bridge failed" });
}

export async function getPlayerStateFromBackend(options) {
  const result = await requestControlBridge({
    ...options,
    method: "GET",
    path: "/__nea/control/player-state",
    query: { session: options.session },
    errorMessage: "Backend state bridge failed",
  });
  return result.state;
}

export async function queuePlayerStateToBackend(options) {
  return requestControlBridge({ ...options, path: "/__nea/control/player-state", body: { session: options.session, state: options.state }, errorMessage: "Backend state bridge failed" });
}

export async function kickPlayerOnBackend(options) {
  const result = await requestControlBridge({ ...options, path: "/__nea/control/player-kick", body: { session: options.session }, errorMessage: "Backend player kick failed" });
  return result.kicked;
}

export async function linkPlayerOnBackend(options) {
  const result = await requestControlBridge({ ...options, path: "/__nea/control/player-link", body: { session: options.session, href: options.href, options: options.linkOptions }, errorMessage: "Backend player link failed" });
  return result.delivered;
}

export async function queueDamageStateToBackend(options) {
  return requestControlBridge({
    ...options,
    path: "/__nea/control/damage-state",
    body: {
      ...(options.session === undefined ? {} : { session: options.session }),
      ...(options.entityId === undefined ? {} : { entityId: options.entityId }),
      state: options.state,
      events: options.events,
    },
    errorMessage: "Backend damage bridge failed",
  });
}

export async function destroyEntityOnBackend(options) {
  return requestControlBridge({ ...options, path: "/__nea/control/entity-destroy", body: { entityId: options.entityId }, errorMessage: "Backend entity destroy bridge failed" });
}

export async function createEntityOnBackend(options) {
  return requestControlBridge({ ...options, path: "/__nea/control/entity-create", body: { entity: options.entity }, errorMessage: "Backend entity create bridge failed" });
}

export async function queueEntityStateToBackend(options) {
  return requestControlBridge({ ...options, path: "/__nea/control/entity-state", body: { entityId: options.entityId, state: options.state }, errorMessage: "Backend entity state bridge failed" });
}

export async function sendGuiCommandToBackend(options) {
  const result = await requestControlBridge({ ...options, path: "/__nea/control/gui-command", body: { session: options.session, command: options.command }, errorMessage: "Backend GUI bridge failed" });
  return result.result;
}

export async function openDialogOnBackend(options) {
  const result = await requestControlBridge({ ...options, path: "/__nea/control/dialog", body: { session: options.session, config: options.config }, errorMessage: "Backend dialog bridge failed" });
  return result.result;
}

export async function cancelDialogsOnBackend(options) {
  const result = await requestControlBridge({ ...options, path: "/__nea/control/dialog-cancel-all", body: { session: options.session }, errorMessage: "Backend dialog cancellation bridge failed" });
  return result.cancelled;
}
