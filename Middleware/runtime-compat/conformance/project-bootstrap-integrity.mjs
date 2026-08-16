export const projectBootstrapIntegrityContract = Object.freeze({
  primaryCheck: "The raw bootstrap byte length and SHA-256 must match the tracked manifest.",
  compatibilityCheck: "When raw verification fails, only CRLF-to-LF normalization may be retried, and the normalized byte length and SHA-256 must match the same manifest.",
  rejectedChanges: Object.freeze(["JSON value changes", "key changes", "whitespace changes other than CRLF line endings", "manifest hash edits"]),
  evidence: Object.freeze([
    "local-player/archive/project/bedwars/bootstrap/manifest.json",
    "local-player/backend/box3-server.cjs",
    "local-player/tools/backend-compat.patch",
  ]),
});
