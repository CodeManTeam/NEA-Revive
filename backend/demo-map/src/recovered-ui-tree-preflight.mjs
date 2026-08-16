const NODE_FIELDS = ["id", "name", "type", "parentId", "childrenIds", "value"];

export function preflightRecoveredUiTree(value) {
  if (!isRecord(value)) return result("evidence-blocked", 0, [diagnostic("invalid-ui-tree", "Recovered uiTree must be an object")]);
  const entries = Object.entries(value);
  if (entries.length === 0) return result("evidence-blocked", 0, [diagnostic("empty-ui-tree", "Recovered uiTree contains no nodes")]);
  const diagnostics = [];
  for (const [key, node] of entries) {
    if (!isRecord(node) || typeof node.id !== "string" || typeof node.name !== "string" || !Number.isSafeInteger(node.type) || typeof node.parentId !== "string" || !Array.isArray(node.childrenIds) || !node.childrenIds.every(childId => typeof childId === "string") || !isRecord(node.value)) {
      diagnostics.push(diagnostic("invalid-ui-node-shape", `Recovered UI node ${key} does not match the observed tree container shape`));
    }
  }
  if (diagnostics.length > 0) return result("evidence-blocked", entries.length, diagnostics);
  return result("partial", entries.length, [diagnostic("ui-value-encoding-unverified", "UI tree container shape is observed, but UI value semantics are not mapped")]);
}

function result(status, nodeCount, diagnostics) {
  return Object.freeze({ format: "nea-recovered-ui-tree-preflight", version: 1, status, nodeCount, observedNodeFields: Object.freeze([...NODE_FIELDS]), conversion: "not-attempted", diagnostics: Object.freeze(diagnostics) });
}

function diagnostic(code, message) {
  return Object.freeze({ field: "uiTree", code, message });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
