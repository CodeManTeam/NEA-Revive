import { createHash } from "node:crypto";

const websocketGuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function encodeFrame(payload, opcode = 1) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const header = body.length < 126
    ? Buffer.from([0x80 | opcode, body.length])
    : body.length <= 0xffff
      ? Buffer.from([0x80 | opcode, 126, body.length >>> 8, body.length & 0xff])
      : (() => {
          const value = Buffer.alloc(10);
          value[0] = 0x80 | opcode;
          value[1] = 127;
          value.writeBigUInt64BE(BigInt(body.length), 2);
          return value;
        })();
  return Buffer.concat([header, body]);
}

class WebSocketPeer {
  constructor(socket, initialData = Buffer.alloc(0)) {
    this.socket = socket;
    this.buffer = initialData;
    this.closed = false;
    this.onMessage = () => {};
    this.onClose = () => {};
    socket.on("data", (data) => {
      this.buffer = Buffer.concat([this.buffer, data]);
      this.parse();
    });
    socket.on("close", () => this.finish());
    socket.on("error", () => this.finish());
    if (this.buffer.length) this.parse();
  }

  parse() {
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const opcode = first & 0x0f;
      const masked = Boolean(second & 0x80);
      let length = second & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) return;
        const wideLength = this.buffer.readBigUInt64BE(2);
        if (wideLength > BigInt(Number.MAX_SAFE_INTEGER)) return this.close();
        length = Number(wideLength);
        offset = 10;
      }
      const maskBytes = masked ? 4 : 0;
      if (this.buffer.length < offset + maskBytes + length) return;
      const mask = masked ? this.buffer.subarray(offset, offset + 4) : null;
      offset += maskBytes;
      const payload = Buffer.from(this.buffer.subarray(offset, offset + length));
      this.buffer = this.buffer.subarray(offset + length);
      if (mask) for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4];
      if (opcode === 8) return this.close();
      if (opcode === 9) {
        this.socket.write(encodeFrame(payload, 10));
        continue;
      }
      if (opcode === 1 || opcode === 2) this.onMessage(opcode === 1 ? payload.toString("utf8") : payload);
    }
  }

  send(payload) {
    if (!this.closed) this.socket.write(encodeFrame(payload, Buffer.isBuffer(payload) ? 2 : 1));
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try { this.socket.write(encodeFrame(Buffer.alloc(0), 8)); } catch {}
    this.socket.end();
    this.onClose();
  }

  finish() {
    if (this.closed) return;
    this.closed = true;
    this.onClose();
  }
}

export function attachWebSocketBoundary(server, state) {
  const sessionSockets = new Map();
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
    if (url.pathname !== "/__ws") return socket.destroy();
    const key = request.headers["sec-websocket-key"];
    if (!key || request.headers.upgrade?.toLowerCase() !== "websocket") return socket.destroy();
    const accept = createHash("sha1").update(`${key}${websocketGuid}`).digest("base64");
    socket.write([
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "\r\n",
    ].join("\r\n"));
    const sid = url.searchParams.get("sid") || "anonymous";
    const socketIndex = sessionSockets.get(sid) || 0;
    const reliable = socketIndex === 0;
    sessionSockets.set(sid, socketIndex + 1);
    const peer = new WebSocketPeer(socket, head);
    state.connections += 1;
    state.lastSession = sid;
    peer.send(JSON.stringify({ reliable }));
    peer.onMessage = (payload) => {
      state.frames += 1;
      state.lastFrame = Buffer.isBuffer(payload) ? `binary:${payload.length}` : payload.slice(0, 500);
      if (typeof payload === "string") peer.send(JSON.stringify({ type: "local-boundary-ack", sid, received: payload }));
    };
    peer.onClose = () => {
      state.connections = Math.max(0, state.connections - 1);
      const remaining = Math.max(0, (sessionSockets.get(sid) || 1) - 1);
      if (remaining) sessionSockets.set(sid, remaining);
      else sessionSockets.delete(sid);
    };
  });
}
