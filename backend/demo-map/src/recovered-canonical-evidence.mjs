const EXECUTABLE_COMPATIBILITY = new Set(["native", "compatible", "emulated"]);
const HISTORICAL_PROVIDER_EVIDENCE = new Set(["player-bundle", "origin-source", "declaration", "protocol-schema"]);

export function isEvidenceBackedRecoveredCanonical(binding) {
  if (binding?.availability !== "confirmed" || !EXECUTABLE_COMPATIBILITY.has(binding.compatibility)) return false;
  const directEvidence = (binding.evidence ?? []).filter(item => item?.confidence === "direct");
  const historicalProvider = directEvidence.some(item => HISTORICAL_PROVIDER_EVIDENCE.has(item.type));
  const localImplementation = directEvidence.some(item => item.type === "local-source");
  const conformance = directEvidence.some(item => item.type === "test");
  return historicalProvider || (localImplementation && conformance);
}
