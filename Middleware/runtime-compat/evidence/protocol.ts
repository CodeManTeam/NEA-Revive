import protocolsJson from "../../origin/server-protocols.json" with { type: "json" };

export const protocols = protocolsJson.map((protocol) => ({
  name: protocol.name,
  client: protocol.client ?? {},
  server: protocol.server ?? {},
}));
