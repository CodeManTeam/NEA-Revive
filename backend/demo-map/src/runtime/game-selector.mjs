export class ParsedGameSelector {
  constructor(selector) {
    this.selector = String(selector);
    this.matchAll = false;
    this.tags = [];
    this.names = [];
    this.components = [];
    for (const part of this.selector.split(",")) {
      const token = part.trim();
      if (token.length === 0) continue;
      if (token.startsWith("*")) {
        this.matchAll = true;
      } else if (token.startsWith("#")) {
        this.names.push(token.slice(1));
      } else if (token.startsWith(".")) {
        this.tags.push(token.slice(1));
      } else {
        if (token === "entity") this.matchAll = true;
        this.components.push(token);
      }
    }
    if (this.matchAll) {
      this.tags.length = 0;
      this.names.length = 0;
      this.components.length = 0;
    } else {
      this.tags.sort();
      this.names.sort();
      this.components.sort();
    }
  }

  test(entity) {
    if (!entity || entity.destroyed === true) return false;
    if (this.matchAll) return true;
    if (this.tags.some(tag => entity.hasTag?.(tag) === true)) return true;
    if (this.names.includes(entity.id)) return true;
    return this.components.some(component => component === "player" && entity.isPlayer === true);
  }

  normalize() {
    if (this.matchAll) return "*";
    return [
      ...this.tags.map(tag => `.${tag}`),
      ...this.names.map(name => `#${name}`),
      ...this.components,
    ].join(",");
  }
}

export function matchesGameSelector(entity, selector) {
  return new ParsedGameSelector(selector).test(entity);
}
