export const dataStorageContract = Object.freeze({
  returnValueFields: Object.freeze(["key", "value", "version", "createTime", "updateTime"]),
  listOptionsImplemented: Object.freeze(["cursor", "pageSize", "constraintTarget", "ascending", "min", "max"]),
  listOptionsUnresolved: Object.freeze(["mixed-type backend ordering"]),
  localScope: "project-file",
  localMutationAtomicity: "single-process-serialized",
  jsonValueTypes: Object.freeze(["string", "finite-number", "boolean", "dense-array", "plain-string-keyed-object"]),
  unresolved: Object.freeze([
    "DAO3 byte quotas and backend error codes",
    "ticket-based distributed update atomicity",
    "cross-process consistency and cloud durability",
    "authoritative group identity and shared scope",
  ]),
});
