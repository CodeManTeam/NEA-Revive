const WINDOWS_ABSOLUTE_PATH = /[A-Za-z]:[\\/](?:[^\\/\s\r\n'"]+[\\/])*[^\\/\s\r\n'"]*/g;

export function formatDiagnostic(error, sensitiveValues = []) {
  const message = error instanceof Error && error.stack ? error.stack : String(error);
  return redactDiagnostic(message, sensitiveValues);
}

export function redactDiagnostic(value, sensitiveValues = []) {
  let redacted = String(value);
  for (const sensitiveValue of sensitiveValues) {
    if (typeof sensitiveValue === "string" && sensitiveValue.length > 0) redacted = redacted.replaceAll(sensitiveValue, "<redacted>");
  }
  return redacted.replace(WINDOWS_ABSOLUTE_PATH, "<path>");
}
