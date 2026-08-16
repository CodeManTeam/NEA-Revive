export const clientUiOwnerInheritanceContract = Object.freeze({
  hierarchy: Object.freeze({
    UiRenderable: Object.freeze(["UiNode"]),
    UiBox: Object.freeze(["UiRenderable", "UiNode"]),
    UiScrollBox: Object.freeze(["UiRenderable", "UiNode"]),
    UiText: Object.freeze(["UiRenderable", "UiNode"]),
    UiInput: Object.freeze(["UiText", "UiRenderable", "UiNode"]),
    UiImage: Object.freeze(["UiRenderable", "UiNode"]),
  }),
  inheritedRenderableMembers: Object.freeze(["anchor", "position", "size"]),
  policy: "Capability analysis resolves members through locally declared UI inheritance and never treats an inherited native member as an unknown script surface.",
});
