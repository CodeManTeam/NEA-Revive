import assert from "node:assert/strict";
import test from "node:test";

import { validateRuntimePackage } from "../src/runtime-package.mjs";
import { verifyRuntimePackageIdentity } from "../src/runtime-package-identity.mjs";

const validPackage = Object.freeze({
  packageId: "captured-123",
  contentId: "123",
  projectRoot: "C:/runtime/project",
  archiveRoot: "C:/runtime/archive",
  worldManifest: "world-captured-123.json",
  clientManifest: "project/captured-123/client-scripts/manifest.json",
  clientUiManifest: "project/captured-123/client-ui/manifest.json",
  clientRuntimeManifest: "project/captured-123/client-runtime/manifest.json",
  projectBootstrapManifest: "project/captured-123/bootstrap/manifest.json",
  playerProjectionDescriptor: "compat/player-entity-projection.json",
  route: "/play/captured-123",
});

test("runtime package accepts package-relative generic manifests", () => {
  assert.equal(validateRuntimePackage(validPackage).clientRuntimeManifest, validPackage.clientRuntimeManifest);
});

test("runtime package requires dynamic Player runtime and bootstrap manifests", () => {
  assert.throws(() => validateRuntimePackage({ ...validPackage, clientRuntimeManifest: undefined }), /clientRuntimeManifest/);
  assert.throws(() => validateRuntimePackage({ ...validPackage, projectBootstrapManifest: undefined }), /projectBootstrapManifest/);
});

test("runtime package rejects identity drift and archive path traversal", () => {
  assert.throws(() => validateRuntimePackage({ ...validPackage, route: "/play/another-project" }), /route must match packageId/);
  assert.throws(() => validateRuntimePackage({ ...validPackage, worldManifest: "../world.json" }), /worldManifest/);
  assert.throws(() => validateRuntimePackage({ ...validPackage, clientManifest: "project\\captured-123\\manifest.json" }), /clientManifest/);
});

const validProjectManifest = Object.freeze({ packageId: "captured-123" });
const validClientRuntimeManifest = Object.freeze({ gameName: "captured-123", pagePath: "/p/captured-123", contentId: "123" });

test("runtime package identity binds project and client runtime manifests", () => {
  assert.deepEqual(verifyRuntimePackageIdentity({
    runtimePackage: validPackage,
    projectManifest: validProjectManifest,
    clientRuntimeManifest: validClientRuntimeManifest,
  }), { packageId: "captured-123", contentId: "123" });
  assert.throws(() => verifyRuntimePackageIdentity({ runtimePackage: validPackage, projectManifest: { packageId: "other-project" }, clientRuntimeManifest: validClientRuntimeManifest }), /project manifest/);
  assert.throws(() => verifyRuntimePackageIdentity({ runtimePackage: validPackage, projectManifest: validProjectManifest, clientRuntimeManifest: { ...validClientRuntimeManifest, gameName: "other-project" } }), /gameName/);
  assert.throws(() => verifyRuntimePackageIdentity({ runtimePackage: validPackage, projectManifest: validProjectManifest, clientRuntimeManifest: { ...validClientRuntimeManifest, pagePath: "/p/other-project" } }), /pagePath/);
  assert.throws(() => verifyRuntimePackageIdentity({ runtimePackage: validPackage, projectManifest: validProjectManifest, clientRuntimeManifest: { ...validClientRuntimeManifest, contentId: "999" } }), /contentId/);
});
