const fs = require("node:fs");

function patchGenericRemoteChannelBundle(path) {
  let source = fs.readFileSync(path, "utf8");
  if (source.includes("var RemoteChannelSessions = class {")) return false;
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = [
    "var RemoteChannelSessions = class {",
    "  sessions = /* @__PURE__ */ new Map();",
    "  get size() { return this.sessions.size; }",
    "  connect(client) {",
    "    requireSessionId3(client.sessionId);",
    "    const session = this.getOrCreate(client.sessionId);",
    "    session.client = client;",
    "  }",
    "  sendExternalEvent(sessionLabel, event) {",
    "    const session = [...this.sessions.values()].find((candidate) => {",
    "      if (candidate.sessionId === sessionLabel) return true;",
    "      if (candidate.sessionId.length <= 12) return candidate.sessionId === sessionLabel;",
    "      return candidate.sessionId.slice(0, 6) + \"...\" + candidate.sessionId.slice(-4) === sessionLabel;",
    "    });",
    "    if (!session?.client) return false;",
    "    const sender = session.client.message.sendClientEvent;",
    "    if (typeof sender !== \"function\") return false;",
    "    const args = JSON.stringify(event);",
    "    if (typeof args !== \"string\") return false;",
    "    sender({ tick: session.nextTick++, args });",
    "    return true;",
    "  }",
    "  handleServerEvent(client, value) {",
    "    const session = this.sessions.get(client.sessionId);",
    "    if (!session || session.client !== client) return false;",
    "    if (!value || !Number.isSafeInteger(value.tick) || value.tick < 0 || typeof value.args !== \"string\") return false;",
    "    try { JSON.parse(value.args); return true; } catch { return false; }",
    "  }",
    "  disconnect(client) {",
    "    const session = this.sessions.get(client.sessionId);",
    "    if (!session || session.client !== client) return false;",
    "    session.client = void 0;",
    "    return true;",
    "  }",
    "  delete(sessionId) { return this.sessions.delete(sessionId); }",
    "  dispose() { this.sessions.clear(); }",
    "  getOrCreate(sessionId) {",
    "    const existing = this.sessions.get(sessionId);",
    "    if (existing) return existing;",
    "    const session = { sessionId, nextTick: 1, client: void 0 };",
    "    this.sessions.set(sessionId, session);",
    "    return session;",
    "  }",
    "};",
    "",
  ];
  const replace = (pattern, replacement, label) => {
    const next = source.replace(pattern, replacement);
    if (next === source) throw new Error(`Unable to patch ${label}`);
    source = next;
  };
  replace("var BedwarsRemoteSessions = class {", lines.join(eol) + "var BedwarsRemoteSessions = class {", "generic remote class");
  replace(/(this\.playerProtocolSessions = new PlayerProtocolSessions\(\);\r?\n)/, `$1    this.remoteChannelSessions = new RemoteChannelSessions();${eol}`, "generic remote constructor");
  replace(/(      bedwarsRemoteSessions: this\.bedwarsRemoteSessions,\r?\n)/, `$1      remoteChannelSessions: this.remoteChannelSessions,${eol}`, "protocol context");
  replace(/(  playerProtocolSessions;\r?\n)/, `$1  remoteChannelSessions;${eol}`, "instance field");
  replace(/(this\.terrainSessions\.delete\(sessionId\);\r?\n)/, `$1    this.remoteChannelSessions.delete(sessionId);${eol}`, "session cleanup");
  replace("    this.bedwarsRemoteSessions?.dispose();", `    this.remoteChannelSessions.dispose();${eol}    this.bedwarsRemoteSessions?.dispose();`, "dispose");
  replace("      const handled = context.bedwarsRemoteSessions?.handleServerEvent(client, data) ?? false;", `      const relayed = context.remoteChannelSessions.handleServerEvent(client, data);${eol}      const legacyHandled = context.bedwarsRemoteSessions?.handleServerEvent(client, data) ?? false;${eol}      const handled = relayed || legacyHandled;`, "server event handler");
  source = source.replace('      if (process.env.BOX3_LOG_REMOTE_EVENTS === "1") {', '      if (relayed && process.env.BOX3_LOG_REMOTE_EVENTS === "1") {');
  replace("        if (schema === remoteChannel) context.bedwarsRemoteSessions?.connect(client);", `        if (schema === remoteChannel) {${eol}          context.remoteChannelSessions.connect(client);${eol}          context.bedwarsRemoteSessions?.connect(client);${eol}        }`, "remote connect");
  replace("        if (schema === remoteChannel) context.bedwarsRemoteSessions?.disconnect(client);", `        if (schema === remoteChannel) {${eol}          context.remoteChannelSessions.disconnect(client);${eol}          context.bedwarsRemoteSessions?.disconnect(client);${eol}        }`, "remote disconnect");
  replace("return this.historicalProjectInstance?.bedwarsRemoteSessions?.sendExternalEvent(sessionLabel, event) ?? false;", "return this.historicalProjectInstance?.remoteChannelSessions.sendExternalEvent(sessionLabel, event) ?? false;", "control ingress");
  fs.writeFileSync(path, source);
  return true;
}

module.exports = { patchGenericRemoteChannelBundle };
