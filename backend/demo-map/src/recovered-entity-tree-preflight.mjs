const NODE_FIELDS = ["id", "name", "type", "parentId", "childrenIds", "value"];

export function preflightRecoveredEntitiesTree(value) {
  if (!isRecord(value)) return result("evidence-blocked", 0, [diagnostic("invalid-entity-tree", "Recovered entitiesTree must be an object")]);
  const entries = Object.entries(value);
  if (entries.length === 0) return result("evidence-blocked", 0, [diagnostic("empty-entity-tree", "Recovered entitiesTree contains no nodes")]);
  const diagnostics = [];
  for (const [key, node] of entries) {
    if (!isRecord(node)) {
      diagnostics.push(diagnostic("invalid-entity-node", "Recovered entity tree nodes must be objects"));
      continue;
    }
    if (typeof node.id !== "string" || typeof node.name !== "string" || !Number.isSafeInteger(node.type) || typeof node.parentId !== "string" || !Array.isArray(node.childrenIds) || !node.childrenIds.every(childId => typeof childId === "string") || !isRecord(node.value)) {
      diagnostics.push(diagnostic("invalid-entity-node-shape", `Recovered entity node ${key} does not match the observed tree container shape`));
    }
  }
  if (diagnostics.length > 0) return result("evidence-blocked", entries.length, diagnostics);
  return result("partial", entries.length, [diagnostic("entity-value-encoding-unverified", "Entity tree container shape is observed, but entity value semantics are not mapped")]);
}

function result(status, nodeCount, diagnostics) {
  return Object.freeze({
    format: "nea-recovered-entity-tree-preflight",
    version: 1,
    status,
    nodeCount,
    observedNodeFields: Object.freeze([...NODE_FIELDS]),
    conversion: "not-attempted",
    diagnostics: Object.freeze(diagnostics),
  });
}

function diagnostic(code, message) {
  return Object.freeze({ field: "entitiesTree", code, message });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
