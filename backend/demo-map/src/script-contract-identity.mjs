export function verifyClientScriptContractIdentity({ projectManifest, capabilityManifest, clientScriptManifest }) {
  const projectContract = projectManifest?.engine?.clientContract;
  const projectApiVersion = projectManifest?.engine?.runtimeApiVersion;
  const capabilityContract = capabilityManifest?.contracts?.client;
  const capabilityApiVersion = capabilityManifest?.apiVersion;
  const clientContract = clientScriptManifest?.contract;
  if (!clientContract || typeof clientContract !== "object" || Array.isArray(clientContract)) {
    throw new Error("Client script manifest contract is missing or invalid");
  }
  if (clientContract.side !== "client") throw new Error("Client script manifest contract must bind the client side");
  if (clientContract.id !== projectContract || clientContract.id !== capabilityContract) {
    throw new Error("Client script manifest contract does not match project capability contracts");
  }
  if (clientContract.apiVersion !== projectApiVersion || clientContract.apiVersion !== capabilityApiVersion) {
    throw new Error("Client script manifest contract API version does not match project capability manifests");
  }
  return Object.freeze({ id: clientContract.id, apiVersion: clientContract.apiVersion });
}

export function verifyServerScriptContractIdentity({ projectManifest, capabilityManifest, serverScriptManifest }) {
  const projectContract = projectManifest?.engine?.serverContract;
  const projectApiVersion = projectManifest?.engine?.runtimeApiVersion;
  const capabilityContract = capabilityManifest?.contracts?.server;
  const capabilityApiVersion = capabilityManifest?.apiVersion;
  const serverContract = serverScriptManifest?.contract;
  if (!serverContract || typeof serverContract !== "object" || Array.isArray(serverContract)) {
    throw new Error("Server script manifest contract is missing or invalid");
  }
  if (serverContract.side !== "server") throw new Error("Server script manifest contract must bind the server side");
  if (serverContract.id !== projectContract || serverContract.id !== capabilityContract) {
    throw new Error("Server script manifest contract does not match project capability contracts");
  }
  if (serverContract.apiVersion !== projectApiVersion || serverContract.apiVersion !== capabilityApiVersion) {
    throw new Error("Server script manifest contract API version does not match project capability manifests");
  }
  return Object.freeze({ id: serverContract.id, apiVersion: serverContract.apiVersion });
}
