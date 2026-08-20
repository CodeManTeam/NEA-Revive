export function isSafeLogicalAssetName(name) {
  if (typeof name !== "string" || name.length === 0 || name.startsWith("/") || name.includes("\\")) return false;
  return name.split("/").every(segment => segment.length > 0 && segment !== "." && segment !== "..");
}

export function buildProjectAssetResolver(assets) {
  const exact = new Map();
  for (const asset of assets) {
    const name = typeof asset === "string" ? asset : asset?.name;
    if (!isSafeLogicalAssetName(name)) continue;
    const previous = exact.get(name);
    exact.set(name, previous === undefined ? asset : null);
  }

  const aliases = new Map();
  for (const [name, asset] of exact) {
    if (asset === null) continue;
    const slash = name.lastIndexOf("/");
    if (slash <= 0) continue;
    const category = name.slice(0, slash);
    const leaf = name.slice(slash + 1);
    const categoryLeaf = category.slice(category.lastIndexOf("/") + 1);
    const prefix = `${categoryLeaf}_`;
    if (!leaf.startsWith(prefix) || leaf.length === prefix.length) continue;
    const alias = `${category}/${leaf.slice(prefix.length)}`;
    const previous = aliases.get(alias);
    aliases.set(alias, previous === undefined ? asset : null);
  }

  return Object.freeze({
    resolve(name) {
      if (!isSafeLogicalAssetName(name)) return undefined;
      if (exact.has(name)) {
        const asset = exact.get(name);
        return asset === null ? undefined : Object.freeze({ asset, match: "exact" });
      }
      const asset = aliases.get(name);
      return asset == null ? undefined : Object.freeze({ asset, match: "category-prefix-alias" });
    },
    get(name) {
      return this.resolve(name)?.asset;
    },
  });
}
