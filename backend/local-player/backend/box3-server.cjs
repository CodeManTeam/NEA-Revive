var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/mudb/stream/codec.js
var require_codec = __commonJS({
  "node_modules/mudb/stream/codec.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function utf8ToBytes(str) {
      let codePoint;
      const strLength = str.length;
      let leadSurrogate;
      const bytes = [];
      for (let i = 0; i < strLength; ++i) {
        codePoint = str.charCodeAt(i);
        if (codePoint > 55295 && codePoint < 57344) {
          if (!leadSurrogate) {
            if (codePoint > 56319) {
              bytes.push(239, 191, 189);
              continue;
            } else if (i + 1 === strLength) {
              bytes.push(239, 191, 189);
              continue;
            }
            leadSurrogate = codePoint;
            continue;
          }
          if (codePoint < 56320) {
            bytes.push(239, 191, 189);
            leadSurrogate = codePoint;
            continue;
          }
          codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
        } else if (leadSurrogate) {
          bytes.push(239, 191, 189);
        }
        leadSurrogate = void 0;
        if (codePoint < 128) {
          bytes.push(codePoint);
        } else if (codePoint < 2048) {
          bytes.push(codePoint >> 6 | 192, codePoint & 63 | 128);
        } else if (codePoint < 65536) {
          bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
        } else if (codePoint < 1114112) {
          bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
        } else {
          throw new Error("mudb/stream: invalid code point");
        }
      }
      return bytes;
    }
    function encode(str) {
      return new Uint8Array(utf8ToBytes(str));
    }
    exports2.encode = encode;
    function decodeCodePointsArray(codePoints) {
      const MAX_ARGUMENTS_LENGTH = 4096;
      const len = codePoints.length;
      if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints);
      }
      let res = "";
      let i = 0;
      while (i < len) {
        res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
      }
      return res;
    }
    function decode(bytes) {
      const { byteLength } = bytes;
      const res = [];
      let i = 0;
      while (i < byteLength) {
        const firstByte = bytes[i];
        let codePoint;
        let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
        if (i + bytesPerSequence <= byteLength) {
          let secondByte;
          let thirdByte;
          let fourthByte;
          let tempCodePoint;
          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 128) {
                codePoint = firstByte;
              }
              break;
            case 2:
              secondByte = bytes[i + 1];
              if ((secondByte & 192) === 128) {
                tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                if (tempCodePoint > 127) {
                  codePoint = tempCodePoint;
                }
              }
              break;
            case 3:
              secondByte = bytes[i + 1];
              thirdByte = bytes[i + 2];
              if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                  codePoint = tempCodePoint;
                }
              }
              break;
            case 4:
              secondByte = bytes[i + 1];
              thirdByte = bytes[i + 2];
              fourthByte = bytes[i + 3];
              if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                  codePoint = tempCodePoint;
                }
              }
          }
        }
        if (codePoint == void 0) {
          codePoint = 65533;
          bytesPerSequence = 1;
        } else if (codePoint > 65535) {
          codePoint -= 65536;
          res.push(codePoint >>> 10 & 1023 | 55296);
          codePoint = 56320 | codePoint & 1023;
        }
        res.push(codePoint);
        i += bytesPerSequence;
      }
      return decodeCodePointsArray(res);
    }
    exports2.decode = decode;
  }
});

// node_modules/mudb/stream/index.js
var require_stream = __commonJS({
  "node_modules/mudb/stream/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var root = typeof self == "object" && self["Object"] == Object && self || typeof global == "object" && global["Object"] == Object && global;
    if (typeof root === "object" && "TextEncoder" in root) {
      const encoder = new TextEncoder();
      exports2.encodeUTF8 = (str) => encoder.encode(str);
      const decoder = new TextDecoder();
      exports2.decodeUTF8 = (bytes) => decoder.decode(bytes);
    } else {
      const codec = require_codec();
      exports2.encodeUTF8 = codec.encode;
      exports2.decodeUTF8 = codec.decode;
    }
    function ceilLog2(v_) {
      let v = v_ - 1;
      let r = v > 65535 ? 1 << 4 : 0;
      v >>>= r;
      let shift = v > 255 ? 1 << 3 : 0;
      v >>>= shift;
      r |= shift;
      shift = v > 15 ? 1 << 2 : 0;
      v >>>= shift;
      r |= shift;
      shift = v > 3 ? 1 << 1 : 0;
      v >>>= shift;
      r |= shift;
      return (r | v >> 1) + 1;
    }
    var MuBuffer = class {
      constructor(buffer) {
        this.buffer = buffer;
        this.dataView = new DataView(buffer);
        this.uint8 = new Uint8Array(buffer);
      }
    };
    exports2.MuBuffer = MuBuffer;
    var bufferPool = new Array(31);
    for (let i = 0; i < 31; ++i) {
      bufferPool[i] = [];
    }
    function allocBuffer(size) {
      if (size > 1073741824 || size < 0) {
        throw new RangeError(`size out of range: ${size}`);
      }
      size = Math.max(2, size | 0);
      const b = ceilLog2(size);
      return bufferPool[b].pop() || new MuBuffer(new ArrayBuffer(1 << b));
    }
    exports2.allocBuffer = allocBuffer;
    function freeBuffer(buffer) {
      if (buffer.uint8.length > 0) {
        bufferPool[ceilLog2(buffer.uint8.length)].push(buffer);
      }
    }
    exports2.freeBuffer = freeBuffer;
    var LITTLE_ENDIAN = true;
    var MuWriteStream3 = class {
      constructor(capacity) {
        this.buffer = allocBuffer(capacity);
        this.offset = 0;
      }
      bytes() {
        return this.buffer.uint8.subarray(0, this.offset);
      }
      destroy() {
        freeBuffer(this.buffer);
      }
      grow(bytes) {
        const newSize = this.offset + bytes;
        const uint8 = this.buffer.uint8;
        if (uint8.length < newSize) {
          const buffer = allocBuffer(newSize);
          buffer.uint8.set(uint8);
          freeBuffer(this.buffer);
          this.buffer = buffer;
        }
      }
      writeInt8(x) {
        this.buffer.dataView.setInt8(this.offset, x);
        this.offset += 1;
      }
      writeInt16(x) {
        this.buffer.dataView.setInt16(this.offset, x, LITTLE_ENDIAN);
        this.offset += 2;
      }
      writeInt32(x) {
        this.buffer.dataView.setInt32(this.offset, x, LITTLE_ENDIAN);
        this.offset += 4;
      }
      writeUint8(x) {
        this.buffer.dataView.setUint8(this.offset, x);
        this.offset += 1;
      }
      writeUint16(x) {
        this.buffer.dataView.setUint16(this.offset, x, LITTLE_ENDIAN);
        this.offset += 2;
      }
      writeUint32(x) {
        this.buffer.dataView.setUint32(this.offset, x, LITTLE_ENDIAN);
        this.offset += 4;
      }
      writeFloat32(x) {
        this.buffer.dataView.setFloat32(this.offset, x, LITTLE_ENDIAN);
        this.offset += 4;
      }
      writeFloat64(x) {
        this.buffer.dataView.setFloat64(this.offset, x, LITTLE_ENDIAN);
        this.offset += 8;
      }
      writeVarint(x) {
        const x_ = x >>> 0;
        const bytes = this.buffer.uint8;
        let offset = this.offset;
        if (x_ < 128) {
          bytes[offset++] = x_;
        } else if (x_ < 16384) {
          bytes[offset++] = x_ & 127 | 128;
          bytes[offset++] = x_ >>> 7;
        } else if (x_ < 2097152) {
          bytes[offset++] = x_ & 127 | 128;
          bytes[offset++] = x_ >> 7 & 127 | 128;
          bytes[offset++] = x_ >>> 14;
        } else if (x_ < 268435456) {
          bytes[offset++] = x_ & 127 | 128;
          bytes[offset++] = x_ >> 7 & 127 | 128;
          bytes[offset++] = x_ >> 14 & 127 | 128;
          bytes[offset++] = x_ >>> 21;
        } else {
          bytes[offset++] = x_ & 127 | 128;
          bytes[offset++] = x_ >> 7 & 127 | 128;
          bytes[offset++] = x_ >> 14 & 127 | 128;
          bytes[offset++] = x_ >> 21 & 127 | 128;
          bytes[offset++] = x_ >>> 28;
        }
        this.offset = offset;
      }
      writeASCII(str) {
        const bytes = this.buffer.uint8;
        let ptr = this.offset;
        for (let i = 0; i < str.length; ++i) {
          bytes[ptr++] = str.charCodeAt(i);
        }
        this.offset = ptr;
      }
      writeString(str) {
        const bytes = exports2.encodeUTF8(str);
        this.grow(5 + bytes.length);
        this.writeVarint(bytes.length);
        this.buffer.uint8.set(bytes, this.offset);
        this.offset += bytes.length;
      }
      writeUint8At(offset, x) {
        this.buffer.dataView.setUint8(offset, x);
      }
      writeUint32At(offset, x) {
        this.buffer.dataView.setUint32(offset, x, LITTLE_ENDIAN);
      }
    };
    exports2.MuWriteStream = MuWriteStream3;
    var MuReadStream3 = class {
      constructor(data) {
        this.buffer = new MuBuffer(data.buffer);
        this.offset = data.byteOffset;
        this.length = data.byteLength + data.byteOffset;
      }
      bytes() {
        return this.buffer.uint8.subarray(this.offset, this.length);
      }
      checkBounds() {
        if (this.offset > this.length) {
          throw new Error("out of bounds");
        }
      }
      readInt8() {
        const offset = this.offset;
        this.offset += 1;
        this.checkBounds();
        return this.buffer.dataView.getInt8(offset);
      }
      readInt16() {
        const offset = this.offset;
        this.offset += 2;
        this.checkBounds();
        return this.buffer.dataView.getInt16(offset, LITTLE_ENDIAN);
      }
      readInt32() {
        const offset = this.offset;
        this.offset += 4;
        this.checkBounds();
        return this.buffer.dataView.getInt32(offset, LITTLE_ENDIAN);
      }
      readUint8() {
        const offset = this.offset;
        this.offset += 1;
        this.checkBounds();
        return this.buffer.dataView.getUint8(offset);
      }
      readUint16() {
        const offset = this.offset;
        this.offset += 2;
        this.checkBounds();
        return this.buffer.dataView.getUint16(offset, LITTLE_ENDIAN);
      }
      readUint32() {
        const offset = this.offset;
        this.offset += 4;
        this.checkBounds();
        return this.buffer.dataView.getUint32(offset, LITTLE_ENDIAN);
      }
      readFloat32() {
        const offset = this.offset;
        this.offset += 4;
        this.checkBounds();
        return this.buffer.dataView.getFloat32(offset, LITTLE_ENDIAN);
      }
      readFloat64() {
        const offset = this.offset;
        this.offset += 8;
        this.checkBounds();
        return this.buffer.dataView.getFloat64(offset, LITTLE_ENDIAN);
      }
      readVarint() {
        const bytes = this.buffer.uint8;
        let offset = this.offset;
        const x0 = bytes[offset++];
        if (x0 < 128) {
          this.offset = offset;
          this.checkBounds();
          return x0;
        }
        const x1 = bytes[offset++];
        if (x1 < 128) {
          this.offset = offset;
          this.checkBounds();
          return x0 & 127 | x1 << 7;
        }
        const x2 = bytes[offset++];
        if (x2 < 128) {
          this.offset = offset;
          this.checkBounds();
          return x0 & 127 | (x1 & 127) << 7 | x2 << 14;
        }
        const x3 = bytes[offset++];
        if (x3 < 128) {
          this.offset = offset;
          this.checkBounds();
          return x0 & 127 | (x1 & 127) << 7 | (x2 & 127) << 14 | x3 << 21;
        }
        const x4 = bytes[offset++];
        this.offset = offset;
        this.checkBounds();
        return (x0 & 127) + ((x1 & 127) << 7) + ((x2 & 127) << 14) + ((x3 & 127) << 21) + x4 * (1 << 28);
      }
      readASCII(length) {
        const head = this.offset;
        this.offset += length;
        this.checkBounds();
        let str = "";
        for (let i = head; i < this.offset; ++i) {
          str += String.fromCharCode(this.buffer.uint8[i]);
        }
        return str;
      }
      readString() {
        const byteLength = this.readVarint();
        const head = this.offset;
        this.offset += byteLength;
        this.checkBounds();
        const bytes = this.buffer.uint8.subarray(head, this.offset);
        return exports2.decodeUTF8(bytes);
      }
      readUint8At(offset) {
        return this.buffer.dataView.getUint8(offset);
      }
    };
    exports2.MuReadStream = MuReadStream3;
  }
});

// node_modules/mudb/util/stringify.js
var require_stringify = __commonJS({
  "node_modules/mudb/util/stringify.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function stableStringify(base) {
      const result = [];
      const seen = [];
      function stringify(x_) {
        const x = x_ && x_.toJSON && typeof x_.toJSON === "function" ? x_.toJSON() : x_;
        if (x === void 0) {
          return false;
        }
        if (x === true) {
          result.push("true");
          return true;
        }
        if (x === false) {
          result.push("false");
          return true;
        }
        if (typeof x === "number") {
          result.push(isFinite(x) ? "" + x : "null");
          return true;
        }
        if (typeof x !== "object") {
          const res = JSON.stringify(x);
          if (typeof res === "undefined") {
            return false;
          }
          result.push(res);
          return true;
        }
        if (x === null) {
          result.push("null");
          return true;
        }
        if (seen.indexOf(x) >= 0) {
          throw new TypeError("Converting circular structure to JSON");
        }
        seen.push(x);
        if (Array.isArray(x)) {
          result.push("[");
          for (let i = 0; i < x.length; ++i) {
            if (!stringify(x[i])) {
              result.push("null");
            }
            if (i < x.length - 1) {
              result.push(",");
            }
          }
          result.push("]");
        } else {
          result.push("{");
          const keys = Object.keys(x).sort();
          let needsComma = false;
          for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            if (needsComma) {
              result.push(",");
              needsComma = false;
            }
            result.push(`${JSON.stringify(key)}:`);
            if (!stringify(x[key])) {
              result.pop();
            } else {
              needsComma = true;
            }
          }
          result.push("}");
        }
        seen[seen.indexOf(x)] = seen[seen.length - 1];
        seen.pop();
        return true;
      }
      if (!stringify(base)) {
        return void 0;
      }
      return result.join("");
    }
    exports2.stableStringify = stableStringify;
  }
});

// node_modules/mudb/protocol.js
var require_protocol = __commonJS({
  "node_modules/mudb/protocol.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var stream_1 = require_stream();
    var stringify_1 = require_stringify();
    var MuMessageFactory = class {
      constructor(schema, idBase) {
        this.idBase = idBase;
        this.messageNames = Object.keys(schema).sort();
        this.schemas = new Array(this.messageNames.length);
        this.messageNames.forEach((name, id) => {
          this.schemas[id] = schema[name];
        });
        const json = this.schemas.map((s) => s.json);
        this.jsonStr = stringify_1.stableStringify(json);
      }
      createDispatch(sockets, bandwidth) {
        const result = {};
        this.messageNames.forEach((name, messageId) => {
          const schema = this.schemas[messageId];
          result[name] = (data, unreliable) => {
            const stream = new stream_1.MuWriteStream(128);
            stream.writeVarint(this.idBase + messageId);
            schema.diff(schema.identity, data, stream);
            const contentBytes = stream.bytes();
            const numBytes = contentBytes.byteLength;
            for (let i = 0; i < sockets.length; ++i) {
              const socket = sockets[i];
              socket.send(contentBytes, unreliable);
              if (!bandwidth[socket.sessionId].sent[name]) {
                bandwidth[socket.sessionId].sent[name] = {
                  count: 0,
                  bytes: 0
                };
              }
              const acc = bandwidth[socket.sessionId].sent[name];
              acc.count += 1;
              acc.bytes += numBytes;
            }
            stream.destroy();
          };
        });
        return result;
      }
      createSendRaw(sockets, bandwidth) {
        const rawId = this.idBase + this.messageNames.length;
        return function(data, unreliable) {
          if (typeof data === "string") {
            const packet = JSON.stringify({
              i: rawId,
              d: data
            });
            const numBytes = packet.length << 1;
            for (let i = 0; i < sockets.length; ++i) {
              const socket = sockets[i];
              socket.send(packet, unreliable);
              const acc = bandwidth[socket.sessionId].sent["raw"];
              acc.count += 1;
              acc.bytes += numBytes;
            }
          } else {
            const size = 5 + data.length;
            const stream = new stream_1.MuWriteStream(size);
            stream.writeVarint(rawId);
            const { uint8 } = stream.buffer;
            uint8.set(data, stream.offset);
            stream.offset += data.length;
            const bytes = stream.bytes();
            const numBytes = bytes.byteLength;
            for (let i = 0; i < sockets.length; ++i) {
              const socket = sockets[i];
              socket.send(bytes, unreliable);
              const acc = bandwidth[socket.sessionId].sent["raw"];
              acc.count += 1;
              acc.bytes += numBytes;
            }
            stream.destroy();
          }
        };
      }
    };
    exports2.MuMessageFactory = MuMessageFactory;
    var MuProtocolFactory = class {
      constructor(protocolSchemas) {
        this.protocolFactories = [];
        let counter = 0;
        for (let i = 0; i < protocolSchemas.length; ++i) {
          const factory = new MuMessageFactory(protocolSchemas[i], counter);
          this.protocolFactories.push(factory);
          counter += factory.messageNames.length + 1;
        }
        this.jsonStr = this.protocolFactories.map((factory) => factory.jsonStr).join();
      }
      createParser(spec, logger, bandwidth, sessionId) {
        const schemaTable = [];
        const handlerTable = [];
        const protocolIdTable = [];
        const messageNameTable = [];
        spec.forEach(({ messageHandlers, rawHandler }, id) => {
          const { messageNames, schemas } = this.protocolFactories[id];
          for (let i = 0; i < messageNames.length; ++i) {
            schemaTable.push(schemas[i]);
            handlerTable.push(messageHandlers[messageNames[i]]);
            protocolIdTable.push(id);
            messageNameTable.push(messageNames[i]);
          }
          schemaTable.push(null);
          handlerTable.push(rawHandler);
          protocolIdTable.push(id);
          messageNameTable.push("raw");
        });
        return (data, unreliable) => {
          if (typeof data === "string") {
            const object = JSON.parse(data);
            const id = object.i;
            if (id < 0 || id >= handlerTable.length) {
              throw new Error(`invalid message id: ${id}`);
            }
            if ("d" in object) {
              handlerTable[id].call(null, object.d, unreliable);
              const acc = bandwidth[protocolIdTable[id]][sessionId].received.raw;
              acc.count += 1;
              acc.bytes += data.length << 1;
            }
          } else {
            const stream = new stream_1.MuReadStream(data);
            const id = stream.readVarint();
            if (id < 0 || id >= handlerTable.length) {
              throw new Error(`invalid message id: ${id}`);
            }
            const schema = schemaTable[id];
            const handler = handlerTable[id];
            const protocolId = protocolIdTable[id];
            const messageName = messageNameTable[id];
            if (!bandwidth[protocolId][sessionId].received[messageName]) {
              bandwidth[protocolId][sessionId].received[messageName] = {
                count: 0,
                bytes: 0
              };
            }
            const acc = bandwidth[protocolId][sessionId].received[messageName];
            acc.count += 1;
            acc.bytes += data.byteLength;
            if (schema === null) {
              handler.call(null, stream.bytes(), unreliable);
              return;
            }
            let msg;
            if (stream.offset < stream.length) {
              msg = schema.patch(schema.identity, stream);
            } else {
              msg = schema.clone(schema.identity);
            }
            handler.call(null, msg, unreliable);
            schema.free(msg);
          }
        };
      }
    };
    exports2.MuProtocolFactory = MuProtocolFactory;
  }
});

// node_modules/mudb/logger.js
var require_logger = __commonJS({
  "node_modules/mudb/logger.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MuDefaultLogger = {
      log: () => {
      },
      error: (x) => console.log(`mudb error: ${x}`),
      exception: console.error
    };
  }
});

// node_modules/mudb/client.js
var require_client = __commonJS({
  "node_modules/mudb/client.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var protocol_1 = require_protocol();
    var logger_1 = require_logger();
    var noop = function() {
    };
    var MuRemoteServer = class {
      constructor() {
        this.message = {};
        this.sendRaw = noop;
      }
    };
    exports2.MuRemoteServer = MuRemoteServer;
    var MuClientProtocolSpec = class {
      constructor() {
        this.messageHandlers = {};
        this.rawHandler = noop;
        this.readyHandler = noop;
        this.closeHandler = noop;
      }
    };
    exports2.MuClientProtocolSpec = MuClientProtocolSpec;
    var MuClientProtocol = class {
      constructor(schema, client, protocolSpec) {
        this.configured = false;
        this.schema = schema;
        this.client = client;
        this.server = new MuRemoteServer();
        this._protocolSpec = protocolSpec;
      }
      configure(spec) {
        if (this.configured) {
          throw new Error("mudb: protocol has been configured");
        }
        this.configured = true;
        this._protocolSpec.messageHandlers = spec.message;
        this._protocolSpec.rawHandler = spec.raw || noop;
        this._protocolSpec.readyHandler = spec.ready || noop;
        this._protocolSpec.closeHandler = spec.close || noop;
      }
    };
    exports2.MuClientProtocol = MuClientProtocol;
    var MuClient = class {
      constructor(socket, logger, skipProtocolValidation) {
        this.protocols = [];
        this._protocolSpecs = [];
        this.running = false;
        this._started = false;
        this._closed = false;
        this.bandwidth = [];
        this._socket = socket;
        this.sessionId = socket.sessionId;
        this.logger = logger || logger_1.MuDefaultLogger;
        this._shouldValidateProtocol = !skipProtocolValidation;
      }
      start(spec_) {
        if (this._started || this._closed) {
          throw new Error("mudb: client has been started");
        }
        this._started = true;
        const clientSchemas = this.protocols.map((p) => p.schema.client);
        const clientFactory = new protocol_1.MuProtocolFactory(clientSchemas);
        const serverSchemas = this.protocols.map((p) => p.schema.server);
        const serverFactory = new protocol_1.MuProtocolFactory(serverSchemas);
        const spec = spec_ || {};
        const checkProtocolConsistency = (packet) => {
          try {
            const data = JSON.parse(packet);
            if (data.clientJsonStr !== clientFactory.jsonStr || data.serverJsonStr !== serverFactory.jsonStr) {
              this.logger.error("protocol mismatch");
              this._socket.close();
            }
          } catch (e) {
            this.logger.exception(e);
            this._socket.close();
          }
        };
        const parser = clientFactory.createParser(this._protocolSpecs, this.logger, this.bandwidth, this.sessionId);
        let validationPacket = this._shouldValidateProtocol;
        this._socket.open({
          ready: () => {
            this.running = true;
            if (this._shouldValidateProtocol) {
              this._socket.send(JSON.stringify({
                clientJsonStr: clientFactory.jsonStr,
                serverJsonStr: serverFactory.jsonStr
              }));
            }
            serverFactory.protocolFactories.forEach((factory, protocolId) => {
              this.bandwidth[protocolId] = {
                [this.sessionId]: {
                  sent: {
                    raw: {
                      count: 0,
                      bytes: 0
                    }
                  },
                  received: {
                    raw: {
                      count: 0,
                      bytes: 0
                    }
                  }
                }
              };
              const protocol = this.protocols[protocolId];
              protocol.server.message = factory.createDispatch([this._socket], this.bandwidth[protocolId]);
              protocol.server.sendRaw = factory.createSendRaw([this._socket], this.bandwidth[protocolId]);
            });
            this._protocolSpecs.forEach((protoSpec) => {
              protoSpec.readyHandler();
            });
            if (spec.ready) {
              try {
                spec.ready();
              } catch (e) {
                this.logger.exception(e);
              }
            }
          },
          message: (data, unreliable) => {
            if (!validationPacket) {
              try {
                parser(data, unreliable);
              } catch (e) {
                this.logger.exception(e);
              }
            } else {
              checkProtocolConsistency(data);
              validationPacket = false;
            }
          },
          close: (error) => {
            this.running = false;
            this._closed = true;
            this._protocolSpecs.forEach((protoSpec) => protoSpec.closeHandler());
            if (spec.close) {
              try {
                spec.close(error);
              } catch (e) {
                this.logger.exception(e);
              }
            }
          }
        });
      }
      destroy() {
        if (!this.running) {
          throw new Error("mudb: client is not running");
        }
        this._socket.close();
      }
      protocol(schema) {
        if (this._started || this._closed) {
          throw new Error("mudb: attempt to register protocol after client has been started");
        }
        this.logger.log(`register ${schema.name} protocol`);
        const spec = new MuClientProtocolSpec();
        const p = new MuClientProtocol(schema, this, spec);
        this.protocols.push(p);
        this._protocolSpecs.push(spec);
        return p;
      }
    };
    exports2.MuClient = MuClient;
  }
});

// node_modules/mudb/server.js
var require_server = __commonJS({
  "node_modules/mudb/server.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var protocol_1 = require_protocol();
    var logger_1 = require_logger();
    var MuRemoteClient = class {
      constructor(socket, message, sendRaw) {
        this._socket = socket;
        this.sessionId = socket.sessionId;
        this.message = message;
        this.sendRaw = sendRaw;
      }
      close() {
        this._socket.close();
      }
    };
    exports2.MuRemoteClient = MuRemoteClient;
    var noop = function() {
    };
    var MuServerProtocolSpec = class {
      constructor() {
        this.messageHandlers = {};
        this.readyHandler = noop;
        this.connectHandler = noop;
        this.rawHandler = noop;
        this.disconnectHandler = noop;
        this.closeHandler = noop;
      }
    };
    exports2.MuServerProtocolSpec = MuServerProtocolSpec;
    var MuServerProtocol = class {
      constructor(schema, server, protocolSpec) {
        this.clients = {};
        this.broadcast = {};
        this.broadcastRaw = noop;
        this.configured = false;
        this.schema = schema;
        this.server = server;
        this._protocolSpec = protocolSpec;
      }
      configure(spec) {
        if (this.configured) {
          throw new Error("mudb: protocol has been configured");
        }
        this.configured = true;
        this._protocolSpec.messageHandlers = spec.message;
        this._protocolSpec.readyHandler = spec.ready || noop;
        this._protocolSpec.connectHandler = spec.connect || noop;
        this._protocolSpec.rawHandler = spec.raw || noop;
        this._protocolSpec.disconnectHandler = spec.disconnect || noop;
        this._protocolSpec.closeHandler = spec.close || noop;
      }
    };
    exports2.MuServerProtocol = MuServerProtocol;
    var MuServer2 = class {
      constructor(socketServer, logger, skipProtocolValidation) {
        this.protocols = [];
        this._protocolSpecs = [];
        this.running = false;
        this._started = false;
        this._closed = false;
        this.bandwidth = [];
        this._socketServer = socketServer;
        this.logger = logger || logger_1.MuDefaultLogger;
        this._shouldValidateProtocol = !skipProtocolValidation;
      }
      start(spec) {
        if (this._started || this._closed) {
          throw new Error("mudb: server has been started");
        }
        this._started = true;
        const clientSchemas = this.protocols.map((p) => p.schema.client);
        const clientFactory = new protocol_1.MuProtocolFactory(clientSchemas);
        const serverSchemas = this.protocols.map((p) => p.schema.server);
        const serverFactory = new protocol_1.MuProtocolFactory(serverSchemas);
        const sockets = [];
        this._socketServer.start({
          ready: () => {
            this.running = true;
            this.protocols.forEach((protocol, pid) => {
              this.bandwidth[pid] = {};
              protocol.broadcast = clientFactory.protocolFactories[pid].createDispatch(sockets, this.bandwidth[pid]);
              protocol.broadcastRaw = clientFactory.protocolFactories[pid].createSendRaw(sockets, this.bandwidth[pid]);
            });
            this._protocolSpecs.forEach((protocolSpec) => {
              protocolSpec.readyHandler();
            });
            if (spec && spec.ready) {
              spec.ready();
            }
          },
          close: (error) => {
            if (spec && spec.close) {
              spec.close(error);
            }
          },
          connection: (socket) => {
            const clientObjects = new Array(this.protocols.length);
            const protocolHandlers = new Array(this.protocols.length);
            this.protocols.forEach((protocol, pid) => {
              const factory = clientFactory.protocolFactories[pid];
              this.bandwidth[pid][socket.sessionId] = {
                sent: {
                  raw: {
                    count: 0,
                    bytes: 0
                  }
                },
                received: {
                  raw: {
                    count: 0,
                    bytes: 0
                  }
                }
              };
              const client = new MuRemoteClient(socket, factory.createDispatch([socket], this.bandwidth[pid]), factory.createSendRaw([socket], this.bandwidth[pid]));
              clientObjects[pid] = client;
              const protocolSpec = this._protocolSpecs[pid];
              const messageHandlers = {};
              Object.keys(protocolSpec.messageHandlers).forEach((message) => {
                const handler = protocolSpec.messageHandlers[message];
                messageHandlers[message] = function(data, unreliable) {
                  handler(client, data, unreliable);
                };
              });
              const rawHandler = protocolSpec.rawHandler;
              protocolHandlers[pid] = {
                rawHandler: function(bytes, unreliable) {
                  rawHandler(client, bytes, unreliable);
                },
                messageHandlers
              };
            });
            function checkProtocolConsistency(packet) {
              try {
                const info = JSON.parse(packet);
                if (info.clientJsonStr !== clientFactory.jsonStr || info.serverJsonStr !== serverFactory.jsonStr) {
                  throw new Error("incompatible protocols");
                }
              } catch (e) {
                console.error(`mudb: kill connection ${socket.sessionId}: ${e}`);
                socket.close();
              }
            }
            const parser = serverFactory.createParser(protocolHandlers, this.logger, this.bandwidth, socket.sessionId);
            let validationPacket = this._shouldValidateProtocol;
            socket.open({
              ready: () => {
                sockets.push(socket);
                if (this._shouldValidateProtocol) {
                  socket.send(JSON.stringify({
                    clientJsonStr: clientFactory.jsonStr,
                    serverJsonStr: serverFactory.jsonStr
                  }));
                }
                this.protocols.forEach((protocol, id) => {
                  const client = clientObjects[id];
                  protocol.clients[socket.sessionId] = client;
                });
                this._protocolSpecs.forEach((protocolSpec, id) => {
                  const client = clientObjects[id];
                  protocolSpec.connectHandler(client);
                });
              },
              message: (data, unreliable) => {
                if (!validationPacket) {
                  try {
                    parser(data, unreliable);
                  } catch (e) {
                    console.error(`mudb: kill connection ${socket.sessionId}: ${e}`);
                    socket.close();
                  }
                } else {
                  checkProtocolConsistency(data);
                  validationPacket = false;
                }
              },
              close: (error) => {
                this._protocolSpecs.forEach((protocolSpec, id) => {
                  const client = clientObjects[id];
                  protocolSpec.disconnectHandler(client);
                });
                this.protocols.forEach((protocol) => {
                  delete protocol.clients[socket.sessionId];
                });
                sockets.splice(sockets.indexOf(socket), 1);
                if (error) {
                  this.logger.error(`socket ${socket.sessionId} was closed due to ${error}`);
                }
              }
            });
          }
        });
      }
      destroy() {
        if (!this.running) {
          throw new Error("mudb: server is not running");
        }
        this._closed = true;
        this.running = false;
        this._socketServer.close();
        this._protocolSpecs.forEach((protocolSpec) => protocolSpec.closeHandler());
      }
      protocol(schema) {
        if (this._started || this._closed) {
          throw new Error("mudb: attempt to register protocol after server has been started");
        }
        this.logger.log(`register ${schema.name} protocol`);
        const spec = new MuServerProtocolSpec();
        const p = new MuServerProtocol(schema, this, spec);
        this.protocols.push(p);
        this._protocolSpecs.push(spec);
        return p;
      }
    };
    exports2.MuServer = MuServer2;
  }
});

// node_modules/mudb/index.js
var require_mudb = __commonJS({
  "node_modules/mudb/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var client_1 = require_client();
    exports2.MuClient = client_1.MuClient;
    var server_1 = require_server();
    exports2.MuServer = server_1.MuServer;
  }
});

// node_modules/mudb/schema/void.js
var require_void = __commonJS({
  "node_modules/mudb/schema/void.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var MuVoid3 = class {
      constructor() {
        this.identity = void 0;
        this.muType = "void";
        this.json = {
          type: "void"
        };
      }
      alloc() {
      }
      free(_) {
      }
      equal(a, b) {
        return true;
      }
      clone(_) {
      }
      assign(d, s) {
      }
      diff(b, t, out) {
        return false;
      }
      patch(b, inp) {
      }
      toJSON(_) {
        return null;
      }
      fromJSON(_) {
        return;
      }
    };
    exports2.MuVoid = MuVoid3;
  }
});

// node_modules/mudb/schema/boolean.js
var require_boolean = __commonJS({
  "node_modules/mudb/schema/boolean.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var MuBoolean4 = class {
      constructor(identity) {
        this.muType = "boolean";
        this.identity = !!identity;
        this.json = {
          type: "boolean",
          identity: this.identity
        };
      }
      alloc() {
        return this.identity;
      }
      free(bool) {
      }
      equal(a, b) {
        return a === b;
      }
      clone(bool) {
        return bool;
      }
      assign(dst, src) {
        return src;
      }
      diff(base, target, out) {
        if (base !== target) {
          out.grow(1);
          out.writeUint8(target ? 1 : 0);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        const result = inp.readUint8();
        if (result > 1) {
          throw new Error(`invalid value for boolean`);
        }
        return !!result;
      }
      toJSON(bool) {
        return bool;
      }
      fromJSON(x) {
        if (typeof x === "boolean") {
          return x;
        }
        return this.identity;
      }
    };
    exports2.MuBoolean = MuBoolean4;
  }
});

// node_modules/mudb/schema/_string.js
var require_string = __commonJS({
  "node_modules/mudb/schema/_string.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var MuString = class {
      constructor(identity, type) {
        this.identity = identity;
        this.muType = type;
        this.json = {
          type,
          identity
        };
      }
      alloc() {
        return this.identity;
      }
      free(str) {
      }
      equal(a, b) {
        return a === b;
      }
      clone(str) {
        return str;
      }
      assign(dst, src) {
        return src;
      }
      toJSON(str) {
        return str;
      }
      fromJSON(x) {
        if (typeof x === "string") {
          return x;
        }
        return this.identity;
      }
    };
    exports2.MuString = MuString;
  }
});

// node_modules/mudb/schema/ascii.js
var require_ascii = __commonJS({
  "node_modules/mudb/schema/ascii.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _string_1 = require_string();
    var MuASCII4 = class extends _string_1.MuString {
      constructor(identity) {
        super(identity || "", "ascii");
      }
      diff(base, target, out) {
        if (base !== target) {
          out.grow(5 + target.length);
          out.writeVarint(target.length);
          out.writeASCII(target);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        return inp.readASCII(inp.readVarint());
      }
    };
    exports2.MuASCII = MuASCII4;
  }
});

// node_modules/mudb/schema/fixed-ascii.js
var require_fixed_ascii = __commonJS({
  "node_modules/mudb/schema/fixed-ascii.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _string_1 = require_string();
    var MuFixedASCII = class extends _string_1.MuString {
      constructor(lengthOrIdentity) {
        const identity = typeof lengthOrIdentity === "number" ? new Array(lengthOrIdentity + 1).join(" ") : lengthOrIdentity;
        super(identity, "fixed-ascii");
        this.length = identity.length;
      }
      diff(base, target, out) {
        if (base !== target) {
          out.grow(this.length);
          out.writeASCII(target);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        return inp.readASCII(this.length);
      }
    };
    exports2.MuFixedASCII = MuFixedASCII;
  }
});

// node_modules/mudb/schema/utf8.js
var require_utf8 = __commonJS({
  "node_modules/mudb/schema/utf8.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _string_1 = require_string();
    var MuUTF85 = class extends _string_1.MuString {
      constructor(identity) {
        super(identity || "", "utf8");
      }
      diff(base, target, stream) {
        if (base !== target) {
          stream.writeString(target);
          return true;
        }
        return false;
      }
      patch(base, stream) {
        return stream.readString();
      }
    };
    exports2.MuUTF8 = MuUTF85;
  }
});

// node_modules/mudb/schema/_number.js
var require_number = __commonJS({
  "node_modules/mudb/schema/_number.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function tuple(...args) {
      return args;
    }
    exports2.ranges = {
      float32: tuple(-34028234663852886e22, 34028234663852886e22),
      float64: tuple(-17976931348623157e292, 17976931348623157e292),
      int8: tuple(-128, 127),
      int16: tuple(-32768, 32767),
      int32: tuple(-2147483648, 2147483647),
      uint8: tuple(0, 255),
      uint16: tuple(0, 65535),
      uint32: tuple(0, 4294967295),
      varint: tuple(0, 4294967295),
      rvarint: tuple(0, 4294967295)
    };
    var MuNumber = class {
      constructor(identity_, type) {
        const identity = identity_ === identity_ ? identity_ || 0 : NaN;
        const range = exports2.ranges[type];
        if (identity !== Infinity && identity !== -Infinity && identity === identity) {
          if (identity < range[0] || identity > range[1]) {
            throw new RangeError(`${identity} is out of range of ${type}`);
          }
        } else if (type !== "float32" && type !== "float64") {
          throw new RangeError(`${identity} is out of range of ${type}`);
        }
        this.identity = identity;
        this.muType = type;
        this.json = {
          type,
          identity
        };
      }
      alloc() {
        return this.identity;
      }
      free(num) {
      }
      equal(a, b) {
        return a === b;
      }
      clone(num) {
        return num;
      }
      assign(dst, src) {
        return src;
      }
      toJSON(num) {
        return num;
      }
      fromJSON(x) {
        if (typeof x === "number") {
          return x;
        }
        return this.identity;
      }
    };
    exports2.MuNumber = MuNumber;
  }
});

// node_modules/mudb/schema/float32.js
var require_float32 = __commonJS({
  "node_modules/mudb/schema/float32.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _number_1 = require_number();
    var MuFloat323 = class extends _number_1.MuNumber {
      constructor(identity) {
        super(identity, "float32");
      }
      diff(base, target, out) {
        if (base !== target) {
          out.grow(4);
          out.writeFloat32(target);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        return inp.readFloat32();
      }
    };
    exports2.MuFloat32 = MuFloat323;
  }
});

// node_modules/mudb/schema/float64.js
var require_float64 = __commonJS({
  "node_modules/mudb/schema/float64.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _number_1 = require_number();
    var MuFloat644 = class extends _number_1.MuNumber {
      constructor(identity) {
        super(identity, "float64");
      }
      diff(base, target, out) {
        if (base !== target) {
          out.grow(8);
          out.writeFloat64(target);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        return inp.readFloat64();
      }
    };
    exports2.MuFloat64 = MuFloat644;
  }
});

// node_modules/mudb/schema/int8.js
var require_int8 = __commonJS({
  "node_modules/mudb/schema/int8.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _number_1 = require_number();
    var MuInt8 = class extends _number_1.MuNumber {
      constructor(identity) {
        super(identity, "int8");
      }
      diff(base, target, out) {
        if (base !== target) {
          out.grow(1);
          out.writeInt8(target);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        return inp.readInt8();
      }
    };
    exports2.MuInt8 = MuInt8;
  }
});

// node_modules/mudb/schema/int16.js
var require_int16 = __commonJS({
  "node_modules/mudb/schema/int16.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _number_1 = require_number();
    var MuInt16 = class extends _number_1.MuNumber {
      constructor(identity) {
        super(identity, "int16");
      }
      diff(base, target, out) {
        if (base !== target) {
          out.grow(2);
          out.writeInt16(target);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        return inp.readInt16();
      }
    };
    exports2.MuInt16 = MuInt16;
  }
});

// node_modules/mudb/schema/int32.js
var require_int32 = __commonJS({
  "node_modules/mudb/schema/int32.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _number_1 = require_number();
    var MuInt323 = class extends _number_1.MuNumber {
      constructor(identity) {
        super(identity, "int32");
      }
      diff(base, target, out) {
        if (base !== target) {
          out.grow(4);
          out.writeInt32(target);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        return inp.readInt32();
      }
    };
    exports2.MuInt32 = MuInt323;
  }
});

// node_modules/mudb/schema/uint8.js
var require_uint8 = __commonJS({
  "node_modules/mudb/schema/uint8.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _number_1 = require_number();
    var MuUint84 = class extends _number_1.MuNumber {
      constructor(identity) {
        super(identity, "uint8");
      }
      diff(base, target, out) {
        if (base !== target) {
          out.grow(1);
          out.writeUint8(target);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        return inp.readUint8();
      }
    };
    exports2.MuUint8 = MuUint84;
  }
});

// node_modules/mudb/schema/uint16.js
var require_uint16 = __commonJS({
  "node_modules/mudb/schema/uint16.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _number_1 = require_number();
    var MuUint163 = class extends _number_1.MuNumber {
      constructor(identity) {
        super(identity, "uint16");
      }
      diff(base, target, out) {
        if (base !== target) {
          out.grow(2);
          out.writeUint16(target);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        return inp.readUint16();
      }
    };
    exports2.MuUint16 = MuUint163;
  }
});

// node_modules/mudb/schema/uint32.js
var require_uint32 = __commonJS({
  "node_modules/mudb/schema/uint32.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _number_1 = require_number();
    var MuUint324 = class extends _number_1.MuNumber {
      constructor(identity) {
        super(identity, "uint32");
      }
      diff(base, target, out) {
        if (base !== target) {
          out.grow(4);
          out.writeUint32(target);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        return inp.readUint32();
      }
    };
    exports2.MuUint32 = MuUint324;
  }
});

// node_modules/mudb/schema/varint.js
var require_varint = __commonJS({
  "node_modules/mudb/schema/varint.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _number_1 = require_number();
    var MuVarint5 = class extends _number_1.MuNumber {
      constructor(identity) {
        super(identity, "varint");
      }
      diff(base, target, out) {
        if (base !== target) {
          out.grow(5);
          out.writeVarint(target);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        return inp.readVarint();
      }
    };
    exports2.MuVarint = MuVarint5;
  }
});

// node_modules/mudb/schema/rvarint.js
var require_rvarint = __commonJS({
  "node_modules/mudb/schema/rvarint.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var _number_1 = require_number();
    var SCHROEPPEL22 = 2863311530;
    var MuRelativeVarint4 = class extends _number_1.MuNumber {
      constructor(identity) {
        super(identity, "rvarint");
      }
      diff(base, target, out) {
        if (base !== target) {
          out.grow(5);
          out.writeVarint(SCHROEPPEL22 + (target - base) ^ SCHROEPPEL22);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        const delta = (SCHROEPPEL22 ^ inp.readVarint()) - SCHROEPPEL22 >> 0;
        return base + delta;
      }
    };
    exports2.MuRelativeVarint = MuRelativeVarint4;
  }
});

// node_modules/mudb/schema/quantized-float.js
var require_quantized_float = __commonJS({
  "node_modules/mudb/schema/quantized-float.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var SCHROEPPEL22 = 2863311530;
    function readSchroeppel(stream) {
      const x = stream.readVarint();
      return (SCHROEPPEL22 ^ x) - SCHROEPPEL22 >> 0;
    }
    var MuQuantizedFloat5 = class {
      constructor(precision, identity) {
        this.precision = precision;
        this.invPrecision = 1;
        this.identity = 0;
        this.muData = {
          type: "quantized-float",
          precision: 0,
          identity: 0
        };
        this.muType = "quantized-float";
        this.invPrecision = 1 / this.precision;
        if (identity) {
          this.identity = this.precision * (this.invPrecision * identity >> 0);
        }
        this.json = this.muData = {
          type: "quantized-float",
          precision: this.precision,
          identity: this.identity
        };
      }
      assign(x, y) {
        return (this.invPrecision * y >> 0) * this.precision;
      }
      clone(y) {
        return (this.invPrecision * y >> 0) * this.precision;
      }
      alloc() {
        return this.identity;
      }
      free() {
      }
      toJSON(x) {
        return this.precision * (this.invPrecision * x >> 0);
      }
      fromJSON(x) {
        if (typeof x === "number") {
          return this.clone(x);
        }
        return this.identity;
      }
      equal(x, y) {
        const sf = this.invPrecision;
        return sf * x >> 0 === sf * y >> 0;
      }
      diff(base, target, stream) {
        const sf = this.invPrecision;
        const b = sf * base >> 0;
        const t = sf * target >> 0;
        if (b === t) {
          return false;
        }
        stream.grow(5);
        stream.writeVarint((SCHROEPPEL22 + (t - b) ^ SCHROEPPEL22) >>> 0);
        return true;
      }
      patch(base, stream) {
        const b = this.invPrecision * base >> 0;
        const d = readSchroeppel(stream);
        return (b + d) * this.precision;
      }
    };
    exports2.MuQuantizedFloat = MuQuantizedFloat5;
  }
});

// node_modules/mudb/schema/is-primitive.js
var require_is_primitive = __commonJS({
  "node_modules/mudb/schema/is-primitive.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var muPrimitiveTypes = [
      "ascii",
      "boolean",
      "fixed-ascii",
      "float32",
      "float64",
      "int8",
      "int16",
      "int32",
      "uint8",
      "uint16",
      "uint32",
      "utf8",
      "void"
    ];
    function isMuPrimitiveType(muType) {
      return muPrimitiveTypes.indexOf(muType) > -1;
    }
    exports2.isMuPrimitiveType = isMuPrimitiveType;
  }
});

// node_modules/mudb/schema/array.js
var require_array = __commonJS({
  "node_modules/mudb/schema/array.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var is_primitive_1 = require_is_primitive();
    function assignPrimitive(dst, src) {
      const N = src.length;
      const M = dst.length;
      const L = Math.min(M, N);
      for (let i = 0; i < L; ++i) {
        dst[i] = src[i];
      }
      for (let i = M; i < N; ++i) {
        dst.push(src[i]);
      }
      dst.length = N;
      return dst;
    }
    function clonePrimitive(src) {
      return src.slice();
    }
    function equalPrimitive(a, b) {
      const N = a.length;
      const M = b.length;
      if (N !== M) {
        return false;
      }
      for (let i = 0; i < N; ++i) {
        if (a[i] !== b[i]) {
          return false;
        }
      }
      return true;
    }
    function toJSONPrimitive(a) {
      return a.slice();
    }
    function assignGeneric(schema) {
      return (dst, src) => {
        const N = src.length;
        const M = dst.length;
        const L = Math.min(M, N);
        for (let i = 0; i < L; ++i) {
          dst[i] = schema.assign(dst[i], src[i]);
        }
        for (let i = M; i < N; ++i) {
          dst.push(schema.clone(src[i]));
        }
        for (let i = N; i < M; ++i) {
          schema.free(dst[i]);
        }
        dst.length = N;
        return dst;
      };
    }
    function cloneGeneric(schema) {
      return (src) => {
        const result = src.slice();
        for (let i = 0; i < result.length; ++i) {
          result[i] = schema.clone(result[i]);
        }
        return result;
      };
    }
    function freeGeneric(schema) {
      return (src) => {
        for (let i = 0; i < src.length; ++i) {
          schema.free(src[i]);
        }
        src.length = 0;
      };
    }
    function equalGeneric(schema) {
      return (a, b) => {
        const N = a.length;
        const M = b.length;
        if (N !== M) {
          return false;
        }
        for (let i = 0; i < N; ++i) {
          if (!schema.equal(a[i], b[i])) {
            return false;
          }
        }
        return true;
      };
    }
    function toJSONGeneric(schema) {
      return (arr) => {
        const result = new Array(arr.length);
        for (let i = 0; i < arr.length; ++i) {
          result[i] = schema.toJSON(arr[i]);
        }
        return result;
      };
    }
    var MuArray5 = class {
      constructor(schema, capacity, identity) {
        this.muType = "array";
        this.muData = schema;
        this.capacity = capacity;
        if (identity) {
          const copy = this.identity = identity.slice();
          for (let i = 0; i < copy.length; ++i) {
            copy[i] = schema.clone(copy[i]);
          }
        } else {
          this.identity = [];
        }
        this.json = {
          type: "array",
          valueType: schema.json,
          identity: JSON.stringify(this.identity)
        };
        if (is_primitive_1.isMuPrimitiveType(schema.muType)) {
          this.assign = assignPrimitive;
          this.clone = clonePrimitive;
          this.free = (x) => x.length = 0;
          this.equal = equalPrimitive;
          this.toJSON = toJSONPrimitive;
        } else {
          this.assign = assignGeneric(schema);
          this.clone = cloneGeneric(schema);
          this.free = freeGeneric(schema);
          this.equal = equalGeneric(schema);
          this.toJSON = toJSONGeneric(schema);
        }
      }
      alloc() {
        return [];
      }
      diff(base, target, out) {
        const tLeng = target.length;
        const numTrackers = Math.ceil(tLeng / 8);
        out.grow(4 + numTrackers);
        const head = out.offset;
        out.writeVarint(tLeng);
        let trackerOffset = out.offset;
        out.offset += numTrackers;
        let tracker = 0;
        let numPatches = 0;
        const bLeng = base.length;
        const schema = this.muData;
        for (let i = 0; i < Math.min(bLeng, tLeng); ++i) {
          if (schema.diff(base[i], target[i], out)) {
            tracker |= 1 << (i & 7);
            ++numPatches;
          }
          if ((i & 7) === 7) {
            out.writeUint8At(trackerOffset++, tracker);
            tracker = 0;
          }
        }
        for (let i = bLeng; i < tLeng; ++i) {
          if (schema.diff(schema.identity, target[i], out)) {
            tracker |= 1 << (i & 7);
            ++numPatches;
          }
          if ((i & 7) === 7) {
            out.writeUint8At(trackerOffset++, tracker);
            tracker = 0;
          }
        }
        if (tLeng & 7) {
          out.writeUint8At(trackerOffset, tracker);
        }
        if (numPatches > 0 || bLeng !== tLeng) {
          return true;
        }
        out.offset = head;
        return false;
      }
      patch(base, inp) {
        const tLeng = inp.readVarint();
        if (tLeng > this.capacity) {
          throw new RangeError(`target length ${tLeng} exceeds capacity ${this.capacity}`);
        }
        const bLeng = base.length;
        const L = Math.min(bLeng, tLeng);
        const numTrackers = Math.ceil(tLeng / 8);
        let trackerOffset = inp.offset;
        inp.offset += numTrackers;
        const result = base.slice();
        const schema = this.muData;
        result.length = L;
        let tracker = 0;
        for (let i = 0; i < L; ++i) {
          const mod8 = i & 7;
          if (!mod8) {
            tracker = inp.readUint8At(trackerOffset++);
          }
          if (1 << mod8 & tracker) {
            result[i] = schema.patch(base[i], inp);
          } else {
            result[i] = schema.clone(base[i]);
          }
        }
        for (let i = bLeng; i < tLeng; ++i) {
          const mod8 = i & 7;
          if (!mod8) {
            tracker = inp.readUint8At(trackerOffset++);
          }
          if (1 << mod8 & tracker) {
            result.push(schema.patch(schema.identity, inp));
          } else {
            result.push(schema.clone(schema.identity));
          }
        }
        return result;
      }
      fromJSON(x) {
        if (Array.isArray(x)) {
          const arr = new Array(x.length);
          const schema = this.muData;
          for (let i = 0; i < x.length; ++i) {
            arr[i] = schema.fromJSON(x[i]);
          }
          return arr;
        }
        return this.clone(this.identity);
      }
    };
    exports2.MuArray = MuArray5;
  }
});

// node_modules/mudb/schema/option.js
var require_option = __commonJS({
  "node_modules/mudb/schema/option.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var TypeDiff;
    (function(TypeDiff2) {
      TypeDiff2[TypeDiff2["BECAME_UNDEFINED"] = 0] = "BECAME_UNDEFINED";
      TypeDiff2[TypeDiff2["BECAME_IDENTITY"] = 1] = "BECAME_IDENTITY";
      TypeDiff2[TypeDiff2["BECAME_DEFINED"] = 2] = "BECAME_DEFINED";
      TypeDiff2[TypeDiff2["STAYED_DEFINED"] = 3] = "STAYED_DEFINED";
    })(TypeDiff || (TypeDiff = {}));
    var MuOption2 = class {
      constructor(schema, identity, identityIsUndefined = false) {
        this.muType = "option";
        this.muData = schema;
        if (identityIsUndefined) {
          this.identity = void 0;
        } else {
          this.identity = identity !== void 0 ? schema.clone(identity) : schema.clone(schema.identity);
        }
        this.json = {
          type: "option",
          valueType: schema.json,
          identity: JSON.stringify(this.identity)
        };
      }
      alloc() {
        return this.muData.alloc();
      }
      free(val) {
        if (val === void 0) {
          return;
        }
        this.muData.free(val);
      }
      equal(a, b) {
        if (a === void 0 && b === void 0) {
          return true;
        }
        if (a !== void 0 && b === void 0) {
          return false;
        }
        if (a === void 0 && b !== void 0) {
          return false;
        }
        return this.muData.equal(a, b);
      }
      clone(val) {
        if (val === void 0) {
          return void 0;
        }
        return this.muData.clone(val);
      }
      assign(dst, src) {
        if (dst !== void 0 && src !== void 0) {
          return this.muData.assign(dst, src);
        }
        return src;
      }
      diff(base, target, out) {
        if (base === void 0 && target === void 0) {
          return false;
        }
        if (base === void 0 && target !== void 0) {
          out.grow(1);
          if (this.muData.equal(this.muData.identity, target)) {
            out.writeUint8(TypeDiff.BECAME_IDENTITY);
            return true;
          }
          out.writeUint8(TypeDiff.BECAME_DEFINED);
          this.muData.diff(this.muData.identity, target, out);
          return true;
        }
        if (base !== void 0 && target === void 0) {
          out.grow(1);
          out.writeUint8(TypeDiff.BECAME_UNDEFINED);
          return true;
        }
        if (this.muData.equal(base, target)) {
          return false;
        }
        out.grow(1);
        out.writeUint8(TypeDiff.STAYED_DEFINED);
        this.muData.diff(base, target, out);
        return true;
      }
      patch(base, inp) {
        const typeDiff = inp.readUint8();
        if (TypeDiff[typeDiff] === void 0) {
          throw new Error("Panic in muOption, invalid TypeDiff");
        }
        if (typeDiff == TypeDiff.BECAME_UNDEFINED) {
          return void 0;
        }
        if (typeDiff == TypeDiff.BECAME_DEFINED) {
          return this.muData.patch(this.muData.identity, inp);
        }
        if (typeDiff === TypeDiff.BECAME_IDENTITY) {
          return this.muData.clone(this.muData.identity);
        }
        if (typeDiff !== TypeDiff.STAYED_DEFINED || base === void 0) {
          throw new Error("Panic in muOption, invariants broken");
        }
        return this.muData.patch(base, inp);
      }
      toJSON(val) {
        if (val === void 0) {
          return void 0;
        }
        return this.muData.toJSON(val);
      }
      fromJSON(json) {
        if (json === void 0) {
          return void 0;
        }
        return this.muData.fromJSON(json);
      }
    };
    exports2.MuOption = MuOption2;
  }
});

// node_modules/mudb/schema/sorted-array.js
var require_sorted_array = __commonJS({
  "node_modules/mudb/schema/sorted-array.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var array_1 = require_array();
    function defaultCompare(a, b) {
      if (a < b) {
        return -1;
      } else if (a > b) {
        return 1;
      } else {
        return 0;
      }
    }
    var SortedOp;
    (function(SortedOp2) {
      SortedOp2[SortedOp2["NONE"] = -1] = "NONE";
      SortedOp2[SortedOp2["SKIP"] = 0] = "SKIP";
      SortedOp2[SortedOp2["PATCH"] = 1] = "PATCH";
      SortedOp2[SortedOp2["INSERT"] = 2] = "INSERT";
      SortedOp2[SortedOp2["INSERT_IDENTITY"] = 3] = "INSERT_IDENTITY";
      SortedOp2[SortedOp2["COPY"] = 4] = "COPY";
    })(SortedOp || (SortedOp = {}));
    var MuSortedArray4 = class {
      constructor(schema, capacity, compare, identity) {
        this.muType = "sorted-array";
        this.muData = schema;
        this.capacity = capacity;
        this.compare = compare || defaultCompare;
        const arraySchema = new array_1.MuArray(schema, capacity, identity);
        this.identity = arraySchema.identity.sort(this.compare);
        this.json = {
          type: "sorted-array",
          valueType: schema.json,
          identity: JSON.stringify(this.identity)
        };
        this.alloc = arraySchema.alloc;
        this.free = arraySchema.free;
        this.equal = arraySchema.equal;
        this.clone = arraySchema.clone;
        this.assign = arraySchema.assign;
        this.toJSON = arraySchema.toJSON;
        this.fromJSON = arraySchema.fromJSON;
      }
      diff(base, target, out) {
        if (base.length === 0 && target.length === 0) {
          return false;
        }
        const schema = this.muData;
        const compare = this.compare;
        out.grow(8);
        const head = out.offset;
        let opPtr = head;
        let opCount = 0;
        let opCode = SortedOp.NONE;
        out.offset += 4;
        let numOps = 0;
        function emitOp() {
          if (opCount > 0) {
            out.writeUint32At(opPtr, opCount << 3 | opCode);
            numOps++;
          }
          out.grow(4);
          opPtr = out.offset;
          out.offset += 4;
        }
        let basePtr = 0;
        let targetPtr = 0;
        while (basePtr < base.length && targetPtr < target.length) {
          const baseItem = base[basePtr];
          const targetItem = target[targetPtr];
          const cmp = compare(baseItem, targetItem);
          if (cmp < 0) {
            if (opCode !== SortedOp.SKIP) {
              emitOp();
              opCount = 1;
              opCode = SortedOp.SKIP;
            } else {
              opCount++;
            }
            basePtr++;
          } else if (0 < cmp) {
            if (opCode === SortedOp.INSERT) {
              if (schema.diff(schema.identity, targetItem, out)) {
                opCount++;
              } else {
                emitOp();
                opCode = SortedOp.INSERT_IDENTITY;
                opCount = 1;
              }
            } else if (opCode === SortedOp.INSERT_IDENTITY) {
              const prevOffset = out.offset;
              out.grow(4);
              out.offset += 4;
              if (schema.diff(schema.identity, targetItem, out)) {
                emitOp();
                out.offset -= 4;
                opPtr = prevOffset;
                opCode = SortedOp.INSERT;
                opCount = 1;
              } else {
                out.offset -= 4;
                opCount += 1;
              }
            } else {
              emitOp();
              opCount = 1;
              if (schema.diff(schema.identity, targetItem, out)) {
                opCode = SortedOp.INSERT;
              } else {
                opCode = SortedOp.INSERT_IDENTITY;
              }
            }
            targetPtr++;
          } else {
            if (opCode === SortedOp.PATCH) {
              if (schema.diff(baseItem, targetItem, out)) {
                opCount++;
              } else {
                emitOp();
                opCode = SortedOp.COPY;
                opCount = 1;
              }
            } else if (opCode === SortedOp.COPY) {
              const prevOffset = out.offset;
              out.grow(4);
              out.offset += 4;
              if (schema.diff(baseItem, targetItem, out)) {
                emitOp();
                out.offset -= 4;
                opPtr = prevOffset;
                opCode = SortedOp.PATCH;
                opCount = 1;
              } else {
                out.offset -= 4;
                opCount += 1;
              }
            } else {
              emitOp();
              opCount = 1;
              if (schema.diff(baseItem, targetItem, out)) {
                opCode = SortedOp.PATCH;
              } else {
                opCode = SortedOp.COPY;
              }
            }
            basePtr++;
            targetPtr++;
          }
        }
        if (basePtr < base.length) {
          if (opCode !== SortedOp.SKIP) {
            emitOp();
            opCount = base.length - basePtr;
            opCode = SortedOp.SKIP;
          } else {
            opCount += base.length - basePtr;
          }
          basePtr++;
        }
        while (targetPtr < target.length) {
          const targetItem = target[targetPtr];
          if (opCode === SortedOp.INSERT) {
            if (schema.diff(schema.identity, targetItem, out)) {
              opCount++;
            } else {
              emitOp();
              opCode = SortedOp.INSERT_IDENTITY;
              opCount = 1;
            }
          } else if (opCode === SortedOp.INSERT_IDENTITY) {
            const prevOffset = out.offset;
            out.grow(4);
            out.offset += 4;
            if (schema.diff(schema.identity, targetItem, out)) {
              emitOp();
              out.offset -= 4;
              opPtr = prevOffset;
              opCode = SortedOp.INSERT;
              opCount = 1;
            } else {
              out.offset -= 4;
              opCount += 1;
            }
          } else {
            emitOp();
            opCount = 1;
            if (schema.diff(schema.identity, targetItem, out)) {
              opCode = SortedOp.INSERT;
            } else {
              opCode = SortedOp.INSERT_IDENTITY;
            }
          }
          targetPtr++;
        }
        if (numOps === 0 && opCode === SortedOp.COPY && opCount === base.length) {
          out.offset = head;
          return false;
        }
        if (opCode !== SortedOp.SKIP) {
          emitOp();
        }
        out.offset -= 4;
        out.writeUint32At(head, numOps);
        return true;
      }
      patch(base, inp) {
        const schema = this.muData;
        const result = this.alloc();
        const numOps = inp.readUint32();
        let ptr = 0;
        let tLength = 0;
        for (let i = 0; i < numOps; ++i) {
          const code = inp.readUint32();
          const count = code >> 3;
          tLength += count;
          if (tLength > this.capacity) {
            throw new RangeError(`target length exceeds capacity ${this.capacity}`);
          }
          const op = code & 7;
          switch (op) {
            case SortedOp.INSERT_IDENTITY:
              for (let j = 0; j < count; ++j) {
                result.push(schema.clone(schema.identity));
              }
              break;
            case SortedOp.INSERT:
              for (let j = 0; j < count; ++j) {
                result.push(schema.patch(schema.identity, inp));
              }
              break;
            case SortedOp.PATCH:
              for (let j = 0; j < count; ++j) {
                result.push(schema.patch(base[ptr++], inp));
              }
              break;
            case SortedOp.COPY:
              for (let j = 0; j < count; ++j) {
                result.push(schema.clone(base[ptr++]));
              }
              break;
            case SortedOp.SKIP:
              ptr += count;
              break;
          }
        }
        return result;
      }
    };
    exports2.MuSortedArray = MuSortedArray4;
  }
});

// node_modules/mudb/schema/struct.js
var require_struct = __commonJS({
  "node_modules/mudb/schema/struct.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var muPrimitiveSize = {
      boolean: 0,
      uint8: 1,
      uint16: 2,
      uint32: 4,
      int8: 1,
      int16: 2,
      int32: 4,
      float32: 4,
      float64: 8,
      varint: 5,
      rvarint: 5,
      "quantized-float": 5
    };
    var muType2ReadMethod = {
      boolean: "readUint8",
      float32: "readFloat32",
      float64: "readFloat64",
      int8: "readInt8",
      int16: "readInt16",
      int32: "readInt32",
      uint8: "readUint8",
      uint16: "readUint16",
      uint32: "readUint32",
      utf8: "readString",
      varint: "readVarint"
    };
    var muType2WriteMethod = {
      boolean: "writeUint8",
      float32: "writeFloat32",
      float64: "writeFloat64",
      int8: "writeInt8",
      int16: "writeInt16",
      int32: "writeInt32",
      uint8: "writeUint8",
      uint16: "writeUint16",
      uint32: "writeUint32",
      utf8: "writeString",
      varint: "writeVarint"
    };
    var muPrimitiveTypes = Object.keys(muPrimitiveSize);
    var MuStruct5 = class {
      constructor(spec) {
        this.muType = "struct";
        const props = Object.keys(spec).sort((a, b) => {
          const ai = muPrimitiveTypes.indexOf(spec[a].muType);
          const bi = muPrimitiveTypes.indexOf(spec[b].muType);
          return bi - ai || (a < b ? -1 : b < a ? 1 : 0);
        });
        const types = props.map((prop) => spec[prop]);
        const json = {
          type: "struct",
          subTypes: {}
        };
        props.forEach((prop) => {
          json.subTypes[prop] = spec[prop].json;
        });
        const params = [];
        const args = [];
        let tokenCounter = 0;
        function token() {
          return "_v" + ++tokenCounter;
        }
        function inject(arg) {
          for (let i = 0; i < args.length; ++i) {
            if (args[i] === arg) {
              return params[i];
            }
          }
          const param = token();
          params.push(param);
          args.push(arg);
          return param;
        }
        const propRefs = props.map(inject);
        const typeRefs = types.map(inject);
        function block() {
          const vars = [];
          const body = [];
          return {
            vars,
            body,
            toString() {
              const localVars = vars.length > 0 ? `var ${vars.join()};` : "";
              return localVars + body.join("");
            },
            def(value) {
              const tok = token();
              vars.push(tok);
              if (value != void 0) {
                body.push(`${tok}=${value};`);
              }
              return tok;
            },
            append(...code) {
              body.push.apply(body, code);
            }
          };
        }
        const prolog = block();
        const epilog = block();
        function func(name, params_) {
          const b = block();
          const baseToString = b.toString;
          b.toString = function() {
            return `function ${name}(${params_.join()}){${baseToString()}}`;
          };
          return b;
        }
        const methods = {
          alloc: func("alloc", []),
          free: func("free", ["s"]),
          equal: func("equal", ["a", "b"]),
          clone: func("clone", ["s"]),
          assign: func("assign", ["d", "s"]),
          diff: func("diff", ["b", "t", "s"]),
          patch: func("patch", ["b", "s"]),
          toJSON: func("toJSON", ["s"]),
          fromJSON: func("fromJSON", ["j"]),
          stats: func("stats", [])
        };
        const allocCountRef = prolog.def("-1");
        const freeCountRef = prolog.def("0");
        const poolRef = prolog.def("[]");
        prolog.append("function MuStruct(){");
        propRefs.forEach((pr, i) => {
          const type = types[i];
          switch (type.muType) {
            case "boolean":
            case "int8":
            case "int16":
            case "int32":
            case "uint8":
            case "uint16":
            case "uint32":
            case "varint":
            case "rvarint":
              prolog.append(`this[${pr}]=${type.identity};`);
              break;
            case "float32":
            case "float64":
            case "quantized-float":
              prolog.append(`this[${pr}]=0.5;this[${pr}]=${type.identity};`);
              break;
            case "ascii":
            case "fixed-ascii":
            case "utf8":
              prolog.append(`this[${pr}]=${inject(type.identity)};`);
              break;
            default:
              prolog.append(`this[${pr}]=null;`);
          }
        });
        prolog.append(`}function _alloc(){++${allocCountRef};if(${poolRef}.length>0){return ${poolRef}.pop()}return new MuStruct()}`);
        const identityRef = prolog.def("_alloc()");
        propRefs.forEach((pr, i) => {
          const type = types[i];
          switch (type.muType) {
            case "ascii":
            case "fixed-ascii":
            case "utf8":
            case "boolean":
            case "float32":
            case "float64":
            case "int8":
            case "int16":
            case "int32":
            case "uint8":
            case "uint16":
            case "uint32":
            case "varint":
            case "rvarint":
            case "quantized-float":
              break;
            default:
              prolog.append(`${identityRef}[${pr}]=${typeRefs[i]}.clone(${inject(type.identity)});`);
              break;
          }
        });
        methods.alloc.append(`var s=_alloc();`);
        propRefs.forEach((pr, i) => {
          const type = types[i];
          switch (type.muType) {
            case "ascii":
            case "fixed-ascii":
            case "utf8":
            case "boolean":
            case "float32":
            case "float64":
            case "int8":
            case "int16":
            case "int32":
            case "uint8":
            case "uint16":
            case "uint32":
            case "varint":
            case "rvarint":
            case "quantized-float":
              break;
            default:
              methods.alloc.append(`s[${pr}]=${typeRefs[i]}.alloc();`);
              break;
          }
        });
        methods.alloc.append(`return s;`);
        methods.free.append(`${poolRef}.push(s);`);
        propRefs.forEach((pr, i) => {
          const type = types[i];
          switch (type.muType) {
            case "ascii":
            case "fixed-ascii":
            case "utf8":
            case "boolean":
            case "float32":
            case "float64":
            case "int8":
            case "int16":
            case "int32":
            case "uint8":
            case "uint16":
            case "uint32":
            case "varint":
            case "rvarint":
            case "quantized-float":
              break;
            default:
              methods.free.append(`${typeRefs[i]}.free(s[${pr}]);`);
              break;
          }
        });
        methods.free.append(`++${freeCountRef};`);
        propRefs.forEach((pr, i) => {
          const type = types[i];
          switch (type.muType) {
            case "ascii":
            case "fixed-ascii":
            case "utf8":
            case "boolean":
            case "float32":
            case "float64":
            case "int8":
            case "int16":
            case "int32":
            case "uint8":
            case "uint16":
            case "uint32":
            case "varint":
            case "rvarint":
              methods.equal.append(`if(a[${pr}]!==b[${pr}]){return false}`);
              break;
            case "quantized-float":
              methods.equal.append(`if(((${type.invPrecision}*a[${pr}])>>0)!==((${type.invPrecision}*b[${pr}])>>0)){return false}`);
              break;
            default:
              methods.equal.append(`if(!${typeRefs[i]}.equal(a[${pr}],b[${pr}])){return false}`);
          }
        });
        methods.equal.append(`return true;`);
        methods.clone.append(`var c=_alloc();`);
        propRefs.forEach((pr, i) => {
          const type = types[i];
          switch (type.muType) {
            case "ascii":
            case "fixed-ascii":
            case "utf8":
            case "boolean":
            case "float32":
            case "float64":
            case "int8":
            case "int16":
            case "int32":
            case "uint8":
            case "uint16":
            case "uint32":
            case "varint":
            case "rvarint":
              methods.clone.append(`c[${pr}]=s[${pr}];`);
              break;
            case "quantized-float":
              methods.clone.append(`c[${pr}]=((${type.invPrecision}*s[${pr}])>>0)*${type.precision};`);
              break;
            default:
              methods.clone.append(`c[${pr}]=${typeRefs[i]}.clone(s[${pr}]);`);
              break;
          }
        });
        methods.clone.append("return c;");
        propRefs.forEach((pr, i) => {
          const type = types[i];
          switch (type.muType) {
            case "ascii":
            case "fixed-ascii":
            case "utf8":
            case "boolean":
            case "float32":
            case "float64":
            case "int8":
            case "int16":
            case "int32":
            case "uint8":
            case "uint16":
            case "uint32":
            case "varint":
            case "rvarint":
              methods.assign.append(`d[${pr}]=s[${pr}];`);
              break;
            case "quantized-float":
              methods.assign.append(`d[${pr}]=((${type.invPrecision}*s[${pr}])>>0)*${type.precision};`);
              break;
            default:
              methods.assign.append(`d[${pr}]=${typeRefs[i]}.assign(d[${pr}],s[${pr}]);`);
          }
        });
        methods.assign.append("return d;");
        const numProps = props.length;
        const trackerBytes = Math.ceil(numProps / 8);
        let baseSize = trackerBytes;
        for (let i = 0; i < types.length; ++i) {
          const muType = types[i].muType;
          if (muType in muPrimitiveSize) {
            baseSize += muPrimitiveSize[muType];
          }
        }
        methods.diff.append(`var head=s.offset;var tr=0;var np=0;s.grow(${baseSize});s.offset+=${trackerBytes};`);
        propRefs.forEach((pr, i) => {
          const muType = types[i].muType;
          switch (muType) {
            case "boolean":
              methods.diff.append(`if(b[${pr}]!==t[${pr}]){++np;tr|=${1 << (i & 7)}}`);
              break;
            case "float32":
            case "float64":
            case "int8":
            case "int16":
            case "int32":
            case "uint8":
            case "uint16":
            case "uint32":
            case "varint":
            case "utf8":
              methods.diff.append(`if(b[${pr}]!==t[${pr}]){s.${muType2WriteMethod[muType]}(t[${pr}]);++np;tr|=${1 << (i & 7)}}`);
              break;
            case "rvarint":
              methods.diff.append(`if(b[${pr}]!==t[${pr}]){s.writeVarint(0xAAAAAAAA+(t[${pr}]-b[${pr}])^0xAAAAAAAA);++np;tr|=${1 << (i & 7)}}`);
              break;
            case "ascii":
              methods.diff.append(`if(b[${pr}]!==t[${pr}]){s.grow(5+t[${pr}].length);s.writeVarint(t[${pr}].length);s.writeASCII(t[${pr}]);++np;tr|=${1 << (i & 7)}}`);
              break;
            case "quantized-float":
              const br = methods.diff.def(`(${types[i].invPrecision}*b[${pr}])>>0`);
              const tr = methods.diff.def(`(${types[i].invPrecision}*t[${pr}])>>0`);
              methods.diff.append(`if(${br}!==${tr}){s.writeVarint((0xAAAAAAAA+(${tr}-${br})^0xAAAAAAAA)>>>0);++np;tr|=${1 << (i & 7)};}`);
              break;
            default:
              methods.diff.append(`if(${typeRefs[i]}.diff(b[${pr}],t[${pr}],s)){++np;tr|=${1 << (i & 7)}}`);
          }
          if ((i & 7) === 7) {
            methods.diff.append(`s.writeUint8At(head+${i >> 3},tr);tr=0;`);
          }
        });
        if (numProps & 7) {
          methods.diff.append(`s.writeUint8At(head+${trackerBytes - 1},tr);`);
        }
        methods.diff.append(`if(np){return true}else{s.offset=head;return false}`);
        methods.patch.append(`var t=_alloc(b);var head=s.offset;var tr=0;s.offset+=${trackerBytes};`);
        propRefs.forEach((pr, i) => {
          if (!(i & 7)) {
            methods.patch.append(`tr=s.readUint8At(head+${i >> 3});`);
          }
          const type = types[i];
          const muType = type.muType;
          methods.patch.append(`;t[${pr}]=(tr&${1 << (i & 7)})?`);
          switch (muType) {
            case "boolean":
              methods.patch.append(`!b[${pr}]:b[${pr}];`);
              break;
            case "float32":
            case "float64":
            case "int8":
            case "int16":
            case "int32":
            case "uint8":
            case "uint16":
            case "uint32":
            case "utf8":
            case "varint":
              methods.patch.append(`s.${muType2ReadMethod[muType]}():b[${pr}];`);
              break;
            case "rvarint":
              methods.patch.append(`b[${pr}]+((0xAAAAAAAA^s.readVarint())-0xAAAAAAAA>>0):b[${pr}];`);
              break;
            case "ascii":
              methods.patch.append(`s.readASCII(s.readVarint()):b[${pr}];`);
              break;
            case "quantized-float":
              methods.patch.append(`(((${type.invPrecision}*b[${pr}])>>0)+(((0xAAAAAAAA^s.readVarint())-0xAAAAAAAA)>>0))*${type.precision}:b[${pr}];`);
              break;
            default:
              methods.patch.append(`${typeRefs[i]}.patch(b[${pr}],s):${typeRefs[i]}.clone(b[${pr}]);`);
          }
        });
        methods.patch.append(`return t;`);
        methods.toJSON.append(`var j={};`);
        propRefs.forEach((pr, i) => {
          methods.toJSON.append(`j[${pr}]=${typeRefs[i]}.toJSON(s[${pr}]);`);
        });
        methods.toJSON.append(`return j;`);
        methods.fromJSON.append(`var s=_alloc();`);
        methods.fromJSON.append(`if(Object.prototype.toString.call(j)==='[object Object]'){`);
        propRefs.forEach((pr, i) => {
          methods.fromJSON.append(`s[${pr}]=${typeRefs[i]}.fromJSON(j[${pr}]);`);
        });
        methods.fromJSON.append(`}`);
        methods.fromJSON.append(`return s;`);
        methods.stats.append(`return {allocCount:${allocCountRef},freeCount:${freeCountRef},poolSize:${poolRef}.length};`);
        const muDataRef = prolog.def("{}");
        propRefs.forEach((pr, i) => {
          prolog.append(`${muDataRef}[${pr}]=${typeRefs[i]};`);
        });
        epilog.append(`return {identity:${identityRef},muData:${muDataRef},pool:${poolRef},`);
        Object.keys(methods).forEach((name) => {
          prolog.append(methods[name].toString());
          epilog.append(`${name}:${name},`);
        });
        epilog.append("}");
        prolog.append(epilog.toString());
        params.push(prolog.toString());
        const proc = Function.apply(null, params);
        const compiled = proc.apply(null, args);
        this.json = json;
        this.muData = compiled.muData;
        this.identity = compiled.identity;
        this.pool = compiled.pool;
        this.alloc = compiled.alloc;
        this.free = compiled.free;
        this.equal = compiled.equal;
        this.clone = compiled.clone;
        this.assign = compiled.assign;
        this.diff = compiled.diff;
        this.patch = compiled.patch;
        this.toJSON = compiled.toJSON;
        this.fromJSON = compiled.fromJSON;
        this.stats = compiled.stats;
      }
    };
    exports2.MuStruct = MuStruct5;
  }
});

// node_modules/mudb/schema/union.js
var require_union = __commonJS({
  "node_modules/mudb/schema/union.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var MuUnion2 = class {
      constructor(schemaSpec, identityType) {
        this.muType = "union";
        this.muData = schemaSpec;
        this._types = Object.keys(schemaSpec).sort();
        if (identityType) {
          this.identity = {
            type: identityType,
            data: schemaSpec[identityType].identity
          };
        } else {
          this.identity = {
            type: "",
            data: void 0
          };
        }
        const result = {};
        Object.keys(schemaSpec).forEach((subtype) => {
          result[subtype] = schemaSpec[subtype].json;
        });
        this.json = {
          type: "union",
          identity: this.identity.type,
          data: result
        };
      }
      alloc() {
        const type = this.identity.type;
        return {
          type,
          data: type ? this.muData[type].clone(this.identity.data) : void 0
        };
      }
      free(union) {
        const schema = this.muData[union.type];
        if (schema) {
          schema.free(union.data);
        }
      }
      equal(a, b) {
        if (a.type !== b.type) {
          return false;
        }
        if (a.type === "") {
          return true;
        }
        return this.muData[a.type].equal(a.data, b.data);
      }
      clone(union) {
        const type = union.type;
        return {
          type,
          data: type ? this.muData[type].clone(union.data) : void 0
        };
      }
      assign(dst, src) {
        const dType = dst.type;
        const sType = src.type;
        const schema = this.muData;
        dst.type = src.type;
        if (dst.type !== dType) {
          schema[dType] && schema[dType].free(dst.data);
          if (sType) {
            schema[sType] && (dst.data = schema[sType].clone(src.data));
          } else {
            dst.data = void 0;
          }
          return dst;
        }
        if (schema[dType]) {
          dst.data = schema[dType].assign(dst.data, src.data);
        }
        return dst;
      }
      diff(base, target, out) {
        out.grow(8);
        const head = out.offset;
        ++out.offset;
        let opcode = 0;
        const schema = this.muData[target.type];
        if (base.type === target.type) {
          if (schema.diff(base.data, target.data, out)) {
            opcode = 1;
          }
        } else {
          out.writeUint8(this._types.indexOf(target.type));
          if (schema.diff(schema.identity, target.data, out)) {
            opcode = 2;
          } else {
            opcode = 4;
          }
        }
        if (opcode) {
          out.writeUint8At(head, opcode);
          return true;
        }
        out.offset = head;
        return false;
      }
      patch(base, inp) {
        const result = this.clone(base);
        const opcode = inp.readUint8();
        if (opcode === 1) {
          result.data = this.muData[result.type].patch(result.data, inp);
        } else {
          result.type = this._types[inp.readUint8()];
          const schema = this.muData[result.type];
          if (opcode === 2) {
            result.data = schema.patch(schema.identity, inp);
          } else if (opcode === 4) {
            result.data = schema.clone(schema.identity);
          } else {
            throw new Error(`invalid opcode ${opcode}`);
          }
        }
        return result;
      }
      toJSON(union) {
        return {
          type: union.type,
          data: this.muData[union.type].toJSON(union.data)
        };
      }
      fromJSON(x) {
        if (typeof x === "object" && x) {
          const type = x.type;
          if (typeof type === "string" && type in this.muData) {
            return {
              type,
              data: this.muData[type].fromJSON(x.data)
            };
          }
        }
        return this.clone(this.identity);
      }
    };
    exports2.MuUnion = MuUnion2;
  }
});

// node_modules/mudb/schema/bytes.js
var require_bytes = __commonJS({
  "node_modules/mudb/schema/bytes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var MuBytes = class {
      constructor(identity) {
        this.muType = "bytes";
        this.pool = {};
        if (identity) {
          this.identity = identity.slice();
        } else {
          this.identity = new Uint8Array(1);
        }
        this.json = {
          type: "bytes",
          identity: `[${Array.prototype.slice.call(this.identity).join()}]`
        };
      }
      _allocBytes(length) {
        return this.pool[length] && this.pool[length].pop() || new Uint8Array(length);
      }
      alloc() {
        return this._allocBytes(this.identity.length);
      }
      free(bytes) {
        const length = bytes.length;
        if (!this.pool[length]) {
          this.pool[length] = [];
        }
        this.pool[length].push(bytes);
      }
      equal(a, b) {
        if (a.length !== b.length) {
          return false;
        }
        for (let i = a.length - 1; i >= 0; --i) {
          if (a[i] !== b[i]) {
            return false;
          }
        }
        return true;
      }
      clone(bytes) {
        const copy = this._allocBytes(bytes.length);
        copy.set(bytes);
        return copy;
      }
      assign(dst, src) {
        if (dst.length !== src.length) {
          throw new Error("dst and src are of different lengths");
        }
        dst.set(src);
        return dst;
      }
      diff(base, target, out) {
        const length = target.length;
        out.grow(5 + length);
        out.writeVarint(length);
        out.buffer.uint8.set(target, out.offset);
        out.offset += length;
        return true;
      }
      patch(base, inp) {
        const length = inp.readVarint();
        const target = this._allocBytes(length);
        const bytes = inp.buffer.uint8.subarray(inp.offset, inp.offset += length);
        target.set(bytes);
        return target;
      }
      toJSON(bytes) {
        const arr = new Array(bytes.length);
        for (let i = 0; i < arr.length; ++i) {
          arr[i] = bytes[i];
        }
        return arr;
      }
      fromJSON(x) {
        if (Array.isArray(x)) {
          const bytes = this._allocBytes(x.length);
          bytes.set(x);
          return bytes;
        }
        return this.clone(this.identity);
      }
    };
    exports2.MuBytes = MuBytes;
  }
});

// node_modules/mudb/schema/dictionary.js
var require_dictionary = __commonJS({
  "node_modules/mudb/schema/dictionary.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var is_primitive_1 = require_is_primitive();
    function assignPrimitive(dst, src) {
      const dKeys = Object.keys(dst);
      const sKeys = Object.keys(src);
      for (let i = 0; i < dKeys.length; ++i) {
        const k = dKeys[i];
        if (!(k in src)) {
          delete dst[k];
        }
      }
      for (let i = 0; i < sKeys.length; ++i) {
        const k = sKeys[i];
        dst[k] = src[k];
      }
      return dst;
    }
    function assignGeneric(schema) {
      return (dst, src) => {
        const dKeys = Object.keys(dst);
        const sKeys = Object.keys(src);
        for (let i = 0; i < dKeys.length; ++i) {
          const k = dKeys[i];
          if (!(k in src)) {
            schema.free(dst[k]);
            delete dst[k];
          }
        }
        for (let i = 0; i < sKeys.length; ++i) {
          const k = sKeys[i];
          if (k in dst) {
            dst[k] = schema.assign(dst[k], src[k]);
          } else {
            dst[k] = schema.clone(src[k]);
          }
        }
        return dst;
      };
    }
    var MuDictionary3 = class {
      constructor(schema, capacity, identity) {
        this.muType = "dictionary";
        this.muData = schema;
        this.capacity = capacity;
        this.identity = {};
        if (identity) {
          const keys = Object.keys(identity);
          for (let i = 0; i < keys.length; ++i) {
            const k = keys[i];
            this.identity[k] = schema.clone(identity[k]);
          }
        }
        this.json = {
          type: "dictionary",
          valueType: schema.json,
          identity: JSON.stringify(this.identity)
        };
        if (is_primitive_1.isMuPrimitiveType(schema.muType)) {
          this.assign = assignPrimitive;
        } else {
          this.assign = assignGeneric(schema);
        }
      }
      alloc() {
        return {};
      }
      free(dict) {
        const props = Object.keys(dict);
        const schema = this.muData;
        for (let i = 0; i < props.length; ++i) {
          schema.free(dict[props[i]]);
        }
      }
      equal(a, b) {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) {
          return false;
        }
        for (let i = aKeys.length - 1; i >= 0; --i) {
          if (!(aKeys[i] in b)) {
            return false;
          }
        }
        const schema = this.muData;
        for (let i = 0; i < aKeys.length; ++i) {
          const k = aKeys[i];
          if (!schema.equal(a[k], b[k])) {
            return false;
          }
        }
        return true;
      }
      clone(dict) {
        const copy = {};
        const keys = Object.keys(dict);
        const schema = this.muData;
        for (let i = 0; i < keys.length; ++i) {
          const k = keys[i];
          copy[k] = schema.clone(dict[k]);
        }
        return copy;
      }
      diff(base, target, out) {
        let numDel = 0;
        let numPatch = 0;
        let numAdd = 0;
        out.grow(12);
        const head = out.offset;
        out.offset += 12;
        const bKeys = Object.keys(base).sort();
        out.grow(5 * bKeys.length);
        for (let i = 0; i < bKeys.length; ++i) {
          if (!(bKeys[i] in target)) {
            ++numDel;
            out.writeVarint(i);
          }
        }
        const tKeys = Object.keys(target);
        const schema = this.muData;
        const newKeys = [];
        for (let i = 0; i < tKeys.length; ++i) {
          const key = tKeys[i];
          if (key in base) {
            const prefix = out.offset;
            out.grow(5);
            out.writeVarint(bKeys.indexOf(key));
            if (schema.diff(base[key], target[key], out)) {
              ++numPatch;
            } else {
              out.offset = prefix;
            }
          } else {
            newKeys.push(key);
          }
        }
        numAdd = newKeys.length;
        const numTrackers = Math.ceil(numAdd / 8);
        out.grow(numTrackers);
        let trackerOffset = out.offset;
        out.offset += numTrackers;
        let tracker = 0;
        for (let i = 0; i < numAdd; ++i) {
          const key = newKeys[i];
          out.writeString(key);
          if (schema.diff(schema.identity, target[key], out)) {
            tracker |= 1 << (i & 7);
          }
          if ((i & 7) === 7) {
            out.writeUint8At(trackerOffset++, tracker);
            tracker = 0;
          }
        }
        if (numAdd & 7) {
          out.writeUint8At(trackerOffset, tracker);
        }
        if (numDel > 0 || numPatch > 0 || numAdd > 0) {
          out.writeUint32At(head, numDel);
          out.writeUint32At(head + 4, numPatch);
          out.writeUint32At(head + 8, numAdd);
          return true;
        }
        out.offset = head;
        return false;
      }
      patch(base, inp) {
        const numDel = inp.readUint32();
        const numPatch = inp.readUint32();
        const numAdd = inp.readUint32();
        const bKeys = Object.keys(base).sort();
        const numTargetProps = bKeys.length - numDel + numAdd;
        if (numTargetProps > this.capacity) {
          throw new Error(`number of target props ${numTargetProps} exceeds capacity ${this.capacity}`);
        }
        const result = {};
        const schema = this.muData;
        const keysToDel = {};
        for (let i = 0; i < numDel; ++i) {
          keysToDel[bKeys[inp.readVarint()]] = true;
        }
        for (let i = 0; i < bKeys.length; ++i) {
          const key = bKeys[i];
          if (!keysToDel[key]) {
            result[key] = schema.clone(base[key]);
          }
        }
        for (let i = 0; i < numPatch; ++i) {
          const idx = inp.readVarint();
          const key = bKeys[idx];
          if (!key) {
            throw new Error(`invalid index of key`);
          }
          result[key] = schema.patch(base[key], inp);
        }
        const numFullTrackers = numAdd / 8 | 0;
        const numTrackers = Math.ceil(numAdd / 8);
        let trackerOffset = inp.offset;
        inp.offset += numTrackers;
        for (let i = 0; i < numFullTrackers; ++i) {
          const tracker = inp.readUint8At(trackerOffset++);
          for (let j = 0; j < 8; ++j) {
            result[inp.readString()] = tracker & 1 << j ? schema.patch(schema.identity, inp) : schema.clone(schema.identity);
          }
        }
        if (numAdd & 7) {
          const tracker = inp.readUint8At(trackerOffset);
          for (let i = 0; i < (numAdd & 7); ++i) {
            result[inp.readString()] = tracker & 1 << i ? schema.patch(schema.identity, inp) : schema.clone(schema.identity);
          }
        }
        return result;
      }
      toJSON(dict) {
        const json = {};
        const keys = Object.keys(dict);
        const schema = this.muData;
        for (let i = 0; i < keys.length; ++i) {
          const k = keys[i];
          json[k] = schema.toJSON(dict[k]);
        }
        return json;
      }
      fromJSON(x) {
        if (Object.prototype.toString.call(x) === "[object Object]") {
          const dict = {};
          const keys = Object.keys(x);
          const schema = this.muData;
          for (let i = 0; i < keys.length; ++i) {
            const k = keys[i];
            dict[k] = schema.fromJSON(x[k]);
          }
          return dict;
        }
        return this.clone(this.identity);
      }
    };
    exports2.MuDictionary = MuDictionary3;
  }
});

// node_modules/mudb/schema/vector.js
var require_vector = __commonJS({
  "node_modules/mudb/schema/vector.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var muTypeToTypedArray = {
      float32: Float32Array,
      float64: Float64Array,
      int8: Int8Array,
      int16: Int16Array,
      int32: Int32Array,
      uint8: Uint8Array,
      uint16: Uint16Array,
      uint32: Uint32Array
    };
    var MuVector = class {
      constructor(schema, dimension) {
        this.muType = "vector";
        this._pool = [];
        this.muData = schema;
        this.dimension = dimension;
        this.TypedArray = muTypeToTypedArray[schema.muType];
        this.identity = new this.TypedArray(dimension);
        for (let i = 0; i < dimension; ++i) {
          this.identity[i] = schema.identity;
        }
        this.json = {
          type: "vector",
          valueType: schema.json,
          dimension
        };
        this.__b = new this.TypedArray(dimension);
        this.__t = new this.TypedArray(dimension);
        this._b = new Uint8Array(this.__b.buffer);
        this._t = new Uint8Array(this.__t.buffer);
      }
      alloc() {
        return this._pool.pop() || new this.TypedArray(this.dimension);
      }
      free(vec) {
        this._pool.push(vec);
      }
      equal(a, b) {
        if (!(a instanceof this.TypedArray) || !(b instanceof this.TypedArray)) {
          return false;
        }
        if (a.length !== b.length) {
          return false;
        }
        for (let i = a.length - 1; i >= 0; --i) {
          if (a[i] !== b[i]) {
            return false;
          }
        }
        return true;
      }
      clone(vec) {
        const copy = this.alloc();
        copy.set(vec);
        return copy;
      }
      assign(dst, src) {
        dst.set(src);
        return dst;
      }
      diff(base, target, out) {
        this.__b.set(base);
        this.__t.set(target);
        const byteLength = this.identity.byteLength;
        out.grow(Math.ceil(byteLength * 9 / 8));
        const head = out.offset;
        let trackerOffset = head;
        out.offset += Math.ceil(byteLength / 8);
        let tracker = 0;
        let numPatches = 0;
        for (let i = 0; i < byteLength; ++i) {
          if (this._b[i] !== this._t[i]) {
            out.writeUint8(this._t[i]);
            tracker |= 1 << (i & 7);
            ++numPatches;
          }
          if ((i & 7) === 7) {
            out.writeUint8At(trackerOffset++, tracker);
            tracker = 0;
          }
        }
        if (numPatches === 0) {
          out.offset = head;
          return false;
        }
        if (byteLength & 7) {
          out.writeUint8At(trackerOffset, tracker);
        }
        return true;
      }
      patch(base, inp) {
        const head = inp.offset;
        const numTrackerBits = this.dimension * this.identity.BYTES_PER_ELEMENT;
        const numTrackerFullBytes = Math.floor(numTrackerBits / 8);
        const numTrackerBytes = Math.ceil(numTrackerBits / 8);
        inp.offset = head + numTrackerBytes;
        this.__b.set(base);
        for (let i = 0; i < numTrackerFullBytes; ++i) {
          const start = i * 8;
          const tracker = inp.readUint8At(head + i);
          for (let j = 0; j < 8; ++j) {
            if (tracker & 1 << j) {
              this._b[start + j] = inp.readUint8();
            }
          }
        }
        if (numTrackerBits & 7) {
          const start = numTrackerFullBytes * 8;
          const tracker = inp.readUint8At(head + numTrackerFullBytes);
          const partialBits = numTrackerBits & 7;
          for (let j = 0; j < partialBits; ++j) {
            if (tracker & 1 << j) {
              this._b[start + j] = inp.readUint8();
            }
          }
        }
        return this.clone(this.__b);
      }
      toJSON(vec) {
        const arr = new Array(vec.length);
        for (let i = 0; i < arr.length; ++i) {
          arr[i] = vec[i];
        }
        return arr;
      }
      fromJSON(x) {
        if (Array.isArray(x)) {
          const vec = this.alloc();
          for (let i = 0; i < vec.length; ++i) {
            vec[i] = this.muData.fromJSON(x[i]);
          }
          return vec;
        }
        return this.clone(this.identity);
      }
    };
    exports2.MuVector = MuVector;
  }
});

// node_modules/mudb/schema/date.js
var require_date = __commonJS({
  "node_modules/mudb/schema/date.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var MuDate2 = class {
      constructor(identity) {
        this.muType = "date";
        this.pool = [];
        this.identity = /* @__PURE__ */ new Date(0);
        if (identity) {
          this.identity.setTime(identity.getTime());
        }
        this.json = {
          type: "date",
          identity: this.identity.toISOString()
        };
      }
      alloc() {
        return this.pool.pop() || /* @__PURE__ */ new Date();
      }
      free(date) {
        this.pool.push(date);
      }
      equal(a, b) {
        return a.getTime() === b.getTime();
      }
      clone(date_) {
        const date = this.alloc();
        date.setTime(date_.getTime());
        return date;
      }
      assign(dst, src) {
        dst.setTime(src.getTime());
        return dst;
      }
      diff(base, target, out) {
        const bt = base.getTime();
        const tt = target.getTime();
        if (bt !== tt) {
          out.grow(10);
          out.writeVarint(tt % 268435456);
          out.writeVarint(tt / 268435456 | 0);
          return true;
        }
        return false;
      }
      patch(base, inp) {
        const date = this.alloc();
        const lo = inp.readVarint();
        const hi = inp.readVarint();
        date.setTime(lo + 268435456 * hi);
        return date;
      }
      toJSON(date) {
        return date.toISOString();
      }
      fromJSON(x) {
        if (typeof x === "string") {
          const ms = Date.parse(x);
          if (ms) {
            const date = this.alloc();
            date.setTime(ms);
            return date;
          }
        }
        return this.clone(this.identity);
      }
    };
    exports2.MuDate = MuDate2;
  }
});

// node_modules/mudb/schema/json.js
var require_json = __commonJS({
  "node_modules/mudb/schema/json.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function equal(a, b) {
      if (a === b) {
        return true;
      }
      if (a && b && typeof a === "object" && typeof b === "object") {
        const aIsArr = Array.isArray(a);
        const bIsArr = Array.isArray(b);
        if (aIsArr !== bIsArr) {
          return false;
        }
        if (aIsArr) {
          const leng = a.length;
          if (leng !== b.length) {
            return false;
          }
          for (let i = leng - 1; i >= 0; --i) {
            if (!equal(a[i], b[i])) {
              return false;
            }
          }
          return true;
        }
        const keys = Object.keys(a);
        if (keys.length !== Object.keys(b).length) {
          return false;
        }
        for (let i = 0; i < keys.length; ++i) {
          const key = keys[i];
          if (!b.hasOwnProperty(key) || !equal(a[key], b[key])) {
            return false;
          }
        }
        return true;
      }
      return a !== a && b !== b;
    }
    function clone(x) {
      if (typeof x !== "object" || x === null) {
        return x;
      }
      const copy = Array.isArray(x) ? [] : {};
      if (Array.isArray(copy)) {
        copy.length = x.length;
        for (let i = 0; i < x.length; ++i) {
          copy[i] = clone(x[i]);
        }
      } else {
        const keys = Object.keys(x);
        for (let i = 0; i < keys.length; ++i) {
          const key = keys[i];
          copy[key] = clone(x[key]);
        }
      }
      return copy;
    }
    exports2.deepEqual = equal;
    exports2.deepClone = clone;
    var MuJSON2 = class {
      constructor(identity) {
        this.muType = "json";
        this.identity = identity && clone(identity);
        this.identity = this.identity || {};
        this.json = {
          type: "json",
          identity: this.identity
        };
      }
      alloc() {
        return {};
      }
      free() {
      }
      equal(a, b) {
        return exports2.deepEqual(a, b);
      }
      clone(obj) {
        return exports2.deepClone(obj);
      }
      assign(dst, src) {
        if (Array.isArray(dst) && Array.isArray(src)) {
          dst.length = src.length;
          for (let i = 0; i < dst.length; ++i) {
            dst[i] = exports2.deepClone(src[i]);
          }
          return dst;
        }
        const dKeys = Object.keys(dst);
        for (let i = 0; i < dKeys.length; ++i) {
          const key = dKeys[i];
          if (!(key in src)) {
            delete dst[key];
          }
        }
        const sKeys = Object.keys(src);
        for (let i = 0; i < sKeys.length; ++i) {
          const key = sKeys[i];
          dst[key] = exports2.deepClone(src[key]);
        }
        return dst;
      }
      diff(base, target, out) {
        const str = JSON.stringify(target);
        out.writeString(str);
        return true;
      }
      patch(base, inp) {
        return JSON.parse(inp.readString());
      }
      toJSON(obj) {
        return obj;
      }
      fromJSON(x) {
        if (typeof x === "object" && x) {
          return x;
        }
        return this.clone(this.identity);
      }
    };
    exports2.MuJSON = MuJSON2;
  }
});

// node_modules/mudb/schema/index.js
var require_schema = __commonJS({
  "node_modules/mudb/schema/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var void_1 = require_void();
    exports2.MuVoid = void_1.MuVoid;
    var boolean_1 = require_boolean();
    exports2.MuBoolean = boolean_1.MuBoolean;
    var ascii_1 = require_ascii();
    exports2.MuASCII = ascii_1.MuASCII;
    var fixed_ascii_1 = require_fixed_ascii();
    exports2.MuFixedASCII = fixed_ascii_1.MuFixedASCII;
    var utf8_1 = require_utf8();
    exports2.MuUTF8 = utf8_1.MuUTF8;
    var float32_1 = require_float32();
    exports2.MuFloat32 = float32_1.MuFloat32;
    var float64_1 = require_float64();
    exports2.MuFloat64 = float64_1.MuFloat64;
    var int8_1 = require_int8();
    exports2.MuInt8 = int8_1.MuInt8;
    var int16_1 = require_int16();
    exports2.MuInt16 = int16_1.MuInt16;
    var int32_1 = require_int32();
    exports2.MuInt32 = int32_1.MuInt32;
    var uint8_1 = require_uint8();
    exports2.MuUint8 = uint8_1.MuUint8;
    var uint16_1 = require_uint16();
    exports2.MuUint16 = uint16_1.MuUint16;
    var uint32_1 = require_uint32();
    exports2.MuUint32 = uint32_1.MuUint32;
    var varint_1 = require_varint();
    exports2.MuVarint = varint_1.MuVarint;
    var rvarint_1 = require_rvarint();
    exports2.MuRelativeVarint = rvarint_1.MuRelativeVarint;
    var quantized_float_1 = require_quantized_float();
    exports2.MuQuantizedFloat = quantized_float_1.MuQuantizedFloat;
    var array_1 = require_array();
    exports2.MuArray = array_1.MuArray;
    var option_1 = require_option();
    exports2.MuOption = option_1.MuOption;
    var sorted_array_1 = require_sorted_array();
    exports2.MuSortedArray = sorted_array_1.MuSortedArray;
    var struct_1 = require_struct();
    exports2.MuStruct = struct_1.MuStruct;
    var union_1 = require_union();
    exports2.MuUnion = union_1.MuUnion;
    var bytes_1 = require_bytes();
    exports2.MuBytes = bytes_1.MuBytes;
    var dictionary_1 = require_dictionary();
    exports2.MuDictionary = dictionary_1.MuDictionary;
    var vector_1 = require_vector();
    exports2.MuVector = vector_1.MuVector;
    var date_1 = require_date();
    exports2.MuDate = date_1.MuDate;
    var json_1 = require_json();
    exports2.MuJSON = json_1.MuJSON;
  }
});

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports2, module2) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module2.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: /* @__PURE__ */ Symbol("kIsForOnEventAttribute"),
      kListener: /* @__PURE__ */ Symbol("kListener"),
      kStatusCode: /* @__PURE__ */ Symbol("status-code"),
      kWebSocket: /* @__PURE__ */ Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/node-gyp-build/node-gyp-build.js
var require_node_gyp_build = __commonJS({
  "node_modules/node-gyp-build/node-gyp-build.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var os = require("os");
    var runtimeRequire = typeof __webpack_require__ === "function" ? __non_webpack_require__ : require;
    var vars = process.config && process.config.variables || {};
    var prebuildsOnly = !!process.env.PREBUILDS_ONLY;
    var abi = process.versions.modules;
    var runtime = isElectron() ? "electron" : isNwjs() ? "node-webkit" : "node";
    var arch = process.env.npm_config_arch || os.arch();
    var platform = process.env.npm_config_platform || os.platform();
    var libc = process.env.LIBC || (isAlpine(platform) ? "musl" : "glibc");
    var armv = process.env.ARM_VERSION || (arch === "arm64" ? "8" : vars.arm_version) || "";
    var uv = (process.versions.uv || "").split(".")[0];
    module2.exports = load;
    function load(dir) {
      return runtimeRequire(load.resolve(dir));
    }
    load.resolve = load.path = function(dir) {
      dir = path.resolve(dir || ".");
      try {
        var name = runtimeRequire(path.join(dir, "package.json")).name.toUpperCase().replace(/-/g, "_");
        if (process.env[name + "_PREBUILD"]) dir = process.env[name + "_PREBUILD"];
      } catch (err) {
      }
      if (!prebuildsOnly) {
        var release = getFirst(path.join(dir, "build/Release"), matchBuild);
        if (release) return release;
        var debug = getFirst(path.join(dir, "build/Debug"), matchBuild);
        if (debug) return debug;
      }
      var prebuild = resolve9(dir);
      if (prebuild) return prebuild;
      var nearby = resolve9(path.dirname(process.execPath));
      if (nearby) return nearby;
      var target = [
        "platform=" + platform,
        "arch=" + arch,
        "runtime=" + runtime,
        "abi=" + abi,
        "uv=" + uv,
        armv ? "armv=" + armv : "",
        "libc=" + libc,
        "node=" + process.versions.node,
        process.versions.electron ? "electron=" + process.versions.electron : "",
        typeof __webpack_require__ === "function" ? "webpack=true" : ""
        // eslint-disable-line
      ].filter(Boolean).join(" ");
      throw new Error("No native build was found for " + target + "\n    loaded from: " + dir + "\n");
      function resolve9(dir2) {
        var tuples = readdirSync(path.join(dir2, "prebuilds")).map(parseTuple);
        var tuple = tuples.filter(matchTuple(platform, arch)).sort(compareTuples)[0];
        if (!tuple) return;
        var prebuilds = path.join(dir2, "prebuilds", tuple.name);
        var parsed = readdirSync(prebuilds).map(parseTags);
        var candidates = parsed.filter(matchTags(runtime, abi));
        var winner = candidates.sort(compareTags(runtime))[0];
        if (winner) return path.join(prebuilds, winner.file);
      }
    };
    function readdirSync(dir) {
      try {
        return fs.readdirSync(dir);
      } catch (err) {
        return [];
      }
    }
    function getFirst(dir, filter) {
      var files = readdirSync(dir).filter(filter);
      return files[0] && path.join(dir, files[0]);
    }
    function matchBuild(name) {
      return /\.node$/.test(name);
    }
    function parseTuple(name) {
      var arr = name.split("-");
      if (arr.length !== 2) return;
      var platform2 = arr[0];
      var architectures = arr[1].split("+");
      if (!platform2) return;
      if (!architectures.length) return;
      if (!architectures.every(Boolean)) return;
      return { name, platform: platform2, architectures };
    }
    function matchTuple(platform2, arch2) {
      return function(tuple) {
        if (tuple == null) return false;
        if (tuple.platform !== platform2) return false;
        return tuple.architectures.includes(arch2);
      };
    }
    function compareTuples(a, b) {
      return a.architectures.length - b.architectures.length;
    }
    function parseTags(file) {
      var arr = file.split(".");
      var extension = arr.pop();
      var tags = { file, specificity: 0 };
      if (extension !== "node") return;
      for (var i = 0; i < arr.length; i++) {
        var tag = arr[i];
        if (tag === "node" || tag === "electron" || tag === "node-webkit") {
          tags.runtime = tag;
        } else if (tag === "napi") {
          tags.napi = true;
        } else if (tag.slice(0, 3) === "abi") {
          tags.abi = tag.slice(3);
        } else if (tag.slice(0, 2) === "uv") {
          tags.uv = tag.slice(2);
        } else if (tag.slice(0, 4) === "armv") {
          tags.armv = tag.slice(4);
        } else if (tag === "glibc" || tag === "musl") {
          tags.libc = tag;
        } else {
          continue;
        }
        tags.specificity++;
      }
      return tags;
    }
    function matchTags(runtime2, abi2) {
      return function(tags) {
        if (tags == null) return false;
        if (tags.runtime && tags.runtime !== runtime2 && !runtimeAgnostic(tags)) return false;
        if (tags.abi && tags.abi !== abi2 && !tags.napi) return false;
        if (tags.uv && tags.uv !== uv) return false;
        if (tags.armv && tags.armv !== armv) return false;
        if (tags.libc && tags.libc !== libc) return false;
        return true;
      };
    }
    function runtimeAgnostic(tags) {
      return tags.runtime === "node" && tags.napi;
    }
    function compareTags(runtime2) {
      return function(a, b) {
        if (a.runtime !== b.runtime) {
          return a.runtime === runtime2 ? -1 : 1;
        } else if (a.abi !== b.abi) {
          return a.abi ? -1 : 1;
        } else if (a.specificity !== b.specificity) {
          return a.specificity > b.specificity ? -1 : 1;
        } else {
          return 0;
        }
      };
    }
    function isNwjs() {
      return !!(process.versions && process.versions.nw);
    }
    function isElectron() {
      if (process.versions && process.versions.electron) return true;
      if (process.env.ELECTRON_RUN_AS_NODE) return true;
      return typeof window !== "undefined" && window.process && window.process.type === "renderer";
    }
    function isAlpine(platform2) {
      return platform2 === "linux" && fs.existsSync("/etc/alpine-release");
    }
    load.parseTags = parseTags;
    load.matchTags = matchTags;
    load.compareTags = compareTags;
    load.parseTuple = parseTuple;
    load.matchTuple = matchTuple;
    load.compareTuples = compareTuples;
  }
});

// node_modules/node-gyp-build/index.js
var require_node_gyp_build2 = __commonJS({
  "node_modules/node-gyp-build/index.js"(exports2, module2) {
    var runtimeRequire = typeof __webpack_require__ === "function" ? __non_webpack_require__ : require;
    if (typeof runtimeRequire.addon === "function") {
      module2.exports = runtimeRequire.addon.bind(runtimeRequire);
    } else {
      module2.exports = require_node_gyp_build();
    }
  }
});

// node_modules/bufferutil/fallback.js
var require_fallback = __commonJS({
  "node_modules/bufferutil/fallback.js"(exports2, module2) {
    "use strict";
    var mask = (source, mask2, output, offset, length) => {
      for (var i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask2[i & 3];
      }
    };
    var unmask = (buffer, mask2) => {
      const length = buffer.length;
      for (var i = 0; i < length; i++) {
        buffer[i] ^= mask2[i & 3];
      }
    };
    module2.exports = { mask, unmask };
  }
});

// node_modules/bufferutil/index.js
var require_bufferutil = __commonJS({
  "node_modules/bufferutil/index.js"(exports2, module2) {
    "use strict";
    try {
      module2.exports = require_node_gyp_build2()(__dirname);
    } catch (e) {
      module2.exports = require_fallback();
    }
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports2, module2) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module2.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = require_bufferutil();
        module2.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module2.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports2, module2) {
    "use strict";
    var kDone = /* @__PURE__ */ Symbol("kDone");
    var kRun = /* @__PURE__ */ Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module2.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports2, module2) {
    "use strict";
    var zlib = require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = /* @__PURE__ */ Symbol("permessage-deflate");
    var kTotalLength = /* @__PURE__ */ Symbol("total-length");
    var kCallback = /* @__PURE__ */ Symbol("callback");
    var kBuffers = /* @__PURE__ */ Symbol("buffers");
    var kError = /* @__PURE__ */ Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers2) {
        const opts = this._options;
        const accepted = offers2.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module2.exports = PerMessageDeflate;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/utf-8-validate/fallback.js
var require_fallback2 = __commonJS({
  "node_modules/utf-8-validate/fallback.js"(exports2, module2) {
    "use strict";
    var isValidUTF8 = (buf) => {
      var len = buf.length;
      var i = 0;
      while (i < len) {
        if (buf[i] < 128) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          } else {
            i += 2;
          }
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          } else {
            i += 3;
          }
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          } else {
            i += 4;
          }
        } else {
          return false;
        }
      }
      return true;
    };
    module2.exports = isValidUTF8;
  }
});

// node_modules/utf-8-validate/index.js
var require_utf_8_validate = __commonJS({
  "node_modules/utf-8-validate/index.js"(exports2, module2) {
    "use strict";
    try {
      module2.exports = require_node_gyp_build2()(__dirname);
    } catch (e) {
      module2.exports = require_fallback2();
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports2, module2) {
    "use strict";
    var { isUtf8 } = require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module2.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module2.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = require_utf_8_validate();
        module2.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports2, module2) {
    "use strict";
    var { Writable } = require("stream");
    var PerMessageDeflate = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module2.exports = Receiver;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports2, module2) {
    "use strict";
    var { Duplex } = require("stream");
    var { randomFillSync } = require("crypto");
    var {
      types: { isUint8Array }
    } = require("util");
    var PerMessageDeflate = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = /* @__PURE__ */ Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module2.exports = Sender;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports2, module2) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = /* @__PURE__ */ Symbol("kCode");
    var kData = /* @__PURE__ */ Symbol("kData");
    var kError = /* @__PURE__ */ Symbol("kError");
    var kMessage = /* @__PURE__ */ Symbol("kMessage");
    var kReason = /* @__PURE__ */ Symbol("kReason");
    var kTarget = /* @__PURE__ */ Symbol("kTarget");
    var kType = /* @__PURE__ */ Symbol("kType");
    var kWasClean = /* @__PURE__ */ Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module2.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers2 = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers2, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers2, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers2, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers2, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers2, extensionName, params);
      }
      return offers2;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension) => {
        let configurations = extensions[extension];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module2.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var https = require("https");
    var http = require("http");
    var net = require("net");
    var tls = require("tls");
    var { randomBytes, createHash: createHash8 } = require("crypto");
    var { Duplex, Readable } = require("stream");
    var { URL: URL2 } = require("url");
    var PerMessageDeflate = require_permessage_deflate();
    var Receiver = require_receiver();
    var Sender = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = /* @__PURE__ */ Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate.extensionName]) {
          this._extensions[PerMessageDeflate.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket.prototype.addEventListener = addEventListener;
    WebSocket.prototype.removeEventListener = removeEventListener;
    module2.exports = WebSocket;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash8("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket.CLOSED) return;
      if (websocket.readyState === WebSocket.OPEN) {
        websocket._readyState = WebSocket.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream2 = __commonJS({
  "node_modules/ws/lib/stream.js"(exports2, module2) {
    "use strict";
    var WebSocket = require_websocket();
    var { Duplex } = require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open2() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open2() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module2.exports = createWebSocketStream;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module2.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var http = require("http");
    var { Duplex } = require("stream");
    var { createHash: createHash8 } = require("crypto");
    var extension = require_extension();
    var PerMessageDeflate = require_permessage_deflate();
    var subprotocol = require_subprotocol();
    var WebSocket = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers2 = extension.parse(secWebSocketExtensions);
            if (offers2[PerMessageDeflate.extensionName]) {
              perMessageDeflate.accept(offers2[PerMessageDeflate.extensionName]);
              extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash8("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate.extensionName]) {
          const params = extensions[PerMessageDeflate.extensionName].params;
          const value = extension.format({
            [PerMessageDeflate.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module2.exports = WebSocketServer;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// node_modules/ws/index.js
var require_ws = __commonJS({
  "node_modules/ws/index.js"(exports2, module2) {
    "use strict";
    var createWebSocketStream = require_stream2();
    var extension = require_extension();
    var PerMessageDeflate = require_permessage_deflate();
    var Receiver = require_receiver();
    var Sender = require_sender();
    var subprotocol = require_subprotocol();
    var WebSocket = require_websocket();
    var WebSocketServer = require_websocket_server();
    WebSocket.createWebSocketStream = createWebSocketStream;
    WebSocket.extension = extension;
    WebSocket.PerMessageDeflate = PerMessageDeflate;
    WebSocket.Receiver = Receiver;
    WebSocket.Sender = Sender;
    WebSocket.Server = WebSocketServer;
    WebSocket.subprotocol = subprotocol;
    WebSocket.WebSocket = WebSocket;
    WebSocket.WebSocketServer = WebSocketServer;
    module2.exports = WebSocket;
  }
});

// node_modules/mudb/socket/socket.js
var require_socket = __commonJS({
  "node_modules/mudb/socket/socket.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var MuSocketState;
    (function(MuSocketState2) {
      MuSocketState2[MuSocketState2["INIT"] = 0] = "INIT";
      MuSocketState2[MuSocketState2["OPEN"] = 1] = "OPEN";
      MuSocketState2[MuSocketState2["CLOSED"] = 2] = "CLOSED";
    })(MuSocketState = exports2.MuSocketState || (exports2.MuSocketState = {}));
    var MuSocketServerState;
    (function(MuSocketServerState2) {
      MuSocketServerState2[MuSocketServerState2["INIT"] = 0] = "INIT";
      MuSocketServerState2[MuSocketServerState2["RUNNING"] = 1] = "RUNNING";
      MuSocketServerState2[MuSocketServerState2["SHUTDOWN"] = 2] = "SHUTDOWN";
    })(MuSocketServerState = exports2.MuSocketServerState || (exports2.MuSocketServerState = {}));
  }
});

// node_modules/mudb/scheduler/perf-now.js
var require_perf_now = __commonJS({
  "node_modules/mudb/scheduler/perf-now.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      exports2.perfNow = () => performance.now();
    } else if (typeof process !== "undefined" && typeof process.hrtime === "function") {
      exports2.perfNow = (() => {
        function nanoSeconds() {
          const hrt = process.hrtime();
          return hrt[0] * 1e9 + hrt[1];
        }
        const loadTime = nanoSeconds() - process.uptime() * 1e9;
        return () => (nanoSeconds() - loadTime) / 1e6;
      })();
    } else if (typeof Date.now === "function") {
      exports2.perfNow = (() => {
        const loadTime = Date.now();
        return () => Date.now() - loadTime;
      })();
    } else {
      exports2.perfNow = (() => {
        const loadTime = (/* @__PURE__ */ new Date()).getTime();
        return () => (/* @__PURE__ */ new Date()).getTime() - loadTime;
      })();
    }
  }
});

// node_modules/mudb/scheduler/system.js
var require_system = __commonJS({
  "node_modules/mudb/scheduler/system.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var perf_now_1 = require_perf_now();
    var root = (typeof self !== "undefined" ? self : global) || {};
    var frameDuration = 1e3 / 60;
    var rAF = root["requestAnimationFrame"] || root["webkitRequestAnimationFrame"] || root["mozRequestAnimationFrame"];
    var cAF = root["cancelAnimationFrame"] || root["webkitCancelAnimationFrame"] || root["mozCancelAnimationFrame"] || root["webkitCancelRequestAnimationFrame"] || root["mozCancelRequestAnimationFrame"];
    if (!rAF || !cAF) {
      const queue = [];
      let last = 0;
      let id = 0;
      rAF = (callback) => {
        if (queue.length === 0) {
          const now_ = perf_now_1.perfNow();
          const next = Math.max(0, frameDuration - (now_ - last));
          last = now_ + next;
          setTimeout(() => {
            const copy = queue.slice(0);
            queue.length = 0;
            for (let i = 0; i < copy.length; ++i) {
              if (!copy[i].cancelled) {
                try {
                  copy[i].callback(last);
                } catch (e) {
                  setTimeout(() => {
                    throw e;
                  }, 0);
                }
              }
            }
          }, Math.round(next));
        }
        queue.push({
          handle: ++id,
          callback,
          cancelled: false
        });
        return id;
      };
      cAF = (handle) => {
        for (let i = 0; i < queue.length; ++i) {
          if (queue[i].handle === handle) {
            queue[i].cancelled = true;
          }
        }
      };
    }
    var rIC = root["requestIdleCallback"];
    var cIC = root["cancelIdleCallback"];
    if (!rIC || !cIC) {
      rIC = (cb, options) => {
        const timeout = options ? options.timeout : 1;
        return setTimeout(() => {
          const start = perf_now_1.perfNow();
          cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (perf_now_1.perfNow() - start))
          });
        }, timeout);
      };
      cIC = (handle) => clearTimeout(handle);
    }
    var nextTick;
    if (typeof process === "object" && process && process.nextTick) {
      nextTick = process.nextTick;
    } else if (typeof setImmediate === "function") {
      nextTick = (cb) => {
        setImmediate(cb);
      };
    } else {
      nextTick = (cb) => {
        setTimeout(cb, 0);
      };
    }
    exports2.MuSystemScheduler = {
      now: () => +/* @__PURE__ */ new Date(),
      setTimeout: (cb, ms) => setTimeout(cb, ms),
      clearTimeout: (handle) => clearTimeout(handle),
      setInterval: (cb, ms) => setInterval(cb, ms),
      clearInterval: (handle) => clearInterval(handle),
      requestAnimationFrame: (cb) => rAF(cb),
      cancelAnimationFrame: (handle) => cAF(handle),
      requestIdleCallback: (cb, options) => rIC(cb, options),
      cancelIdleCallback: (handle) => cIC(handle),
      nextTick: (cb) => nextTick(cb)
    };
    if (typeof performance === "object" && performance && performance.now) {
      exports2.MuSystemScheduler.now = () => performance.now();
    } else if (typeof process === "object" && process && process.hrtime) {
      exports2.MuSystemScheduler.now = () => {
        const time = process.hrtime();
        return time[0] * 1e3 + time[1] / 1e6;
      };
    } else if (Date.now) {
      exports2.MuSystemScheduler.now = () => Date.now();
    }
  }
});

// node_modules/mudb/util/error.js
var require_error = __commonJS({
  "node_modules/mudb/util/error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function makeError(path) {
      return function(errOrMsg) {
        const msg = typeof errOrMsg === "string" ? errOrMsg : errOrMsg.toString();
        return new Error(`${msg} [mudb/${path}]`);
      };
    }
    exports2.makeError = makeError;
  }
});

// node_modules/mudb/socket/web/server.js
var require_server2 = __commonJS({
  "node_modules/mudb/socket/web/server.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var ws = require_ws();
    var url = require("url");
    var socket_1 = require_socket();
    var system_1 = require_system();
    var logger_1 = require_logger();
    var error_1 = require_error();
    var stream_1 = require_stream();
    var error = error_1.makeError("socket/web/server");
    function noop() {
    }
    function coallesceFragments(frags) {
      let size = 0;
      for (let i = 0; i < frags.length; ++i) {
        size += frags[i].length;
      }
      const result = new Uint8Array(size);
      let offset = 0;
      for (let i = 0; i < frags.length; ++i) {
        result.set(frags[i], offset);
        offset += frags[i].length;
      }
      return result;
    }
    var MuWebSocketConnection = class {
      constructor(sessionId, reliableSocket, serverClose, logger, bufferLimit) {
        this.bufferLimit = bufferLimit;
        this.started = false;
        this.closed = false;
        this.unreliableSockets = [];
        this.lastReliablePing = 0;
        this.lastUnreliablePing = [];
        this.pendingMessages = [];
        this.onMessage = noop;
        this.onClose = noop;
        this.sessionId = sessionId;
        this.reliableSocket = reliableSocket;
        this.serverClose = serverClose;
        this._logger = logger;
        this.reliableSocket.onmessage = ({ data }) => {
          if (this.closed) {
            return;
          }
          if (this.started) {
            if (typeof data === "string") {
              this.onMessage(data, false);
            } else if (data.length === 1) {
              this.onMessage(data[0], false);
            } else if (data.length > 1) {
              let size = 0;
              for (let i = 0; i < data.length; ++i) {
                size += data[i].length;
              }
              const buffer = stream_1.allocBuffer(size);
              const result = buffer.uint8;
              let offset = 0;
              for (let i = 0; i < data.length; ++i) {
                result.set(data[i], offset);
                offset += data[i].length;
              }
              this.onMessage(result.subarray(0, offset), false);
              stream_1.freeBuffer(buffer);
            }
          } else {
            if (typeof data === "string") {
              this.pendingMessages.push(data);
            } else {
              this.pendingMessages.push(coallesceFragments(data));
            }
          }
        };
        this.reliableSocket.onclose = () => {
          if (!this.closed) {
            this._logger.log(`unexpectedly closed websocket connection for ${this.sessionId}`);
          } else {
            this._logger.log(`closing websocket connection for ${this.sessionId}`);
          }
          this.closed = true;
          for (let i = 0; i < this.unreliableSockets.length; ++i) {
            this.unreliableSockets[i].close();
          }
          this.onClose();
          this.serverClose();
        };
        this.reliableSocket.onerror = (e) => {
          this._logger.error(`error on reliable socket ${this.sessionId}. reason ${e} ${e.stack ? e.stack : ""}`);
        };
      }
      addUnreliableSocket(socket) {
        if (this.closed) {
          return;
        }
        this.unreliableSockets.push(socket);
        this.lastUnreliablePing.push(0);
        socket.onmessage = ({ data }) => {
          if (this.closed) {
            return;
          }
          if (this.started) {
            if (typeof data === "string") {
              this.onMessage(data, true);
            } else if (data.length === 1) {
              this.onMessage(data[0], true);
            } else if (data.length > 1) {
              let size = 0;
              for (let i = 0; i < data.length; ++i) {
                size += data[i].length;
              }
              const buffer = stream_1.allocBuffer(size);
              const result = buffer.uint8;
              let offset = 0;
              for (let i = 0; i < data.length; ++i) {
                result.set(data[i], offset);
                offset += data[i].length;
              }
              this.onMessage(result.subarray(0, offset), true);
              stream_1.freeBuffer(buffer);
            }
          }
        };
        socket.onclose = () => {
          const idx = this.unreliableSockets.indexOf(socket);
          this.unreliableSockets.splice(idx, 1);
          this.lastUnreliablePing.splice(idx, 1);
          if (!this.closed) {
            this._logger.error(`unreliable socket closed unexpectedly: ${this.sessionId}`);
          }
        };
        socket.onerror = (e) => {
          this._logger.error(`unreliable socket ${this.sessionId} error: ${e} ${e.stack ? e.stack : ""}`);
        };
      }
      send(data, unreliable) {
        if (this.closed) {
          return;
        }
        if (unreliable) {
          const sockets = this.unreliableSockets;
          if (sockets.length > 0) {
            let socket = sockets[0];
            let bufferedAmount = socket.bufferedAmount || 0;
            let idx = 0;
            for (let i = 1; i < sockets.length; ++i) {
              const s = sockets[i];
              const b = s.bufferedAmount || 0;
              if (b < bufferedAmount) {
                socket = s;
                bufferedAmount = b;
                idx = i;
              }
            }
            if (bufferedAmount < this.bufferLimit) {
              socket.send(typeof data === "string" ? data : new Uint8Array(data));
              sockets.splice(idx, 1);
              sockets.push(socket);
            }
          }
        } else {
          this.reliableSocket.send(typeof data === "string" ? data : new Uint8Array(data));
        }
      }
      close() {
        this.reliableSocket.close();
      }
      doPing(now, pingCutoff) {
        if (this.closed) {
          return;
        }
        if (this.lastReliablePing < pingCutoff) {
          this.lastReliablePing = now;
          this.reliableSocket.ping();
        }
        for (let i = 0; i < this.unreliableSockets.length; ++i) {
          if (this.lastUnreliablePing[i] < pingCutoff) {
            this.lastUnreliablePing[i] = now;
            this.unreliableSockets[i].ping();
          }
        }
      }
    };
    exports2.MuWebSocketConnection = MuWebSocketConnection;
    var MuWebSocketClient = class {
      constructor(connection, scheduler, logger) {
        this._state = socket_1.MuSocketState.INIT;
        this.sessionId = connection.sessionId;
        this._connection = connection;
        this._logger = logger;
        this.scheduler = scheduler;
      }
      state() {
        return this._state;
      }
      open(spec) {
        if (this._state !== socket_1.MuSocketState.INIT) {
          throw error(`socket had been opened`);
        }
        this.scheduler.setTimeout(() => {
          if (this._state !== socket_1.MuSocketState.INIT) {
            return;
          }
          this._state = socket_1.MuSocketState.OPEN;
          spec.ready();
          for (let i = 0; i < this._connection.pendingMessages.length; ++i) {
            if (this._connection.closed) {
              break;
            }
            try {
              spec.message(this._connection.pendingMessages[i], false);
            } catch (e) {
              this._logger.exception(e);
            }
          }
          this._connection.pendingMessages.length = 0;
          if (this._connection.closed) {
            this._state = socket_1.MuSocketState.CLOSED;
            spec.close();
          } else {
            this._connection.started = true;
            this._connection.onMessage = spec.message;
            this._connection.onClose = () => {
              this._state = socket_1.MuSocketState.CLOSED;
              spec.close();
            };
          }
        }, 0);
      }
      send(data, unreliable) {
        this._connection.send(data, !!unreliable);
      }
      close() {
        this._logger.log(`close called on websocket ${this.sessionId}`);
        if (this._state !== socket_1.MuSocketState.CLOSED) {
          this._state = socket_1.MuSocketState.CLOSED;
          this._connection.close();
        }
      }
      reliableBufferedAmount() {
        return this._connection.reliableSocket.bufferedAmount;
      }
      unreliableBufferedAmount() {
        let amount = Infinity;
        for (let i = 0; i < this._connection.unreliableSockets.length; ++i) {
          amount = Math.min(amount, this._connection.unreliableSockets[i].bufferedAmount);
        }
        return amount;
      }
    };
    exports2.MuWebSocketClient = MuWebSocketClient;
    var MuWebSocketServer2 = class {
      constructor(spec) {
        this._state = socket_1.MuSocketServerState.INIT;
        this._connections = [];
        this.clients = [];
        this._onClose = noop;
        this._pingInterval = 1e4;
        this._logger = spec.logger || logger_1.MuDefaultLogger;
        this.bufferLimit = spec.bufferLimit || 1024;
        this._options = {
          server: spec.server,
          clientTracking: false
        };
        spec.backlog && (this._options["backlog"] = spec.backlog);
        spec.maxPayload && (this._options["maxPayload"] = spec.maxPayload);
        spec.handleProtocols && (this._options["handleProtocols"] = spec.handleProtocols);
        spec.path && (this._options["path"] = spec.path);
        spec.perMessageDeflate && (this._options["perMessageDeflate"] = spec.perMessageDeflate);
        this.scheduler = spec.scheduler || system_1.MuSystemScheduler;
        if ("pingInterval" in spec) {
          this._pingInterval = spec.pingInterval || 0;
        }
      }
      state() {
        return this._state;
      }
      _findConnection(sessionId) {
        for (let i = 0; i < this._connections.length; ++i) {
          if (this._connections[i].sessionId === sessionId) {
            return this._connections[i];
          }
        }
        return null;
      }
      start(spec) {
        if (this._state !== socket_1.MuSocketServerState.INIT) {
          throw error(`server had been started`);
        }
        if (this._pingInterval) {
          this._pingIntervalId = this.scheduler.setInterval(() => {
            const now = Date.now();
            const pingCutoff = now - this._pingInterval;
            for (let i = 0; i < this._connections.length; ++i) {
              this._connections[i].doPing(now, pingCutoff);
            }
          }, this._pingInterval * 0.5);
        }
        this.scheduler.setTimeout(() => {
          this._wsServer = new ws.Server(this._options).on("connection", (socket, req) => {
            if (this._state === socket_1.MuSocketServerState.SHUTDOWN) {
              this._logger.error("connection attempt from closed socket server");
              socket.terminate();
              return;
            }
            this._logger.log(`muwebsocket connection received: extensions ${socket.extensions} protocol ${socket.protocol}`);
            const query = url.parse(req.url, true).query;
            const sessionId = query["sid"];
            if (typeof sessionId !== "string") {
              this._logger.error(`no session id`);
              return;
            }
            socket.binaryType = "fragments";
            socket.onerror = (e) => {
              this._logger.error(`socket error in opening state: ${e}`);
            };
            socket.onopen = () => this._logger.log("socket opened");
            let connection = this._findConnection(sessionId);
            if (connection) {
              socket.send(JSON.stringify({
                reliable: false
              }));
              connection.addUnreliableSocket(socket);
            } else {
              socket.send(JSON.stringify({
                reliable: true
              }));
              connection = new MuWebSocketConnection(sessionId, socket, () => {
                if (connection) {
                  this._connections.splice(this._connections.indexOf(connection), 1);
                  for (let i = this.clients.length - 1; i >= 0; --i) {
                    if (this.clients[i].sessionId === connection.sessionId) {
                      this.clients.splice(i, 1);
                    }
                  }
                }
              }, this._logger, this.bufferLimit);
              this._connections.push(connection);
              const client = new MuWebSocketClient(connection, this.scheduler, this._logger);
              this.clients.push(client);
              spec.connection(client);
            }
          }).on("error", (e) => {
            this._logger.error(`internal websocket error ${e}.  ${e.stack ? e.stack : ""}`);
          }).on("listening", () => this._logger.log(`muwebsocket server listening: ${JSON.stringify(this._wsServer.address())}`)).on("close", () => {
            if (this._pingIntervalId) {
              this.scheduler.clearInterval(this._pingIntervalId);
            }
            this._logger.log("muwebsocket server closing");
          }).on("headers", (headers) => this._logger.log(`muwebsocket: headers ${headers}`));
          this._onClose = spec.close;
          this._state = socket_1.MuSocketServerState.RUNNING;
          spec.ready();
        }, 0);
      }
      close() {
        if (this._state === socket_1.MuSocketServerState.SHUTDOWN) {
          return;
        }
        this._state = socket_1.MuSocketServerState.SHUTDOWN;
        if (this._wsServer) {
          this._wsServer.close(this._onClose);
        }
      }
    };
    exports2.MuWebSocketServer = MuWebSocketServer2;
  }
});

// legacy/box3-compat/src/bundled-cli.ts
var bundled_cli_exports = {};
__export(bundled_cli_exports, {
  main: () => main
});
module.exports = __toCommonJS(bundled_cli_exports);
var import_node_http2 = require("node:http");

// legacy/box3-compat/src/archive/client-script-modules.ts
var import_node_crypto = require("node:crypto");
var import_promises = require("node:fs/promises");
var import_node_path = require("node:path");
function isSafeModuleName(name) {
  return name.length > 3 && name.endsWith(".js") && !name.includes("/") && !name.includes("\\") && !name.includes("\0") && name !== ".js" && name !== "..js";
}
var { loadClientUiState } = require("./client-ui-state.cjs");
var { parsePlayerBodyProfile } = require("./player-body-profile.cjs");
var sha256Pattern = /^[0-9a-f]{64}$/;
async function loadClientScriptModules(assetRoot, manifestName = "project/bedwars/client-scripts/manifest.json") {
  const root = (0, import_node_path.resolve)(assetRoot);
  const manifestPath = resolveInside(root, manifestName);
  const value = JSON.parse(await (0, import_promises.readFile)(manifestPath, "utf8"));
  const manifest = validateManifest(value);
  const moduleRoot = (0, import_node_path.dirname)(manifestPath);
  const modules = {};
  for (const entry of manifest.files) {
    const bytes = await (0, import_promises.readFile)((0, import_node_path.resolve)(moduleRoot, entry.name));
    const digest = (0, import_node_crypto.createHash)("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== entry.bytes || digest !== entry.sha256) {
      throw new Error(`Client script module does not match its manifest: ${entry.name}`);
    }
    modules[entry.name] = bytes.toString("utf8");
  }
  return Object.freeze(modules);
}
function validateManifest(value) {
  if (!isRecord(value) || value.format !== "nea-recovered-client-scripts" || value.version !== 1 || value.sourceMessage !== "gameNet.syncClientScriptModules" || !Array.isArray(value.files)) {
    throw new Error("Unsupported client script manifest");
  }
  const names = /* @__PURE__ */ new Set();
  for (const entry of value.files) {
    if (!isRecord(entry) || typeof entry.name !== "string" || !isSafeModuleName(entry.name) || !Number.isInteger(entry.bytes) || entry.bytes < 0 || typeof entry.sha256 !== "string" || !sha256Pattern.test(entry.sha256) || names.has(entry.name)) {
      throw new Error("Invalid client script manifest entry");
    }
    names.add(entry.name);
  }
  return value;
}
function resolveInside(root, path) {
  const target = (0, import_node_path.resolve)(root, path);
  const local = (0, import_node_path.relative)(root, target);
  if (local === "" || local.startsWith("..") || (0, import_node_path.isAbsolute)(local)) {
    throw new Error("Client script manifest must be inside the archive root");
  }
  return target;
}
function isRecord(value) {
  return typeof value === "object" && value !== null;
}

// legacy/box3-compat/src/archive/client-runtime.ts
var import_node_crypto2 = require("node:crypto");
var import_promises2 = require("node:fs/promises");
var import_node_path3 = require("node:path");

// legacy/box3-compat/src/archive/asset-kind.ts
var import_node_path2 = require("node:path");
function detectAssetMedia(filename, bytes) {
  if (matches(bytes, [137, 80, 78, 71, 13, 10, 26, 10])) {
    return { kind: "png", contentType: "image/png" };
  }
  if (matches(bytes, [73, 68, 51]) || bytes[0] === 255 && (bytes[1] & 224) === 224) {
    return { kind: "mp3", contentType: "audio/mpeg" };
  }
  switch ((0, import_node_path2.extname)(filename).toLowerCase()) {
    case ".css":
      return { kind: "css", contentType: "text/css; charset=utf-8" };
    case ".html":
      return { kind: "html", contentType: "text/html; charset=utf-8" };
    case ".js":
      return { kind: "javascript", contentType: "text/javascript; charset=utf-8" };
    case ".json":
      return { kind: "json", contentType: "application/json; charset=utf-8" };
    case ".mp3":
      return { kind: "mp3", contentType: "audio/mpeg" };
    case ".png":
      return { kind: "png", contentType: "image/png" };
    case ".svg":
      return { kind: "svg", contentType: "image/svg+xml; charset=utf-8" };
    case ".woff":
      return { kind: "font", contentType: "font/woff" };
    case ".woff2":
      return { kind: "font", contentType: "font/woff2" };
    default:
      return { kind: "binary", contentType: "application/octet-stream" };
  }
}
function matches(bytes, magic) {
  return magic.every((byte, index) => bytes[index] === byte);
}

// legacy/box3-compat/src/archive/client-runtime.ts
var CLIENT_RUNTIME_FORMAT = "nea-recovered-client-runtime";
var CLIENT_RUNTIME_VERSION = 1;
var CLIENT_RUNTIME_MANIFEST_NAME = "project/bedwars/client-runtime/manifest.json";
var localBackgroundHash = "QmTn4FL6hBnoD469zujDAFMpQtZMNwF5Wcc4LtHTqWNYHZ.png";
var sha256Pattern2 = /^[0-9a-f]{64}$/;
var buildIdPattern = /^[A-Za-z0-9_-]{1,128}$/;
var gameNamePattern = /^[a-z0-9_-]{1,128}$/;
var contentIdPattern = /^\d{1,20}$/;
var pagePathPattern = /^\/p\/[A-Za-z0-9_-]{1,128}$/;
var assetSegmentPattern = /^[A-Za-z0-9._-]+$/;
var FileClientRuntime = class _FileClientRuntime {
  constructor(runtimeRoot, manifest) {
    this.runtimeRoot = runtimeRoot;
    this.manifest = manifest;
    this.assetCount = manifest.files.length;
    this.pagePath = manifest.pagePath;
    this.gameName = manifest.gameName;
    this.displayName = "Local BedWars";
    this.contentId = manifest.contentId;
    this.entries = new Map(manifest.files.map((entry) => [entry.path, entry]));
  }
  runtimeRoot;
  manifest;
  assetCount;
  pagePath;
  gameName;
  displayName;
  contentId;
  entries;
  static async load(assetRoot, manifestName = CLIENT_RUNTIME_MANIFEST_NAME) {
    const archiveRoot = await (0, import_promises2.realpath)((0, import_node_path3.resolve)(assetRoot));
    const manifestPath = await (0, import_promises2.realpath)(resolveInside2(archiveRoot, manifestName));
    if (!isInside(archiveRoot, manifestPath)) throw new Error("Client runtime manifest must be inside the archive root");
    const manifest = validateManifest2(JSON.parse(await (0, import_promises2.readFile)(manifestPath, "utf8")));
    const runtimeRoot = await (0, import_promises2.realpath)((0, import_node_path3.dirname)(manifestPath));
    if (!isInside(archiveRoot, runtimeRoot)) throw new Error("Client runtime directory must be inside the archive root");
    return new _FileClientRuntime(runtimeRoot, manifest);
  }
  async get(path) {
    if (!isSafeAssetPath(path)) return void 0;
    const entry = this.entries.get(path);
    if (!entry) return void 0;
    try {
      const filePath = await (0, import_promises2.realpath)((0, import_node_path3.resolve)(this.runtimeRoot, entry.file));
      if (!isInside(this.runtimeRoot, filePath)) return void 0;
      const bytes = await (0, import_promises2.readFile)(filePath);
      const digest = (0, import_node_crypto2.createHash)("sha256").update(bytes).digest("hex");
      if (bytes.byteLength !== entry.bytes || digest !== entry.sha256) {
        throw new Error(`Client runtime asset does not match its manifest: ${entry.path}`);
      }
      const media = detectAssetMedia(entry.path, bytes);
      if (media.contentType !== entry.contentType) {
        throw new Error(`Client runtime asset content type does not match its manifest: ${entry.path}`);
      }
      return { bytes, contentType: media.contentType };
    } catch (error) {
      if (error.code === "ENOENT") return void 0;
      throw error;
    }
  }
  matchesPagePath(path) {
    return path === this.pagePath || path === `/p/${this.gameName}`;
  }
  matchesLauncherPath(path) {
    return path === `/play/${this.gameName}`;
  }
  bindProjectIdentity(gameName, displayName) {
    if (!gameNamePattern.test(gameName)) throw new Error("Project package id cannot be used as a Player route");
    this.gameName = gameName;
    this.displayName = displayName;
    return this;
  }
  getMapInfo(origin) {
    const localOrigin = normalizeOrigin(origin);
    return {
      contentId: this.manifest.contentId,
      name: this.displayName,
      backgroundImage: `${localOrigin}/block/${localBackgroundHash}`
    };
  }
  renderLauncher() {
    const source = `/p/${this.gameName}?contentId=${encodeURIComponent(this.manifest.contentId)}`;
    return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${this.displayName}</title><style>html,body,#GameIframe{width:100%;height:100%;margin:0;border:0;display:block;overflow:hidden;background:#000}</style></head><body>${renderLauncherBridge()}<iframe id="GameIframe" data-local-bridge="waiting" title="${this.displayName}" src="${source}" allow="autoplay; clipboard-read; clipboard-write; fullscreen; gamepad; pointer-lock" allowfullscreen></iframe></body></html>`;
  }
  renderShell(origin) {
    const localOrigin = normalizeOrigin(origin);
    const clientConfig = createClientConfig(this.manifest, localOrigin);
    const nextData = {
      buildId: this.manifest.buildId,
      page: "/p/[gameName]",
      query: {
        contentId: this.manifest.contentId,
        gameName: this.gameName
      },
      props: {
        pageProps: {
          clientConfig,
          loadingConfig: false,
          locale: "zh",
          message: { playLoadingTip: "Loading" },
          userInfo: { id: 0, nickname: "Guest" }
        }
      },
      isFallback: false,
      gssp: true,
      locale: "zh",
      locales: ["zh"],
      defaultLocale: "zh"
    };
    const styles = this.manifest.initialStyles.map((path) => `<link rel="stylesheet" href="${path}">`).join("");
    const scripts = this.manifest.initialScripts.map((path) => `<script defer src="${path}"></script>`).join("");
    return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="next-head-count" content="0"><title>${this.displayName}</title>${styles}<script>window.CLIENT_CONFIG=${jsonForScript(clientConfig)};</script></head><body><div id="__next"></div><div id="react-container"></div><script id="__NEXT_DATA__" type="application/json">${jsonForScript(nextData)}</script>${scripts}</body></html>`;
  }
};
var EmptyClientRuntime = class {
  assetCount = 0;
  async get() {
    return void 0;
  }
  matchesPagePath() {
    return false;
  }
  matchesLauncherPath() {
    return false;
  }
  bindProjectIdentity() {
    return this;
  }
  getMapInfo() {
    return void 0;
  }
  renderLauncher() {
    return void 0;
  }
  renderShell() {
    return void 0;
  }
};
var emptyClientRuntime = Object.freeze(new EmptyClientRuntime());
async function loadClientRuntime(assetRoot, manifestName = CLIENT_RUNTIME_MANIFEST_NAME) {
  return FileClientRuntime.load(assetRoot, manifestName);
}
function createClientConfig(manifest, origin) {
  return {
    APP_EDITION: "box3",
    APP_ENV: "production",
    APP_REGION: "cn",
    ARENA_URL: origin,
    BACKEND_SERVER_URL: origin,
    CDN_PATH: origin,
    CREATERA_BACKEND_SERVER_URL: origin,
    FEATURE_FLAGS: [],
    JAVA_BACKEND_SERVER_URL: origin,
    LOG_LEVEL: "warn",
    MAAS_BACKEND_SERVER_URL: origin,
    MAX_HALF_CHUNKS: 4,
    MAX_Y_HALF_CHUNKS: 1,
    OSS_CDN_URL: origin,
    PLATFORM_URL: origin,
    SCRIPT_WHITELIST: [],
    WEBSITE_URL: origin,
    cacheIPFS: false,
    headless: false,
    mapInfo: {
      contentId: manifest.contentId,
      name: "Local BedWars",
      backgroundImage: `${origin}/block/${localBackgroundHash}`
    },
    mockJavaBackend: true,
    mode: "play"
  };
}
function validateManifest2(value) {
  if (!isRecord2(value) || value.format !== CLIENT_RUNTIME_FORMAT || value.version !== CLIENT_RUNTIME_VERSION || typeof value.buildId !== "string" || !buildIdPattern.test(value.buildId) || typeof value.pagePath !== "string" || !pagePathPattern.test(value.pagePath) || typeof value.gameName !== "string" || !gameNamePattern.test(value.gameName) || typeof value.contentId !== "string" || !contentIdPattern.test(value.contentId) || !Array.isArray(value.initialScripts) || !Array.isArray(value.initialStyles) || !Array.isArray(value.files)) {
    throw new Error("Unsupported client runtime manifest");
  }
  const files = [];
  const paths = /* @__PURE__ */ new Set();
  const filenames = /* @__PURE__ */ new Set();
  for (const entry of value.files) {
    if (!isRecord2(entry) || typeof entry.path !== "string" || !isSafeAssetPath(entry.path) || typeof entry.file !== "string" || !isSafeAssetFile(entry.file) || entry.file !== `assets${entry.path}` || !Number.isInteger(entry.bytes) || entry.bytes < 0 || typeof entry.sha256 !== "string" || !sha256Pattern2.test(entry.sha256) || typeof entry.contentType !== "string" || entry.contentType.length === 0 || paths.has(entry.path) || filenames.has(entry.file)) {
      throw new Error("Invalid client runtime manifest asset");
    }
    paths.add(entry.path);
    filenames.add(entry.file);
    files.push({
      path: entry.path,
      file: entry.file,
      bytes: entry.bytes,
      sha256: entry.sha256,
      contentType: entry.contentType
    });
  }
  const initialScripts = validateInitialAssets(value.initialScripts, paths, ".js");
  const initialStyles = validateInitialAssets(value.initialStyles, paths, ".css");
  if (initialScripts.length === 0 || initialStyles.length === 0) {
    throw new Error("Client runtime manifest must provide page scripts and styles");
  }
  return Object.freeze({
    format: CLIENT_RUNTIME_FORMAT,
    version: CLIENT_RUNTIME_VERSION,
    buildId: value.buildId,
    pagePath: value.pagePath,
    gameName: value.gameName,
    contentId: value.contentId,
    initialScripts: Object.freeze(initialScripts),
    initialStyles: Object.freeze(initialStyles),
    files: Object.freeze(files)
  });
}
function validateInitialAssets(value, files, extension) {
  const seen = /* @__PURE__ */ new Set();
  const paths = [];
  for (const item of value) {
    if (typeof item !== "string" || !isSafeAssetPath(item) || !item.endsWith(extension) || !files.has(item) || seen.has(item)) {
      throw new Error("Invalid client runtime page asset");
    }
    seen.add(item);
    paths.push(item);
  }
  return paths;
}
function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
function renderLauncherBridge() {
  return `<script>(()=>{"use strict";const origin=window.location.origin;const allowedEvents=new Set(["hashChange","jumpTo","loaded","openStore","openUserProfile","playerContextmenu","screenshot"]);let connected=false;const frame=()=>{const value=document.getElementById("GameIframe");return value instanceof HTMLIFrameElement?value:null};const record=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);const smallValue=(value,depth=0)=>{if(value===null||value===undefined||typeof value==="boolean")return true;if(typeof value==="number")return Number.isFinite(value);if(typeof value==="string")return value.length<=2048;if(depth>=3)return false;if(Array.isArray(value))return value.length<=32&&value.every(item=>smallValue(item,depth+1));if(!record(value))return false;const entries=Object.entries(value);return entries.length<=32&&entries.every(([key,item])=>key.length<=128&&smallValue(item,depth+1))};const validPayload=(name,value)=>name==="screenshot"?record(value)&&value.blob instanceof Blob&&value.blob.size<=4194304:smallValue(value);const reply=(source,id,value)=>source.postMessage({penpal:"reply",id,resolution:"fulfilled",returnValue:value},origin);window.addEventListener("message",event=>{const gameFrame=frame();if(!gameFrame||event.origin!==origin||event.source!==gameFrame.contentWindow||!record(event.data))return;const data=event.data;if(data.penpal==="syn"){connected=false;gameFrame.dataset.localBridge="synack";event.source.postMessage({penpal:"synAck",methodNames:["emit"]},origin);return}if(data.penpal==="ack"){if(Array.isArray(data.methodNames)&&data.methodNames.length<=2&&data.methodNames.includes("emit")&&data.methodNames.every(name=>name==="emit"||name==="receiveHeartbeat")){connected=true;gameFrame.dataset.localBridge="connected"}return}if(!connected||data.penpal!=="call"||data.methodName!=="emit"||!Number.isSafeInteger(data.id)||data.id<1||data.id>2147483647||!Array.isArray(data.args)||data.args.length<1||data.args.length>2||typeof data.args[0]!=="string"||data.args[0].length>80)return;const name=data.args[0];const accepted=allowedEvents.has(name)&&validPayload(name,data.args[1]);if(accepted&&name==="loaded")gameFrame.dataset.localBridge="ready";reply(event.source,data.id,accepted)});})();</script>`;
}
function normalizeOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:" || url.origin !== value) {
    throw new Error("Local client origin must be an HTTP origin");
  }
  return url.origin;
}
function resolveInside2(root, path) {
  const target = (0, import_node_path3.resolve)(root, path);
  if (!isInside(root, target)) throw new Error("Client runtime path must be inside the archive root");
  return target;
}
function isInside(parent, target) {
  const local = (0, import_node_path3.relative)(parent, target);
  return local !== "" && local !== ".." && !local.startsWith(`..${import_node_path3.sep}`) && !(0, import_node_path3.isAbsolute)(local);
}
function isSafeAssetPath(value) {
  return value.startsWith("/_next/") && value.slice("/_next/".length).split("/").every(isSafeAssetSegment);
}
function isSafeAssetFile(value) {
  return value.startsWith("assets/_next/") && value.slice("assets/_next/".length).split("/").every(isSafeAssetSegment);
}
function isSafeAssetSegment(value) {
  return value !== "." && value !== ".." && assetSegmentPattern.test(value);
}
function isRecord2(value) {
  return typeof value === "object" && value !== null;
}

// legacy/box3-compat/src/archive/project-bootstrap.ts
var import_node_crypto3 = require("node:crypto");
var import_promises3 = require("node:fs/promises");
var import_node_path4 = require("node:path");
var MESH_HASH = /^[A-Za-z0-9_-]{43}$/;
var CID = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
var SHA256 = /^[0-9a-f]{64}$/;
var JSON_FILE = /^[A-Za-z0-9._-]+\.json$/;
var MAX_MANIFEST_BYTES = 64 * 1024;
var MAX_BOOTSTRAP_BYTES = 2 * 1024 * 1024;
var MAX_SKIN_PART_ID = 2147483647;
var NUMBER_FIELDS = [
  "bodyBX",
  "bodyBY",
  "bodyBZ",
  "bodyOffsetX",
  "bodyOffsetY",
  "bodyOffsetZ",
  "meshBX",
  "meshBY",
  "meshBZ",
  "renderBoxOffsetX",
  "renderBoxOffsetY",
  "renderBoxOffsetZ"
];
var MESH_FIELDS = [...NUMBER_FIELDS, "hash", "hashType"];
var SKIN_PART_NAMES = [
  "head",
  "hips",
  "leftFoot",
  "leftHand",
  "leftLowerArm",
  "leftLowerLeg",
  "leftShoulder",
  "leftUpperArm",
  "leftUpperLeg",
  "neck",
  "rightFoot",
  "rightHand",
  "rightLowerArm",
  "rightLowerLeg",
  "rightShoulder",
  "rightUpperArm",
  "rightUpperLeg",
  "torso"
];
var PROJECT_BOOTSTRAP_FORMAT = "nea-recovered-project-bootstrap";
var PROJECT_BOOTSTRAP_VERSION = 2;
var PROJECT_BOOTSTRAP_SOURCE_MESSAGES = [
  "models.appendMeshHashes",
  "models.appendSkinHashes",
  "models.appendSkinPartHashes",
  "sound.resetDictionary",
  "gameNet.syncClientScriptModules",
  "gameTerrain.reset",
  "models.appendSkinPartHashes"
];
var emptyProjectBootstrap = freezeBootstrap({
  meshHashes: [],
  skinHashes: [],
  skinPartHashBatches: [],
  soundDictionary: []
});
async function loadProjectBootstrap(assetRoot, manifestName = "project/bedwars/bootstrap/manifest.json") {
  const manifestPath = resolveInside3((0, import_node_path4.resolve)(assetRoot), manifestName);
  const manifest = asRecord(
    JSON.parse((await readFileAtMost(manifestPath, MAX_MANIFEST_BYTES, "bootstrap manifest")).toString("utf8")),
    "bootstrap manifest"
  );
  const file = asRecord(manifest.file, "bootstrap manifest file");
  const fileName = file.name;
  const fileBytes = file.bytes;
  const fileHash = file.sha256;
  if (manifest.format !== "nea-recovered-project-bootstrap-manifest" || manifest.version !== 1) {
    throw new Error("Unsupported project bootstrap manifest");
  }
  if (typeof fileName !== "string" || !JSON_FILE.test(fileName)) throw new Error("Invalid project bootstrap file");
  if (typeof fileBytes !== "number" || !Number.isSafeInteger(fileBytes) || fileBytes < 0 || fileBytes > MAX_BOOTSTRAP_BYTES) {
    throw new Error("Invalid project bootstrap file size");
  }
  if (typeof fileHash !== "string" || !SHA256.test(fileHash)) throw new Error("Invalid project bootstrap file hash");
  const bootstrapPath = resolveInside3((0, import_node_path4.dirname)(manifestPath), fileName);
  const bootstrapInfo = await (0, import_promises3.stat)(bootstrapPath);
  if (!bootstrapInfo.isFile() || bootstrapInfo.size > MAX_BOOTSTRAP_BYTES) {
    throw new Error("Project bootstrap data does not match its manifest");
  }
  let bytes = await (0, import_promises3.readFile)(bootstrapPath);
  const describeManifestMismatch = (candidate) => {
    const actualHash = (0, import_node_crypto3.createHash)("sha256").update(candidate).digest("hex");
    return `Project bootstrap data does not match its manifest: expected bytes=${fileBytes} sha256=${fileHash}, received bytes=${candidate.byteLength} sha256=${actualHash}`;
  };
  const matchesManifest = (candidate) => candidate.byteLength === fileBytes && (0, import_node_crypto3.createHash)("sha256").update(candidate).digest("hex") === fileHash;
  if (!matchesManifest(bytes)) {
    const normalized = Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
    if (!matchesManifest(normalized)) {
      throw new Error(describeManifestMismatch(bytes));
    }
    bytes = normalized;
  }
  return validateProjectBootstrap(JSON.parse(bytes.toString("utf8")));
}
function validateProjectBootstrap(value) {
  const data = asRecord(value, "bootstrap data");
  if (data.format !== PROJECT_BOOTSTRAP_FORMAT || data.version !== PROJECT_BOOTSTRAP_VERSION || !sameStrings(data.sourceMessages, PROJECT_BOOTSTRAP_SOURCE_MESSAGES) || !Array.isArray(data.meshHashes) || data.meshHashes.length < 117 || !Array.isArray(data.skinHashes) || data.skinHashes.length !== 1 || !Array.isArray(data.skinPartHashBatches) || data.skinPartHashBatches.length !== 2 || !Array.isArray(data.soundDictionary) || data.soundDictionary.length !== 45 || data.soundDictionary[0] !== "") throw new Error("Unsupported project bootstrap data");
  const usedPartIds = /* @__PURE__ */ new Set();
  return freezeBootstrap({
    meshHashes: data.meshHashes.map((entry, index) => validateMesh(entry, index)),
    skinHashes: data.skinHashes.map((entry, index) => validateSkin(entry, index)),
    skinPartHashBatches: [
      validateSkinPartBatch(data.skinPartHashBatches[0], 0, 151, usedPartIds),
      validateSkinPartBatch(data.skinPartHashBatches[1], 1, 13, usedPartIds)
    ],
    soundDictionary: data.soundDictionary.map((entry, index) => validateSound(entry, index))
  });
}
function validateMesh(value, index) {
  const entry = asRecord(value, `mesh bootstrap entry ${index}`);
  if (Object.keys(entry).length !== MESH_FIELDS.length || !MESH_FIELDS.every((key) => Object.hasOwn(entry, key))) {
    throw new Error(`Invalid mesh bootstrap entry at ${index}`);
  }
  for (const field of NUMBER_FIELDS) {
    const number = entry[field];
    if (typeof number !== "number" || !Number.isFinite(number) || number < -256 || number > 256) {
      throw new Error(`Invalid mesh bootstrap dimension at ${index}`);
    }
  }
  if (typeof entry.hash !== "string" || !MESH_HASH.test(entry.hash) || typeof entry.hashType !== "string" || !safeText(entry.hashType)) throw new Error(`Invalid mesh bootstrap hash at ${index}`);
  return entry;
}
function validateSkin(value, index) {
  const entry = asRecord(value, `skin bootstrap entry ${index}`);
  if (!sameKeys(entry, ["hash", "parts"])) throw new Error(`Invalid skin bootstrap entry at ${index}`);
  if (typeof entry.hash !== "string" || !MESH_HASH.test(entry.hash)) {
    throw new Error(`Invalid skin bootstrap hash at ${index}`);
  }
  const parts = asRecord(entry.parts, `skin bootstrap parts ${index}`);
  if (!sameKeys(parts, SKIN_PART_NAMES)) throw new Error(`Invalid skin bootstrap parts at ${index}`);
  const result = /* @__PURE__ */ Object.create(null);
  for (const name of SKIN_PART_NAMES) {
    const hash = parts[name];
    if (typeof hash !== "string" || hash !== "" && !MESH_HASH.test(hash)) {
      throw new Error(`Invalid skin bootstrap part ${name} at ${index}`);
    }
    result[name] = hash;
  }
  return { hash: entry.hash, parts: result };
}
function validateSkinPartBatch(value, batchIndex, expectedLength, usedIds) {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    throw new Error(`Invalid skin part bootstrap batch ${batchIndex}`);
  }
  let previousId = -1;
  return value.map((item, index) => {
    const entry = asRecord(item, `skin part bootstrap entry ${batchIndex}:${index}`);
    if (!sameKeys(entry, ["id", "hash"])) throw new Error(`Invalid skin part bootstrap entry ${batchIndex}:${index}`);
    if (typeof entry.id !== "number" || !Number.isSafeInteger(entry.id) || entry.id < 0 || entry.id > MAX_SKIN_PART_ID || entry.id <= previousId || usedIds.has(entry.id) || typeof entry.hash !== "string" || !MESH_HASH.test(entry.hash)) throw new Error(`Invalid skin part bootstrap entry ${batchIndex}:${index}`);
    previousId = entry.id;
    usedIds.add(entry.id);
    return { id: entry.id, hash: entry.hash };
  });
}
function validateSound(value, index) {
  if (typeof value !== "string" || index > 0 && !CID.test(value)) throw new Error(`Invalid sound dictionary entry at ${index}`);
  return value;
}
function freezeBootstrap(value) {
  return Object.freeze({
    meshHashes: Object.freeze(value.meshHashes.map((entry) => Object.freeze({ ...entry }))),
    skinHashes: Object.freeze(value.skinHashes.map((entry) => Object.freeze({
      hash: entry.hash,
      parts: Object.freeze({ ...entry.parts })
    }))),
    skinPartHashBatches: Object.freeze(value.skinPartHashBatches.map((batch) => Object.freeze(
      batch.map((entry) => Object.freeze({ ...entry }))
    ))),
    soundDictionary: Object.freeze([...value.soundDictionary])
  });
}
function sameKeys(value, expected) {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}
function asRecord(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`Invalid ${label}`);
  return value;
}
function sameStrings(value, expected) {
  return Array.isArray(value) && value.length === expected.length && value.every((item, index) => item === expected[index]);
}
function safeText(value) {
  return Buffer.byteLength(value, "utf8") <= 128 && /^[\x20-\x7e]*$/.test(value);
}
async function readFileAtMost(path, maximumBytes, label) {
  const info = await (0, import_promises3.stat)(path);
  if (!info.isFile() || info.size > maximumBytes) throw new Error(`Invalid ${label} size`);
  const bytes = await (0, import_promises3.readFile)(path);
  if (bytes.byteLength > maximumBytes) throw new Error(`Invalid ${label} size`);
  return bytes;
}
function resolveInside3(root, path) {
  const target = (0, import_node_path4.resolve)(root, path);
  const local = (0, import_node_path4.relative)(root, target);
  if (local === "" || local.startsWith("..") || (0, import_node_path4.isAbsolute)(local)) throw new Error("Project bootstrap must be inside archive root");
  return target;
}

// legacy/box3-compat/src/app/box3-server.ts
var import_node_http = require("node:http");
var import_mudb = __toESM(require_mudb(), 1);

// legacy/box3-compat/src/archive/file-asset-store.ts
var import_promises4 = require("node:fs/promises");
var import_node_path5 = require("node:path");

// legacy/box3-compat/src/archive/cid.ts
var import_node_crypto4 = require("node:crypto");
var alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
var contentAddressedFilenamePattern = /^(Qm[1-9A-HJ-NP-Za-km-z]{44})(?:\.[A-Za-z0-9]+)?$/;
function cidV0For(bytes) {
  const digest = (0, import_node_crypto4.createHash)("sha256").update(bytes).digest();
  return encodeBase58(Buffer.concat([Buffer.from([18, 32]), digest]));
}
function contentAddressFromFilename(filename) {
  return contentAddressedFilenamePattern.exec(filename)?.[1];
}
function verifyContentAddress(filename, bytes) {
  const expected = contentAddressFromFilename(filename);
  return expected ? cidV0For(bytes) === expected : void 0;
}
function encodeBase58(bytes) {
  if (bytes.length === 0) return "";
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let index = 0; index < digits.length; index++) {
      carry += digits[index] << 8;
      digits[index] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let output = "";
  for (const byte of bytes) {
    if (byte !== 0) break;
    output += alphabet[0];
  }
  for (let index = digits.length - 1; index >= 0; index--) output += alphabet[digits[index]];
  return output;
}

// legacy/box3-compat/src/archive/file-asset-store.ts
var extensionFallbacks = [".mp3"];
var opaqueAssetKey = /^[A-Za-z0-9_-]{43}$/;
var opaqueNamespaces = /* @__PURE__ */ new Set(["engine/m", "avatar/m"]);
var FileArchiveAssetStore = class {
  root;
  constructor(root) {
    this.root = (0, import_node_path5.resolve)(root);
  }
  async get(namespace, key) {
    const contentAddressed = namespace === "block";
    if (!contentAddressed && !opaqueNamespaces.has(namespace)) return void 0;
    if (contentAddressed && !contentAddressFromFilename(key)) return void 0;
    if (!contentAddressed && !opaqueAssetKey.test(key)) return void 0;
    try {
      const root = await (0, import_promises4.realpath)(this.root);
      const namespaceRoot = await (0, import_promises4.realpath)((0, import_node_path5.resolve)(root, ...namespace.split("/")));
      if (!isInside2(root, namespaceRoot)) return void 0;
      const candidates = contentAddressed ? candidateNames(key) : [key];
      for (const candidate of candidates) {
        try {
          const path = await (0, import_promises4.realpath)((0, import_node_path5.resolve)(namespaceRoot, candidate));
          if (!isInside2(namespaceRoot, path)) return void 0;
          const bytes = await (0, import_promises4.readFile)(path);
          if (contentAddressed && verifyContentAddress(candidate, bytes) !== true) continue;
          return { bytes, contentType: detectAssetMedia(candidate, bytes).contentType };
        } catch (error) {
          if (error.code === "ENOENT") continue;
          throw error;
        }
      }
      return void 0;
    } catch (error) {
      if (error.code === "ENOENT") return void 0;
      throw error;
    }
  }
};
function candidateNames(key) {
  if (key.includes(".")) return [key];
  return [key, ...extensionFallbacks.map((extension) => `${key}${extension}`)];
}
function isInside2(parent, target) {
  const local = (0, import_node_path5.relative)(parent, target);
  return local !== "" && local !== ".." && !local.startsWith(`..${import_node_path5.sep}`) && !(0, import_node_path5.isAbsolute)(local);
}

// legacy/box3-compat/src/config/server-config.ts
var import_node_path6 = require("node:path");

// legacy/box3-compat/src/security/origin-policy.ts
var import_node_net = require("node:net");
function isAllowedOrigin(origin, configured) {
  if (configured) return typeof origin === "string" && configured.includes(origin);
  return !origin || isLoopbackOrigin(origin);
}
function isLoopbackOrigin(origin) {
  if (typeof origin !== "string") return false;
  try {
    const url = new URL(origin);
    return origin === url.origin && (url.protocol === "http:" || url.protocol === "https:") && isLoopbackHost(url.hostname);
  } catch {
    return false;
  }
}
function isLoopbackHost(host) {
  const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (normalized === "localhost" || normalized === "::1") return true;
  if ((0, import_node_net.isIP)(normalized) === 4) return normalized.startsWith("127.");
  return false;
}

// legacy/box3-compat/src/config/server-config.ts
var MAX_PAYLOAD_BYTES = 16 * 1024 * 1024;
function resolveServerConfig(input2 = {}) {
  const config = {
    host: input2.host ?? process.env.BOX3_HOST ?? "127.0.0.1",
    port: input2.port ?? integerEnv("BOX3_PORT", 8080),
    path: input2.path ?? process.env.BOX3_WS_PATH ?? "/ws",
    allowRemote: input2.allowRemote ?? booleanEnv("BOX3_ALLOW_REMOTE", false),
    allowedOrigins: input2.allowedOrigins ?? listEnv("BOX3_ALLOWED_ORIGINS"),
    maxPayloadBytes: input2.maxPayloadBytes ?? integerEnv("BOX3_MAX_PAYLOAD_BYTES", 1024 * 1024),
    assetRoot: (0, import_node_path6.resolve)(input2.assetRoot ?? process.env.BOX3_ASSET_ROOT ?? "archive"),
    worldManifest: input2.worldManifest ?? process.env.BOX3_WORLD_MANIFEST ?? "world-bedwars.json"
  };
  if (!Number.isInteger(config.port) || config.port < 0 || config.port > 65535) {
    throw new Error(`Invalid port: ${config.port}`);
  }
  if (!config.path.startsWith("/")) throw new Error("WebSocket path must start with /");
  if (!Number.isSafeInteger(config.maxPayloadBytes) || config.maxPayloadBytes < 1024 || config.maxPayloadBytes > MAX_PAYLOAD_BYTES) {
    throw new Error(`maxPayloadBytes must be an integer between 1024 and ${MAX_PAYLOAD_BYTES}`);
  }
  if (!config.worldManifest.endsWith(".json")) throw new Error("World manifest must be a JSON file");
  if (!config.allowRemote && !isLoopbackHost(config.host)) {
    throw new Error(`Refusing non-loopback host ${config.host}; enable allowRemote only behind an authenticated proxy`);
  }
  return config;
}
function integerEnv(name, fallback) {
  const value = process.env[name];
  if (value === void 0 || value === "") return fallback;
  return Number(value);
}
function booleanEnv(name, fallback) {
  const value = process.env[name];
  if (value === void 0 || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}
function listEnv(name) {
  const value = process.env[name];
  if (!value) return void 0;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

// legacy/box3-compat/src/session/issued-session-registry.ts
var DEFAULT_INITIAL_TTL_MS = 2 * 60 * 1e3;
var DEFAULT_RECONNECT_TTL_MS = 30 * 1e3;
var DEFAULT_PENDING_UPGRADE_TTL_MS = 5 * 1e3;
var DEFAULT_MAX_SESSIONS = 256;
var IssuedSessionCapacityError = class extends Error {
  constructor() {
    super("Local session capacity reached");
  }
};
var IssuedSessionRegistry = class {
  constructor(issueConfig, options = {}) {
    this.issueConfig = issueConfig;
    this.initialTtlMs = requirePositiveMilliseconds("initialTtlMs", options.initialTtlMs ?? DEFAULT_INITIAL_TTL_MS);
    this.reconnectTtlMs = requirePositiveMilliseconds("reconnectTtlMs", options.reconnectTtlMs ?? DEFAULT_RECONNECT_TTL_MS);
    this.pendingUpgradeTtlMs = requirePositiveMilliseconds(
      "pendingUpgradeTtlMs",
      options.pendingUpgradeTtlMs ?? DEFAULT_PENDING_UPGRADE_TTL_MS
    );
    this.maxSessions = requirePositiveInteger("maxSessions", options.maxSessions ?? DEFAULT_MAX_SESSIONS);
    this.now = options.now ?? Date.now;
    this.onExpired = options.onExpired;
  }
  issueConfig;
  sessions = /* @__PURE__ */ new Map();
  initialTtlMs;
  reconnectTtlMs;
  pendingUpgradeTtlMs;
  maxSessions;
  now;
  onExpired;
  get size() {
    this.prune();
    return this.sessions.size;
  }
  issue(socketServerUrl) {
    this.prune();
    if (this.sessions.size >= this.maxSessions) throw new IssuedSessionCapacityError();
    const config = this.issueConfig(socketServerUrl);
    const sessionId = requireSessionId(config.sessionId);
    if (this.sessions.has(sessionId)) throw new Error("Session ID was issued twice: " + sessionId);
    const session = {
      config,
      expiresAt: this.now() + this.initialTtlMs,
      openSockets: 0,
      pendingUpgrades: []
    };
    this.sessions.set(sessionId, session);
    this.schedule(sessionId, session);
    return config;
  }
  /** Reserves a slot while ws finishes the HTTP upgrade. */
  reserveUpgrade(sessionId) {
    this.prune();
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    this.removeExpiredPending(session);
    if (session.openSockets + session.pendingUpgrades.length >= session.config.maxSockets) return false;
    session.pendingUpgrades.push(this.now() + this.pendingUpgradeTtlMs);
    this.schedule(sessionId, session);
    return true;
  }
  /** Moves a verified WebSocket upgrade from pending to connected. */
  attachSocket(sessionId) {
    this.prune();
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    this.removeExpiredPending(session);
    if (session.pendingUpgrades.length === 0) return false;
    session.pendingUpgrades.shift();
    session.openSockets += 1;
    this.schedule(sessionId, session);
    return true;
  }
  detachSocket(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.openSockets === 0) return;
    session.openSockets -= 1;
    if (session.openSockets === 0 && session.pendingUpgrades.length === 0) {
      session.expiresAt = this.now() + this.reconnectTtlMs;
    }
    this.schedule(sessionId, session);
  }
  /** Starts the bounded reconnect period after MuDB closes a logical client. */
  markDisconnected(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.expiresAt = this.now() + this.reconnectTtlMs;
    this.schedule(sessionId, session);
  }
  dispose() {
    for (const session of this.sessions.values()) {
      if (session.expiryTimer) clearTimeout(session.expiryTimer);
    }
    this.sessions.clear();
  }
  prune() {
    const now = this.now();
    for (const [sessionId, session] of this.sessions) {
      this.removeExpiredPending(session, now);
      if (session.openSockets === 0 && session.pendingUpgrades.length === 0 && session.expiresAt <= now) {
        this.expire(sessionId, session);
      } else {
        this.schedule(sessionId, session);
      }
    }
  }
  removeExpiredPending(session, now = this.now()) {
    while (session.pendingUpgrades[0] !== void 0 && session.pendingUpgrades[0] <= now) {
      session.pendingUpgrades.shift();
    }
  }
  schedule(sessionId, session) {
    if (session.expiryTimer) clearTimeout(session.expiryTimer);
    const pendingExpiry = session.pendingUpgrades[0];
    const sessionExpiry = session.openSockets === 0 ? session.expiresAt : Number.POSITIVE_INFINITY;
    const deadline = Math.min(pendingExpiry ?? Number.POSITIVE_INFINITY, sessionExpiry);
    if (!Number.isFinite(deadline)) {
      session.expiryTimer = void 0;
      return;
    }
    const delay = Math.max(0, deadline - this.now());
    const timer = setTimeout(() => this.prune(), delay);
    timer.unref();
    session.expiryTimer = timer;
  }
  expire(sessionId, session) {
    if (session.expiryTimer) clearTimeout(session.expiryTimer);
    this.sessions.delete(sessionId);
    this.onExpired?.(sessionId);
  }
};
function requirePositiveMilliseconds(name, value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(name + " must be a positive integer number of milliseconds");
  }
  return value;
}
function requirePositiveInteger(name, value) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(name + " must be a positive integer");
  return value;
}
function requireSessionId(value) {
  if (!value || value.length > 256) throw new Error("sessionId must be between 1 and 256 characters");
  return value;
}

// legacy/box3-compat/src/session/historical-project-catalog.ts
var maxHistoricalProjectIdentityLength = 256;
var trustedTargets = /* @__PURE__ */ new WeakSet();
var targetInstances = /* @__PURE__ */ new WeakMap();
function isHistoricalProjectTarget(value) {
  return isObject(value) && trustedTargets.has(value) && targetInstances.has(value);
}
var HistoricalProjectCatalogError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "HistoricalProjectCatalogError";
  }
};
var HistoricalProjectAdmissionError = class extends Error {
  constructor(failure) {
    super(failure === "unknown-content-id" ? "Local historical project was not found" : "Local historical project is unavailable");
    this.failure = failure;
    this.name = "HistoricalProjectAdmissionError";
  }
  failure;
};
function createHistoricalProjectTarget(identity, instance) {
  const targetIdentity = requireIdentity(identity, "Historical project target identity");
  if (!isObject(instance)) throw new HistoricalProjectCatalogError("Historical project target requires a mounted runtime instance");
  const target = Object.freeze({ identity: targetIdentity });
  trustedTargets.add(target);
  targetInstances.set(target, instance);
  return target;
}
function createHistoricalProjectDescriptor(input2) {
  if (!isObject(input2)) throw new HistoricalProjectCatalogError("Historical project descriptor must be an object");
  const target = requireHistoricalProjectTarget(input2.target);
  if (typeof input2.available !== "boolean") {
    throw new HistoricalProjectCatalogError("Historical project descriptor availability must be boolean");
  }
  return Object.freeze({
    contentId: requireIdentity(input2.contentId, "Historical project content ID"),
    target,
    available: input2.available
  });
}
var HistoricalProjectCatalog = class {
  descriptors;
  byContentId;
  constructor(descriptors) {
    if (!Array.isArray(descriptors) || descriptors.length === 0) {
      throw new HistoricalProjectCatalogError("Historical project catalog requires at least one descriptor");
    }
    const entries = /* @__PURE__ */ new Map();
    const targetIdentities = /* @__PURE__ */ new Set();
    const targetInstancesInCatalog = /* @__PURE__ */ new Set();
    const normalized = [];
    for (const descriptorInput of descriptors) {
      const descriptor = createHistoricalProjectDescriptor(descriptorInput);
      if (entries.has(descriptor.contentId)) {
        throw new HistoricalProjectCatalogError(`Historical project content ID is duplicated: ${descriptor.contentId}`);
      }
      if (targetIdentities.has(descriptor.target.identity)) {
        throw new HistoricalProjectCatalogError(`Historical project target identity is duplicated: ${descriptor.target.identity}`);
      }
      targetIdentities.add(descriptor.target.identity);
      const targetInstance = targetInstances.get(descriptor.target);
      if (!targetInstance || targetInstancesInCatalog.has(targetInstance)) {
        throw new HistoricalProjectCatalogError("Historical project target must refer to one unique mounted runtime instance");
      }
      targetInstancesInCatalog.add(targetInstance);
      entries.set(descriptor.contentId, descriptor);
      normalized.push(descriptor);
    }
    this.descriptors = Object.freeze(normalized);
    this.byContentId = entries;
    Object.freeze(this);
  }
  /** Resolves only an available project; unknown and unavailable stay distinct locally. */
  admit(contentId) {
    const descriptor = this.byContentId.get(contentId);
    if (!descriptor) throw new HistoricalProjectAdmissionError("unknown-content-id");
    if (!descriptor.available) throw new HistoricalProjectAdmissionError("project-unavailable");
    return descriptor;
  }
};
function requireHistoricalProjectTarget(value) {
  if (!isHistoricalProjectTarget(value)) {
    throw new HistoricalProjectCatalogError("Historical project descriptor must reference a mounted runtime target");
  }
  return value;
}
function requireIdentity(value, label) {
  if (typeof value !== "string" || Array.from(value).length === 0 || value.trim().length === 0 || Array.from(value).length > maxHistoricalProjectIdentityLength || /[\x00-\x1f\x7f]/.test(value)) {
    throw new HistoricalProjectCatalogError(`${label} is invalid`);
  }
  return value;
}
function isObject(value) {
  return typeof value === "object" && value !== null;
}

// legacy/box3-compat/src/http/request-handler.ts
var maxCreateSessionBytes = 8 * 1024;
var createSessionFields = ["mode", "contentId", "fingerPrint", "serverId"];
var archiveAssetPrefixes = [
  { path: "/block/", namespace: "block" },
  { path: "/engine/m/", namespace: "engine/m" },
  { path: "/avatar/m/", namespace: "avatar/m" }
];
function createRequestHandler(dependencies) {
  return (request, response) => {
    void handleRequest(request, response, dependencies).catch((error) => {
      if (error instanceof URIError && !response.headersSent) {
        sendJson(response, 400, { error: "invalid_uri" });
        return;
      }
      if (!response.headersSent) sendJson(response, 500, { error: "internal_error" });
      else response.destroy();
    });
  };
}
async function handleRequest(request, response, dependencies) {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (isAnonymousApiPath(url.pathname, dependencies.clientRuntime.contentId)) {
    if (request.method === "OPTIONS") {
      if (!applyLoopbackCors(request, response)) {
        sendJson(response, 403, { error: "origin_not_allowed" });
        return;
      }
      response.writeHead(204);
      response.end();
      return;
    }
    applyLoopbackCors(request, response);
  }
  if (request.method === "POST" && url.pathname === "/api/createSession") {
    let input2;
    try {
      input2 = await readJsonBody(request);
    } catch (error) {
      sendJson(response, error instanceof RequestBodyError && error.tooLarge ? 413 : 400, {
        error: error instanceof RequestBodyError ? error.code : "invalid_request"
      });
      return;
    }
    const createSession = parseCreateSessionRequest(input2);
    if (!createSession) {
      sendJson(response, 400, { error: "invalid_request" });
      return;
    }
    response.setHeader("cache-control", "no-store");
    try {
      sendJson(response, 200, {
        config: dependencies.issueLocalSession(
          createSession.contentId,
          localOriginForRequest(request, dependencies.localOrigin())
        )
      });
    } catch (error) {
      if (error instanceof HistoricalProjectAdmissionError) {
        sendJson(response, error.failure === "unknown-content-id" ? 404 : 409, {
          error: error.failure === "unknown-content-id" ? "local_project_not_found" : "local_project_unavailable"
        });
        return;
      }
      if (error instanceof IssuedSessionCapacityError) {
        sendJson(response, 429, { error: "session_capacity_reached" });
        return;
      }
      throw error;
    }
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/getMapInfo") {
    const mapInfo = dependencies.clientRuntime.getMapInfo(localOriginForRequest(request, dependencies.localOrigin()));
    if (mapInfo) {
      sendJson(response, 200, mapInfo);
      return;
    }
  }
  if (request.method === "GET" && dependencies.clientRuntime.contentId && (url.pathname === `/content/auth/guest/${dependencies.clientRuntime.contentId}` || url.pathname === `/content/view/increase/${dependencies.clientRuntime.contentId}`)) {
    sendJson(response, 200, { code: 200, data: { value: true } });
    return;
  }
  if (request.method === "GET" && url.pathname === "/sticker/all" && url.searchParams.get("mapId") === dependencies.clientRuntime.contentId) {
    sendJson(response, 200, []);
    return;
  }
  if (request.method === "POST" && url.pathname === "/statistics/content/online" && dependencies.clientRuntime.contentId) {
    request.resume();
    sendJson(response, 200, { code: 200, data: { value: true } });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/status") {
    sendJson(response, 200, {
      ...dependencies.stats.snapshot(),
      world: dependencies.world.kind,
      protocols: dependencies.protocols,
      clientScriptModules: dependencies.clientScriptModules,
      localClient: dependencies.clientRuntime.pagePath ? { assets: dependencies.clientRuntime.assetCount, pagePath: dependencies.clientRuntime.pagePath } : null,
      projectBootstrap: dependencies.projectBootstrap,
      projectBootstrapDiagnostics: dependencies.projectBootstrapDiagnostics()
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/healthz") {
    sendJson(response, 200, { status: "ok" });
    return;
  }
  const archiveAssetPrefix = archiveAssetPrefixes.find((item) => url.pathname.startsWith(item.path));
  if ((request.method === "GET" || request.method === "HEAD") && archiveAssetPrefix) {
    const key = decodeURIComponent(url.pathname.slice(archiveAssetPrefix.path.length));
    const asset = await dependencies.assetStore.get(archiveAssetPrefix.namespace, key);
    if (!asset) {
      sendJson(response, 404, { error: "asset_not_found" });
      return;
    }
    response.writeHead(200, {
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": asset.bytes.byteLength,
      "content-type": asset.contentType,
      "x-content-type-options": "nosniff"
    });
    response.end(request.method === "HEAD" ? void 0 : asset.bytes);
    return;
  }
  if ((request.method === "GET" || request.method === "HEAD") && url.pathname.startsWith("/_next/")) {
    const asset = await dependencies.clientRuntime.get(url.pathname);
    if (!asset) {
      sendJson(response, 404, { error: "asset_not_found" });
      return;
    }
    response.writeHead(200, {
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": asset.bytes.byteLength,
      "content-type": asset.contentType,
      "x-content-type-options": "nosniff"
    });
    response.end(request.method === "HEAD" ? void 0 : asset.bytes);
    return;
  }
  if ((request.method === "GET" || request.method === "HEAD") && dependencies.clientRuntime.matchesPagePath(url.pathname)) {
    const shell = dependencies.clientRuntime.renderShell(localOriginForRequest(request, dependencies.localOrigin()));
    if (shell) {
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "text/html; charset=utf-8",
        "x-content-type-options": "nosniff"
      });
      response.end(request.method === "HEAD" ? void 0 : shell);
      return;
    }
  }
  if ((request.method === "GET" || request.method === "HEAD") && dependencies.clientRuntime.matchesLauncherPath(url.pathname)) {
    const launcher = dependencies.clientRuntime.renderLauncher();
    if (launcher) {
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "text/html; charset=utf-8",
        "x-content-type-options": "nosniff"
      });
      response.end(request.method === "HEAD" ? void 0 : launcher);
      return;
    }
  }
  if (request.method === "GET" && url.pathname === "/") {
    const launcher = dependencies.clientRuntime.renderLauncher();
    if (launcher) {
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "text/html; charset=utf-8",
        "x-content-type-options": "nosniff"
      });
      response.end(launcher);
      return;
    }
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end(`Box3 compatibility server
WebSocket: ${dependencies.wsPath}
`);
    return;
  }
  sendJson(response, 404, { error: "not_found" });
}
function localOriginForRequest(request, configuredOrigin) {
  const host = request.headers.host;
  if (typeof host !== "string") return configuredOrigin;
  try {
    const configured = new URL(configuredOrigin);
    const candidate = new URL(`http://${host}`);
    if (candidate.protocol !== configured.protocol || candidate.port !== configured.port || candidate.username !== "" || candidate.password !== "" || candidate.pathname !== "/" || candidate.search !== "" || candidate.hash !== "" || !isLoopbackHost(candidate.hostname)) return configuredOrigin;
    return candidate.origin;
  } catch {
    return configuredOrigin;
  }
}
function isAnonymousApiPath(pathname, contentId) {
  if (pathname === "/api/createSession" || pathname === "/api/getMapInfo") return true;
  if (!contentId) return false;
  return pathname === `/content/auth/guest/${contentId}` || pathname === `/content/view/increase/${contentId}` || pathname === "/sticker/all" || pathname === "/statistics/content/online";
}
function applyLoopbackCors(request, response) {
  const origin = request.headers.origin;
  if (!isLoopbackOrigin(origin)) return false;
  response.setHeader("access-control-allow-origin", origin);
  response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
  response.setHeader("access-control-max-age", "600");
  response.setHeader("vary", "Origin");
  return true;
}
function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}
async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > maxCreateSessionBytes) throw new RequestBodyError("request_too_large", true);
    chunks.push(bytes);
  }
  if (size === 0) throw new RequestBodyError("invalid_json", false);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestBodyError("invalid_json", false);
  }
}
function parseCreateSessionRequest(value) {
  if (typeof value !== "object" || value === null) return void 0;
  const input2 = value;
  if (!createSessionFields.every((field) => {
    const item = input2[field];
    return typeof item === "string" && Buffer.byteLength(item, "utf8") <= 2048;
  })) return void 0;
  return input2;
}
var RequestBodyError = class extends Error {
  constructor(code, tooLarge) {
    super(code);
    this.code = code;
    this.tooLarge = tooLarge;
  }
  code;
  tooLarge;
};

// legacy/box3-compat/src/world/voxel-raycast.ts
var minimumDirectionLength = 1e-8;
function raycastVoxel(voxels, origin, direction, maximumDistance) {
  if (!isVector(origin) || !isVector(direction) || !Number.isFinite(maximumDistance) || maximumDistance < 0) {
    return void 0;
  }
  const length = Math.hypot(direction[0], direction[1], direction[2]);
  if (length <= minimumDirectionLength) return void 0;
  const dx = direction[0] / length;
  const dy = direction[1] / length;
  const dz = direction[2] / length;
  let x = initialVoxel(origin[0], dx);
  let y = initialVoxel(origin[1], dy);
  let z = initialVoxel(origin[2], dz);
  const stepX = sign(dx);
  const stepY = sign(dy);
  const stepZ = sign(dz);
  let maxX = nextBoundaryDistance(origin[0], dx, x, stepX);
  let maxY = nextBoundaryDistance(origin[1], dy, y, stepY);
  let maxZ = nextBoundaryDistance(origin[2], dz, z, stepZ);
  const deltaX = axisDelta(dx);
  const deltaY = axisDelta(dy);
  const deltaZ = axisDelta(dz);
  let distance = 0;
  let normal = [0, 0, 0];
  const maximumSteps = Math.ceil(maximumDistance * 3) + 3;
  for (let step = 0; step < maximumSteps && distance <= maximumDistance; step++) {
    const block = voxels.voxelAt(x, y, z);
    if (block === void 0) return void 0;
    if (block !== 0) return { x, y, z, block, distance, normal };
    if (maxX <= maxY && maxX <= maxZ) {
      x += stepX;
      distance = maxX;
      maxX += deltaX;
      normal = [-stepX, 0, 0];
    } else if (maxY <= maxZ) {
      y += stepY;
      distance = maxY;
      maxY += deltaY;
      normal = [0, -stepY, 0];
    } else {
      z += stepZ;
      distance = maxZ;
      maxZ += deltaZ;
      normal = [0, 0, -stepZ];
    }
  }
  return void 0;
}
function sign(value) {
  return value > 0 ? 1 : value < 0 ? -1 : 0;
}
function axisDelta(direction) {
  return direction === 0 ? Infinity : Math.abs(1 / direction);
}
function nextBoundaryDistance(origin, direction, voxel, step) {
  if (direction === 0) return Infinity;
  const boundary = step > 0 ? voxel + 1 : voxel;
  return (boundary - origin) / direction;
}
function initialVoxel(origin, direction) {
  const voxel = Math.floor(origin);
  return direction < 0 && origin === voxel ? voxel - 1 : voxel;
}
function isVector(value) {
  return value.length === 3 && value.every(Number.isFinite);
}

// legacy/box3-compat/src/game/input/terrain-interaction.ts
var action0Button = 1;
var action1Button = 2;
var maximumReach = 4.5;
var TerrainInteractionService = class {
  constructor(options) {
    this.options = options;
  }
  options;
  handleInput(sessionId, input2) {
    if (!sessionId || !isRecord3(input2) || !Array.isArray(input2.events)) return 0;
    const changes = [];
    let matchChanged = false;
    for (const event of input2.events) {
      const broken = blockBreakTarget(event, this.options.terrain);
      if (broken) {
        const result = this.breakAt(sessionId, broken);
        if (result.matchChanged) matchChanged = true;
        changes.push(...result.changes);
      }
      const placed = blockPlacementTarget(event, this.options.terrain);
      if (placed) changes.push(...this.placeAt(sessionId, placed));
    }
    this.options.terrainSessions.broadcast(changes);
    if (matchChanged) this.options.onMatchChanged?.();
    return changes.length;
  }
  breakAt(sessionId, hit) {
    const match = this.options.match;
    if (!match) {
      const change2 = this.options.terrain.remove(hit.x, hit.y, hit.z);
      return { changes: change2 ? [change2] : [], matchChanged: false };
    }
    const brokenBed = match.breakBed(sessionId, hit.x, hit.y, hit.z);
    if (brokenBed) {
      const team = match.map.teams[brokenBed.team];
      if (!team) return { changes: [], matchChanged: false };
      const changes = team.bed.map((cell) => this.options.terrain.remove(cell.x, cell.y, cell.z)).filter((change2) => change2 !== void 0);
      return { changes, matchChanged: true };
    }
    const change = this.options.terrain.removePlaced(hit.x, hit.y, hit.z);
    return { changes: change ? [change] : [], matchChanged: false };
  }
  placeAt(sessionId, interaction) {
    const menu = this.menuNear(sessionId, interaction.origin);
    if (menu) {
      this.options.openInventory?.(sessionId, menu);
      return [];
    }
    const placement = this.options.selectedPlacement?.(sessionId);
    if (!placement || !this.options.consumePlacement || isZeroVector(interaction.hit.normal)) return [];
    const x = interaction.hit.x + interaction.hit.normal[0];
    const y = interaction.hit.y + interaction.hit.normal[1];
    const z = interaction.hit.z + interaction.hit.normal[2];
    const change = this.options.terrain.place(x, y, z, placement.block);
    if (!change) return [];
    if (!this.options.consumePlacement(sessionId, placement.item)) {
      this.options.terrain.removePlaced(x, y, z);
      return [];
    }
    return [change];
  }
  menuNear(sessionId, origin) {
    const match = this.options.match;
    if (!match || !this.options.openInventory) return void 0;
    const player = match.player(sessionId);
    if (!player) return void 0;
    const team = match.map.teams[player.team];
    if (!team) return void 0;
    if (distanceSquared(origin, team.shop) <= maximumReach * maximumReach) return "shop";
    if (distanceSquared(origin, team.upgrade) <= maximumReach * maximumReach) return "upgrade";
    return void 0;
  }
};
function blockBreakTarget(value, terrain) {
  return voxelInteraction(value, terrain, action0Button)?.hit;
}
function blockPlacementTarget(value, terrain) {
  return voxelInteraction(value, terrain, action1Button);
}
function voxelInteraction(value, terrain, button) {
  if (!isRecord3(value)) return void 0;
  const { buttonState, prevButtonState } = value;
  if (!isByte(buttonState) || !isByte(prevButtonState)) return void 0;
  if ((buttonState & ~prevButtonState & button) === 0) return void 0;
  const origin = vector3(value.rayOrigin);
  const direction = vector3(value.rayDirection);
  if (!origin || !direction) return void 0;
  const hit = raycastVoxel(terrain, origin, direction, maximumReach);
  return hit ? { origin, hit } : void 0;
}
function vector3(value) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(isFiniteNumber)) return void 0;
  return [value[0], value[1], value[2]];
}
function isZeroVector(value) {
  return value[0] === 0 && value[1] === 0 && value[2] === 0;
}
function distanceSquared(first, second) {
  const x = first[0] - second[0];
  const y = first[1] - second[1];
  const z = first[2] - second[2];
  return x * x + y * y + z * z;
}
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function isByte(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255;
}
function isRecord3(value) {
  return typeof value === "object" && value !== null;
}

// legacy/box3-compat/src/game/input/keyboard-interaction.ts
var maximumKeysPerEvent = 64;
var KeyboardInteractionService = class {
  constructor(options) {
    this.options = options;
  }
  options;
  handle(sessionId, input2) {
    if (!sessionId || !isRecord4(input2)) return 0;
    const playerId = this.options.playerIdForSession(sessionId);
    if (playerId === void 0 || input2.id !== playerId) return 0;
    if (!Number.isSafeInteger(input2.tick) || input2.tick < 0) return 0;
    const current = keyCodes(input2.keyDownState);
    const previous = keyCodes(input2.prevKeyDownState);
    if (!current || !previous) return 0;
    const currentSet = new Set(current);
    const previousSet = new Set(previous);
    const keyDown = [];
    const keyUp = [];
    let handled = 0;
    for (const keyCode of currentSet) {
      if (previousSet.has(keyCode)) continue;
      this.options.onKeyPress(sessionId, keyCode);
      keyDown.push(keyCode);
      handled += 1;
    }
    for (const keyCode of previousSet) {
      if (currentSet.has(keyCode)) continue;
      keyUp.push(keyCode);
      handled += 1;
    }
    if (handled > 0) this.options.onTransitions?.(sessionId, { tick: input2.tick, keyDown, keyUp });
    return handled;
  }
};
function keyCodes(value) {
  if (!Array.isArray(value) || value.length > maximumKeysPerEvent) return void 0;
  if (!value.every(isKeyCode)) return void 0;
  return value;
}
function isKeyCode(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255;
}
function isRecord4(value) {
  return typeof value === "object" && value !== null;
}

// legacy/box3-compat/src/game/match/src-main-map.ts
var bedwarsTeamIndices = [0, 1, 2, 3];
var srcMainBedwarsMap = Object.freeze({
  id: "src-main",
  source: "others/src_/server/gameConfig.js#MAP_DATA.main",
  voidY: -10,
  teams: Object.freeze([
    mapTeam(0, "RED", vector(237.5, 72, 127.5), bed(216, 64, 127, 215, 64, 127), vector(240, 62, 127), vector(232.5, 64, 136.5), vector(232.5, 64, 118.5), vector(237.5, 65.4, 122.5), vector(237.5, 65.4, 132.5)),
    mapTeam(1, "BLUE", vector(17.5, 72, 127.5), bed(38, 64, 127, 39, 64, 127), vector(14, 62, 127), vector(22.5, 64, 118.5), vector(22.5, 64, 136.5), vector(17.5, 65.4, 122.5), vector(17.5, 65.4, 132.5)),
    mapTeam(2, "GREEN", vector(127.5, 72, 237.5), bed(127, 64, 215, 127, 64, 214), vector(127, 62, 240), vector(118.5, 64, 232.5), vector(136.5, 64, 232.5), vector(122.5, 65.4, 237.5), vector(132.6, 65.4, 237.5)),
    mapTeam(3, "YELLOW", vector(127.5, 72, 17.5), bed(127, 64, 39, 127, 64, 40), vector(127, 62, 14), vector(136.5, 64, 22.5), vector(118.5, 64, 22.5), vector(132.5, 65.4, 17.5), vector(122.5, 65.4, 17.5))
  ])
});
function isBedwarsTeamIndex(value) {
  return Number.isInteger(value) && value >= 0 && value < bedwarsTeamIndices.length;
}
function teamForIndex(map, index) {
  const team = map.teams.find((candidate) => candidate.index === index);
  if (!team) throw new Error("Map is missing BedWars team " + String(index));
  return team;
}
function vector(x, y, z) {
  return Object.freeze([x, y, z]);
}
function bed(firstX, firstY, firstZ, secondX, secondY, secondZ) {
  return Object.freeze([
    Object.freeze({ x: firstX, y: firstY, z: firstZ }),
    Object.freeze({ x: secondX, y: secondY, z: secondZ })
  ]);
}
function mapTeam(index, name, spawn, cells, forge, shop, upgrade, teamChest, enderChest) {
  return Object.freeze({ index, name, spawn, bed: cells, forge, shop, upgrade, teamChest, enderChest });
}

// legacy/box3-compat/src/game/match/bedwars-match.ts
var BedwarsMatch = class {
  map;
  maximumPlayersPerTeam;
  playersBySession = /* @__PURE__ */ new Map();
  teamPlayerCounts = [0, 0, 0, 0];
  beds = [true, true, true, true];
  constructor(options = {}) {
    this.map = options.map ?? srcMainBedwarsMap;
    this.maximumPlayersPerTeam = requireCapacity(options.maximumPlayersPerTeam ?? 4);
    validateMap(this.map);
  }
  get playerCount() {
    return this.playersBySession.size;
  }
  join(sessionId) {
    requireSessionId2(sessionId);
    const existing = this.playersBySession.get(sessionId);
    if (existing) return existing;
    const team = this.nextTeam();
    const player = Object.freeze({
      sessionId,
      team,
      spawn: teamForIndex(this.map, team).spawn
    });
    this.playersBySession.set(sessionId, player);
    this.teamPlayerCounts[team] += 1;
    return player;
  }
  player(sessionId) {
    return this.playersBySession.get(sessionId);
  }
  players() {
    return Object.freeze([...this.playersBySession.values()]);
  }
  spawnFor(sessionId) {
    return this.join(sessionId).spawn;
  }
  disconnect(sessionId) {
    const player = this.playersBySession.get(sessionId);
    if (!player) return false;
    this.playersBySession.delete(sessionId);
    this.teamPlayerCounts[player.team] -= 1;
    return true;
  }
  snapshot() {
    return Object.freeze({
      mapId: this.map.id,
      beds: Object.freeze([...this.beds]),
      players: Object.freeze([...this.teamPlayerCounts])
    });
  }
  teamForBedVoxel(x, y, z) {
    if (!isVoxelCoordinate(x) || !isVoxelCoordinate(y) || !isVoxelCoordinate(z)) return void 0;
    for (const team of this.map.teams) {
      if (team.bed.some((cell) => cell.x === x && cell.y === y && cell.z === z)) return team.index;
    }
    return void 0;
  }
  breakBed(sessionId, x, y, z) {
    const player = this.playersBySession.get(sessionId);
    const targetTeam = this.teamForBedVoxel(x, y, z);
    if (!player || targetTeam === void 0 || player.team === targetTeam || !this.beds[targetTeam]) return void 0;
    this.beds[targetTeam] = false;
    return Object.freeze({ team: targetTeam, snapshot: this.snapshot() });
  }
  nextTeam() {
    let selected;
    let lowestCount = Number.POSITIVE_INFINITY;
    for (const team of bedwarsTeamIndices) {
      const count = this.teamPlayerCounts[team];
      if (count >= this.maximumPlayersPerTeam || count >= lowestCount) continue;
      selected = team;
      lowestCount = count;
    }
    if (selected === void 0) throw new Error("BedWars match is full");
    return selected;
  }
};
function validateMap(map) {
  if (!map.id) throw new Error("BedWars map id must not be empty");
  if (map.teams.length !== bedwarsTeamIndices.length) throw new Error("BedWars map must define four teams");
  for (const index of bedwarsTeamIndices) {
    const team = teamForIndex(map, index);
    if (!isBedwarsTeamIndex(team.index) || !isFiniteVector(team.spawn)) {
      throw new Error("BedWars map contains an invalid team definition");
    }
  }
}
function requireCapacity(value) {
  if (!Number.isInteger(value) || value < 1 || value > 64) {
    throw new RangeError("maximumPlayersPerTeam must be an integer between 1 and 64");
  }
  return value;
}
function requireSessionId2(value) {
  if (!value) throw new Error("sessionId must not be empty");
}
function isVoxelCoordinate(value) {
  return Number.isInteger(value) && Number.isFinite(value);
}
function isFiniteVector(value) {
  return value.length === 3 && value.every(Number.isFinite);
}

// legacy/box3-compat/src/game/match/forge-resources.ts
var ironIntervalMilliseconds = 2e3;
var goldIntervalMilliseconds = 8e3;
var emeraldIntervalMilliseconds = 3e4;
var forgeReach = 4.5;
var ForgeResourceService = class {
  constructor(options) {
    this.options = options;
    this.now = options.now ?? Date.now;
    this.schedule = options.schedule ?? ((callback, milliseconds) => setInterval(callback, milliseconds));
    this.cancel = options.cancel ?? ((handle) => clearInterval(handle));
  }
  options;
  now;
  schedule;
  cancel;
  timer;
  nextIron = 0;
  nextGold = 0;
  nextEmerald = 0;
  start() {
    if (this.timer !== void 0) return;
    const now = this.now();
    this.nextIron = now + ironIntervalMilliseconds;
    this.nextGold = now + goldIntervalMilliseconds;
    this.nextEmerald = now + emeraldIntervalMilliseconds;
    const timer = this.schedule(() => this.tick(), 500);
    this.timer = timer;
    if (hasUnref(timer)) timer.unref();
  }
  dispose() {
    if (this.timer === void 0) return;
    this.cancel(this.timer);
    this.timer = void 0;
  }
  tick() {
    const now = this.now();
    const ironDue = now >= this.nextIron;
    const goldDue = now >= this.nextGold;
    const emeraldDue = now >= this.nextEmerald;
    if (!ironDue && !goldDue && !emeraldDue) return;
    if (ironDue) this.nextIron = advance(this.nextIron, ironIntervalMilliseconds, now);
    if (goldDue) this.nextGold = advance(this.nextGold, goldIntervalMilliseconds, now);
    if (emeraldDue) this.nextEmerald = advance(this.nextEmerald, emeraldIntervalMilliseconds, now);
    for (const player of this.options.match.players()) {
      const position = this.options.runtime.playerPosition(player.sessionId);
      const team = this.options.match.map.teams[player.team];
      if (!position || !team || distanceSquared2(position, team.forge) > forgeReach * forgeReach) continue;
      if (ironDue) this.options.grantItem(player.sessionId, "iron", 1);
      if (goldDue) this.options.grantItem(player.sessionId, "gold", 1);
      if (emeraldDue) this.options.grantItem(player.sessionId, "emerald", 1);
    }
  }
};
function advance(next, interval, now) {
  while (next <= now) next += interval;
  return next;
}
function distanceSquared2(first, second) {
  const x = first[0] - second[0];
  const y = first[1] - second[1];
  const z = first[2] - second[2];
  return x * x + y * y + z * z;
}
function hasUnref(value) {
  return typeof value === "object" && value !== null && "unref" in value && typeof value.unref === "function";
}

// legacy/box3-compat/src/archive/legacy-project.ts
var maxProjectJsonBytes = 8 * 1024 * 1024;
var maxScriptBytes = 2 * 1024 * 1024;
var maxVoxelSnapshotBytes = 64 * 1024 * 1024;
var maxTotalLocalAssetBytes = 256 * 1024 * 1024;
var maxEntityId = 2147483647;
function createLegacyProjectRuntimePlan(project, resolveMesh) {
  if (typeof resolveMesh !== "function") throw new TypeError("resolveMesh must be a function");
  const assets = new Map(project.assets.map((asset) => [asset.logicalName, asset]));
  const entries = [];
  const unresolved = [];
  for (const entity of project.entities) {
    const asset = assets.get(entity.mesh);
    if (!asset) throw new Error(`Legacy entity references an unavailable mesh: ${entity.mesh}`);
    const meshId = resolveMesh(asset);
    if (meshId === void 0) {
      unresolved.push(Object.freeze({ sourceId: entity.sourceId, mesh: entity.mesh }));
      continue;
    }
    if (!Number.isSafeInteger(meshId) || meshId < 1 || meshId > maxEntityId) {
      throw new RangeError(`Invalid meshId returned for legacy resource: ${entity.mesh}`);
    }
    const runtimeTags = entity.tags.filter(isRuntimeTag);
    entries.push(Object.freeze({
      sourceId: entity.sourceId,
      spawn: freezeRuntimeSpawn({
        kind: "object",
        position: entity.position,
        name: entity.name,
        tags: runtimeTags,
        replica: {
          body: {
            bounds: entity.bounds,
            orientation: entity.orientation,
            collides: entity.collision,
            fixed: entity.fixed,
            gravity: entity.gravity,
            mass: entity.mass,
            friction: entity.friction,
            restitution: entity.restitution
          },
          model: {
            meshId,
            color: entity.tint,
            scale: entity.scale,
            emissive: entity.emissive,
            shininess: entity.shininess,
            metalness: entity.metalness
          }
        }
      })
    }));
  }
  return Object.freeze({
    entries: Object.freeze(entries),
    unresolved: Object.freeze(unresolved)
  });
}
function freezeRuntimeSpawn(input2) {
  const replica = input2.replica;
  if (!replica) throw new Error("Legacy runtime spawn requires a replica");
  return Object.freeze({
    kind: input2.kind,
    position: freezeVector(input2.position),
    ...input2.name === void 0 ? {} : { name: input2.name },
    ...input2.tags === void 0 ? {} : { tags: Object.freeze([...input2.tags]) },
    replica: Object.freeze({
      body: Object.freeze({
        bounds: freezeVector(replica.body.bounds),
        ...replica.body.orientation === void 0 ? {} : { orientation: freezeQuaternion(replica.body.orientation) },
        ...replica.body.collides === void 0 ? {} : { collides: replica.body.collides },
        ...replica.body.fixed === void 0 ? {} : { fixed: replica.body.fixed },
        ...replica.body.gravity === void 0 ? {} : { gravity: replica.body.gravity },
        ...replica.body.mass === void 0 ? {} : { mass: replica.body.mass },
        ...replica.body.friction === void 0 ? {} : { friction: replica.body.friction },
        ...replica.body.restitution === void 0 ? {} : { restitution: replica.body.restitution }
      }),
      model: Object.freeze({
        meshId: replica.model.meshId,
        ...replica.model.color === void 0 ? {} : { color: freezeRgba(replica.model.color) },
        ...replica.model.scale === void 0 ? {} : { scale: freezeVector(replica.model.scale) },
        ...replica.model.emissive === void 0 ? {} : { emissive: replica.model.emissive },
        ...replica.model.shininess === void 0 ? {} : { shininess: replica.model.shininess },
        ...replica.model.metalness === void 0 ? {} : { metalness: replica.model.metalness }
      })
    })
  });
}
function isRuntimeTag(value) {
  return /^[A-Za-z0-9_.:-]{1,64}$/.test(value);
}
function freezeVector(value) {
  return Object.freeze([value[0], value[1], value[2]]);
}
function freezeQuaternion(value) {
  return Object.freeze([value[0], value[1], value[2], value[3]]);
}
function freezeRgba(value) {
  return Object.freeze([value[0], value[1], value[2], value[3]]);
}

// legacy/box3-compat/src/game/project/legacy-project-mount.ts
function mountLegacyProject(options) {
  if (!options || typeof options !== "object") throw new TypeError("legacy project mount options are required");
  if (!options.runtime || typeof options.runtime.spawnEntity !== "function" || typeof options.runtime.despawnEntity !== "function") {
    throw new TypeError("legacy project runtime must expose spawnEntity and despawnEntity");
  }
  const plan = createLegacyProjectRuntimePlan(options.project, options.resolveMesh);
  const spawned = [];
  const entityIds = /* @__PURE__ */ new Set();
  const sourceIds = /* @__PURE__ */ new Map();
  try {
    for (const entry of plan.entries) {
      const snapshot = options.runtime.spawnEntity(entry.spawn);
      const entityId = snapshot?.entityId;
      if (!Number.isSafeInteger(entityId) || entityId < 1) throw new Error("Legacy project runtime returned an invalid entity id");
      if (entityIds.has(entityId)) throw new Error("Legacy project runtime returned a duplicate entity id");
      entityIds.add(entityId);
      sourceIds.set(entry.sourceId, entityId);
      spawned.push(Object.freeze({ sourceId: entry.sourceId, entityId }));
    }
  } catch (error) {
    for (const entry of [...spawned].reverse()) {
      try {
        options.runtime.despawnEntity(entry.entityId);
      } catch {
      }
    }
    throw error;
  }
  const unresolved = Object.freeze(plan.unresolved.map((entry) => Object.freeze({ ...entry })));
  const mounted = Object.freeze(spawned);
  let disposed = false;
  return Object.freeze({
    spawned: mounted,
    unresolved,
    getRuntimeEntityId(sourceId) {
      return sourceIds.get(sourceId);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      let failure;
      for (const entry of [...mounted].reverse()) {
        try {
          options.runtime.despawnEntity(entry.entityId);
        } catch (error) {
          failure ??= error;
        }
      }
      if (failure !== void 0) throw failure;
    }
  });
}

// legacy/box3-compat/src/game/project/project-package-player-projection.ts
var import_node_crypto5 = require("node:crypto");

// packages/migration/src/safe-project-file.ts
var import_promises5 = require("node:fs/promises");
var import_node_path7 = require("node:path");
async function createRealProjectRoot(rootDirectory, label) {
  const path = (0, import_node_path7.resolve)(rootDirectory);
  const info = await requireRealDirectory(path, `${label} root`);
  const realPath = await (0, import_promises5.realpath)(path);
  return Object.freeze({ path, realPath, identity: identityOf(info) });
}
async function readRealFileFromRoot(root, relativePath, maximumBytes, label, options = {}) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) throw new RangeError(`${label} maximum bytes is invalid`);
  const parts = requireProjectRelativePath(relativePath, `${label} path`).split("/");
  const directories = await captureDirectoryChain(root, parts.slice(0, -1), label);
  const parent = directories.at(-1);
  const target = (0, import_node_path7.join)(parent.path, parts.at(-1));
  const expected = await requireRealFile(target, maximumBytes, label);
  const expectedRealPath = await (0, import_promises5.realpath)(target);
  assertResolvedInside(root.realPath, expectedRealPath, label);
  const handle = await (0, import_promises5.open)(target, "r");
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || !sameFileIdentity(identityOf(expected), opened) || opened.size < 0 || opened.size > maximumBytes) {
      throw new Error(`${label} changed while opening`);
    }
    await verifyDirectoryChain(root, directories, label);
    await verifyTargetPath(root, target, expected, expectedRealPath, maximumBytes, label);
    await options.beforeRead?.();
    await verifyDirectoryChain(root, directories, label);
    await verifyTargetPath(root, target, expected, expectedRealPath, maximumBytes, label);
    const bytes = await readOpenFileAtMost(handle, maximumBytes, label);
    const completed = await handle.stat();
    if (!completed.isFile() || !sameFileIdentity(identityOf(opened), completed)) {
      throw new Error(`${label} changed while reading`);
    }
    await verifyDirectoryChain(root, directories, label);
    await verifyTargetPath(root, target, expected, expectedRealPath, maximumBytes, label);
    return bytes;
  } finally {
    await handle.close();
  }
}
function requireProjectRelativePath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) {
    throw new Error(`${label} must be a non-empty project-relative path`);
  }
  if (value.includes("\\") || value.startsWith("/") || value.includes(":") || /[\x00-\x1f\x7f]/.test(value)) {
    throw new Error(`${label} must be a safe project-relative path`);
  }
  const parts = value.split("/");
  if (parts.some((part) => part.length === 0 || part === "." || part === "..")) {
    throw new Error(`${label} must be a safe project-relative path`);
  }
  return value;
}
async function captureDirectoryChain(root, parts, label) {
  await verifyRoot(root, label);
  const directories = [Object.freeze({ path: root.path, realPath: root.realPath, identity: root.identity })];
  let current = root.path;
  for (const part of parts) {
    current = (0, import_node_path7.join)(current, part);
    const info = await requireRealDirectory(current, `${label} path segment`);
    const realPath = await (0, import_promises5.realpath)(current);
    assertResolvedInside(root.realPath, realPath, label);
    directories.push(Object.freeze({ path: current, realPath, identity: identityOf(info) }));
  }
  return Object.freeze(directories);
}
async function verifyDirectoryChain(root, directories, label) {
  await verifyRoot(root, label);
  for (const directory of directories.slice(1)) {
    const info = await requireRealDirectory(directory.path, `${label} path segment`);
    if (!sameFileIdentity(directory.identity, info)) throw new Error(`${label} parent directory changed`);
    const realPath = await (0, import_promises5.realpath)(directory.path);
    if (!samePath(directory.realPath, realPath)) throw new Error(`${label} parent directory changed`);
    assertResolvedInside(root.realPath, realPath, label);
  }
}
async function verifyRoot(root, label) {
  const info = await requireRealDirectory(root.path, `${label} root`);
  if (!sameFileIdentity(root.identity, info)) throw new Error(`${label} root changed`);
  const realPath = await (0, import_promises5.realpath)(root.path);
  if (!samePath(root.realPath, realPath)) throw new Error(`${label} root changed`);
}
async function verifyTargetPath(root, target, expected, expectedRealPath, maximumBytes, label) {
  const info = await requireRealFile(target, maximumBytes, label);
  if (!sameFileIdentity(identityOf(expected), info)) throw new Error(`${label} file changed`);
  const realPath = await (0, import_promises5.realpath)(target);
  if (!samePath(expectedRealPath, realPath)) throw new Error(`${label} file changed`);
  assertResolvedInside(root.realPath, realPath, label);
}
async function requireRealDirectory(path, label) {
  const info = await (0, import_promises5.lstat)(path);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`${label} must be a real directory`);
  return info;
}
async function requireRealFile(path, maximumBytes, label) {
  const info = await (0, import_promises5.lstat)(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 0 || info.size > maximumBytes) {
    throw new Error(`Invalid ${label} file`);
  }
  return info;
}
async function readOpenFileAtMost(handle, maximumBytes, label) {
  const chunks = [];
  let totalBytes = 0;
  let position = 0;
  while (true) {
    const remainingWithProbe = maximumBytes - totalBytes + 1;
    const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, remainingWithProbe));
    const { bytesRead } = await handle.read(buffer, 0, buffer.byteLength, position);
    if (bytesRead === 0) break;
    totalBytes += bytesRead;
    if (totalBytes > maximumBytes) throw new Error(`Invalid ${label} size`);
    chunks.push(buffer.subarray(0, bytesRead));
    position += bytesRead;
  }
  return Buffer.concat(chunks, totalBytes);
}
function assertResolvedInside(root, target, label) {
  const local = (0, import_node_path7.relative)(root, target);
  if (local === ".." || local.startsWith("..\\") || local.startsWith("../") || (0, import_node_path7.isAbsolute)(local)) {
    throw new Error(`${label} path escapes its root`);
  }
}
function identityOf(info) {
  return Object.freeze({ dev: info.dev, ino: info.ino });
}
function sameFileIdentity(expected, actual) {
  return expected.dev === actual.dev && expected.ino === actual.ino;
}
function samePath(left, right) {
  return (0, import_node_path7.relative)(left, right) === "" && (0, import_node_path7.relative)(right, left) === "";
}

// legacy/box3-compat/src/game/project/project-package-player-projection.ts
var PROJECT_PACKAGE_PLAYER_PROJECTION_FORMAT = "nea-local-player-entity-projection";
var PROJECT_PACKAGE_PLAYER_PROJECTION_VERSION = 1;
var maxDescriptorBytes = 256 * 1024;
var maxMappings = 4096;
var sha256Pattern3 = /^[a-f0-9]{64}$/;
var bootstrapMeshHashPattern = /^[A-Za-z0-9_-]{43}$/;
var trustedProjections = /* @__PURE__ */ new WeakSet();
var projectionSourceSnapshots = /* @__PURE__ */ new WeakMap();
function isProjectPackagePlayerProjection(value) {
  return isObject2(value) && trustedProjections.has(value);
}
function isProjectPackagePlayerProjectionBoundToProject(projection, project) {
  return isProjectPackagePlayerProjection(projection) && projectionSourceSnapshots.get(projection) === project;
}
function projectPackageEntityFingerprint(entity) {
  const canonical = JSON.stringify({
    kind: entity.kind,
    position: [entity.position[0], entity.position[1], entity.position[2]],
    tags: [...entity.tags]
  });
  return (0, import_node_crypto5.createHash)("sha256").update(canonical, "utf8").digest("hex");
}
async function loadProjectPackagePlayerProjection(project, bootstrap, descriptorFile) {
  if (!project || typeof project.rootDirectory !== "string") {
    throw new TypeError("Validated project package is required");
  }
  const descriptorPath = requireProjectionDescriptorPath(descriptorFile);
  const root = await createRealProjectRoot(project.rootDirectory, "Local Player projection package");
  const bytes = await readRealFileFromRoot(
    root,
    descriptorPath,
    maxDescriptorBytes,
    "Local Player projection descriptor"
  );
  let document;
  try {
    document = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Local Player projection descriptor is not valid JSON");
  }
  return createProjectPackagePlayerProjection(project, bootstrap, document);
}
function createProjectPackagePlayerProjection(project, bootstrap, descriptorValue) {
  if (!project || !project.manifest || !Array.isArray(project.entities)) {
    throw new TypeError("Validated project package is required");
  }
  if (!bootstrap || !Array.isArray(bootstrap.meshHashes)) {
    throw new TypeError("Project bootstrap mesh table is required");
  }
  const descriptor = parseDescriptor(descriptorValue);
  if (descriptor.packageId !== project.manifest.packageId) {
    throw new Error("Local Player projection package ID does not match the loaded v1 package");
  }
  const mappedEntityIndexes = /* @__PURE__ */ new Set();
  const entries = [];
  for (const mapping of descriptor.entities) {
    if (mappedEntityIndexes.has(mapping.entityIndex)) {
      throw new Error(`Duplicate local Player projection entity mapping: ${mapping.entityIndex}`);
    }
    mappedEntityIndexes.add(mapping.entityIndex);
    const source = project.entities[mapping.entityIndex];
    if (!source) throw new Error(`Local Player projection references an unavailable entity index: ${mapping.entityIndex}`);
    if (source.kind !== "entity" && source.kind !== "prop") {
      throw new Error(`Local Player projection entity ${mapping.entityIndex} is not a static entity`);
    }
    if (!sameEntityExpectation(source, mapping.expect)) {
      throw new Error(`Local Player projection entity expectation does not match: ${mapping.entityIndex}`);
    }
    const fingerprint = projectPackageEntityFingerprint(source);
    if (mapping.sourceFingerprint !== fingerprint) {
      throw new Error(`Local Player projection entity fingerprint does not match: ${mapping.entityIndex}`);
    }
    const bootstrapEntry = bootstrap.meshHashes[mapping.mesh.bootstrapMeshIndex];
    if (!bootstrapEntry || bootstrapEntry.hash !== mapping.mesh.bootstrapMeshHash) {
      throw new Error(`Local Player projection bootstrap mesh binding does not match: ${mapping.entityIndex}`);
    }
    entries.push(Object.freeze({
      entityIndex: mapping.entityIndex,
      spawn: freezeSpawn(source, mapping)
    }));
  }
  const diagnostics = [];
  for (const [entityIndex, entity] of project.entities.entries()) {
    if ((entity.kind === "entity" || entity.kind === "prop") && !mappedEntityIndexes.has(entityIndex)) {
      diagnostics.push(Object.freeze({
        code: "unmapped-static-entity",
        entityIndex,
        kind: entity.kind,
        sourceFingerprint: projectPackageEntityFingerprint(entity)
      }));
    }
  }
  const frozenEntries = Object.freeze(entries.sort((left, right) => left.entityIndex - right.entityIndex));
  const frozenDiagnostics = Object.freeze(diagnostics);
  const runtimeMeshes = /* @__PURE__ */ new Map();
  for (const mesh of descriptor.meshes) {
    if (runtimeMeshes.has(mesh.name)) throw new Error(`Duplicate local Player runtime mesh mapping: ${mesh.name}`);
    const bootstrapEntry = bootstrap.meshHashes[mesh.bootstrapMeshIndex];
    if (!bootstrapEntry || bootstrapEntry.hash !== mesh.bootstrapMeshHash) {
      throw new Error(`Local Player runtime mesh bootstrap binding does not match: ${mesh.name}`);
    }
    runtimeMeshes.set(mesh.name, Object.freeze({
      bounds: mesh.bounds,
      meshId: mesh.bootstrapMeshIndex + 1
    }));
  }
  const bindings = Object.freeze([
    ...descriptor.entities.map((mapping) => Object.freeze({
      bootstrapMeshIndex: mapping.mesh.bootstrapMeshIndex,
      bootstrapMeshHash: mapping.mesh.bootstrapMeshHash
    })),
    ...descriptor.meshes.map((mesh) => Object.freeze({
      bootstrapMeshIndex: mesh.bootstrapMeshIndex,
      bootstrapMeshHash: mesh.bootstrapMeshHash
    }))
  ]);
  const projection = Object.freeze({
    packageId: project.manifest.packageId,
    packageRootDirectory: project.rootDirectory,
    descriptor,
    entries: frozenEntries,
    diagnostics: frozenDiagnostics,
    resolveRuntimeMesh(name) {
      return typeof name === "string" ? runtimeMeshes.get(name) : void 0;
    },
    matchesBootstrap(candidate) {
      return Boolean(candidate) && Array.isArray(candidate.meshHashes) && bindings.every((binding) => candidate.meshHashes[binding.bootstrapMeshIndex]?.hash === binding.bootstrapMeshHash);
    }
  });
  trustedProjections.add(projection);
  projectionSourceSnapshots.set(projection, project);
  return projection;
}
function mountProjectPackagePlayerProjection(projection, runtime) {
  if (!isProjectPackagePlayerProjection(projection)) {
    throw new TypeError("Local Player projection must be created by the validated projection factory");
  }
  if (!runtime || typeof runtime.spawnEntity !== "function" || typeof runtime.despawnEntity !== "function") {
    throw new TypeError("Local Player projection runtime must expose spawnEntity and despawnEntity");
  }
  const spawned = [];
  const runtimeIds = /* @__PURE__ */ new Map();
  const usedRuntimeIds = /* @__PURE__ */ new Set();
  try {
    for (const entry of projection.entries) {
      const snapshot = runtime.spawnEntity(entry.spawn);
      const entityId = snapshot?.entityId;
      if (!Number.isSafeInteger(entityId) || entityId < 1) {
        throw new Error("Local Player projection runtime returned an invalid entity id");
      }
      if (usedRuntimeIds.has(entityId)) {
        throw new Error("Local Player projection runtime returned a duplicate entity id");
      }
      usedRuntimeIds.add(entityId);
      runtimeIds.set(entry.entityIndex, entityId);
      spawned.push(Object.freeze({ entityIndex: entry.entityIndex, entityId }));
    }
  } catch (error) {
    for (const entry of [...spawned].reverse()) {
      try {
        runtime.despawnEntity(entry.entityId);
      } catch {
      }
    }
    throw error;
  }
  const mounted = Object.freeze(spawned);
  let disposed = false;
  return Object.freeze({
    spawned: mounted,
    diagnostics: projection.diagnostics,
    getRuntimeEntityId(entityIndex) {
      return runtimeIds.get(entityIndex);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      let failure;
      for (const entry of [...mounted].reverse()) {
        try {
          runtime.despawnEntity(entry.entityId);
        } catch (error) {
          failure ??= error;
        }
      }
      if (failure !== void 0) throw failure;
    }
  });
}
function requireProjectionDescriptorPath(descriptorFile) {
  const path = requireProjectRelativePath(descriptorFile, "Local Player projection descriptor");
  if (!path.endsWith(".json")) {
    throw new TypeError("Local Player projection descriptor must name a .json file");
  }
  return path;
}
function parseDescriptor(value) {
  const record = requireRecord(value, "Local Player projection descriptor");
  requireAllowedKeys(record, ["format", "version", "packageId", "entities", "meshes"], ["format", "version", "packageId", "entities"], "Local Player projection descriptor");
  if (record.format !== PROJECT_PACKAGE_PLAYER_PROJECTION_FORMAT) {
    throw new Error("Unsupported local Player projection descriptor format");
  }
  if (record.version !== PROJECT_PACKAGE_PLAYER_PROJECTION_VERSION) {
    throw new Error("Unsupported local Player projection descriptor version");
  }
  const packageId = requirePackageId(record.packageId);
  if (!Array.isArray(record.entities) || record.entities.length > maxMappings) {
    throw new Error("Local Player projection entities must be an array of at most 4096 mappings");
  }
  if (record.meshes !== void 0 && (!Array.isArray(record.meshes) || record.meshes.length > maxMappings)) {
    throw new Error("Local Player projection meshes must be an array of at most 4096 mappings");
  }
  return Object.freeze({
    format: PROJECT_PACKAGE_PLAYER_PROJECTION_FORMAT,
    version: PROJECT_PACKAGE_PLAYER_PROJECTION_VERSION,
    packageId,
    entities: Object.freeze(record.entities.map((entry, index) => parseMapping(entry, index))),
    meshes: Object.freeze((record.meshes ?? []).map((entry, index) => parseRuntimeMesh(entry, index)))
  });
}
function parseRuntimeMesh(value, index) {
  const record = requireRecord(value, `Local Player runtime mesh ${index}`);
  requireExactKeys(record, ["name", "bounds", "bootstrapMeshIndex", "bootstrapMeshHash"], `Local Player runtime mesh ${index}`);
  return Object.freeze({
    name: requireText(record.name, "Local Player runtime mesh name"),
    bounds: requirePositiveVector(record.bounds, "Local Player runtime mesh bounds"),
    ...parseMeshBinding({
      bootstrapMeshIndex: record.bootstrapMeshIndex,
      bootstrapMeshHash: record.bootstrapMeshHash
    }, index)
  });
}
function parseMapping(value, index) {
  const record = requireRecord(value, `Local Player projection entity ${index}`);
  requireAllowedKeys(
    record,
    ["entityIndex", "sourceFingerprint", "expect", "body", "mesh", "model", "nameplate"],
    ["entityIndex", "sourceFingerprint", "expect", "body", "mesh", "model"],
    `Local Player projection entity ${index}`
  );
  const entityIndex = requireEntityIndex(record.entityIndex);
  const sourceFingerprint = requireSha256(record.sourceFingerprint, `Local Player projection entity ${index} fingerprint`);
  return Object.freeze({
    entityIndex,
    sourceFingerprint,
    expect: parseExpectation(record.expect, index),
    body: parseBody(record.body, index),
    mesh: parseMeshBinding(record.mesh, index),
    model: parseModel(record.model, index),
    ...record.nameplate === void 0 ? {} : { nameplate: parseNameplate(record.nameplate, index) }
  });
}
function parseExpectation(value, index) {
  const record = requireRecord(value, `Local Player projection entity ${index} expectation`);
  requireExactKeys(record, ["kind", "position", "tags"], `Local Player projection entity ${index} expectation`);
  if (record.kind !== "entity" && record.kind !== "prop") {
    throw new Error("Local Player projection expected source kind is invalid");
  }
  return Object.freeze({
    kind: record.kind,
    position: requireVector(record.position, "Local Player projection expected source position"),
    tags: requireSourceTags(record.tags)
  });
}
function parseBody(value, index) {
  const record = requireRecord(value, `Local Player projection entity ${index} body`);
  requireAllowedKeys(
    record,
    ["bounds", "orientation", "collides", "fixed", "gravity", "collisionGroup", "mass", "friction", "restitution"],
    ["bounds"],
    `Local Player projection entity ${index} body`
  );
  return Object.freeze({
    bounds: requirePositiveVector(record.bounds, "Local Player projection body bounds"),
    ...record.orientation === void 0 ? {} : { orientation: requireQuaternion(record.orientation, "Local Player projection body orientation") },
    ...record.collides === void 0 ? {} : { collides: requireBoolean(record.collides, "Local Player projection body collides") },
    ...record.fixed === void 0 ? {} : { fixed: requireBoolean(record.fixed, "Local Player projection body fixed") },
    ...record.gravity === void 0 ? {} : { gravity: requireBoolean(record.gravity, "Local Player projection body gravity") },
    ...record.collisionGroup === void 0 ? {} : { collisionGroup: requireUint16(record.collisionGroup, "Local Player projection body collisionGroup") },
    ...record.mass === void 0 ? {} : { mass: requireFinite(record.mass, 0, 1e6, "Local Player projection body mass") },
    ...record.friction === void 0 ? {} : { friction: requireFinite(record.friction, 0, 1e6, "Local Player projection body friction") },
    ...record.restitution === void 0 ? {} : { restitution: requireFinite(record.restitution, 0, 1e6, "Local Player projection body restitution") }
  });
}
function parseMeshBinding(value, index) {
  const record = requireRecord(value, `Local Player projection entity ${index} mesh binding`);
  requireExactKeys(record, ["bootstrapMeshIndex", "bootstrapMeshHash"], `Local Player projection entity ${index} mesh binding`);
  const bootstrapMeshIndex = record.bootstrapMeshIndex;
  if (typeof bootstrapMeshIndex !== "number" || !Number.isSafeInteger(bootstrapMeshIndex) || bootstrapMeshIndex < 0) {
    throw new Error("Local Player projection bootstrap mesh index is invalid");
  }
  const bootstrapMeshHash = record.bootstrapMeshHash;
  if (typeof bootstrapMeshHash !== "string" || !bootstrapMeshHashPattern.test(bootstrapMeshHash)) {
    throw new Error("Local Player projection bootstrap mesh hash is invalid");
  }
  return Object.freeze({ bootstrapMeshIndex, bootstrapMeshHash });
}
function parseModel(value, index) {
  const record = requireRecord(value, `Local Player projection entity ${index} model`);
  requireAllowedKeys(
    record,
    ["invisible", "color", "scale", "offset", "emissive", "shininess", "metalness", "staticShadow", "name"],
    [],
    `Local Player projection entity ${index} model`
  );
  return Object.freeze({
    ...record.invisible === void 0 ? {} : { invisible: requireBoolean(record.invisible, "Local Player projection model invisible") },
    ...record.color === void 0 ? {} : { color: requireRgba(record.color, "Local Player projection model color") },
    ...record.scale === void 0 ? {} : { scale: requireVector(record.scale, "Local Player projection model scale") },
    ...record.offset === void 0 ? {} : { offset: requireVector(record.offset, "Local Player projection model offset") },
    ...record.emissive === void 0 ? {} : { emissive: requireFinite(record.emissive, 0, 1, "Local Player projection model emissive") },
    ...record.shininess === void 0 ? {} : { shininess: requireFinite(record.shininess, 0, 1, "Local Player projection model shininess") },
    ...record.metalness === void 0 ? {} : { metalness: requireFinite(record.metalness, 0, 1, "Local Player projection model metalness") },
    ...record.staticShadow === void 0 ? {} : { staticShadow: requireBoolean(record.staticShadow, "Local Player projection model staticShadow") },
    ...record.name === void 0 ? {} : { name: requireText(record.name, "Local Player projection model name") }
  });
}
function parseNameplate(value, index) {
  const record = requireRecord(value, `Local Player projection entity ${index} nameplate`);
  requireAllowedKeys(record, ["text", "radius", "color"], ["text"], `Local Player projection entity ${index} nameplate`);
  return Object.freeze({
    text: requireText(record.text, "Local Player projection nameplate text"),
    ...record.radius === void 0 ? {} : { radius: requireFinite(record.radius, 0, 4096, "Local Player projection nameplate radius") },
    ...record.color === void 0 ? {} : { color: requireRgb(record.color, "Local Player projection nameplate color") }
  });
}
function freezeSpawn(source, mapping) {
  const body = mapping.body;
  const model = mapping.model;
  return Object.freeze({
    // This descriptor projects inert static source records only. It does not
    // claim NPC/item/projectile behavior for a historical Player.
    kind: "object",
    position: Object.freeze([source.position[0], source.position[1], source.position[2]]),
    tags: Object.freeze([...source.tags]),
    replica: Object.freeze({
      body,
      model: Object.freeze({
        meshId: mapping.mesh.bootstrapMeshIndex + 1,
        ...model
      }),
      ...mapping.nameplate === void 0 ? {} : { nameplate: mapping.nameplate }
    })
  });
}
function sameEntityExpectation(entity, expectation) {
  return entity.kind === expectation.kind && entity.position.length === expectation.position.length && entity.position.every((coordinate, index) => coordinate === expectation.position[index]) && entity.tags.length === expectation.tags.length && entity.tags.every((tag, index) => tag === expectation.tags[index]);
}
function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value;
}
function isObject2(value) {
  return value !== null && typeof value === "object";
}
function requireExactKeys(value, expected, label) {
  const keys = Object.keys(value);
  if (keys.length !== expected.length || !expected.every((key) => Object.hasOwn(value, key))) {
    throw new Error(`${label} has unsupported or missing fields`);
  }
}
function requireAllowedKeys(value, allowed, required, label) {
  if (Object.keys(value).some((key) => !allowed.includes(key)) || required.some((key) => !Object.hasOwn(value, key))) {
    throw new Error(`${label} has unsupported or missing fields`);
  }
}
function requirePackageId(value) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) {
    throw new Error("Local Player projection package ID is invalid");
  }
  return value;
}
function requireEntityIndex(value) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value >= maxMappings) {
    throw new Error("Local Player projection entity index is invalid");
  }
  return value;
}
function requireSha256(value, label) {
  if (typeof value !== "string" || !sha256Pattern3.test(value)) throw new Error(`${label} is invalid`);
  return value;
}
function requireVector(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((item) => typeof item !== "number" || !Number.isFinite(item) || Math.abs(item) > 4096)) {
    throw new Error(`${label} must contain three finite coordinates within the runtime bounds`);
  }
  return Object.freeze([value[0], value[1], value[2]]);
}
function requireSourceTags(value) {
  if (!Array.isArray(value) || value.length > 32 || value.some((tag) => typeof tag !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(tag))) {
    throw new Error("Local Player projection expected source tags are invalid");
  }
  const tags = [...value];
  const canonical = [...new Set(tags)].sort();
  if (canonical.length !== tags.length || canonical.some((tag, index) => tag !== tags[index])) {
    throw new Error("Local Player projection expected source tags must be unique and sorted");
  }
  return Object.freeze(tags);
}
function requirePositiveVector(value, label) {
  const vector2 = requireVector(value, label);
  if (vector2.some((item) => item <= 0)) throw new Error(`${label} must contain three positive coordinates`);
  return vector2;
}
function requireQuaternion(value, label) {
  if (!Array.isArray(value) || value.length !== 4 || value.some((item) => typeof item !== "number" || !Number.isFinite(item) || Math.abs(item) > 1)) {
    throw new Error(`${label} must contain four normalized finite components`);
  }
  if (Math.hypot(value[0], value[1], value[2], value[3]) < 1e-6) {
    throw new Error(`${label} must not be zero`);
  }
  return Object.freeze([value[0], value[1], value[2], value[3]]);
}
function requireRgba(value, label) {
  if (!Array.isArray(value) || value.length !== 4 || value.some((item) => !Number.isInteger(item) || item < 0 || item > 255)) {
    throw new Error(`${label} must contain four unsigned bytes`);
  }
  return Object.freeze([value[0], value[1], value[2], value[3]]);
}
function requireRgb(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((item) => typeof item !== "number" || !Number.isFinite(item) || item < 0 || item > 1)) {
    throw new Error(`${label} must contain three normalized colour components`);
  }
  return Object.freeze([value[0], value[1], value[2]]);
}
function requireBoolean(value, label) {
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean`);
  return value;
}
function requireUint16(value, label) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 65535) throw new Error(`${label} must be an unsigned 16-bit integer`);
  return value;
}
function requireFinite(value, minimum, maximum, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} is outside the supported range`);
  }
  return value;
}
function requireText(value, label) {
  if (typeof value !== "string" || Array.from(value).length === 0 || Array.from(value).length > 64 || /[\x00-\x1f\x7f]/.test(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

// legacy/box3-compat/src/game/runtime/runtime-frame.ts
var defaultRuntimePlayerInputState = 4 | 1536;
function copyRuntimeVector(vector2) {
  return Object.freeze([vector2[0], vector2[1], vector2[2]]);
}
function copyRuntimeQuaternion(quaternion) {
  return Object.freeze([quaternion[0], quaternion[1], quaternion[2], quaternion[3]]);
}
function copyRuntimeRgb(color) {
  return Object.freeze([color[0], color[1], color[2]]);
}
function copyRuntimeRgba(color) {
  return Object.freeze([color[0], color[1], color[2], color[3]]);
}
function copyRuntimeAvatarSkin(value) {
  const result = /* @__PURE__ */ Object.create(null);
  for (const bodyPart of bodyParts) result[bodyPart] = value[bodyPart];
  return Object.freeze(result);
}
function isRuntimeAvatarSkin(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && bodyParts.every((bodyPart) => Number.isInteger(value[bodyPart]) && value[bodyPart] >= 0 && value[bodyPart] <= 4294967295);
}
function snapshotRuntimePlayer(player) {
  return Object.freeze({
    sessionId: player.sessionId,
    playerId: player.playerId,
    position: copyRuntimeVector(player.position),
    velocity: copyRuntimeVector(player.velocity),
    bodyHalfExtents: copyRuntimeVector(player.bodyHalfExtents),
    bodyShapeHalfExtents: copyRuntimeVector(player.bodyShapeHalfExtents ?? player.bodyHalfExtents),
    inputState: player.inputState,
    inputAngle: player.inputAngle,
    inputPitch: player.inputPitch,
    inputCameraAngle: player.inputCameraAngle,
    walkSpeed: player.walkSpeed,
    runSpeed: player.runSpeed,
    runAcceleration: player.runAcceleration,
    jumpPower: player.jumpPower,
    jumpSpeedFactor: player.jumpSpeedFactor,
    jumpAccelerationFactor: player.jumpAccelerationFactor,
    doubleJumpPower: player.doubleJumpPower,
    crouchSpeed: player.crouchSpeed,
    crouchAcceleration: player.crouchAcceleration,
    flySpeed: player.flySpeed,
    flyAcceleration: player.flyAcceleration,
    swimAcceleration: player.swimAcceleration,
    swimSpeed: player.swimSpeed,
    walkAcceleration: player.walkAcceleration,
    ...player.avatarSkin === void 0 ? {} : { avatarSkin: copyRuntimeAvatarSkin(player.avatarSkin) }
  });
}
function snapshotRuntimeEntityReplica(replica) {
  const body = Object.freeze({
    bounds: copyRuntimeVector(replica.body.bounds),
    ...replica.body.orientation === void 0 ? {} : { orientation: copyRuntimeQuaternion(replica.body.orientation) },
    ...replica.body.collides === void 0 ? {} : { collides: replica.body.collides },
    ...replica.body.fixed === void 0 ? {} : { fixed: replica.body.fixed },
    ...replica.body.gravity === void 0 ? {} : { gravity: replica.body.gravity },
    ...replica.body.collisionGroup === void 0 ? {} : { collisionGroup: replica.body.collisionGroup },
    ...replica.body.mass === void 0 ? {} : { mass: replica.body.mass },
    ...replica.body.friction === void 0 ? {} : { friction: replica.body.friction },
    ...replica.body.restitution === void 0 ? {} : { restitution: replica.body.restitution }
  });
  const model = Object.freeze({
    meshId: replica.model.meshId,
    ...replica.model.invisible === void 0 ? {} : { invisible: replica.model.invisible },
    ...replica.model.color === void 0 ? {} : { color: copyRuntimeRgba(replica.model.color) },
    ...replica.model.scale === void 0 ? {} : { scale: copyRuntimeVector(replica.model.scale) },
    ...replica.model.offset === void 0 ? {} : { offset: copyRuntimeVector(replica.model.offset) },
    ...replica.model.emissive === void 0 ? {} : { emissive: replica.model.emissive },
    ...replica.model.shininess === void 0 ? {} : { shininess: replica.model.shininess },
    ...replica.model.metalness === void 0 ? {} : { metalness: replica.model.metalness },
    ...replica.model.staticShadow === void 0 ? {} : { staticShadow: replica.model.staticShadow },
    ...replica.model.name === void 0 ? {} : { name: replica.model.name }
  });
  const nameplate = replica.nameplate === void 0 ? void 0 : Object.freeze({
    text: replica.nameplate.text,
    ...replica.nameplate.radius === void 0 ? {} : { radius: replica.nameplate.radius },
    ...replica.nameplate.color === void 0 ? {} : { color: copyRuntimeRgb(replica.nameplate.color) }
  });
  return Object.freeze({
    body,
    model,
    ...nameplate === void 0 ? {} : { nameplate }
  });
}
function snapshotRuntimeEntity(entity) {
  const snapshot = {
    entityId: entity.entityId,
    kind: entity.kind,
    position: copyRuntimeVector(entity.position),
    velocity: copyRuntimeVector(entity.velocity),
    name: entity.name,
    tags: Object.freeze([...entity.tags]),
    ownerSessionId: entity.ownerSessionId,
    interactable: entity.interactable
  };
  return Object.freeze(entity.replica === void 0 ? snapshot : { ...snapshot, replica: snapshotRuntimeEntityReplica(entity.replica) });
}
function createRuntimeFrame(tick, players, entities = []) {
  return Object.freeze({
    tick,
    players: Object.freeze(players.map(snapshotRuntimePlayer)),
    entities: Object.freeze(entities.map(snapshotRuntimeEntity))
  });
}

// legacy/box3-compat/src/game/runtime/entity-registry.ts
var defaultFirstEntityId = 1e6;
var maxEntityId2 = 2147483647;
var EntityRegistry = class {
  entitiesById = /* @__PURE__ */ new Map();
  nextEntityId;
  constructor(options = {}) {
    this.nextEntityId = requireEntityId(options.firstEntityId ?? defaultFirstEntityId, "firstEntityId");
  }
  get size() {
    return this.entitiesById.size;
  }
  has(entityId) {
    return this.entitiesById.has(entityId);
  }
  spawn(input2) {
    validateSpawn(input2);
    const entityId = input2.entityId ?? this.allocateEntityId();
    requireEntityId(entityId, "entityId");
    if (this.entitiesById.has(entityId)) throw new Error("Runtime entity id is already registered");
    const entity = {
      entityId,
      kind: input2.kind,
      position: copyRuntimeVector(input2.position),
      velocity: copyRuntimeVector(input2.velocity ?? [0, 0, 0]),
      name: input2.name,
      tags: normalizeTags(input2.tags),
      ownerSessionId: input2.ownerSessionId,
      interactable: input2.interactable ?? false,
      ...input2.replica === void 0 ? {} : { replica: snapshotRuntimeEntityReplica(input2.replica) }
    };
    this.entitiesById.set(entityId, entity);
    if (entityId >= this.nextEntityId && entityId < maxEntityId2) this.nextEntityId = entityId + 1;
    return snapshotEntity(entity);
  }
  despawn(entityId) {
    return this.entitiesById.delete(entityId);
  }
  updateTransform(entityId, transform) {
    const entity = this.entitiesById.get(entityId);
    if (!entity) return void 0;
    validateTransform(transform);
    if (transform.position) entity.position = copyRuntimeVector(transform.position);
    if (transform.velocity) entity.velocity = copyRuntimeVector(transform.velocity);
    const body = {
      ...transform.orientation === void 0 ? {} : { orientation: transform.orientation },
      ...transform.collides === void 0 ? {} : { collides: transform.collides },
      ...transform.fixed === void 0 ? {} : { fixed: transform.fixed },
      ...transform.gravity === void 0 ? {} : { gravity: transform.gravity },
      ...transform.mass === void 0 ? {} : { mass: transform.mass },
      ...transform.friction === void 0 ? {} : { friction: transform.friction },
      ...transform.restitution === void 0 ? {} : { restitution: transform.restitution }
    };
    if (Object.keys(body).length > 0 || transform.model !== void 0 || transform.nameplate !== void 0) {
      if (!entity.replica) throw new Error("Runtime entity has no render replica");
      entity.replica = snapshotRuntimeEntityReplica({
        body: { ...entity.replica.body, ...body },
        model: transform.model === void 0 ? entity.replica.model : { ...entity.replica.model, ...transform.model },
        ...transform.nameplate === null ? {} : transform.nameplate !== void 0 ? { nameplate: transform.nameplate } : entity.replica.nameplate === void 0 ? {} : { nameplate: entity.replica.nameplate }
      });
    }
    return snapshotEntity(entity);
  }
  snapshot() {
    return Object.freeze(
      [...this.entitiesById.values()].sort((left, right) => left.entityId - right.entityId).map(snapshotEntity)
    );
  }
  clear() {
    this.entitiesById.clear();
  }
  allocateEntityId() {
    while (this.entitiesById.has(this.nextEntityId)) {
      if (this.nextEntityId >= maxEntityId2) throw new Error("Runtime entity id space exhausted");
      this.nextEntityId += 1;
    }
    return this.nextEntityId;
  }
};
function snapshotEntity(entity) {
  return snapshotRuntimeEntity({
    entityId: entity.entityId,
    kind: entity.kind,
    position: entity.position,
    velocity: entity.velocity,
    name: entity.name,
    tags: entity.tags,
    ownerSessionId: entity.ownerSessionId,
    interactable: entity.interactable,
    ...entity.replica === void 0 ? {} : { replica: entity.replica }
  });
}
function validateSpawn(input2) {
  if (!isEntityKind(input2.kind)) throw new RangeError("runtime entity kind is invalid");
  if (input2.entityId !== void 0) requireEntityId(input2.entityId, "entityId");
  requireVector2(input2.position, "position");
  if (input2.velocity !== void 0) requireVector2(input2.velocity, "velocity");
  if (input2.name !== void 0 && (!isShortText(input2.name) || /[\x00-\x1f\x7f]/.test(input2.name))) {
    throw new RangeError("runtime entity name is invalid");
  }
  if (input2.ownerSessionId !== void 0 && !isShortText(input2.ownerSessionId)) {
    throw new RangeError("runtime entity ownerSessionId is invalid");
  }
  if (input2.interactable !== void 0 && typeof input2.interactable !== "boolean") {
    throw new RangeError("runtime entity interactable must be boolean");
  }
  if (input2.replica !== void 0) validateReplica(input2.replica);
  normalizeTags(input2.tags);
}
function validateTransform(transform) {
  if (transform.position !== void 0) requireVector2(transform.position, "position");
  if (transform.velocity !== void 0) requireVector2(transform.velocity, "velocity");
  if (transform.orientation !== void 0) requireQuaternion2(transform.orientation, "orientation");
  requireOptionalBoolean(transform.collides, "runtime entity body collides");
  requireOptionalBoolean(transform.fixed, "runtime entity body fixed");
  requireOptionalBoolean(transform.gravity, "runtime entity body gravity");
  requireOptionalFinite(transform.mass, "runtime entity body mass", 0, 1e6);
  requireOptionalFinite(transform.friction, "runtime entity body friction", 0, 1e6);
  requireOptionalFinite(transform.restitution, "runtime entity body restitution", 0, 1e6);
  if (transform.model !== void 0) {
    if (!transform.model || typeof transform.model !== "object" || Array.isArray(transform.model)) throw new RangeError("runtime entity model update is invalid");
    if (transform.model.meshId !== void 0) throw new RangeError("runtime entity model meshId cannot be changed");
    requireOptionalBoolean(transform.model.invisible, "runtime entity model invisible");
    if (transform.model.color !== void 0) requireRgba2(transform.model.color, "runtime entity model color");
    if (transform.model.scale !== void 0) requireVector2(transform.model.scale, "runtime entity model scale");
    if (transform.model.offset !== void 0) requireVector2(transform.model.offset, "runtime entity model offset");
    requireOptionalFinite(transform.model.emissive, "runtime entity model emissive", 0, 1);
    requireOptionalFinite(transform.model.shininess, "runtime entity model shininess", 0, 1);
    requireOptionalFinite(transform.model.metalness, "runtime entity model metalness", 0, 1);
  }
  if (transform.nameplate !== void 0 && transform.nameplate !== null) {
    if (!transform.nameplate || typeof transform.nameplate !== "object" || Array.isArray(transform.nameplate)) throw new RangeError("runtime entity nameplate is invalid");
    requireText2(transform.nameplate.text, "runtime entity nameplate text");
    requireOptionalFinite(transform.nameplate.radius, "runtime entity nameplate radius", 0, 4096);
    if (transform.nameplate.color !== void 0) requireRgb2(transform.nameplate.color, "runtime entity nameplate color");
  }
}
function validateReplica(replica) {
  if (!replica || typeof replica !== "object" || !replica.body || !replica.model) {
    throw new RangeError("runtime entity replica is invalid");
  }
  const { body, model, nameplate } = replica;
  requirePositiveVector2(body.bounds, "runtime entity body bounds");
  if (body.orientation !== void 0) requireQuaternion2(body.orientation, "runtime entity body orientation");
  requireOptionalBoolean(body.collides, "runtime entity body collides");
  requireOptionalBoolean(body.fixed, "runtime entity body fixed");
  requireOptionalBoolean(body.gravity, "runtime entity body gravity");
  requireOptionalUint16(body.collisionGroup, "runtime entity body collisionGroup");
  requireOptionalFinite(body.mass, "runtime entity body mass", 0, 1e6);
  requireOptionalFinite(body.friction, "runtime entity body friction", 0, 1e6);
  requireOptionalFinite(body.restitution, "runtime entity body restitution", 0, 1e6);
  if (!Number.isSafeInteger(model.meshId) || model.meshId < 1 || model.meshId > maxEntityId2) {
    throw new RangeError("runtime entity model meshId is invalid");
  }
  requireOptionalBoolean(model.invisible, "runtime entity model invisible");
  if (model.color !== void 0) requireRgba2(model.color, "runtime entity model color");
  if (model.scale !== void 0) requireVector2(model.scale, "runtime entity model scale");
  if (model.offset !== void 0) requireVector2(model.offset, "runtime entity model offset");
  requireOptionalFinite(model.emissive, "runtime entity model emissive", 0, 1);
  requireOptionalFinite(model.shininess, "runtime entity model shininess", 0, 1);
  requireOptionalFinite(model.metalness, "runtime entity model metalness", 0, 1);
  requireOptionalBoolean(model.staticShadow, "runtime entity model staticShadow");
  requireOptionalText(model.name, "runtime entity model name");
  if (nameplate !== void 0) {
    requireText2(nameplate.text, "runtime entity nameplate text");
    requireOptionalFinite(nameplate.radius, "runtime entity nameplate radius", 0, 4096);
    if (nameplate.color !== void 0) requireRgb2(nameplate.color, "runtime entity nameplate color");
  }
}
function normalizeTags(tags) {
  if (tags === void 0) return Object.freeze([]);
  if (!Array.isArray(tags) || tags.length > 32) throw new RangeError("runtime entity tags are invalid");
  const normalized = [...new Set(tags)].sort();
  if (normalized.some((tag) => !/^[A-Za-z0-9_.:-]{1,64}$/.test(tag))) {
    throw new RangeError("runtime entity tag is invalid");
  }
  return Object.freeze(normalized);
}
function isEntityKind(value) {
  return value === "generic" || value === "npc" || value === "projectile" || value === "item" || value === "object";
}
function requireEntityId(value, name) {
  if (!Number.isInteger(value) || value < 1 || value > maxEntityId2) {
    throw new RangeError(`${name} must be an integer between 1 and ${maxEntityId2}`);
  }
  return value;
}
function requireVector2(value, name) {
  if (value.length !== 3 || value.some((coordinate) => !Number.isFinite(coordinate) || Math.abs(coordinate) > 4096)) {
    throw new RangeError(`${name} must contain three finite coordinates within the runtime bounds`);
  }
}
function requirePositiveVector2(value, name) {
  requireVector2(value, name);
  if (value.some((coordinate) => coordinate <= 0)) {
    throw new RangeError(`${name} must contain three positive coordinates`);
  }
}
function requireQuaternion2(value, name) {
  if (value.length !== 4 || value.some((component) => !Number.isFinite(component) || Math.abs(component) > 1)) {
    throw new RangeError(`${name} must contain four normalized finite coordinates`);
  }
  if (Math.hypot(value[0], value[1], value[2], value[3]) < 1e-6) {
    throw new RangeError(`${name} must not be zero`);
  }
}
function requireRgba2(value, name) {
  if (value.length !== 4 || value.some((component) => !Number.isInteger(component) || component < 0 || component > 255)) {
    throw new RangeError(`${name} must contain four unsigned bytes`);
  }
}
function requireRgb2(value, name) {
  if (value.length !== 3 || value.some((component) => !Number.isFinite(component) || component < 0 || component > 1)) {
    throw new RangeError(`${name} must contain three normalized colour components`);
  }
}
function requireOptionalBoolean(value, name) {
  if (value !== void 0 && typeof value !== "boolean") throw new RangeError(`${name} must be boolean`);
}
function requireOptionalUint16(value, name) {
  if (value !== void 0 && (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 65535)) {
    throw new RangeError(`${name} must be an unsigned 16-bit integer`);
  }
}
function requireOptionalFinite(value, name, minimum, maximum) {
  if (value !== void 0 && (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum)) {
    throw new RangeError(`${name} is outside the supported range`);
  }
}
function requireOptionalText(value, name) {
  if (value !== void 0) requireText2(value, name);
}
function requireText2(value, name) {
  if (!isShortText(value) || /[\x00-\x1f\x7f]/.test(value)) throw new RangeError(`${name} is invalid`);
}
function isShortText(value) {
  return typeof value === "string" && Array.from(value).length > 0 && Array.from(value).length <= 64;
}

// legacy/box3-compat/src/game/runtime/player-registry.ts
var PlayerRegistry = class {
  playersBySession = /* @__PURE__ */ new Map();
  get size() {
    return this.playersBySession.size;
  }
  hasPlayerId(playerId) {
    return [...this.playersBySession.values()].some((player) => player.playerId === playerId);
  }
  join(registration) {
    validateRegistration(registration);
    const existing = this.playersBySession.get(registration.sessionId);
    if (existing) {
      if (existing.playerId !== registration.playerId || !sameVector(existing.spawn, registration.spawn) || !sameVector(existing.bodyHalfExtents, registration.bodyHalfExtents) || !sameVector(existing.bodyShapeHalfExtents, registration.bodyShapeHalfExtents ?? registration.bodyHalfExtents)) {
        throw new Error("Authoritative player registration changed");
      }
      return snapshotPlayer(existing);
    }
    if ([...this.playersBySession.values()].some((player2) => player2.playerId === registration.playerId)) {
      throw new Error("Authoritative player id is already registered");
    }
    const spawn = copyRuntimeVector(registration.spawn);
    const player = {
      sessionId: registration.sessionId,
      playerId: registration.playerId,
      spawn,
      position: spawn,
      velocity: copyRuntimeVector([0, 0, 0]),
      bodyHalfExtents: copyRuntimeVector(registration.bodyHalfExtents),
      bodyShapeHalfExtents: copyRuntimeVector(registration.bodyShapeHalfExtents ?? registration.bodyHalfExtents),
      inputState: defaultRuntimePlayerInputState,
      inputAngle: 0,
      inputPitch: 0,
      inputCameraAngle: 0,
      pendingInputs: /* @__PURE__ */ new Map()
    };
    this.playersBySession.set(player.sessionId, player);
    return snapshotPlayer(player);
  }
  leave(sessionId) {
    const player = this.playersBySession.get(sessionId);
    if (!player) return false;
    player.pendingInputs.clear();
    this.playersBySession.delete(sessionId);
    return true;
  }
  enqueueInput(sessionId, tick, command) {
    const player = this.playersBySession.get(sessionId);
    if (!player || command.kind !== "temporary-legacy-position-transform") return false;
    player.pendingInputs.set(tick, copyTemporaryLegacyPositionTransform(command));
    return true;
  }
  applyInputsAt(tick) {
    for (const player of this.playersBySession.values()) {
      const command = player.pendingInputs.get(tick);
      if (!command) continue;
      player.pendingInputs.delete(tick);
      applyTemporaryLegacyPositionTransform(player, command);
    }
  }
  snapshot() {
    return Object.freeze(
      [...this.playersBySession.values()].sort((left, right) => left.playerId - right.playerId).map(snapshotPlayer)
    );
  }
  playerPosition(sessionId) {
    const player = this.playersBySession.get(sessionId);
    return player ? copyRuntimeVector(player.position) : void 0;
  }
  clear() {
    for (const player of this.playersBySession.values()) player.pendingInputs.clear();
    this.playersBySession.clear();
  }
};
function applyTemporaryLegacyPositionTransform(player, command) {
  player.position = copyRuntimeVector(command.position);
  if (command.velocity) player.velocity = copyRuntimeVector(command.velocity);
  if (command.inputState !== void 0) player.inputState = command.inputState;
  if (command.inputAngle !== void 0) player.inputAngle = command.inputAngle;
  if (command.inputPitch !== void 0) player.inputPitch = command.inputPitch;
  if (command.inputCameraAngle !== void 0) player.inputCameraAngle = command.inputCameraAngle;
  if (command.walkSpeed !== void 0) player.walkSpeed = command.walkSpeed;
  if (command.runSpeed !== void 0) player.runSpeed = command.runSpeed;
  if (command.runAcceleration !== void 0) player.runAcceleration = command.runAcceleration;
  if (command.jumpPower !== void 0) player.jumpPower = command.jumpPower;
  if (command.jumpSpeedFactor !== void 0) player.jumpSpeedFactor = command.jumpSpeedFactor;
  if (command.jumpAccelerationFactor !== void 0) player.jumpAccelerationFactor = command.jumpAccelerationFactor;
  if (command.doubleJumpPower !== void 0) player.doubleJumpPower = command.doubleJumpPower;
  if (command.crouchSpeed !== void 0) player.crouchSpeed = command.crouchSpeed;
  if (command.crouchAcceleration !== void 0) player.crouchAcceleration = command.crouchAcceleration;
  if (command.flySpeed !== void 0) player.flySpeed = command.flySpeed;
  if (command.flyAcceleration !== void 0) player.flyAcceleration = command.flyAcceleration;
  if (command.swimAcceleration !== void 0) player.swimAcceleration = command.swimAcceleration;
  if (command.swimSpeed !== void 0) player.swimSpeed = command.swimSpeed;
  if (command.walkAcceleration !== void 0) player.walkAcceleration = command.walkAcceleration;
  if (command.avatarSkin !== void 0) player.avatarSkin = copyRuntimeAvatarSkin(command.avatarSkin);
}
function copyTemporaryLegacyPositionTransform(command) {
  return Object.freeze({
    kind: "temporary-legacy-position-transform",
    tick: command.tick,
    position: copyRuntimeVector(command.position),
    velocity: command.velocity ? copyRuntimeVector(command.velocity) : void 0,
    inputState: command.inputState,
    inputAngle: command.inputAngle,
    inputPitch: command.inputPitch,
    inputCameraAngle: command.inputCameraAngle,
    walkSpeed: command.walkSpeed,
    runSpeed: command.runSpeed,
    runAcceleration: command.runAcceleration,
    jumpPower: command.jumpPower,
    jumpSpeedFactor: command.jumpSpeedFactor,
    jumpAccelerationFactor: command.jumpAccelerationFactor,
    doubleJumpPower: command.doubleJumpPower,
    crouchSpeed: command.crouchSpeed,
    crouchAcceleration: command.crouchAcceleration,
    flySpeed: command.flySpeed,
    flyAcceleration: command.flyAcceleration,
    swimAcceleration: command.swimAcceleration,
    swimSpeed: command.swimSpeed,
    walkAcceleration: command.walkAcceleration,
    avatarSkin: command.avatarSkin === void 0 ? void 0 : copyRuntimeAvatarSkin(command.avatarSkin)
  });
}
function snapshotPlayer(player) {
  return snapshotRuntimePlayer({
    sessionId: player.sessionId,
    playerId: player.playerId,
    position: player.position,
    velocity: player.velocity,
    bodyHalfExtents: player.bodyHalfExtents,
    bodyShapeHalfExtents: player.bodyShapeHalfExtents,
    inputState: player.inputState,
    inputAngle: player.inputAngle,
    inputPitch: player.inputPitch,
    inputCameraAngle: player.inputCameraAngle,
    walkSpeed: player.walkSpeed,
    runSpeed: player.runSpeed,
    runAcceleration: player.runAcceleration,
    jumpPower: player.jumpPower,
    jumpSpeedFactor: player.jumpSpeedFactor,
    jumpAccelerationFactor: player.jumpAccelerationFactor,
    doubleJumpPower: player.doubleJumpPower,
    crouchSpeed: player.crouchSpeed,
    crouchAcceleration: player.crouchAcceleration,
    flySpeed: player.flySpeed,
    flyAcceleration: player.flyAcceleration,
    swimAcceleration: player.swimAcceleration,
    swimSpeed: player.swimSpeed,
    walkAcceleration: player.walkAcceleration,
    avatarSkin: player.avatarSkin
  });
}
function validateRegistration(registration) {
  if (!registration.sessionId) throw new Error("sessionId must not be empty");
  if (!Number.isInteger(registration.playerId) || registration.playerId < 1 || registration.playerId > 2147483647) {
    throw new RangeError("playerId must be an integer between 1 and 2147483647");
  }
  if (registration.spawn.length !== 3 || registration.spawn.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new RangeError("spawn must contain three finite coordinates");
  }
  normalizePositiveVector(registration.bodyHalfExtents, "player body half extents");
  const shapeHalfExtents = normalizePositiveVector(registration.bodyShapeHalfExtents ?? registration.bodyHalfExtents, "player body shape half extents");
  if (shapeHalfExtents.some((component, index) => component > registration.bodyHalfExtents[index])) throw new RangeError("player body shape half extents must fit inside bounds");
}
function sameVector(left, right) {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}

// legacy/box3-compat/src/game/runtime/authoritative-game-runtime.ts
var maxUint32 = 4294967295;
var acceptedInputHistoryTicks = 32;
var acceptedInputLeadTicks = 2;
var AuthoritativeGameRuntime = class {
  constructor(options) {
    this.options = options;
    this.entities = options.entities ?? new EntityRegistry();
    this.players = options.players ?? new PlayerRegistry();
  }
  options;
  entities;
  players;
  lastSimulatedTick;
  lastQueuedInput = /* @__PURE__ */ new Map();
  get playerCount() {
    return this.players.size;
  }
  get entityCount() {
    return this.entities.size;
  }
  get simulationTick() {
    return this.lastSimulatedTick;
  }
  join(registration) {
    if (this.entities.has(registration.playerId)) throw new Error("Authoritative player id collides with an entity");
    return this.players.join(registration);
  }
  spawnEntity(input2) {
    if (input2.entityId !== void 0 && this.players.hasPlayerId(input2.entityId)) {
      throw new Error("Authoritative entity id collides with a player");
    }
    const entity = this.entities.spawn(input2);
    if (this.players.hasPlayerId(entity.entityId)) {
      this.entities.despawn(entity.entityId);
      throw new Error("Authoritative entity id collides with a player");
    }
    return entity;
  }
  despawnEntity(entityId) {
    return this.entities.despawn(entityId);
  }
  updateEntityTransform(entityId, transform) {
    return this.entities.updateTransform(entityId, transform);
  }
  leave(sessionId) {
    const removed = this.players.leave(sessionId);
    this.lastQueuedInput.delete(sessionId);
    if (this.players.size === 0) this.lastSimulatedTick = void 0;
    return removed;
  }
  enqueueInput(sessionId, command) {
    if (!isTemporaryLegacyPositionTransformCommand(command)) return false;
    const serverTick = currentTick(this.options.gameClock);
    const simulatedTick = this.lastSimulatedTick ?? serverTick;
    if (simulatedTick >= maxUint32) return false;
    const nextApplyTick = simulatedTick + 1;
    if (command.tick === void 0) {
      return this.players.enqueueInput(sessionId, nextApplyTick, command);
    }
    const clientTick = command.tick;
    if (clientTick < Math.max(1, serverTick - acceptedInputHistoryTicks) || clientTick > Math.min(maxUint32, serverTick + acceptedInputLeadTicks)) return false;
    const previous = this.lastQueuedInput.get(sessionId);
    if (previous) {
      if (clientTick < previous.clientTick) return false;
      if (clientTick === previous.clientTick) {
        if (previous.applyTick <= simulatedTick) return false;
        return this.players.enqueueInput(sessionId, previous.applyTick, command);
      }
    }
    const applyTick = Math.max(clientTick, nextApplyTick);
    if (!this.players.enqueueInput(sessionId, applyTick, command)) return false;
    this.lastQueuedInput.set(sessionId, { clientTick, applyTick });
    return true;
  }
  advanceTo(tick) {
    requireTick(tick, "tick");
    if (this.lastSimulatedTick === void 0) {
      this.lastSimulatedTick = tick;
      return this.snapshot();
    }
    if (tick <= this.lastSimulatedTick) return this.snapshot();
    for (let simulationTick = this.lastSimulatedTick + 1; simulationTick <= tick; simulationTick += 1) {
      this.players.applyInputsAt(simulationTick);
    }
    this.lastSimulatedTick = tick;
    return this.snapshot();
  }
  snapshot() {
    return createRuntimeFrame(this.lastSimulatedTick ?? 0, this.players.snapshot(), this.entities.snapshot());
  }
  playerPosition(sessionId) {
    return this.players.playerPosition(sessionId);
  }
  dispose() {
    this.entities.clear();
    this.players.clear();
    this.lastQueuedInput.clear();
    this.lastSimulatedTick = void 0;
  }
};
function isTemporaryLegacyPositionTransformCommand(command) {
  return command.kind === "temporary-legacy-position-transform" && (command.tick === void 0 || isTick(command.tick)) && isVector2(command.position) && (command.velocity === void 0 || isVector2(command.velocity)) && (command.inputState === void 0 || isUint16(command.inputState)) && (command.inputAngle === void 0 || isByte2(command.inputAngle)) && (command.inputPitch === void 0 || isByte2(command.inputPitch)) && (command.inputCameraAngle === void 0 || isByte2(command.inputCameraAngle)) && (command.avatarSkin === void 0 || isRuntimeAvatarSkin(command.avatarSkin));
}
function currentTick(gameClock2) {
  const tick = gameClock2.currentTick();
  requireTick(tick, "gameClock.currentTick()");
  return tick;
}
function isVector2(value) {
  return value.length === 3 && value.every((coordinate) => Number.isFinite(coordinate) && Math.abs(coordinate) <= 4096);
}
function isByte2(value) {
  return Number.isInteger(value) && value >= 0 && value <= 255;
}
function isUint16(value) {
  return Number.isInteger(value) && value >= 0 && value <= 65535;
}
function isTick(value) {
  return Number.isInteger(value) && value >= 0 && value <= maxUint32;
}
function requireTick(value, name) {
  if (!isTick(value)) throw new RangeError(`${name} must be an unsigned 32-bit integer`);
}

// legacy/box3-compat/src/game/terrain/voxel-runs.ts
var maxMortonCoordinate = 1023;
var maxBlockId = 65535;
function mortonIndex(x, y, z) {
  validateCoordinate(x, "x");
  validateCoordinate(y, "y");
  validateCoordinate(z, "z");
  let result = 0;
  for (let bit = 0; bit < 10; bit++) {
    result |= (x >>> bit & 1) << 3 * bit;
    result |= (y >>> bit & 1) << 3 * bit + 1;
    result |= (z >>> bit & 1) << 3 * bit + 2;
  }
  return result >>> 0;
}
function encodeTerrainVoxelRuns(voxels) {
  const indexed = voxels.map((voxel) => ({ ...voxel, index: mortonIndex(voxel.x, voxel.y, voxel.z) }));
  indexed.sort((left, right) => left.index - right.index);
  const runs = [];
  let previousEnd = 0;
  let previousBlock = 0;
  for (const voxel of indexed) {
    if (!Number.isInteger(voxel.block) || voxel.block < 0 || voxel.block > maxBlockId) {
      throw new RangeError("voxel block is outside wire range");
    }
    if (runs.length > 0 && voxel.index < previousEnd) throw new RangeError("voxel coordinates must be unique");
    runs.push({
      offset: voxel.index - previousEnd,
      block: voxel.block - previousBlock,
      count: 1
    });
    previousEnd = voxel.index + 1;
    previousBlock = voxel.block;
  }
  return runs;
}
function validateCoordinate(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > maxMortonCoordinate) {
    throw new RangeError(name + " must be an integer between 0 and " + maxMortonCoordinate);
  }
}

// legacy/box3-compat/src/game/terrain/mutable-archive-world.ts
var maximumBlockId = 65535;
var MutableArchiveWorld = class {
  constructor(terrain, base) {
    this.base = base;
    this.nx = requireDimension(terrain.nx, "nx");
    this.ny = requireDimension(terrain.ny, "ny");
    this.nz = requireDimension(terrain.nz, "nz");
  }
  base;
  changes = /* @__PURE__ */ new Map();
  nx;
  ny;
  nz;
  get size() {
    return this.changes.size;
  }
  contains(x, y, z) {
    return Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) && x >= 0 && y >= 0 && z >= 0 && x < this.nx && y < this.ny && z < this.nz;
  }
  voxelAt(x, y, z) {
    if (!this.contains(x, y, z)) return void 0;
    const index = mortonIndex(x, y, z);
    return this.changes.get(index)?.block ?? this.base.voxelAt(x, y, z);
  }
  /** Trusted server override for map mechanics such as destroyed beds. */
  setVoxel(x, y, z, block) {
    if (!this.canMutate(x, y, z)) return void 0;
    requireBlock(block);
    const previous = this.voxelAt(x, y, z);
    if (previous === void 0 || previous === block) return void 0;
    return this.write(x, y, z, block);
  }
  /** Places a player block only into a known, originally empty map cell. */
  place(x, y, z, block) {
    if (!this.canMutate(x, y, z)) return void 0;
    requireBlock(block);
    if (block === 0 || this.base.voxelAt(x, y, z) !== 0 || this.voxelAt(x, y, z) !== 0) return void 0;
    return this.write(x, y, z, block);
  }
  /** Removes only a player-placed overlay block; initial map terrain is protected. */
  removePlaced(x, y, z) {
    if (!this.canMutate(x, y, z) || this.base.voxelAt(x, y, z) !== 0) return void 0;
    const change = this.changes.get(mortonIndex(x, y, z));
    if (!change || change.block === 0) return void 0;
    return this.write(x, y, z, 0);
  }
  /** Trusted removal path retained for world mechanics and narrow compatibility. */
  remove(x, y, z) {
    return this.setVoxel(x, y, z, 0);
  }
  snapshotRuns() {
    return encodeTerrainVoxelRuns([...this.changes.values()]);
  }
  write(x, y, z, block) {
    const voxel = { x, y, z, block };
    this.changes.set(mortonIndex(x, y, z), voxel);
    return encodeTerrainVoxelRuns([voxel])[0];
  }
  canMutate(x, y, z) {
    return this.contains(x, y, z) && x < this.nx - 1 && y < this.ny - 1 && z < this.nz - 1;
  }
};
function requireDimension(value, name) {
  if (!Number.isInteger(value) || value <= 0 || value > 1024) {
    throw new RangeError(name + " must be an integer between 1 and 1024");
  }
  return value;
}
function requireBlock(value) {
  if (!Number.isInteger(value) || value < 0 || value > maximumBlockId) {
    throw new RangeError("voxel block is outside wire range");
  }
}

// legacy/box3-compat/src/session/ref-sessions.ts
var RefSessions = class {
  clients = /* @__PURE__ */ new Map();
  connect(client) {
    if (!client.sessionId) throw new Error("sessionId must not be empty");
    this.clients.set(client.sessionId, client);
  }
  disconnect(client) {
    if (!client.sessionId || this.clients.get(client.sessionId) !== client) return false;
    this.clients.delete(client.sessionId);
    return true;
  }
  delete(sessionId) {
    return this.clients.delete(sessionId);
  }
  dispose() {
    this.clients.clear();
  }
  open(sessionLabel, href, options) {
    const exact = this.clients.get(sessionLabel);
    const client = exact ?? [...this.clients.values()].find((candidate) => matchesSessionLabel(candidate.sessionId, sessionLabel));
    if (!client) return false;
    client.message.openLink({
      href: String(href),
      isConfirm: options?.isConfirm === void 0 ? true : Boolean(options.isConfirm),
      isNewTab: options?.isNewTab === void 0 ? true : Boolean(options.isNewTab),
      warning: false
    });
    return true;
  }
};

// legacy/box3-compat/src/game/terrain/terrain-sessions.ts
var TerrainSessions = class {
  clients = /* @__PURE__ */ new Map();
  get size() {
    return this.clients.size;
  }
  connect(client) {
    if (!client.sessionId) throw new Error("sessionId must not be empty");
    this.clients.set(client.sessionId, client);
  }
  /** Detaches a closed socket without allowing a stale close to remove a reconnect. */
  disconnect(client) {
    if (!client.sessionId || this.clients.get(client.sessionId) !== client) return false;
    this.clients.delete(client.sessionId);
    return true;
  }
  delete(sessionId) {
    return this.clients.delete(sessionId);
  }
  dispose() {
    this.clients.clear();
  }
  send(client, runs) {
    if (runs.length === 0) return;
    client.message.voxelChange(runs.map((run) => ({ ...run })));
  }
  broadcast(runs) {
    if (runs.length === 0) return;
    for (const client of this.clients.values()) this.send(client, runs);
  }
};

// legacy/box3-compat/src/game/match/bedwars-items.ts
var offers = [
  offer("wool", 4, "iron", 16),
  offer("sand", 12, "iron", 16),
  offer("enderStone", 24, "iron", 12),
  offer("ladder", 4, "iron", 8),
  offer("plank", 4, "gold", 16),
  offer("glass", 12, "iron", 4),
  offer("obdisian", 4, "emerald", 4),
  offer("stoneSword", 10, "iron", 1),
  offer("ironSword", 7, "gold", 1),
  offer("diamondSword", 3, "emerald", 1),
  offer("knockbackStick", 5, "gold", 1),
  offer("ChainmailBoots", 24, "iron", 1),
  offer("IronBoots", 12, "gold", 1),
  offer("DiamondBoots", 6, "emerald", 1),
  offer("scissors", 20, "iron", 1),
  offer("diamondPickaxe", 6, "gold", 1),
  offer("goldenPickaxe", 3, "gold", 1),
  offer("ironPickaxe", 10, "iron", 1),
  offer("woodenPickaxe", 10, "iron", 1),
  offer("diamondAxe", 6, "gold", 1),
  offer("ironAxe", 3, "gold", 1),
  offer("stoneAxe", 10, "iron", 1),
  offer("woodenAxe", 10, "iron", 1),
  offer("arrow", 2, "gold", 8),
  offer("bow", 12, "gold", 1),
  offer("bow1", 24, "gold", 1),
  offer("bow2", 6, "emerald", 1),
  offer("invisiblePotion", 2, "emerald", 1),
  offer("speedPotion", 1, "emerald", 1),
  offer("jumpPotion", 1, "emerald", 1),
  offer("goldenApple", 3, "gold", 1),
  offer("tnt", 8, "gold", 1),
  offer("fireBall", 40, "iron", 1),
  offer("enderPearl", 4, "emerald", 1),
  offer("egg", 1, "emerald", 1),
  offer("milk", 4, "gold", 1),
  offer("plate", 2, "emerald", 1),
  offer("waterBucket", 6, "gold", 1)
];
var placeable = [
  { item: "wool", block: 177 },
  { item: "sand", block: 135 },
  { item: "enderStone", block: 389 },
  { item: "plank", block: 141 },
  { item: "glass", block: 170 },
  { item: "obdisian", block: 175 },
  { item: "ladder", block: 426 }
];
function shopOfferFor(item) {
  return offers.find((candidate) => candidate.item === item);
}
function placeableBlockFor(item) {
  return placeable.find((candidate) => candidate.item === item)?.block;
}
function offer(item, price, currency, amount) {
  return Object.freeze({ item, price, currency, amount });
}

// legacy/box3-compat/src/session/bedwars-remote.ts
var initialDelayMilliseconds = 1500;
var inventorySize = 36;
var quickInventorySize = 9;
var maximumStackSize = 64;
var RemoteChannelSessions = class {
  sessions = /* @__PURE__ */ new Map();
  get size() {
    return this.sessions.size;
  }
  connect(client) {
    requireSessionId3(client.sessionId);
    const session = this.getOrCreate(client.sessionId);
    session.client = client;
  }
  sendExternalEvent(sessionLabel, event) {
    const session = [...this.sessions.values()].find((candidate) => matchesSessionLabel(candidate.sessionId, sessionLabel));
    if (!session?.client) return false;
    const sender = session.client.message.sendClientEvent;
    if (typeof sender !== "function") return false;
    const args = JSON.stringify(event);
    if (typeof args !== "string") return false;
    sender({ tick: session.nextTick++, args });
    return true;
  }
  handleServerEvent(client, value) {
    const session = this.sessions.get(client.sessionId);
    if (!session || session.client !== client) return false;
    if (!value || !Number.isSafeInteger(value.tick) || value.tick < 0 || typeof value.args !== "string") return false;
    try {
      JSON.parse(value.args);
      return true;
    } catch {
      return false;
    }
  }
  disconnect(client) {
    const session = this.sessions.get(client.sessionId);
    if (!session || session.client !== client) return false;
    session.client = void 0;
    return true;
  }
  delete(sessionId) {
    return this.sessions.delete(sessionId);
  }
  dispose() {
    this.sessions.clear();
  }
  getOrCreate(sessionId) {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;
    const session = { sessionId, nextTick: 1, client: void 0 };
    this.sessions.set(sessionId, session);
    return session;
  }
};
var BedwarsRemoteSessions = class {
  match;
  schedule;
  cancel;
  initialDelayMilliseconds;
  sessions = /* @__PURE__ */ new Map();
  constructor(options = {}) {
    this.match = options.match ?? new BedwarsMatch();
    this.schedule = options.schedule ?? ((callback, milliseconds) => setTimeout(callback, milliseconds));
    this.cancel = options.cancel ?? ((handle) => clearTimeout(handle));
    this.initialDelayMilliseconds = options.initialDelayMilliseconds ?? initialDelayMilliseconds;
    if (!Number.isInteger(this.initialDelayMilliseconds) || this.initialDelayMilliseconds < 0) {
      throw new RangeError("initialDelayMilliseconds must be a non-negative integer");
    }
  }
  get size() {
    return this.sessions.size;
  }
  connect(client) {
    requireSessionId3(client.sessionId);
    this.match.join(client.sessionId);
    const session = this.getOrCreate(client.sessionId);
    session.client = client;
    if (session.initialized) {
      this.replayInitialState(session);
      this.broadcastMatch();
      return;
    }
    if (session.timer !== void 0) {
      this.broadcastMatch();
      return;
    }
    const handle = this.schedule(() => {
      session.timer = void 0;
      this.initialize(session);
    }, this.initialDelayMilliseconds);
    session.timer = handle;
    if (hasUnref2(handle)) handle.unref();
    this.broadcastMatch();
  }
  /** Loopback control ingress for project Script Runtime events. */
  sendExternalEvent(sessionLabel, event) {
    const session = [...this.sessions.values()].find((candidate) => matchesSessionLabel(candidate.sessionId, sessionLabel));
    if (!session?.client) return false;
    const sender = session.client.message.sendClientEvent;
    if (typeof sender !== "function") return false;
    sender({
      tick: session.nextTick++,
      args: JSON.stringify(event)
    });
    return true;
  }
  /** Opens a recovered server-side interaction panel for this client. */
  openInventory(sessionId, type) {
    requireSessionId3(sessionId);
    this.match.join(sessionId);
    const session = this.getOrCreate(sessionId);
    if (!session.client) return false;
    this.initialize(session);
    session.bagOpen = false;
    session.openInventoryType = type;
    this.send(session, "setinventory", { playerInventory: copyInventory(session.inventory) });
    this.send(session, "showinventory", { show: true, type });
    return true;
  }
  /** Awards an item after an authoritative forge/resource event. */
  grantItem(sessionId, item, count) {
    if (!isInventoryItem(item) || !isPositiveCount(count)) return false;
    this.match.join(sessionId);
    const session = this.getOrCreate(sessionId);
    if (!canAddItem(session.inventory, item, count)) return false;
    addItem(session.inventory, item, count);
    this.syncInventory(session);
    return true;
  }
  selectedPlacement(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return void 0;
    const item = session.inventory[session.selectedQuickbar];
    if (!item || item.count < 1) return void 0;
    const block = placeableBlockFor(item.item);
    return block === void 0 ? void 0 : { item: item.item, block };
  }
  /** Handles the recovered default hotkeys from game-net.sendKeyBoardEvent. */
  handleKeyPress(sessionId, keyCode) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (keyCode >= 49 && keyCode <= 57) return this.selectQuickbar(session, keyCode - 49);
    if (keyCode === 69) {
      this.toggleBag(session);
      return true;
    }
    if (keyCode === 81) return this.discardSelected(session);
    if (keyCode === 13 && !session.openInventoryType) {
      this.send(session, "input", {});
      return true;
    }
    return false;
  }
  consumeSelectedPlacement(sessionId, item) {
    const session = this.sessions.get(sessionId);
    const selected = session?.inventory[session.selectedQuickbar];
    if (!session || !selected || selected.item !== item || selected.count < 1 || placeableBlockFor(item) === void 0) return false;
    selected.count -= 1;
    if (selected.count === 0) selected.item = "";
    this.syncInventory(session);
    return true;
  }
  handleServerEvent(client, value) {
    requireSessionId3(client.sessionId);
    this.match.join(client.sessionId);
    const session = this.getOrCreate(client.sessionId);
    session.client = client;
    this.initialize(session);
    const event = parseServerEvent(value);
    if (!event) return false;
    switch (event.type) {
      case "bag":
        this.toggleBag(session);
        return true;
      case "choose":
        return this.handleChoose(session, event.args);
      case "pressQIbyScreen":
        return this.handleQuickSelect(session, event.args);
      case "shadowDiscard":
        return this.discardSelected(session);
      case "buy":
        return this.handleBuy(session, event.args);
      case "chat":
        return this.handleChat(session, event.args);
      default:
        return false;
    }
  }
  /** Broadcasts the shared sidebar state after a player, bed, or team change. */
  syncMatch() {
    this.broadcastMatch();
  }
  /** Detaches a closed remote-channel client while preserving match and inventory state. */
  disconnect(client) {
    const session = this.sessions.get(client.sessionId);
    if (!session || session.client !== client) return false;
    if (session.timer !== void 0) {
      this.cancel(session.timer);
      session.timer = void 0;
    }
    session.client = void 0;
    session.bagOpen = false;
    session.selectedInventory = void 0;
    session.openInventoryType = void 0;
    return true;
  }
  delete(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session?.timer !== void 0) this.cancel(session.timer);
    if (session) this.sessions.delete(sessionId);
    const matchChanged = this.match.disconnect(sessionId);
    if (matchChanged) this.broadcastMatch();
    return session !== void 0;
  }
  dispose() {
    for (const sessionId of [...this.sessions.keys()]) this.delete(sessionId);
  }
  getOrCreate(sessionId) {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;
    const inventory = emptyInventory();
    inventory[0] = { item: "woodenSword", count: 1 };
    const session = {
      sessionId,
      inventory,
      initialized: false,
      bagOpen: false,
      selectedQuickbar: 0,
      nextTick: 1
    };
    this.sessions.set(sessionId, session);
    return session;
  }
  initialize(session) {
    if (session.initialized || !session.client) return;
    session.initialized = true;
    this.replayInitialState(session);
  }
  replayInitialState(session) {
    if (!session.client) return;
    const player = this.match.join(session.sessionId);
    const snapshot = this.match.snapshot();
    this.send(session, "draw", {
      dateNum: "Local archive",
      beds: [...snapshot.beds],
      players: [...snapshot.players]
    });
    this.send(session, "setYou", { team: player.team, v: true });
    this.send(session, "changeUpgrade", { upg: [0, 0, 0, 0, 0, 0, 0, 0, 0] });
    this.send(session, "setAllQI", { playerInventory: copyInventory(session.inventory.slice(0, quickInventorySize)) });
    this.send(session, "changePlayers", { index: player.team, allplayers: [...snapshot.players], single: false });
    this.send(session, "changeHp", { hp: 20 });
  }
  broadcastMatch() {
    const snapshot = this.match.snapshot();
    for (const session of this.sessions.values()) {
      if (!session.initialized || !session.client) continue;
      const player = this.match.player(session.sessionId);
      if (!player) continue;
      this.send(session, "changeBed", { index: player.team, beds: [...snapshot.beds], single: false });
      this.send(session, "changePlayers", { index: player.team, allplayers: [...snapshot.players], single: false });
    }
  }
  toggleBag(session) {
    if (session.openInventoryType) {
      this.closeInventory(session);
      return;
    }
    session.bagOpen = true;
    session.openInventoryType = "inventory";
    this.send(session, "setinventory", { playerInventory: copyInventory(session.inventory) });
    this.send(session, "showinventory", { show: true, type: "inventory" });
  }
  closeInventory(session) {
    const type = session.openInventoryType;
    session.bagOpen = false;
    session.openInventoryType = void 0;
    if (type) this.send(session, "showinventory", { show: false, type });
  }
  handleChoose(session, args) {
    const index = args.index;
    const type = args.type;
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= inventorySize || typeof type !== "string") return false;
    if (type !== "inventory" && type !== "teamchest" && type !== "enderBag") return false;
    session.selectedInventory = { index, type };
    this.send(session, "setInventoryCase", { index, s: true, type });
    return true;
  }
  handleQuickSelect(session, args) {
    const index = args.index;
    if (typeof index !== "number" || !Number.isInteger(index)) return false;
    return this.selectQuickbar(session, index);
  }
  selectQuickbar(session, index) {
    if (index < 0 || index >= quickInventorySize) return false;
    session.selectedQuickbar = index;
    this.send(session, "setchoosecase", { pos: index + 1 });
    return true;
  }
  discardSelected(session) {
    const selection = session.selectedInventory;
    if (!session.openInventoryType || !selection || selection.type !== "inventory") return false;
    const slot = session.inventory[selection.index];
    if (!slot || !slot.item) return false;
    slot.item = "";
    slot.count = 1;
    session.selectedInventory = void 0;
    this.send(session, "setInventoryCase", { index: selection.index, s: false, type: "inventory" });
    this.syncInventory(session);
    return true;
  }
  handleBuy(session, args) {
    if (session.openInventoryType !== "shop" || typeof args.thing !== "string") return false;
    const offer2 = shopOfferFor(args.thing);
    if (!offer2 || !canRemoveItem(session.inventory, offer2.currency, offer2.price) || !canAddItem(session.inventory, offer2.item, offer2.amount)) return false;
    removeItem(session.inventory, offer2.currency, offer2.price);
    addItem(session.inventory, offer2.item, offer2.amount);
    const selectedIndex = session.inventory.findIndex((slot) => slot.item === offer2.item && slot.count > 0);
    if (selectedIndex >= 0 && selectedIndex < quickInventorySize && placeableBlockFor(offer2.item) !== void 0) {
      session.selectedQuickbar = selectedIndex;
      this.send(session, "setchoosecase", { pos: selectedIndex + 1 });
    }
    this.syncInventory(session);
    return true;
  }
  handleChat(session, args) {
    const text = args.text;
    if (typeof text !== "string") return false;
    const normalized = text.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 160);
    if (!normalized) return false;
    this.send(session, "message", {
      content: "Guest: " + normalized,
      titleLength: 0,
      titleColor: ["White", 0]
    });
    return true;
  }
  syncInventory(session) {
    if (!session.initialized) return;
    this.send(session, "setAllQI", { playerInventory: copyInventory(session.inventory.slice(0, quickInventorySize)) });
    if (session.openInventoryType) this.send(session, "setinventory", { playerInventory: copyInventory(session.inventory) });
  }
  send(session, type, args) {
    const client = session.client;
    if (!client) return;
    const sender = client.message.sendClientEvent;
    if (typeof sender !== "function") throw new Error("Remote-channel client is missing sendClientEvent");
    sender({
      tick: session.nextTick++,
      args: JSON.stringify({ type, args })
    });
  }
};
function parseServerEvent(value) {
  if (!isRecord5(value) || typeof value.args !== "string") return void 0;
  try {
    const parsed = JSON.parse(value.args);
    if (!isRecord5(parsed) || typeof parsed.type !== "string") return void 0;
    const args = isRecord5(parsed.args) ? parsed.args : {};
    return { type: parsed.type, args };
  } catch {
    return void 0;
  }
}
function emptyInventory() {
  return Array.from({ length: inventorySize }, () => ({ item: "", count: 1 }));
}
function canAddItem(items, item, count) {
  let capacity = 0;
  for (const slot of items) {
    if (slot.item === item) capacity += maximumStackSize - slot.count;
    else if (!slot.item) capacity += maximumStackSize;
    if (capacity >= count) return true;
  }
  return false;
}
function addItem(items, item, count) {
  let remaining = count;
  for (const slot of items) {
    if (slot.item !== item || slot.count >= maximumStackSize) continue;
    const added = Math.min(maximumStackSize - slot.count, remaining);
    slot.count += added;
    remaining -= added;
    if (remaining === 0) return;
  }
  for (const slot of items) {
    if (slot.item) continue;
    const added = Math.min(maximumStackSize, remaining);
    slot.item = item;
    slot.count = added;
    remaining -= added;
    if (remaining === 0) return;
  }
}
function canRemoveItem(items, item, count) {
  return items.filter((slot) => slot.item === item).reduce((total, slot) => total + slot.count, 0) >= count;
}
function removeItem(items, item, count) {
  let remaining = count;
  for (const slot of items) {
    if (slot.item !== item) continue;
    const removed = Math.min(slot.count, remaining);
    slot.count -= removed;
    remaining -= removed;
    if (slot.count === 0) slot.item = "";
    if (remaining === 0) return;
  }
}
function copyInventory(items) {
  return items.map((item) => [item.item, item.count]);
}
function isInventoryItem(value) {
  return value.length > 0 && value.length <= 64 && /^[A-Za-z0-9]+$/.test(value);
}
function isPositiveCount(value) {
  return Number.isInteger(value) && value > 0 && value <= maximumStackSize;
}
function isRecord5(value) {
  return typeof value === "object" && value !== null;
}
function requireSessionId3(sessionId) {
  if (!sessionId) throw new Error("sessionId must not be empty");
}
function hasUnref2(value) {
  return typeof value === "object" && value !== null && "unref" in value && typeof value.unref === "function";
}

// legacy/box3-compat/src/session/dialog-sessions.ts
var maximumRpcId = 4294967295;
var maximumOptionIndex = 4294967295;
var DialogSessions = class {
  sessions = /* @__PURE__ */ new Map();
  get size() {
    return this.sessions.size;
  }
  hasActiveClient(sessionId) {
    return this.resolveSessionLabel(sessionId)?.client !== void 0;
  }
  connect(client) {
    requireSessionId4(client.sessionId);
    const session = this.getOrCreate(client.sessionId);
    if (session.client && session.client !== client) {
      rejectPending(session, `Dialog client was replaced for session ${client.sessionId}`);
    }
    session.client = client;
  }
  open(sessionId, config) {
    requireSessionId4(sessionId);
    const session = this.resolveSessionLabel(sessionId);
    const client = session?.client;
    if (!session || !client) throw new Error(`No active dialog client for session ${sessionId}`);
    const rpcId = allocateRpcId(session);
    let pending;
    const response = new Promise((resolve9, reject) => {
      pending = { resolve: resolve9, reject };
    });
    response.catch(() => {
    });
    session.pending.set(rpcId, pending);
    try {
      client.message.open({ rpcId, config: normalizeDialogConfig(config) });
    } catch (error) {
      session.pending.delete(rpcId);
      pending.reject(asError(error));
    }
    return Object.freeze({ rpcId, response });
  }
  close(client, message) {
    const session = this.sessions.get(client.sessionId);
    if (!session || session.client !== client || !isRpcId(message.rpcId)) return false;
    const pending = session.pending.get(message.rpcId);
    if (!pending) return false;
    const result = cloneDialogResult(message.result);
    if (!result) return false;
    session.pending.delete(message.rpcId);
    pending.resolve(result);
    return true;
  }
  cancel(sessionId, rpcId) {
    const session = this.resolveSessionLabel(sessionId);
    if (!session || !isRpcId(rpcId)) return false;
    const pending = session.pending.get(rpcId);
    if (!pending) return false;
    session.pending.delete(rpcId);
    const failure = sendCancelDialog(session.client, rpcId);
    pending.reject(failure ?? new Error(`Dialog call ${rpcId} was cancelled`));
    return true;
  }
  cancelAll(sessionId) {
    const session = this.resolveSessionLabel(sessionId);
    if (!session || session.pending.size === 0) return 0;
    const pending = [...session.pending.values()];
    session.pending.clear();
    const failure = sendCancelDialogs(session.client);
    const reason = failure ?? new Error(`Dialog calls were cancelled for session ${sessionId}`);
    for (const call of pending) call.reject(reason);
    return pending.length;
  }
  /** Rejects only the current transport, so a stale disconnect cannot clear a replacement. */
  disconnect(client) {
    const session = this.sessions.get(client.sessionId);
    if (!session || session.client !== client) return false;
    this.sessions.delete(client.sessionId);
    rejectPending(session, `Dialog client disconnected for session ${client.sessionId}`);
    return true;
  }
  delete(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    this.sessions.delete(sessionId);
    rejectPending(session, `Dialog session expired for session ${sessionId}`);
    return true;
  }
  dispose() {
    for (const sessionId of [...this.sessions.keys()]) this.delete(sessionId);
  }
  resolveSessionLabel(sessionLabel) {
    const exact = this.sessions.get(sessionLabel);
    if (exact) return exact;
    return [...this.sessions.values()].find((candidate) => matchesSessionLabel(candidate.sessionId, sessionLabel));
  }
  getOrCreate(sessionId) {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;
    const session = {
      sessionId,
      nextRpcId: 0,
      pending: /* @__PURE__ */ new Map()
    };
    this.sessions.set(sessionId, session);
    return session;
  }
};
var defaultDialogBackgroundColor = Object.freeze({ r: 1, g: 1, b: 1, a: 1 });
var defaultDialogTextColor = Object.freeze({ r: 0, g: 0, b: 0, a: 1 });
function normalizeDialogConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new TypeError("Dialog config must be an object");
  const type = String(config.type ?? "text").toLowerCase();
  const common = {
    lookEyeEntity: dialogEntityId(config.lookEyeEntity),
    lookTargetEntity: dialogEntityId(config.lookTargetEntity),
    lookEyeEnabled: Boolean(config.lookEyeEnabled),
    lookTargetEnabled: Boolean(config.lookTargetEnabled),
    lookUpEnabled: Boolean(config.lookUpEnabled),
    content: String(config.content ?? ""),
    contentBackgroundColor: dialogColor(config.contentBackgroundColor, defaultDialogBackgroundColor),
    contentTextColor: dialogColor(config.contentTextColor, defaultDialogTextColor),
    lookEyeOffset: dialogVector(config.lookEyeOffset),
    lookTargetOffset: dialogVector(config.lookTargetOffset),
    lookUp: dialogVector(config.lookUp),
    title: String(config.title ?? ""),
    titleBackgroundColor: dialogColor(config.titleBackgroundColor, defaultDialogBackgroundColor),
    titleTextColor: dialogColor(config.titleTextColor, defaultDialogTextColor)
  };
  if (type === "text") return { type, data: { common, hasArrow: Boolean(config.hasArrow) } };
  if (type === "input") return { type, data: { common, confirmText: String(config.confirmText ?? ""), placeholder: String(config.placeholder ?? "") } };
  if (type === "select") {
    if (!Array.isArray(config.options)) throw new TypeError("Select dialog options must be an array");
    return { type, data: { common, options: config.options.map((option) => String(option)) } };
  }
  throw new RangeError(`Unsupported dialog type: ${type}`);
}
function dialogEntityId(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
function dialogVector(value) {
  return {
    x: Number.isFinite(value?.x) ? value.x : 0,
    y: Number.isFinite(value?.y) ? value.y : 0,
    z: Number.isFinite(value?.z) ? value.z : 0
  };
}
function dialogColor(value, fallback) {
  return {
    r: Number.isFinite(value?.r) ? value.r : fallback.r,
    g: Number.isFinite(value?.g) ? value.g : fallback.g,
    b: Number.isFinite(value?.b) ? value.b : fallback.b,
    a: Number.isFinite(value?.a) ? value.a : fallback.a
  };
}
function allocateRpcId(session) {
  for (let attempts = 0; attempts <= maximumRpcId; attempts++) {
    const rpcId = session.nextRpcId;
    session.nextRpcId = rpcId === maximumRpcId ? 0 : rpcId + 1;
    if (!session.pending.has(rpcId)) return rpcId;
  }
  throw new Error("Dialog RPC id space exhausted");
}
function rejectPending(session, message) {
  const pending = [...session.pending.values()];
  session.pending.clear();
  const reason = new Error(message);
  for (const call of pending) call.reject(reason);
}
function sendCancelDialog(client, rpcId) {
  if (!client) return new Error(`No active dialog client for cancellation ${rpcId}`);
  try {
    client.message.cancelDialog(rpcId);
  } catch (error) {
    return asError(error);
  }
  return void 0;
}
function sendCancelDialogs(client) {
  if (!client) return new Error("No active dialog client for cancellation");
  try {
    client.message.cancelDialogs();
  } catch (error) {
    return asError(error);
  }
  return void 0;
}
function cloneDialogResult(value) {
  if (!isRecord6(value) || typeof value.type !== "string") return void 0;
  switch (value.type) {
    case "close":
      return value.data === void 0 ? Object.freeze({ type: "close", data: void 0 }) : void 0;
    case "text":
    case "input":
      return typeof value.data === "string" ? Object.freeze({ type: value.type, data: value.data }) : void 0;
    case "select": {
      const data = value.data;
      if (!isRecord6(data) || !isOptionIndex(data.index) || typeof data.value !== "string") return void 0;
      return Object.freeze({
        type: "select",
        data: Object.freeze({ index: data.index, value: data.value })
      });
    }
    default:
      return void 0;
  }
}
function requireSessionId4(sessionId) {
  if (!sessionId) throw new Error("sessionId must not be empty");
}
function isRpcId(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= maximumRpcId;
}
function isOptionIndex(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= maximumOptionIndex;
}
function isRecord6(value) {
  return typeof value === "object" && value !== null;
}
function asError(value) {
  return value instanceof Error ? value : new Error(String(value));
}

// legacy/box3-compat/src/session/gui-sessions.ts
var maximumGuiHandle = 4294967295;
var GuiSessions = class {
  sessions = /* @__PURE__ */ new Map();
  get size() {
    return this.sessions.size;
  }
  hasActiveClient(sessionId) {
    return this.resolveSessionLabel(sessionId)?.client !== void 0;
  }
  connect(client) {
    requireGuiSessionId(client.sessionId);
    const session = this.getOrCreate(client.sessionId);
    if (session.client && session.client !== client) rejectPendingGui(session, `GUI client was replaced for session ${client.sessionId}`);
    session.client = client;
  }
  command(sessionId, command) {
    requireGuiSessionId(sessionId);
    if (!command || typeof command !== "object" || Array.isArray(command)) throw new TypeError("GUI command must be an object");
    const session = this.resolveSessionLabel(sessionId);
    const client = session?.client;
    if (!session || !client) throw new Error(`No active GUI client for session ${sessionId}`);
    const handle = allocateGuiHandle(session);
    let pending;
    const response = new Promise((resolveGui, reject) => {
      pending = { resolve: resolveGui, reject };
    });
    session.pending.set(handle, pending);
    try {
      sendGuiCommandPacket(client, handle, command);
    } catch (error) {
      session.pending.delete(handle);
      pending.reject(asGuiError(error));
    }
    return response;
  }
  resolve(client, message) {
    const session = this.sessions.get(client.sessionId);
    if (!session || session.client !== client || !isGuiHandle(message.handle)) return false;
    const pending = session.pending.get(message.handle);
    if (!pending) return false;
    session.pending.delete(message.handle);
    try {
      pending.resolve(message.value ? JSON.parse(message.value) : void 0);
    } catch (error) {
      pending.reject(asGuiError(error));
    }
    return true;
  }
  reject(client, message) {
    const session = this.sessions.get(client.sessionId);
    if (!session || session.client !== client || !isGuiHandle(message.handle)) return false;
    const pending = session.pending.get(message.handle);
    if (!pending) return false;
    session.pending.delete(message.handle);
    pending.reject(new Error(String(message.message)));
    return true;
  }
  disconnect(client) {
    const session = this.sessions.get(client.sessionId);
    if (!session || session.client !== client) return false;
    this.sessions.delete(client.sessionId);
    rejectPendingGui(session, `GUI client disconnected for session ${client.sessionId}`);
    return true;
  }
  delete(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    this.sessions.delete(sessionId);
    rejectPendingGui(session, `GUI session expired for session ${sessionId}`);
    return true;
  }
  dispose() {
    for (const sessionId of [...this.sessions.keys()]) this.delete(sessionId);
  }
  resolveSessionLabel(sessionLabel) {
    const exact = this.sessions.get(sessionLabel);
    if (exact) return exact;
    return [...this.sessions.values()].find((candidate) => matchesSessionLabel(candidate.sessionId, sessionLabel));
  }
  getOrCreate(sessionId) {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;
    const session = { sessionId, nextHandle: 0, pending: /* @__PURE__ */ new Map() };
    this.sessions.set(sessionId, session);
    return session;
  }
};
function sendGuiCommandPacket(client, handle, command) {
  const operation = String(command.operation ?? "");
  switch (operation) {
    case "init":
      client.message.init({ handle, data: JSON.stringify(command.config) });
      return;
    case "show":
      client.message.show({ handle, name: requireGuiString(command.name, "name"), allowMultiple: command.allowMultiple === true });
      return;
    case "remove":
      client.message.remove({ handle, selector: requireGuiString(command.selector, "selector") });
      return;
    case "getAttribute":
      client.message.getAttribute({ handle, selector: requireGuiString(command.selector, "selector"), name: requireGuiString(command.name, "name") });
      return;
    case "setAttribute":
      client.message.setAttribute({ handle, selector: requireGuiString(command.selector, "selector"), name: requireGuiString(command.name, "name"), value: JSON.stringify(command.value) });
      return;
    default:
      throw new Error(`Unsupported GUI operation: ${operation}`);
  }
}
function allocateGuiHandle(session) {
  for (let offset = 0; offset <= maximumGuiHandle; offset += 1) {
    const handle = session.nextHandle;
    session.nextHandle = handle === maximumGuiHandle ? 0 : handle + 1;
    if (!session.pending.has(handle)) return handle;
  }
  throw new Error(`GUI handle space exhausted for session ${session.sessionId}`);
}
function rejectPendingGui(session, message) {
  const pending = [...session.pending.values()];
  session.pending.clear();
  for (const call of pending) call.reject(new Error(message));
}
function requireGuiSessionId(sessionId) {
  if (!sessionId) throw new Error("sessionId must not be empty");
}
function requireGuiString(value, name) {
  if (typeof value !== "string") throw new TypeError(`GUI ${name} must be a string`);
  return value;
}
function isGuiHandle(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= maximumGuiHandle;
}
function asGuiError(value) {
  return value instanceof Error ? value : new Error(String(value));
}

// legacy/box3-compat/src/session/game-chat-sessions.ts
var GameChatSessions = class {
  sessions = /* @__PURE__ */ new Map();
  get size() {
    return this.sessions.size;
  }
  connect(client) {
    requireSessionId5(client.sessionId);
    this.sessions.set(client.sessionId, { client });
  }
  /**
   * Returns true only after handing the message to the current chat client.
   * It is not an acknowledgement that the Player displayed the notice.
   */
  sendGlobalNotice(sessionId, notice) {
    requireSessionId5(sessionId);
    const client = this.sessions.get(sessionId)?.client;
    if (!client) return false;
    client.message.globalNotice(copyGlobalNotice(notice));
    return true;
  }
  sendLog(sessionId, message) {
    requireSessionId5(sessionId);
    const client = this.sessions.get(sessionId)?.client;
    if (!client) return false;
    client.message.log(copyChatLog(message));
    return true;
  }
  broadcastLog(message) {
    const packet = copyChatLog(message);
    let delivered = 0;
    for (const { client } of this.sessions.values()) {
      client.message.log(packet);
      delivered += 1;
    }
    return delivered;
  }
  /** A stale physical socket cannot detach a later replacement. */
  disconnect(client) {
    const session = this.sessions.get(client.sessionId);
    if (!session || session.client !== client) return false;
    this.sessions.delete(client.sessionId);
    return true;
  }
  delete(sessionId) {
    return this.sessions.delete(sessionId);
  }
  dispose() {
    this.sessions.clear();
  }
};
function copyGlobalNotice(notice) {
  return Object.freeze({
    detail: notice.detail,
    title: notice.title
  });
}
function copyChatLog(message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) throw new TypeError("chat message must be an object");
  if (typeof message.text !== "string") throw new TypeError("chat message text must be a string");
  return Object.freeze({
    duration: Number.isInteger(message.duration) ? message.duration : 0,
    id: Number.isSafeInteger(message.senderId) && message.senderId >= 0 ? message.senderId : 0,
    msgType: 0,
    hideFloat: message.hideFloat === true,
    private: message.private === true,
    valid: true,
    i18nPrefix: "",
    i18nSuffix: "",
    text: message.text
  });
}
function requireSessionId5(sessionId) {
  if (!sessionId) throw new Error("sessionId must not be empty");
}

// legacy/box3-compat/src/session/game-clock.ts
var import_node_perf_hooks = require("node:perf_hooks");
var gameTickMilliseconds = 64;
var initialTick = 4;
var maxTick = 4294967295;
var GameClock = class {
  now;
  initialTick;
  startedAt;
  tick;
  constructor(options = {}) {
    this.now = options.now ?? import_node_perf_hooks.performance.now.bind(import_node_perf_hooks.performance);
    this.initialTick = requireTick2(options.initialTick ?? initialTick, "initialTick");
    this.startedAt = this.readNow();
    this.tick = this.initialTick;
  }
  currentTick() {
    const elapsed = this.readNow() - this.startedAt;
    const candidate = Math.min(maxTick, this.initialTick + Math.max(0, Math.floor(elapsed / gameTickMilliseconds)));
    if (candidate > this.tick) this.tick = candidate;
    return this.tick;
  }
  milliseconds() {
    return this.currentTick() * gameTickMilliseconds;
  }
  readNow() {
    const value = this.now();
    if (!Number.isFinite(value)) throw new Error("game clock source must return a finite number");
    return value;
  }
};
function requireTick2(value, name) {
  if (!Number.isInteger(value) || value < 1 || value > maxTick) {
    throw new RangeError(`${name} must be an integer between 1 and ${maxTick}`);
  }
  return value;
}

// legacy/box3-compat/src/session/anonymous-player-state.ts
var import_stream = __toESM(require_stream(), 1);

// legacy/box3-compat/src/wire/net-public-state.ts
var import_schema2 = __toESM(require_schema(), 1);

// legacy/box3-compat/src/wire/net-replica-components.ts
var import_schema = __toESM(require_schema(), 1);
var relativeVarintBias = 2863311530;
function compareId(left, right) {
  return left.id - right.id;
}
function encodeRelative(delta) {
  return (relativeVarintBias + delta ^ relativeVarintBias) >>> 0;
}
function decodeRelative(encoded) {
  return (relativeVarintBias ^ encoded) - relativeVarintBias >> 0;
}
var MuReplicaQuantizedVec3 = class {
  constructor(precision, identity = [0, 0, 0]) {
    this.precision = precision;
    if (!Number.isFinite(precision) || precision <= 0) throw new RangeError("precision must be positive");
    if (identity.length !== 3 || identity.some((value) => !Number.isFinite(value))) {
      throw new RangeError("identity must contain three finite coordinates");
    }
    this.invPrecision = 1 / precision;
    this.identity = this.quantize(identity);
    this.muData = {
      type: this.muType,
      precision,
      identity: [...this.identity]
    };
    this.json = this.muData;
  }
  precision;
  muType = "replica-quantized-vec3";
  invPrecision;
  identity;
  muData;
  json;
  alloc() {
    return [0, 0, 0];
  }
  free(_value) {
  }
  clone(value) {
    return this.assign(this.alloc(), value);
  }
  assign(target, source) {
    const quantized = this.quantize(source);
    target[0] = quantized[0];
    target[1] = quantized[1];
    target[2] = quantized[2];
    return target;
  }
  equal(left, right) {
    return this.quantized(left, 0) === this.quantized(right, 0) && this.quantized(left, 1) === this.quantized(right, 1) && this.quantized(left, 2) === this.quantized(right, 2);
  }
  diff(base, target, stream) {
    const x = encodeRelative(this.quantized(target, 0) - this.quantized(base, 0));
    const y = encodeRelative(this.quantized(target, 1) - this.quantized(base, 1));
    const z = encodeRelative(this.quantized(target, 2) - this.quantized(base, 2));
    if (!x && !y && !z) return false;
    const changed = (x ? 1 : 0) | (y ? 2 : 0) | (z ? 4 : 0);
    const writeFirst = (value) => {
      const high = value >>> 4;
      stream.writeUint8((changed | (high ? 8 : 0)) << 4 | value & 15);
      if (high) stream.writeVarint(high);
    };
    if (x) {
      writeFirst(x);
      if (y) stream.writeVarint(y);
      if (z) stream.writeVarint(z);
    } else if (y) {
      writeFirst(y);
      if (z) stream.writeVarint(z);
    } else {
      writeFirst(z);
    }
    return true;
  }
  patch(base, stream) {
    const header = stream.readUint8();
    let first = header & 15;
    if (header & 128) first = (first | stream.readVarint() << 4) >>> 0;
    let x = 0;
    let y = 0;
    let z = 0;
    if (header & 16) {
      x = decodeRelative(first);
      if (header & 32) y = decodeRelative(stream.readVarint());
      if (header & 64) z = decodeRelative(stream.readVarint());
    } else if (header & 32) {
      y = decodeRelative(first);
      if (header & 64) z = decodeRelative(stream.readVarint());
    } else {
      z = decodeRelative(first);
    }
    return [
      (this.quantized(base, 0) + x) * this.precision,
      (this.quantized(base, 1) + y) * this.precision,
      (this.quantized(base, 2) + z) * this.precision
    ];
  }
  toJSON(value) {
    return this.quantize(value);
  }
  fromJSON(json) {
    return Array.isArray(json) && json.length === 3 && json.every(Number.isFinite) ? this.clone(json) : this.clone(this.identity);
  }
  quantized(value, index) {
    return Math.round(this.invPrecision * value[index]) >> 0;
  }
  quantize(value) {
    return [
      this.quantized(value, 0) * this.precision,
      this.quantized(value, 1) * this.precision,
      this.quantized(value, 2) * this.precision
    ];
  }
};
var MotionPlaybackSchema = new import_schema.MuStruct({
  motionId: new import_schema.MuASCII(""),
  cycleCount: new import_schema.MuInt32(1)
});
var PlaybackSchema = new import_schema.MuStruct({
  motions: new import_schema.MuArray(MotionPlaybackSchema, Infinity),
  startTick: new import_schema.MuFloat64(0),
  cycleCount: new import_schema.MuInt32(1)
});
var NetModelMotionSchema = new import_schema.MuStruct({
  defaultMotionId: new import_schema.MuASCII(""),
  paused: new import_schema.MuBoolean(false),
  pausedTick: new import_schema.MuFloat64(0),
  startTick: new import_schema.MuFloat64(0),
  playback: PlaybackSchema
});
var NetModelSchema = new import_schema.MuStruct({
  id: new import_schema.MuVarint(0),
  meshId: new import_schema.MuVarint(0),
  invisible: new import_schema.MuBoolean(false),
  red: new import_schema.MuUint8(255),
  green: new import_schema.MuUint8(255),
  blue: new import_schema.MuUint8(255),
  alpha: new import_schema.MuUint8(255),
  emissive: new import_schema.MuQuantizedFloat(1 / 256, 0),
  shininess: new import_schema.MuQuantizedFloat(1 / 256, 0),
  metalness: new import_schema.MuQuantizedFloat(1 / 256, 0),
  scaleX: new import_schema.MuQuantizedFloat(1 / 256, 1),
  scaleY: new import_schema.MuQuantizedFloat(1 / 256, 1),
  scaleZ: new import_schema.MuQuantizedFloat(1 / 256, 1),
  offsetX: new import_schema.MuQuantizedFloat(1 / 256, 0),
  offsetY: new import_schema.MuQuantizedFloat(1 / 256, 0),
  offsetZ: new import_schema.MuQuantizedFloat(1 / 256, 0),
  motion: NetModelMotionSchema,
  staticShadow: new import_schema.MuBoolean(false),
  name: new import_schema.MuUTF8("")
});
var NetModelSetSchema = new import_schema.MuSortedArray(NetModelSchema, Infinity, compareId);
var EntityNameComponentSchema = new import_schema.MuStruct({
  id: new import_schema.MuVarint(0),
  radius: new import_schema.MuQuantizedFloat(1 / 16, 16),
  name: new import_schema.MuUTF8(""),
  color: new MuReplicaQuantizedVec3(1 / 256, [1, 1, 1])
});
var EntityNameComponentSetSchema = new import_schema.MuSortedArray(EntityNameComponentSchema, Infinity, compareId);

// legacy/box3-compat/src/wire/net-public-state.ts
var maxPlayerId = 2147483647;
var defaultPlayerInputState = 4 | 1536;
var playerBodyFlags = 2 | 4 | 8;
var relativeVarintBias2 = 2863311530;
var bodyParts = [
  "head",
  "hips",
  "leftFoot",
  "leftHand",
  "leftLowerArm",
  "leftLowerLeg",
  "leftShoulder",
  "leftUpperArm",
  "leftUpperLeg",
  "neck",
  "rightFoot",
  "rightHand",
  "rightLowerArm",
  "rightLowerLeg",
  "rightShoulder",
  "rightUpperArm",
  "rightUpperLeg",
  "torso"
];
var localAvatarSkinPartIds = [
  311,
  312,
  313,
  314,
  315,
  316,
  58,
  317,
  318,
  61,
  319,
  320,
  321,
  322,
  66,
  323,
  324,
  325
];
var unused = new import_schema2.MuVoid();
function compareId2(left, right) {
  return left.id - right.id;
}
function compareNumber(left, right) {
  return left - right;
}
function bodyPartStruct(schema) {
  return new import_schema2.MuStruct({
    hips: schema,
    torso: schema,
    neck: schema,
    head: schema,
    leftShoulder: schema,
    leftUpperArm: schema,
    leftLowerArm: schema,
    leftHand: schema,
    rightShoulder: schema,
    rightUpperArm: schema,
    rightLowerArm: schema,
    rightHand: schema,
    leftUpperLeg: schema,
    leftLowerLeg: schema,
    leftFoot: schema,
    rightUpperLeg: schema,
    rightLowerLeg: schema,
    rightFoot: schema
  });
}
var PlayerSkinIdSchema = bodyPartStruct(new import_schema2.MuVarint(0));
var PlayerSkinInvisibleSchema = bodyPartStruct(new import_schema2.MuBoolean(false));
var PlayerInputSchema = new import_schema2.MuStruct({
  id: new import_schema2.MuUint32(0),
  state: new import_schema2.MuUint16(defaultPlayerInputState),
  angle: new import_schema2.MuUint8(0),
  cameraAngle: new import_schema2.MuUint8(0),
  pitch: new import_schema2.MuUint8(0)
});
var PlayerInputSetSchema = new import_schema2.MuSortedArray(PlayerInputSchema, Infinity, compareId2);
var PlayerSchema = new import_schema2.MuStruct({
  id: new import_schema2.MuVarint(0),
  physGround: new import_schema2.MuBoolean(false),
  physFluid: new import_schema2.MuQuantizedFloat(1 / 32, 0),
  platformX: new import_schema2.MuQuantizedFloat(1 / 256, 0),
  platformY: new import_schema2.MuQuantizedFloat(1 / 256, 0),
  platformZ: new import_schema2.MuQuantizedFloat(1 / 256, 0),
  occupancy: new import_schema2.MuUint8(0),
  flags: new import_schema2.MuVarint(2 | 4 | 8 | 16 | 32 | 64 | 128),
  walkSpeed: new import_schema2.MuQuantizedFloat(1 / 1024, 0.22),
  walkAcceleration: new import_schema2.MuQuantizedFloat(1 / 1024, 0.19),
  runSpeed: new import_schema2.MuQuantizedFloat(1 / 1024, 0.4),
  runAcceleration: new import_schema2.MuQuantizedFloat(1 / 1024, 0.35),
  crouchSpeed: new import_schema2.MuQuantizedFloat(1 / 1024, 0.1),
  crouchAcceleration: new import_schema2.MuQuantizedFloat(1 / 1024, 0.09),
  swimSpeed: new import_schema2.MuQuantizedFloat(1 / 1024, 0.4),
  swimAcceleration: new import_schema2.MuQuantizedFloat(1 / 1024, 0.1),
  flySpeed: new import_schema2.MuQuantizedFloat(1 / 1024, 2),
  flyAcceleration: new import_schema2.MuQuantizedFloat(1 / 1024, 2),
  jumpSpeedFactor: new import_schema2.MuQuantizedFloat(1 / 1024, 0.85),
  jumpAccelerationFactor: new import_schema2.MuQuantizedFloat(1 / 1024, 0.55),
  jumpPower: new import_schema2.MuQuantizedFloat(1 / 1024, 0.96),
  doubleJumpPower: new import_schema2.MuQuantizedFloat(1 / 1024, 0.9),
  freezedForwardAngle: new import_schema2.MuUint16(0),
  inputDirectionState: new import_schema2.MuUint8(0),
  stepHeight: new import_schema2.MuQuantizedFloat(1 / 1024, 1.25)
});
var PlayerSetSchema = new import_schema2.MuSortedArray(PlayerSchema, Infinity, compareId2);
var RigidBodySchema = {
  muType: "struct",
  json: { type: "struct", subTypes: {} },
  muData: {},
  identity: createRigidBody(),
  alloc: createRigidBody,
  free(_body) {
  },
  clone(source) {
    return assignRigidBody(createRigidBody(), source);
  },
  assign(target, source) {
    return assignRigidBody(target, source);
  },
  equal(left, right) {
    return left.id === right.id && left.flags === right.flags && left.group === right.group && left.mass === right.mass && left.friction === right.friction && left.restitution === right.restitution && left.rx === right.rx && left.ry === right.ry && left.rz === right.rz && left.px === right.px && left.py === right.py && left.pz === right.pz && left.vx === right.vx && left.vy === right.vy && left.vz === right.vz && left.qx === right.qx && left.qy === right.qy && left.qz === right.qz && left.qw === right.qw && left.hsx === right.hsx && left.hsy === right.hsy && left.hsz === right.hsz && left.ax === right.ax && left.ay === right.ay && left.az === right.az;
  },
  diff(base, target, stream) {
    const id = target.id - base.id | 0;
    const group = target.group - base.group | 0;
    const mass = quantizedDelta(base.mass, target.mass);
    const friction = quantizedDelta(base.friction, target.friction);
    const restitution = quantizedDelta(base.restitution, target.restitution);
    const rx = quantizedDelta(base.rx, target.rx);
    const ry = quantizedDelta(base.ry, target.ry);
    const rz = quantizedDelta(base.rz, target.rz);
    const px = quantizedDelta(base.px, target.px);
    const py = quantizedDelta(base.py, target.py);
    const pz = quantizedDelta(base.pz, target.pz);
    const vx = quantizedDelta(base.vx, target.vx);
    const vy = quantizedDelta(base.vy, target.vy);
    const vz = quantizedDelta(base.vz, target.vz);
    const qx = quantizedDelta(base.qx, target.qx);
    const qy = quantizedDelta(base.qy, target.qy);
    const qz = quantizedDelta(base.qz, target.qz);
    const qw = quantizedDelta(base.qw, target.qw);
    const hsx = quantizedDelta(base.hsx, target.hsx);
    const hsy = quantizedDelta(base.hsy, target.hsy);
    const hsz = quantizedDelta(base.hsz, target.hsz);
    const ax = quantizedDelta(base.ax, target.ax);
    const ay = quantizedDelta(base.ay, target.ay);
    const az = quantizedDelta(base.az, target.az);
    const flags = (base.flags ^ target.flags) & 31;
    let mask = flags << 6;
    if (id) mask |= 1 << 18;
    if (group) mask |= 1 << 14;
    if (mass) mask |= 1 << 15;
    if (friction) mask |= 1 << 16;
    if (restitution) mask |= 1 << 17;
    if (rx) mask |= 1 << 11;
    if (ry) mask |= 2 << 11;
    if (rz) mask |= 4 << 11;
    if (px) mask |= 1;
    if (py) mask |= 2;
    if (pz) mask |= 4;
    if (vx) mask |= 1 << 3;
    if (vy) mask |= 2 << 3;
    if (vz) mask |= 4 << 3;
    if (qx) mask |= 1 << 19;
    if (qy) mask |= 2 << 19;
    if (qz) mask |= 4 << 19;
    if (qw) mask |= 8 << 19;
    if (hsx) mask |= 1 << 23;
    if (hsy) mask |= 2 << 23;
    if (hsz) mask |= 4 << 23;
    if (ax) mask |= 1 << 26;
    if (ay) mask |= 2 << 26;
    if (az) mask |= 4 << 26;
    if (!mask) return false;
    stream.writeVarint(mask >>> 0);
    if (id) writeRelative(stream, id);
    if (group) writeRelative(stream, group);
    if (mass) writeRelative(stream, mass);
    if (friction) writeRelative(stream, friction);
    if (restitution) writeRelative(stream, restitution);
    if (rx) writeRelative(stream, rx);
    if (ry) writeRelative(stream, ry);
    if (rz) writeRelative(stream, rz);
    if (px) writeRelative(stream, px);
    if (py) writeRelative(stream, py);
    if (pz) writeRelative(stream, pz);
    if (vx) writeRelative(stream, vx);
    if (vy) writeRelative(stream, vy);
    if (vz) writeRelative(stream, vz);
    if (qx) writeRelative(stream, qx);
    if (qy) writeRelative(stream, qy);
    if (qz) writeRelative(stream, qz);
    if (qw) writeRelative(stream, qw);
    if (hsx) writeRelative(stream, hsx);
    if (hsy) writeRelative(stream, hsy);
    if (hsz) writeRelative(stream, hsz);
    if (ax) writeRelative(stream, ax);
    if (ay) writeRelative(stream, ay);
    if (az) writeRelative(stream, az);
    return true;
  },
  patch(base, stream) {
    const mask = stream.readVarint();
    const target = createRigidBody();
    target.flags = base.flags ^ mask >>> 6 & 31;
    target.id = mask & 1 << 18 ? base.id + readRelative(stream) : base.id;
    target.group = mask & 1 << 14 ? base.group + readRelative(stream) : base.group;
    target.mass = mask & 1 << 15 ? applyQuantizedDelta(base.mass, readRelative(stream)) : base.mass;
    target.friction = mask & 1 << 16 ? applyQuantizedDelta(base.friction, readRelative(stream)) : base.friction;
    target.restitution = mask & 1 << 17 ? applyQuantizedDelta(base.restitution, readRelative(stream)) : base.restitution;
    target.rx = mask & 1 << 11 ? applyQuantizedDelta(base.rx, readRelative(stream)) : base.rx;
    target.ry = mask & 2 << 11 ? applyQuantizedDelta(base.ry, readRelative(stream)) : base.ry;
    target.rz = mask & 4 << 11 ? applyQuantizedDelta(base.rz, readRelative(stream)) : base.rz;
    target.px = mask & 1 ? applyQuantizedDelta(base.px, readRelative(stream)) : base.px;
    target.py = mask & 2 ? applyQuantizedDelta(base.py, readRelative(stream)) : base.py;
    target.pz = mask & 4 ? applyQuantizedDelta(base.pz, readRelative(stream)) : base.pz;
    target.vx = mask & 1 << 3 ? applyQuantizedDelta(base.vx, readRelative(stream)) : base.vx;
    target.vy = mask & 2 << 3 ? applyQuantizedDelta(base.vy, readRelative(stream)) : base.vy;
    target.vz = mask & 4 << 3 ? applyQuantizedDelta(base.vz, readRelative(stream)) : base.vz;
    target.qx = mask & 1 << 19 ? applyQuantizedDelta(base.qx, readRelative(stream)) : base.qx;
    target.qy = mask & 2 << 19 ? applyQuantizedDelta(base.qy, readRelative(stream)) : base.qy;
    target.qz = mask & 4 << 19 ? applyQuantizedDelta(base.qz, readRelative(stream)) : base.qz;
    target.qw = mask & 8 << 19 ? applyQuantizedDelta(base.qw, readRelative(stream)) : base.qw;
    target.hsx = mask & 1 << 23 ? applyQuantizedDelta(base.hsx, readRelative(stream)) : base.hsx;
    target.hsy = mask & 2 << 23 ? applyQuantizedDelta(base.hsy, readRelative(stream)) : base.hsy;
    target.hsz = mask & 4 << 23 ? applyQuantizedDelta(base.hsz, readRelative(stream)) : base.hsz;
    target.ax = mask & 1 << 26 ? applyQuantizedDelta(base.ax, readRelative(stream)) : base.ax;
    target.ay = mask & 2 << 26 ? applyQuantizedDelta(base.ay, readRelative(stream)) : base.ay;
    target.az = mask & 4 << 26 ? applyQuantizedDelta(base.az, readRelative(stream)) : base.az;
    return target;
  },
  toJSON(body) {
    return { id: body.id, flags: body.flags, position: [body.px, body.py, body.pz] };
  },
  fromJSON(value) {
    const body = createRigidBody();
    if (value && typeof value === "object") {
      body.id = Number.isInteger(value.id) ? value.id : 0;
      body.flags = Number.isInteger(value.flags) ? value.flags : body.flags;
      if (Array.isArray(value.position) && value.position.length === 3) {
        body.px = Number(value.position[0]) || 0;
        body.py = Number(value.position[1]) || 0;
        body.pz = Number(value.position[2]) || 0;
      }
    }
    return body;
  }
};
function createRigidBody() {
  return {
    id: 0,
    flags: 2 | 4,
    group: 0,
    mass: 1,
    friction: 0,
    restitution: 0,
    rx: 1,
    ry: 1,
    rz: 1,
    px: 0,
    py: 0,
    pz: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    qx: 0,
    qy: 0,
    qz: 0,
    qw: 1,
    hsx: 1,
    hsy: 1,
    hsz: 1,
    ax: 0,
    ay: 0,
    az: 0
  };
}
function assignRigidBody(target, source) {
  target.id = source.id;
  target.flags = source.flags;
  target.group = source.group;
  target.mass = source.mass;
  target.friction = source.friction;
  target.restitution = source.restitution;
  target.rx = source.rx;
  target.ry = source.ry;
  target.rz = source.rz;
  target.px = source.px;
  target.py = source.py;
  target.pz = source.pz;
  target.vx = source.vx;
  target.vy = source.vy;
  target.vz = source.vz;
  target.qx = source.qx;
  target.qy = source.qy;
  target.qz = source.qz;
  target.qw = source.qw;
  target.hsx = source.hsx;
  target.hsy = source.hsy;
  target.hsz = source.hsz;
  target.ax = source.ax;
  target.ay = source.ay;
  target.az = source.az;
  return target;
}
function quantizedDelta(base, target) {
  return Math.round(target * 256) - Math.round(base * 256) | 0;
}
function applyQuantizedDelta(base, delta) {
  return (Math.round(base * 256) + delta) / 256;
}
function writeRelative(stream, delta) {
  stream.writeVarint((relativeVarintBias2 + delta ^ relativeVarintBias2) >>> 0);
}
function readRelative(stream) {
  return (relativeVarintBias2 ^ stream.readVarint()) - relativeVarintBias2 >> 0;
}
var RigidBodySetSchema = new import_schema2.MuSortedArray(RigidBodySchema, Infinity, compareId2);
var PlayerDisplaySchema = new import_schema2.MuStruct({
  id: new import_schema2.MuVarint(0),
  flags: new import_schema2.MuVarint(8),
  name: new import_schema2.MuUTF8("player"),
  tag: new import_schema2.MuVarint(0),
  avatarSkin: PlayerSkinIdSchema,
  userId: unused,
  avatar_hash: unused,
  skinInvisible: PlayerSkinInvisibleSchema,
  mapSkin: PlayerSkinIdSchema,
  color: unused,
  metalness: new import_schema2.MuQuantizedFloat(1 / 256, 0),
  emissive: new import_schema2.MuQuantizedFloat(1 / 256, 0),
  shininess: new import_schema2.MuQuantizedFloat(1 / 256, 0),
  scale: new import_schema2.MuQuantizedFloat(1 / 256, 1),
  attachments: unused
});
var PlayerDisplaySetSchema = new import_schema2.MuSortedArray(PlayerDisplaySchema, Infinity, compareId2);
var DamageSchema = new import_schema2.MuStruct({
  id: new import_schema2.MuVarint(0),
  showHealthBar: new import_schema2.MuBoolean(true),
  hp: new import_schema2.MuQuantizedFloat(1 / 256, 100),
  maxHp: new import_schema2.MuQuantizedFloat(1 / 256, 100)
});
var DamageSetSchema = new import_schema2.MuSortedArray(DamageSchema, Infinity, compareId2);
var NetStateSchema = new import_schema2.MuStruct({
  players: PlayerSetSchema,
  playerInputs: PlayerInputSetSchema,
  physics: unused,
  bodies: RigidBodySetSchema,
  collisionFilter: unused,
  zones: unused,
  zoneSelectors: unused
});
var GameReplicaSchema = new import_schema2.MuStruct({
  running: new import_schema2.MuBoolean(false),
  sync: new import_schema2.MuBoolean(false),
  environment: unused,
  models: NetModelSetSchema,
  players: PlayerDisplaySetSchema,
  particles: unused,
  damage: DamageSetSchema,
  interactive: unused,
  entityName: EntityNameComponentSetSchema,
  sound: unused,
  keyframes: unused,
  entities: new import_schema2.MuSortedArray(new import_schema2.MuVarint(0), Infinity, compareNumber)
});
var NetPublicSchema = new import_schema2.MuStruct({
  tick: new import_schema2.MuRelativeVarint(0),
  frameSkip: new import_schema2.MuRelativeVarint(0),
  state: NetStateSchema,
  replica: GameReplicaSchema
});
function createNetPublicState(input2) {
  requireTick3(input2.tick);
  const target = NetPublicSchema.clone(NetPublicSchema.identity);
  target.tick = input2.tick;
  target.frameSkip = input2.frameSkip ?? 0;
  requireTick3(target.frameSkip);
  const seen = /* @__PURE__ */ new Set();
  for (const player of input2.players) {
    requirePlayerId(player.playerId);
    if (seen.has(player.playerId)) throw new RangeError("player ids must be unique");
    seen.add(player.playerId);
    const [px, py, pz] = normalizeVector(player.position, "position");
    const [vx, vy, vz] = normalizeVector(player.velocity ?? [0, 0, 0], "velocity");
    const [rx, ry, rz] = normalizePositiveVector(player.bodyHalfExtents, "player body half extents");
    const [hsx, hsy, hsz] = normalizePositiveVector(player.bodyShapeHalfExtents ?? player.bodyHalfExtents, "player body shape half extents");
    const inputState = player.inputState ?? defaultPlayerInputState;
    const inputAngle = player.inputAngle ?? 0;
    const inputPitch = player.inputPitch ?? 0;
    const inputCameraAngle = player.inputCameraAngle ?? 0;
    const name = player.name ?? "Guest";
    requireUint162(inputState, "inputState");
    requireByte(inputAngle, "inputAngle");
    requireByte(inputPitch, "inputPitch");
    requireByte(inputCameraAngle, "inputCameraAngle");
    if (!/^[\x20-\x7e]{1,64}$/.test(name)) throw new RangeError("name must be printable ASCII");
    const playerState = PlayerSchema.clone(PlayerSchema.identity);
    playerState.id = player.playerId;
    if (player.walkSpeed !== void 0) playerState.walkSpeed = player.walkSpeed;
    if (player.runSpeed !== void 0) playerState.runSpeed = player.runSpeed;
    if (player.runAcceleration !== void 0) playerState.runAcceleration = player.runAcceleration;
    if (player.jumpPower !== void 0) playerState.jumpPower = player.jumpPower;
    if (player.jumpSpeedFactor !== void 0) playerState.jumpSpeedFactor = player.jumpSpeedFactor;
    if (player.jumpAccelerationFactor !== void 0) playerState.jumpAccelerationFactor = player.jumpAccelerationFactor;
    if (player.doubleJumpPower !== void 0) playerState.doubleJumpPower = player.doubleJumpPower;
    if (player.crouchSpeed !== void 0) playerState.crouchSpeed = player.crouchSpeed;
    if (player.crouchAcceleration !== void 0) playerState.crouchAcceleration = player.crouchAcceleration;
    if (player.flySpeed !== void 0) playerState.flySpeed = player.flySpeed;
    if (player.flyAcceleration !== void 0) playerState.flyAcceleration = player.flyAcceleration;
    if (player.swimAcceleration !== void 0) playerState.swimAcceleration = player.swimAcceleration;
    if (player.swimSpeed !== void 0) playerState.swimSpeed = player.swimSpeed;
    if (player.walkAcceleration !== void 0) playerState.walkAcceleration = player.walkAcceleration;
    target.state.players.push(playerState);
    const playerInput = PlayerInputSchema.clone(PlayerInputSchema.identity);
    playerInput.id = player.playerId;
    playerInput.state = inputState;
    playerInput.angle = inputAngle;
    playerInput.pitch = inputPitch;
    playerInput.cameraAngle = inputCameraAngle;
    target.state.playerInputs.push(playerInput);
    const body = RigidBodySchema.clone(RigidBodySchema.identity);
    body.id = player.playerId;
    body.flags = playerBodyFlags;
    body.rx = rx;
    body.ry = ry;
    body.rz = rz;
    body.hsx = hsx;
    body.hsy = hsy;
    body.hsz = hsz;
    body.px = px;
    body.py = py;
    body.pz = pz;
    body.vx = vx;
    body.vy = vy;
    body.vz = vz;
    target.state.bodies.push(body);
    const display = PlayerDisplaySchema.clone(PlayerDisplaySchema.identity);
    display.id = player.playerId;
    display.name = name;
    for (let index = 0; index < bodyParts.length; index += 1) {
      display.avatarSkin[bodyParts[index]] = player.avatarSkin?.[bodyParts[index]] ?? localAvatarSkinPartIds[index];
    }
    target.replica.players.push(display);
    target.replica.entities.push(player.playerId);
  }
  for (const entity of input2.entities ?? []) {
    requireEntityId2(entity.entityId);
    if (seen.has(entity.entityId)) throw new RangeError("player and entity ids must be unique");
    seen.add(entity.entityId);
    if (!entity.body || typeof entity.body !== "object") throw new RangeError("entity body is required");
    if (!entity.model || typeof entity.model !== "object") throw new RangeError("entity model is required");
    const [px, py, pz] = normalizeVector(entity.position, "entity position");
    const [vx, vy, vz] = normalizeVector(entity.velocity ?? [0, 0, 0], "entity velocity");
    const [rx, ry, rz] = normalizePositiveVector(entity.body.bounds, "entity body bounds");
    const [qx, qy, qz, qw] = normalizeQuaternion(entity.body.orientation);
    const body = RigidBodySchema.clone(RigidBodySchema.identity);
    body.id = entity.entityId;
    body.flags = entityBodyFlags(entity.body);
    body.group = optionalUint16(entity.body.collisionGroup, 0, "entity collisionGroup");
    body.mass = optionalFinite(entity.body.mass, 1, "entity mass", 0, 1e6);
    body.friction = optionalFinite(entity.body.friction, 0, "entity friction", 0, 1e6);
    body.restitution = optionalFinite(entity.body.restitution, 0, "entity restitution", 0, 1e6);
    body.rx = rx;
    body.ry = ry;
    body.rz = rz;
    body.hsx = rx;
    body.hsy = ry;
    body.hsz = rz;
    body.px = px;
    body.py = py;
    body.pz = pz;
    body.vx = vx;
    body.vy = vy;
    body.vz = vz;
    body.qx = qx;
    body.qy = qy;
    body.qz = qz;
    body.qw = qw;
    target.state.bodies.push(body);
    const model = NetModelSchema.clone(NetModelSchema.identity);
    model.id = entity.entityId;
    model.meshId = requireMeshId(entity.model.meshId);
    model.invisible = optionalBoolean(entity.model.invisible, false, "entity model invisible");
    const [red, green, blue, alpha] = normalizeRgba(entity.model.color ?? [255, 255, 255, 255], "entity model color");
    model.red = red;
    model.green = green;
    model.blue = blue;
    model.alpha = alpha;
    const [scaleX, scaleY, scaleZ] = normalizeVector(entity.model.scale ?? [1, 1, 1], "entity model scale");
    model.scaleX = scaleX;
    model.scaleY = scaleY;
    model.scaleZ = scaleZ;
    const [offsetX, offsetY, offsetZ] = normalizeVector(entity.model.offset ?? [0, 0, 0], "entity model offset");
    model.offsetX = offsetX;
    model.offsetY = offsetY;
    model.offsetZ = offsetZ;
    model.emissive = optionalFinite(entity.model.emissive, 0, "entity model emissive", 0, 1);
    model.shininess = optionalFinite(entity.model.shininess, 0, "entity model shininess", 0, 1);
    model.metalness = optionalFinite(entity.model.metalness, 0, "entity model metalness", 0, 1);
    model.staticShadow = optionalBoolean(entity.model.staticShadow, false, "entity model staticShadow");
    model.name = optionalText(entity.model.name, "", "entity model name");
    target.replica.models.push(model);
    if (entity.nameplate !== void 0) {
      if (!entity.nameplate || typeof entity.nameplate !== "object") throw new RangeError("entity nameplate is invalid");
      const nameplate = EntityNameComponentSchema.clone(EntityNameComponentSchema.identity);
      nameplate.id = entity.entityId;
      nameplate.name = requireText3(entity.nameplate.text, "entity nameplate text");
      nameplate.radius = optionalFinite(entity.nameplate.radius, 16, "entity nameplate radius", 0, 4096);
      nameplate.color = normalizeRgb(entity.nameplate.color ?? [1, 1, 1], "entity nameplate color");
      target.replica.entityName.push(nameplate);
    }
    target.replica.entities.push(entity.entityId);
  }
  for (const damage of input2.damage ?? []) {
    requireEntityId2(damage.id);
    if (!seen.has(damage.id)) throw new RangeError("damage state must reference a visible player or entity");
    if (typeof damage.showHealthBar !== "boolean") throw new RangeError("damage showHealthBar must be boolean");
    if (!Number.isFinite(damage.hp) || !Number.isFinite(damage.maxHp)) throw new RangeError("damage hp and maxHp must be finite");
    const record = DamageSchema.clone(DamageSchema.identity);
    record.id = damage.id;
    record.showHealthBar = damage.showHealthBar;
    record.hp = damage.hp;
    record.maxHp = damage.maxHp;
    target.replica.damage.push(record);
  }
  target.state.players.sort(compareId2);
  target.state.playerInputs.sort(compareId2);
  target.state.bodies.sort(compareId2);
  target.replica.players.sort(compareId2);
  target.replica.models.sort(compareId2);
  target.replica.damage.sort(compareId2);
  target.replica.entityName.sort(compareId2);
  target.replica.entities.sort(compareNumber);
  target.replica.running = true;
  return target;
}
function entityBodyFlags(body) {
  const collides = optionalBoolean(body.collides, true, "entity body collides");
  const fixed = optionalBoolean(body.fixed, true, "entity body fixed");
  const gravity = optionalBoolean(body.gravity, false, "entity body gravity");
  return (collides ? 2 : 0) | (gravity ? 4 : 0) | (fixed ? 16 : 0);
}
function normalizePositiveVector(value, name) {
  const vector2 = normalizeVector(value, name);
  if (vector2.some((coordinate) => coordinate <= 0 || coordinate > 4096)) {
    throw new RangeError(name + " must contain three positive coordinates within the runtime bounds");
  }
  return vector2;
}
function normalizeQuaternion(value) {
  if (value === void 0) return [0, 0, 0, 1];
  if (value.length !== 4 || value.some((coordinate) => !Number.isFinite(coordinate) || Math.abs(coordinate) > 1)) {
    throw new RangeError("entity orientation must contain four finite normalized coordinates");
  }
  const magnitude = Math.hypot(value[0], value[1], value[2], value[3]);
  if (magnitude < 1e-6) throw new RangeError("entity orientation must not be zero");
  return [value[0] / magnitude, value[1] / magnitude, value[2] / magnitude, value[3] / magnitude];
}
function normalizeRgba(value, name) {
  if (value.length !== 4 || value.some((component) => !Number.isInteger(component) || component < 0 || component > 255)) {
    throw new RangeError(name + " must contain four unsigned bytes");
  }
  return [value[0], value[1], value[2], value[3]];
}
function normalizeRgb(value, name) {
  if (value.length !== 3 || value.some((component) => !Number.isFinite(component) || component < 0 || component > 1)) {
    throw new RangeError(name + " must contain three normalized colour components");
  }
  return [value[0], value[1], value[2]];
}
function optionalBoolean(value, fallback, name) {
  if (value === void 0) return fallback;
  if (typeof value !== "boolean") throw new RangeError(name + " must be boolean");
  return value;
}
function optionalUint16(value, fallback, name) {
  if (value === void 0) return fallback;
  requireUint162(value, name);
  return value;
}
function optionalFinite(value, fallback, name, minimum, maximum) {
  if (value === void 0) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(name + " is outside the supported range");
  }
  return value;
}
function optionalText(value, fallback, name) {
  if (value === void 0) return fallback;
  return requireText3(value, name);
}
function requireText3(value, name) {
  if (typeof value !== "string" || Array.from(value).length === 0 || Array.from(value).length > 64 || /[\x00-\x1f\x7f]/.test(value)) {
    throw new RangeError(name + " is invalid");
  }
  return value;
}
function requireMeshId(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maxPlayerId) {
    throw new RangeError("entity meshId must be a positive safe integer");
  }
  return value;
}
function requireEntityId2(value) {
  if (!Number.isInteger(value) || value < 1 || value > maxPlayerId) {
    throw new RangeError("entityId must be an integer between 1 and " + maxPlayerId);
  }
}
function normalizeVector(value, name) {
  if (value.length !== 3 || value.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new RangeError(name + " must contain three finite coordinates");
  }
  return [value[0], value[1], value[2]];
}
function requirePlayerId(value) {
  if (!Number.isInteger(value) || value < 1 || value > maxPlayerId) {
    throw new RangeError("playerId must be an integer between 1 and " + maxPlayerId);
  }
}
function requireTick3(value) {
  if (!Number.isInteger(value) || value < 0 || value > 4294967295) {
    throw new RangeError("tick must be an unsigned 32-bit integer");
  }
}
function requireByte(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError(name + " must be an unsigned byte");
  }
}
function requireUint162(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new RangeError(name + " must be an unsigned 16-bit integer");
  }
}

// legacy/box3-compat/src/session/anonymous-player-state.ts
var maxBootstrapPlayerId = 2147483647;
var maxPublicBaseTick = 1073741823;
var defaultPlayerInputState2 = 4 | 1536;
function encodeAnonymousPlayerSecret(playerId) {
  requirePlayerId2(playerId);
  const stream = new import_stream.MuWriteStream(16);
  try {
    stream.writeVarint(1);
    stream.writeUint8(69);
    stream.writeUint8(0);
    stream.writeVarint(playerId);
    stream.writeUint8(5);
    stream.writeVarint(playerId);
    stream.writeUint8(1);
    stream.writeVarint(playerId);
    return Uint8Array.from(stream.bytes());
  } finally {
    stream.destroy();
  }
}
function encodeAnonymousPlayerPublic(input2) {
  return encodeAnonymousPlayersPublic({
    tick: input2.tick,
    players: [input2],
    pauseCounter: input2.pauseCounter
  });
}
function createAnonymousPlayersPublicState(input2) {
  requireUint32(input2.tick, "tick");
  validatePlayers(input2.players);
  return createNetPublicState({
    tick: input2.tick,
    players: input2.players,
    entities: input2.entities,
    damage: input2.damage
  });
}
function encodeNetPublicPacket(base, current, pauseCounter = 0) {
  requireUint32(pauseCounter, "pauseCounter");
  requirePublicBaseTick(base.tick);
  const stream = new import_stream.MuWriteStream(estimatePacketCapacity(current));
  try {
    stream.writeVarint(base.tick * 2);
    NetPublicSchema.diff(base, current, stream);
    stream.writeVarint(pauseCounter);
    return Uint8Array.from(stream.bytes());
  } finally {
    stream.destroy();
  }
}
function encodeAnonymousPlayersPublic(input2) {
  const current = createAnonymousPlayersPublicState(input2);
  try {
    return encodeNetPublicPacket(NetPublicSchema.identity, current, input2.pauseCounter ?? 0);
  } finally {
    NetPublicSchema.free(current);
  }
}
function estimatePacketCapacity(current) {
  return Math.max(256, 64 + current.state.players.length * 256 + current.replica.models.length * 512);
}
function validatePlayers(players) {
  if (players.length === 0) throw new RangeError("players must not be empty");
  const seenPlayerIds = /* @__PURE__ */ new Set();
  for (const player of players) {
    requirePlayerId2(player.playerId);
    if (seenPlayerIds.has(player.playerId)) throw new RangeError("player ids must be unique");
    seenPlayerIds.add(player.playerId);
    const name = player.name ?? "Guest";
    if (!/^[\x20-\x7e]{1,64}$/.test(name)) throw new RangeError("name must be printable ASCII");
    for (const coordinate of player.position) quantizeCoordinate(coordinate);
    for (const coordinate of player.velocity ?? [0, 0, 0]) quantizeCoordinate(coordinate);
    normalizePositiveVector(player.bodyHalfExtents, "player body half extents");
    const shapeHalfExtents = normalizePositiveVector(player.bodyShapeHalfExtents ?? player.bodyHalfExtents, "player body shape half extents");
    if (shapeHalfExtents.some((component, index) => component > player.bodyHalfExtents[index])) throw new RangeError("player body shape half extents must fit inside bounds");
    requireUint163(player.inputState ?? defaultPlayerInputState2, "inputState");
    requireByte2(player.inputAngle ?? 0, "inputAngle");
    requireByte2(player.inputPitch ?? 0, "inputPitch");
    requireByte2(player.inputCameraAngle ?? 0, "inputCameraAngle");
  }
}
function quantizeCoordinate(value) {
  if (!Number.isFinite(value)) throw new RangeError("spawn coordinate must be finite");
  const quantized = Math.round(value * 256);
  if (quantized < -2147483648 || quantized > 2147483647) {
    throw new RangeError("spawn coordinate is outside wire range");
  }
  return quantized;
}
function requirePlayerId2(value) {
  if (!Number.isInteger(value) || value < 1 || value > maxBootstrapPlayerId) {
    throw new RangeError("playerId must be an integer between 1 and " + maxBootstrapPlayerId);
  }
}
function requirePublicBaseTick(value) {
  if (!Number.isInteger(value) || value < 0 || value > maxPublicBaseTick) {
    throw new RangeError("base tick must fit the PUBLIC message header");
  }
}
function requireByte2(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError(name + " must be an unsigned byte");
  }
}
function requireUint163(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new RangeError(name + " must be an unsigned 16-bit integer");
  }
}
function requireUint32(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 4294967295) {
    throw new RangeError(name + " must be an unsigned 32-bit integer");
  }
}

// legacy/box3-compat/src/session/game-net-handshake.ts
var maxUint322 = 4294967295;
var maxBootstrapPlayerId2 = 2147483647;
var defaultSpawn = [128, 72, 128];
var GameNetHandshakeSession = class {
  playerId;
  initialTick;
  initialPauseCounter;
  initialSpawn;
  bodyHalfExtents;
  bodyShapeHalfExtents;
  initialPackets;
  deliveredClients = /* @__PURE__ */ new WeakSet();
  constructor(playerId, initialTick2 = 4, initialPauseCounter = 0, initialSpawn = defaultSpawn, bodyHalfExtents, bodyShapeHalfExtents = bodyHalfExtents) {
    this.playerId = requirePlayerId3("playerId", playerId);
    this.initialTick = requireUint322("initialTick", initialTick2, false);
    this.initialPauseCounter = requireUint322("initialPauseCounter", initialPauseCounter, true);
    this.initialSpawn = normalizeSpawn(initialSpawn);
    this.bodyHalfExtents = normalizePositiveVector(bodyHalfExtents, "player body half extents");
    this.bodyShapeHalfExtents = normalizePositiveVector(bodyShapeHalfExtents, "player body shape half extents");
  }
  get initialPacketsIssued() {
    return this.initialPackets !== void 0;
  }
  takeInitialPacketsFor(client) {
    if (this.deliveredClients.has(client)) return void 0;
    this.deliveredClients.add(client);
    if (!this.initialPackets) {
      this.initialPackets = {
        playerId: this.playerId,
        tick: this.initialTick,
        pauseCounter: this.initialPauseCounter,
        spawn: this.initialSpawn,
        bodyHalfExtents: this.bodyHalfExtents,
        bodyShapeHalfExtents: this.bodyShapeHalfExtents,
        secret: encodeAnonymousPlayerSecret(this.playerId),
        public: encodeAnonymousPlayerPublic({
          playerId: this.playerId,
          tick: this.initialTick,
          position: this.initialSpawn,
          bodyHalfExtents: this.bodyHalfExtents,
          bodyShapeHalfExtents: this.bodyShapeHalfExtents,
          pauseCounter: this.initialPauseCounter
        })
      };
    }
    return this.initialPackets;
  }
};
var GameNetHandshakeSessions = class {
  sessions = /* @__PURE__ */ new Map();
  initialTick;
  currentTick;
  initialPauseCounter;
  initialSpawn;
  bodyHalfExtents;
  bodyShapeHalfExtents;
  spawnForSession;
  nextPlayerId;
  constructor(options = {}) {
    this.nextPlayerId = requirePlayerId3("firstPlayerId", options.firstPlayerId ?? 1);
    this.initialTick = requireUint322("initialTick", options.initialTick ?? 4, false);
    this.currentTick = options.currentTick;
    this.initialPauseCounter = requireUint322(
      "initialPauseCounter",
      options.initialPauseCounter ?? 0,
      true
    );
    this.initialSpawn = normalizeSpawn(options.initialSpawn ?? defaultSpawn);
    this.bodyHalfExtents = normalizePositiveVector(options.bodyHalfExtents, "player body half extents");
    this.bodyShapeHalfExtents = normalizePositiveVector(options.bodyShapeHalfExtents ?? options.bodyHalfExtents, "player body shape half extents");
    this.spawnForSession = options.spawnForSession;
  }
  get size() {
    return this.sessions.size;
  }
  get(sessionId) {
    return this.sessions.get(sessionId);
  }
  getOrCreate(sessionId) {
    if (!sessionId) throw new Error("sessionId must not be empty");
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;
    if (this.nextPlayerId > maxBootstrapPlayerId2) throw new Error("game-net player id space exhausted");
    const initialTick2 = this.currentTick ? requireUint322("currentTick()", this.currentTick(), false) : this.initialTick;
    const session = new GameNetHandshakeSession(
      this.nextPlayerId,
      initialTick2,
      this.initialPauseCounter,
      this.spawnForSession?.(sessionId) ?? this.initialSpawn,
      this.bodyHalfExtents,
      this.bodyShapeHalfExtents
    );
    this.nextPlayerId += 1;
    this.sessions.set(sessionId, session);
    return session;
  }
  delete(sessionId) {
    return this.sessions.delete(sessionId);
  }
  dispose() {
    this.sessions.clear();
  }
};
function requireUint322(name, value, allowZero) {
  const minimum = allowZero ? 0 : 1;
  if (!Number.isInteger(value) || value < minimum || value > maxUint322) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maxUint322}`);
  }
  return value;
}
function requirePlayerId3(name, value) {
  if (!Number.isInteger(value) || value < 1 || value > maxBootstrapPlayerId2) {
    throw new RangeError(`${name} must be an integer between 1 and ${maxBootstrapPlayerId2}`);
  }
  return value;
}
function normalizeSpawn(value) {
  if (value.length !== 3 || value.some((item) => !Number.isFinite(item))) {
    throw new RangeError("initialSpawn must contain three finite coordinates");
  }
  return Object.freeze([value[0], value[1], value[2]]);
}

// legacy/box3-compat/src/session/game-net-public.ts
var checkpointInterval = 4;
var maxRetainedCheckpoints = 16;
var maxUint323 = 4294967295;
var GameNetPublicSessions = class {
  gameClock;
  runtime;
  schedule;
  cancel;
  sessions = /* @__PURE__ */ new Map();
  damageStates = /* @__PURE__ */ new Map();
  pendingDamageHurt = /* @__PURE__ */ new Map();
  pendingDamageDie = /* @__PURE__ */ new Set();
  pendingDamageRespawn = /* @__PURE__ */ new Set();
  timer;
  constructor(options) {
    this.gameClock = options.gameClock;
    this.runtime = options.runtime ?? new AuthoritativeGameRuntime({ gameClock: this.gameClock });
    this.schedule = options.schedule ?? ((callback, milliseconds) => setInterval(callback, milliseconds));
    this.cancel = options.cancel ?? ((handle) => clearInterval(handle));
  }
  get size() {
    return this.sessions.size;
  }
  start(client, packets) {
    requireSessionId6(client.sessionId);
    const session = this.getOrCreate(client.sessionId, packets);
    this.runtime.join({
      sessionId: client.sessionId,
      playerId: packets.playerId,
      spawn: packets.spawn,
      bodyHalfExtents: packets.bodyHalfExtents,
      bodyShapeHalfExtents: packets.bodyShapeHalfExtents
    });
    session.client = client;
    const frame = this.advanceToCurrentTick();
    this.resetPublicHistory(session);
    this.sendIdentity(session, client, frame);
    session.lastSentTick = frame.tick;
    this.ensureTimer();
  }
  synchronize(client) {
    return this.resend(client);
  }
  unpause(client) {
    return this.resend(client);
  }
  /** Drops only this closed transport; match state survives the reconnect grace period. */
  disconnect(client) {
    requireSessionId6(client.sessionId);
    const session = this.sessions.get(client.sessionId);
    if (!session || session.client !== client) return false;
    this.releaseSessionState(session);
    return true;
  }
  acknowledge(sessionId, tick) {
    requireSessionId6(sessionId);
    requireTick4(tick);
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const checkpoint = session.sentCheckpoints.get(tick);
    if (!checkpoint || tick <= (session.acknowledgedTick ?? 0)) return;
    session.acknowledgedTick = tick;
    session.acknowledgedCheckpoint = checkpoint;
    this.discardCheckpointsBefore(session, tick);
  }
  lastAcknowledgedTick(sessionId) {
    return this.sessions.get(sessionId)?.acknowledgedTick;
  }
  /**
   * Decodes the old full-body input format into a temporary compatibility
   * command. The transport never applies the transform itself.
   */
  acceptInput(sessionId, input2) {
    requireSessionId6(sessionId);
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    const command = decodeTemporaryLegacyPositionTransformCommand(input2, session.playerId);
    return command ? this.runtime.enqueueInput(sessionId, command) : false;
  }
  kick(sessionLabel) {
    requireSessionId6(sessionLabel);
    const exact = this.sessions.get(sessionLabel);
    const session = exact ?? [...this.sessions.values()].find((candidate) => matchesSessionLabel(candidate.sessionId, sessionLabel));
    const client = session?.client;
    if (!client) return false;
    client.close();
    return true;
  }
  updateDamage(entityId, state, events = {}) {
    requireEntityId2(entityId);
    const frame = this.runtime.snapshot();
    const exists = frame.players.some((player) => player.playerId === entityId) || frame.entities.some((entity) => entity.entityId === entityId);
    if (!exists) return false;
    const previous = this.damageStates.get(entityId) ?? defaultDamageState;
    const next = normalizeRuntimeDamageState(state, previous);
    this.damageStates.set(entityId, next);
    if ([...this.sessions.values()].some((session) => session.client)) this.queueDamageEvents(entityId, events);
    return true;
  }
  destroyEntity(entityId) {
    requireEntityId2(entityId);
    if (!this.runtime.despawnEntity(entityId)) return false;
    this.damageStates.delete(entityId);
    this.pendingDamageHurt.delete(entityId);
    this.pendingDamageDie.delete(entityId);
    this.pendingDamageRespawn.delete(entityId);
    return true;
  }
  queueDamageEvents(entityId, events) {
    if (Object.prototype.hasOwnProperty.call(events, "hurt")) {
      const amount = Number(events.hurt);
      if (!Number.isFinite(amount)) throw new RangeError("damage hurt amount must be finite");
      this.pendingDamageHurt.set(entityId, (this.pendingDamageHurt.get(entityId) ?? 0) + amount);
    }
    if (events.die === true) this.pendingDamageDie.add(entityId);
    if (events.respawn === true) this.pendingDamageRespawn.add(entityId);
  }
  flushDamageEvents() {
    if (this.pendingDamageHurt.size === 0 && this.pendingDamageDie.size === 0 && this.pendingDamageRespawn.size === 0) return false;
    const packet = {
      damage: {
        die: [...this.pendingDamageDie].sort(compareNumber),
        hurt: [...this.pendingDamageHurt].sort(([left], [right]) => left - right).map(([id, damage]) => ({ id, damage })),
        respawn: [...this.pendingDamageRespawn].sort(compareNumber)
      }
    };
    let sent = false;
    try {
      for (const session of this.sessions.values()) {
        const sender = session.client?.message.scriptEvents;
        if (typeof sender !== "function") continue;
        sender(packet);
        sent = true;
      }
      return sent;
    } finally {
      this.pendingDamageHurt.clear();
      this.pendingDamageDie.clear();
      this.pendingDamageRespawn.clear();
    }
  }
  publish() {
    const frame = this.advanceToCurrentTick();
    const current = createPublicState(frame, this.damageStates);
    let sent = false;
    try {
      for (const session of this.sessions.values()) {
        if (!session.client || frame.tick <= session.lastSentTick) continue;
        this.sendCurrent(session, session.client, current);
        session.lastSentTick = frame.tick;
        sent = true;
      }
      return this.flushDamageEvents() || sent;
    } finally {
      NetPublicSchema.free(current);
    }
  }
  delete(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    this.releaseSessionState(session);
    this.sessions.delete(sessionId);
    this.damageStates.delete(session.playerId);
    this.pendingDamageHurt.delete(session.playerId);
    this.pendingDamageDie.delete(session.playerId);
    this.pendingDamageRespawn.delete(session.playerId);
    this.runtime.leave(sessionId);
    if (this.sessions.size === 0) this.stopTimer();
    return true;
  }
  dispose() {
    this.stopTimer();
    for (const session of this.sessions.values()) {
      this.releaseSessionState(session);
      this.runtime.leave(session.sessionId);
    }
    this.sessions.clear();
    this.damageStates.clear();
    this.pendingDamageHurt.clear();
    this.pendingDamageDie.clear();
    this.pendingDamageRespawn.clear();
  }
  resend(client) {
    const session = this.sessions.get(client.sessionId);
    if (!session) return false;
    session.client = client;
    const frame = this.advanceToCurrentTick();
    this.resetPublicHistory(session);
    this.sendIdentity(session, client, frame);
    session.lastSentTick = Math.max(session.lastSentTick, frame.tick);
    return true;
  }
  getOrCreate(sessionId, packets) {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      if (existing.playerId !== packets.playerId || existing.pauseCounter !== packets.pauseCounter) {
        throw new Error("Game-net PUBLIC session configuration changed");
      }
      return existing;
    }
    const session = {
      sessionId,
      playerId: packets.playerId,
      pauseCounter: packets.pauseCounter,
      lastSentTick: packets.tick,
      sentCheckpoints: /* @__PURE__ */ new Map()
    };
    this.sessions.set(sessionId, session);
    return session;
  }
  ensureTimer() {
    if (this.timer !== void 0) return;
    const handle = this.schedule(() => this.publish(), gameTickMilliseconds);
    this.timer = handle;
    if (hasUnref3(handle)) handle.unref();
  }
  stopTimer() {
    if (this.timer === void 0) return;
    this.cancel(this.timer);
    this.timer = void 0;
  }
  advanceToCurrentTick() {
    return this.runtime.advanceTo(this.gameClock.currentTick());
  }
  sendIdentity(session, client, frame) {
    const current = createPublicState(frame, this.damageStates);
    try {
      this.sendCurrent(session, client, current, true);
    } finally {
      NetPublicSchema.free(current);
    }
  }
  sendCurrent(session, client, current, forceIdentity = false) {
    const base = forceIdentity ? NetPublicSchema.identity : session.acknowledgedCheckpoint ?? NetPublicSchema.identity;
    client.sendRaw(encodeNetPublicPacket(base, current, session.pauseCounter), false);
    this.retainCheckpoint(session, current);
  }
  retainCheckpoint(session, current) {
    if (current.tick % checkpointInterval !== 0) return;
    const replacement = NetPublicSchema.clone(current);
    const previous = session.sentCheckpoints.get(current.tick);
    session.sentCheckpoints.set(current.tick, replacement);
    if (previous) {
      if (session.acknowledgedCheckpoint === previous) session.acknowledgedCheckpoint = replacement;
      NetPublicSchema.free(previous);
    }
    this.trimRetainedCheckpoints(session);
  }
  discardCheckpointsBefore(session, tick) {
    for (const [checkpointTick, checkpoint] of session.sentCheckpoints) {
      if (checkpointTick >= tick) continue;
      session.sentCheckpoints.delete(checkpointTick);
      NetPublicSchema.free(checkpoint);
    }
  }
  trimRetainedCheckpoints(session) {
    while (session.sentCheckpoints.size > maxRetainedCheckpoints) {
      let discardedTick;
      for (const checkpointTick of session.sentCheckpoints.keys()) {
        if (checkpointTick !== session.acknowledgedTick) {
          discardedTick = checkpointTick;
          break;
        }
      }
      if (discardedTick === void 0) return;
      const checkpoint = session.sentCheckpoints.get(discardedTick);
      session.sentCheckpoints.delete(discardedTick);
      if (checkpoint) NetPublicSchema.free(checkpoint);
    }
  }
  resetPublicHistory(session) {
    session.acknowledgedTick = void 0;
    session.acknowledgedCheckpoint = void 0;
    this.clearCheckpoints(session);
  }
  releaseSessionState(session) {
    this.resetPublicHistory(session);
    session.client = void 0;
  }
  clearCheckpoints(session) {
    for (const checkpoint of session.sentCheckpoints.values()) NetPublicSchema.free(checkpoint);
    session.sentCheckpoints.clear();
  }
};
var defaultDamageState = Object.freeze({ showHealthBar: true, hp: 100, maxHp: 100 });
function normalizeRuntimeDamageState(state, previous = defaultDamageState) {
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new RangeError("damage state must be an object");
  const showHealthBar = state.showHealthBar ?? previous.showHealthBar;
  const hp = state.hp ?? previous.hp;
  const maxHp = state.maxHp ?? previous.maxHp;
  if (typeof showHealthBar !== "boolean") throw new RangeError("damage showHealthBar must be boolean");
  if (!Number.isFinite(hp) || !Number.isFinite(maxHp)) throw new RangeError("damage hp and maxHp must be finite");
  return Object.freeze({ showHealthBar, hp, maxHp });
}
function createPublicState(frame, damageStates = /* @__PURE__ */ new Map()) {
  const entities = [];
  for (const entity of frame.entities) {
    if (entity.replica === void 0) continue;
    entities.push({
      entityId: entity.entityId,
      position: entity.position,
      velocity: entity.velocity,
      body: entity.replica.body,
      model: entity.replica.model,
      ...entity.replica.nameplate === void 0 ? {} : { nameplate: entity.replica.nameplate }
    });
  }
  const damage = [];
  for (const player of frame.players) damage.push({ id: player.playerId, ...damageStates.get(player.playerId) ?? defaultDamageState });
  for (const entity of entities) damage.push({ id: entity.entityId, ...damageStates.get(entity.entityId) ?? defaultDamageState });
  return createAnonymousPlayersPublicState({
    tick: frame.tick,
    players: frame.players,
    entities,
    damage
  });
}
function decodeTemporaryLegacyPositionTransformCommand(input2, playerId) {
  if (!isRecord7(input2) || !isRecord7(input2.input) || !Array.isArray(input2.input.bodies)) return void 0;
  const tick = input2.tick === void 0 ? void 0 : input2.tick;
  if (tick !== void 0 && !isTick2(tick)) return void 0;
  const inputState = optionalUint162(input2.input.inputState);
  const inputAngle = optionalByte(input2.input.inputAngle);
  const inputPitch = optionalByte(input2.input.inputPitch);
  const inputCameraAngle = optionalByte(input2.input.inputCameraAngle);
  if (input2.input.inputState !== void 0 && inputState === void 0 || input2.input.inputAngle !== void 0 && inputAngle === void 0 || input2.input.inputPitch !== void 0 && inputPitch === void 0 || input2.input.inputCameraAngle !== void 0 && inputCameraAngle === void 0) return void 0;
  const body = input2.input.bodies.find((candidate) => isRecord7(candidate) && candidate.id === playerId);
  if (!body) return void 0;
  const { px, py, pz } = body;
  if (!isPositionCoordinate(px) || !isPositionCoordinate(py) || !isPositionCoordinate(pz)) return void 0;
  const velocities = [body.vx, body.vy, body.vz];
  if (velocities.some((value) => value !== void 0) && !velocities.every(isPositionCoordinate)) return void 0;
  const velocity = velocities.every(isPositionCoordinate) ? [velocities[0], velocities[1], velocities[2]] : void 0;
  return Object.freeze({
    kind: "temporary-legacy-position-transform",
    tick,
    position: [px, py, pz],
    velocity,
    inputState,
    inputAngle,
    inputPitch,
    inputCameraAngle
  });
}
function isPositionCoordinate(value) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 4096;
}
function optionalByte(value) {
  return isByte3(value) ? value : void 0;
}
function optionalUint162(value) {
  return isUint162(value) ? value : void 0;
}
function isByte3(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255;
}
function isUint162(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 65535;
}
function isTick2(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= maxUint323;
}
function isRecord7(value) {
  return typeof value === "object" && value !== null;
}
function requireSessionId6(sessionId) {
  if (!sessionId) throw new Error("sessionId must not be empty");
}
function requireTick4(tick) {
  if (!isTick2(tick)) throw new RangeError("tick must be an unsigned 32-bit integer");
}
function hasUnref3(value) {
  return typeof value === "object" && value !== null && "unref" in value && typeof value.unref === "function";
}

// legacy/box3-compat/src/session/player-protocol-sessions.ts
var PlayerProtocolSessions = class {
  sessions = /* @__PURE__ */ new Map();
  get size() {
    return this.sessions.size;
  }
  connect(client) {
    requireSessionId7(client.sessionId);
    this.sessions.set(client.sessionId, { client });
  }
  /**
   * Returns true only after handing the recovered frame to the current player
   * protocol socket. It is not an acknowledgement that a profile was opened.
   */
  openUserProfile(sessionId, userId) {
    requireSessionId7(sessionId);
    const client = this.sessions.get(sessionId)?.client;
    if (!client) return false;
    client.message.openUserProfileDialog(Object.freeze({ userId }));
    return true;
  }
  /** A stale physical socket cannot detach a later replacement. */
  disconnect(client) {
    const session = this.sessions.get(client.sessionId);
    if (!session || session.client !== client) return false;
    this.sessions.delete(client.sessionId);
    return true;
  }
  delete(sessionId) {
    return this.sessions.delete(sessionId);
  }
  dispose() {
    this.sessions.clear();
  }
};
function requireSessionId7(sessionId) {
  if (!sessionId) throw new Error("sessionId must not be empty");
}

// legacy/box3-compat/src/evidence/historical-bootstrap-payload-digest.ts
var import_node_crypto6 = require("node:crypto");
var HISTORICAL_BOOTSTRAP_PAYLOAD_DIGEST = "sha256-canonical-json-v1";
function historicalBootstrapPayloadDigest(value) {
  return (0, import_node_crypto6.createHash)("sha256").update(canonicalJson(value)).digest("hex");
}
function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Historical bootstrap payload must contain finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) {
      throw new TypeError("Historical bootstrap payload must not contain sparse arrays");
    }
    const entries = [];
    for (let index = 0; index < value.length; index++) {
      if (!Object.hasOwn(value, index)) throw new TypeError("Historical bootstrap payload must not contain sparse arrays");
      entries.push(canonicalJson(value[index]));
    }
    return `[${entries.join(",")}]`;
  }
  if (typeof value !== "object") throw new TypeError("Historical bootstrap payload must be JSON data");
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    throw new TypeError("Historical bootstrap payload must contain JSON object records");
  }
  const data = value;
  return `{${Object.keys(data).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(data[key])}`).join(",")}}`;
}

// legacy/box3-compat/src/session/project-bootstrap.ts
var ProjectBootstrapSessions = class {
  constructor(options) {
    this.options = options;
  }
  options;
  sessions = /* @__PURE__ */ new Map();
  completedConnections = 0;
  latestCompleted;
  get size() {
    return this.sessions.size;
  }
  diagnosticsSnapshot() {
    const events = this.latestCompleted?.map((event) => ({ ...event }));
    return {
      payloadDigest: HISTORICAL_BOOTSTRAP_PAYLOAD_DIGEST,
      completedConnections: this.completedConnections,
      latestCompleted: events ? { complete: true, eventCount: events.length, events } : null
    };
  }
  beginConnection(sessionId) {
    const session = this.getOrCreate(sessionId);
    this.resetConnection(session);
  }
  connectModels(client) {
    const session = this.getOrCreate(client.sessionId);
    session.models = client;
    return this.flush(session);
  }
  connectSound(client) {
    const session = this.getOrCreate(client.sessionId);
    session.sound = client;
    return this.flush(session);
  }
  sendSoundCommand(command) {
    const recipients = [...this.sessions.values()].filter((session) => session.soundSent && session.sound);
    if (recipients.length === 0) return false;
    if (command.action === "play") {
      const sampleId = this.options.bootstrap.soundDictionary.indexOf(command.sample);
      if (sampleId < 0) throw new Error(`Sound sample is not present in the project bootstrap dictionary: ${command.sample}`);
      const payload = {
        gain: command.gain,
        pitch: command.pitch,
        radius: command.radius,
        sampleId,
        soundId: command.soundId,
        position: command.position
      };
      for (const session of recipients) session.sound.message.play(payload);
      return recipients.length;
    }
    const messageName = command.action === "setCurrentTimeAndResume" ? "setCurrentTimeAndResume" : command.action;
    for (const session of recipients) {
      if (command.action === "setCurrentTime" || command.action === "setCurrentTimeAndResume") {
        session.sound.message[messageName]({ soundId: command.soundId, currentTime: command.currentTime });
      } else {
        session.sound.message[messageName](command.soundId);
      }
    }
    return recipients.length;
  }
  connectTerrain(client) {
    const session = this.getOrCreate(client.sessionId);
    session.terrain = client;
    return this.flush(session);
  }
  connectGameUi(client) {
    const session = this.getOrCreate(client.sessionId);
    session.gameUiReady = true;
    return this.flush(session);
  }
  joinGameNet(client, afterBootstrap) {
    const session = this.getOrCreate(client.sessionId);
    session.gameNet = client;
    session.joined = true;
    if (afterBootstrap && !session.afterBootstrapSent) session.afterBootstrap = afterBootstrap;
    return this.flush(session);
  }
  delete(sessionId) {
    return this.sessions.delete(sessionId);
  }
  dispose() {
    this.sessions.clear();
  }
  getOrCreate(sessionId) {
    if (!sessionId) throw new Error("sessionId must not be empty");
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;
    const session = {
      joined: false,
      gameUiReady: !this.options.clientUiRequired,
      modelsSent: this.options.bootstrap.meshHashes.length === 0,
      skinHashesSent: this.options.bootstrap.skinHashes.length === 0,
      initialSkinPartHashesSent: skinPartBatch(this.options.bootstrap, 0).length === 0,
      soundSent: this.options.bootstrap.soundDictionary.length === 0,
      scriptsSent: Object.keys(this.options.clientScripts).length === 0,
      terrainSent: false,
      tailSkinPartHashesSent: skinPartBatch(this.options.bootstrap, 1).length === 0,
      afterBootstrapSent: false,
      diagnosticEvents: [],
      diagnosticsCompleted: false
    };
    this.sessions.set(sessionId, session);
    return session;
  }
  resetConnection(session) {
    session.gameNet = void 0;
    session.models = void 0;
    session.sound = void 0;
    session.terrain = void 0;
    session.joined = false;
    session.gameUiReady = !this.options.clientUiRequired;
    session.modelsSent = this.options.bootstrap.meshHashes.length === 0;
    session.skinHashesSent = this.options.bootstrap.skinHashes.length === 0;
    session.initialSkinPartHashesSent = skinPartBatch(this.options.bootstrap, 0).length === 0;
    session.soundSent = this.options.bootstrap.soundDictionary.length === 0;
    session.scriptsSent = Object.keys(this.options.clientScripts).length === 0;
    session.terrainSent = false;
    session.tailSkinPartHashesSent = skinPartBatch(this.options.bootstrap, 1).length === 0;
    session.afterBootstrap = void 0;
    session.afterBootstrapSent = false;
    session.diagnosticEvents = [];
    session.diagnosticsCompleted = false;
  }
  flush(session) {
    if (!session.joined || !session.gameNet || !session.terrain || !session.gameUiReady) return false;
    if (!session.modelsSent && !session.models) return false;
    if (!session.skinHashesSent && !session.models) return false;
    if (!session.initialSkinPartHashesSent && !session.models) return false;
    if (!session.tailSkinPartHashesSent && !session.models) return false;
    if (!session.soundSent && !session.sound) return false;
    if (!session.modelsSent) {
      this.send(session, session.models, "models", "appendMeshHashes", this.options.bootstrap.meshHashes.map((entry) => ({ ...entry })));
      session.modelsSent = true;
    }
    if (!session.skinHashesSent) {
      this.send(session, session.models, "models", "appendSkinHashes", this.options.bootstrap.skinHashes.map((entry) => ({
        hash: entry.hash,
        parts: { ...entry.parts }
      })));
      session.skinHashesSent = true;
    }
    if (!session.initialSkinPartHashesSent) {
      this.send(session, session.models, "models", "appendSkinPartHashes", skinPartBatch(this.options.bootstrap, 0).map((entry) => ({ ...entry })));
      session.initialSkinPartHashesSent = true;
    }
    if (!session.soundSent) {
      this.send(session, session.sound, "sound", "resetDictionary", [...this.options.bootstrap.soundDictionary]);
      session.soundSent = true;
    }
    if (!session.scriptsSent) {
      this.send(session, session.gameNet, "gameNet", "syncClientScriptModules", { ...this.options.clientScripts });
      session.scriptsSent = true;
    }
    if (!session.terrainSent) {
      this.send(session, session.terrain, "gameTerrain", "reset", this.options.world.initialTerrain());
      session.terrainSent = true;
    }
    if (!session.tailSkinPartHashesSent) {
      this.send(session, session.models, "models", "appendSkinPartHashes", skinPartBatch(this.options.bootstrap, 1).map((entry) => ({ ...entry })));
      session.tailSkinPartHashesSent = true;
    }
    if (!session.afterBootstrapSent && session.afterBootstrap) {
      session.afterBootstrap();
      session.afterBootstrapSent = true;
    }
    if (!session.diagnosticsCompleted) {
      session.diagnosticsCompleted = true;
      this.completedConnections += 1;
      this.latestCompleted = Object.freeze(session.diagnosticEvents.map((event) => Object.freeze({ ...event })));
    }
    return true;
  }
  send(session, client, protocol, name, payload) {
    const message = client.message[name];
    if (typeof message !== "function") throw new Error(`Missing ${name} bootstrap message`);
    const payloadSha256 = historicalBootstrapPayloadDigest(payload);
    message(payload);
    session.diagnosticEvents.push(Object.freeze({
      protocol,
      message: name,
      payloadSha256
    }));
  }
};
function skinPartBatch(bootstrap, index) {
  return bootstrap.skinPartHashBatches[index] ?? [];
}

// packages/project-package/src/index.ts
var import_node_crypto7 = require("node:crypto");
var import_promises6 = require("node:fs/promises");
var import_node_path8 = require("node:path");

// packages/contracts/src/index.ts
var MAX_ENTITY_BILLBOARD_WORLD_SIZE = 256;
var ENTITY_BILLBOARD_IMAGE_MIME_TYPES = Object.freeze([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml"
]);
var PLAYER_MOVE_DIRECTIONS = Object.freeze(["north", "south", "west", "east"]);
var ContractError = class extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
  code;
  details;
  name = "ContractError";
};
var ProjectValidationError = class extends ContractError {
  name = "ProjectValidationError";
  constructor(message, argumentPath) {
    super("DAO3_PROJECT_VALIDATION_FAILED", message, { argumentPath });
  }
};

// packages/math-core/src/index.ts
function vector32(x, y, z) {
  return freezeVector2(requireFinite2(x, "x"), requireFinite2(y, "y"), requireFinite2(z, "z"));
}
function requireFinite2(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}
function freezeVector2(x, y, z) {
  return Object.freeze([x, y, z]);
}

// packages/project-package/src/index.ts
var PROJECT_PACKAGE_FORMAT = "dao3-project/v1";
var MAX_ZIP_UNCOMPRESSED_BYTES = 128 * 1024 * 1024;
function validateProjectPackageManifest(value) {
  const record = requireRecord2(value, "/");
  const formatVersion = requireString(record.formatVersion, "/formatVersion");
  if (formatVersion !== PROJECT_PACKAGE_FORMAT) throw new ProjectValidationError("Unsupported project package format", "/formatVersion");
  const display = requireRecord2(record.display, "/display");
  const engine = requireRecord2(record.engine, "/engine");
  return Object.freeze({
    formatVersion: PROJECT_PACKAGE_FORMAT,
    packageId: requireIdentifier(record.packageId, "/packageId"),
    display: Object.freeze({
      name: requireText4(display.name, "/display/name", 120),
      ...display.description === void 0 ? {} : { description: requireText4(display.description, "/display/description", 4096) }
    }),
    engine: Object.freeze({
      runtimeApiVersion: requireVersion(engine.runtimeApiVersion, "/engine/runtimeApiVersion"),
      tickRate: requireTickRate(engine.tickRate)
    }),
    world: requirePackagePath(record.world, "/world"),
    assets: requirePackagePath(record.assets, "/assets"),
    scripts: requirePackagePath(record.scripts, "/scripts")
  });
}
async function validateProjectPackageDirectory(rootDirectory) {
  const root = (0, import_node_path8.resolve)(rootDirectory);
  const errors = [];
  let manifest;
  try {
    const rootInfo = await (0, import_promises6.lstat)(root);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) errors.push("Package root must be a real directory");
  } catch {
    return Object.freeze({ valid: false, errors: Object.freeze(["Package root does not exist"]) });
  }
  try {
    manifest = validateProjectPackageManifest(await readJsonFile(root, "dao3.project.json"));
  } catch (error) {
    errors.push(errorMessage(error));
  }
  if (manifest) {
    let world;
    let assets;
    try {
      world = validateProjectWorldConfig(await readJsonFile(root, manifest.world));
    } catch (error) {
      errors.push(errorMessage(error));
    }
    try {
      validateProjectScriptManifest(await readJsonFile(root, manifest.scripts));
    } catch (error) {
      errors.push(errorMessage(error));
    }
    try {
      assets = validateProjectAssetIndex(await readJsonFile(root, manifest.assets));
      await validateProjectAssetFiles(root, assets);
    } catch (error) {
      errors.push(errorMessage(error));
    }
    if (world) {
      try {
        validateProjectEntitySnapshot(await readJsonFile(root, world.entities), assets);
      } catch (error) {
        errors.push(errorMessage(error));
      }
      try {
        validateProjectTerrainSnapshot(await readJsonFile(root, world.terrain), world.shape);
      } catch (error) {
        errors.push(errorMessage(error));
      }
    }
  }
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    ...manifest ? { manifest } : {}
  });
}
async function loadProjectPackageDirectory(rootDirectory) {
  const root = (0, import_node_path8.resolve)(rootDirectory);
  const report = await validateProjectPackageDirectory(root);
  if (!report.valid || !report.manifest) {
    throw new ProjectValidationError(`Project package validation failed: ${report.errors.join("; ")}`);
  }
  const world = validateProjectWorldConfig(await readJsonFile(root, report.manifest.world));
  const assets = validateProjectAssetIndex(await readJsonFile(root, report.manifest.assets));
  await validateProjectAssetFiles(root, assets);
  return Object.freeze({
    rootDirectory: root,
    manifest: report.manifest,
    world,
    entities: validateProjectEntitySnapshot(await readJsonFile(root, world.entities), assets),
    terrain: validateProjectTerrainSnapshot(await readJsonFile(root, world.terrain), world.shape),
    assets,
    scripts: validateProjectScriptManifest(await readJsonFile(root, report.manifest.scripts))
  });
}
function validateProjectWorldConfig(value) {
  const record = requireRecord2(value, "/world");
  const shape = requireVoxelPosition(record.shape, "/world/shape", true);
  const spawn = requireVector3(record.spawn, "/world/spawn");
  if (spawn[0] < 0 || spawn[0] >= shape[0] || spawn[1] < 0 || spawn[1] >= shape[1] || spawn[2] < 0 || spawn[2] >= shape[2]) {
    throw new ProjectValidationError("World spawn is outside world shape", "/world/spawn");
  }
  return Object.freeze({
    shape,
    spawn,
    entities: requirePackagePath(record.entities, "/world/entities"),
    terrain: requirePackagePath(record.terrain, "/world/terrain")
  });
}
function validateProjectEntitySnapshot(value, assets) {
  const record = requireRecord2(value, "/entities");
  if (!Array.isArray(record.entities)) throw new ProjectValidationError("Entity snapshot requires an entities array", "/entities/entities");
  return Object.freeze(record.entities.map((item, index) => {
    const entity = requireRecord2(item, `/entities/entities/${index}`);
    const kind = requireEntityKind(entity.kind, `/entities/entities/${index}/kind`);
    const position = requireVector3(entity.position, `/entities/entities/${index}/position`);
    const tags = entity.tags === void 0 ? [] : requireTags(entity.tags, `/entities/entities/${index}/tags`);
    const visual = entity.visual === void 0 ? void 0 : requireEntityVisual(entity.visual, `/entities/entities/${index}/visual`, assets);
    return Object.freeze({ kind, position, tags: Object.freeze(tags), ...visual ? { visual } : {} });
  }));
}
function validateProjectTerrainSnapshot(value, shape) {
  const record = requireRecord2(value, "/terrain");
  if (!Array.isArray(record.voxels)) throw new ProjectValidationError("Terrain snapshot requires a voxels array", "/terrain/voxels");
  const seen = /* @__PURE__ */ new Set();
  return Object.freeze(record.voxels.map((item, index) => {
    const voxel = requireRecord2(item, `/terrain/voxels/${index}`);
    const position = requireVoxelPosition(voxel.position, `/terrain/voxels/${index}/position`, false);
    if (position[0] >= shape[0] || position[1] >= shape[1] || position[2] >= shape[2]) {
      throw new ProjectValidationError("Terrain voxel is outside world shape", `/terrain/voxels/${index}/position`);
    }
    const key = position.join(",");
    if (seen.has(key)) throw new ProjectValidationError("Terrain snapshot contains duplicate positions", `/terrain/voxels/${index}/position`);
    seen.add(key);
    return Object.freeze({
      position,
      value: Object.freeze({
        blockId: requireInteger(voxel.blockId, `/terrain/voxels/${index}/blockId`, 0, 4095),
        rotation: requireInteger(voxel.rotation ?? 0, `/terrain/voxels/${index}/rotation`, 0, 255)
      })
    });
  }));
}
function validateProjectAssetIndex(value) {
  const record = requireRecord2(value, "/assets");
  if (!Array.isArray(record.assets)) throw new ProjectValidationError("Asset index requires an assets array", "/assets/assets");
  const logicalPaths = /* @__PURE__ */ new Set();
  const sources = /* @__PURE__ */ new Set();
  const assets = record.assets.map((value2, index) => {
    const path = `/assets/assets/${index}`;
    const asset = requireRecord2(value2, path);
    const logicalPath = requirePackagePath(asset.logicalPath, `${path}/logicalPath`);
    const source = requirePackagePath(asset.source, `${path}/source`);
    if (logicalPaths.has(logicalPath)) throw new ProjectValidationError("Asset index contains duplicate logical paths", `${path}/logicalPath`);
    if (sources.has(source)) throw new ProjectValidationError("Asset index contains duplicate source files", `${path}/source`);
    logicalPaths.add(logicalPath);
    sources.add(source);
    return Object.freeze({
      logicalPath,
      source,
      sha256: requireSha2562(asset.sha256, `${path}/sha256`),
      mimeType: requireMimeType(asset.mimeType, `${path}/mimeType`),
      bytes: requireInteger(asset.bytes, `${path}/bytes`, 0, Number.MAX_SAFE_INTEGER)
    });
  });
  return Object.freeze({ assets: Object.freeze(assets) });
}
async function validateProjectAssetFiles(root, assets) {
  for (const asset of assets.assets) {
    const bytes = await readPackageFile(root, asset.source);
    if (bytes.byteLength !== asset.bytes) throw new ProjectValidationError("Asset byte length does not match index", `/assets/${asset.source}`);
    const sha256 = (0, import_node_crypto7.createHash)("sha256").update(bytes).digest("hex");
    if (sha256 !== asset.sha256) throw new ProjectValidationError("Asset digest does not match index", `/assets/${asset.source}`);
  }
}
function validateProjectScriptManifest(value) {
  const record = requireRecord2(value, "/scripts");
  const entry = record.entry;
  if (entry !== null && typeof entry !== "string") throw new ProjectValidationError("Script entry must be a string or null", "/scripts/entry");
  if (typeof entry === "string") requirePackagePath(entry, "/scripts/entry");
  if (!Array.isArray(record.modules) || record.modules.some((module2) => typeof module2 !== "string")) {
    throw new ProjectValidationError("Script modules must be an array of paths", "/scripts/modules");
  }
  const modules = record.modules.map((module2) => requirePackagePath(module2, "/scripts/modules"));
  if (record.capabilities !== void 0 && (!Array.isArray(record.capabilities) || record.capabilities.some((capability) => typeof capability !== "string"))) {
    throw new ProjectValidationError("Script capabilities must be an array of identifiers", "/scripts/capabilities");
  }
  const seenCapabilities = /* @__PURE__ */ new Set();
  const capabilities = (record.capabilities ?? []).map((capability, index) => {
    const capabilityId = requireCapabilityId(capability, `/scripts/capabilities/${index}`);
    if (seenCapabilities.has(capabilityId)) throw new ProjectValidationError("Script capabilities contain duplicates", `/scripts/capabilities/${index}`);
    seenCapabilities.add(capabilityId);
    return capabilityId;
  });
  return Object.freeze({ entry, modules: Object.freeze(modules), capabilities: Object.freeze(capabilities) });
}
async function readJsonFile(root, packagePath) {
  try {
    return JSON.parse((await readPackageFile(root, packagePath)).toString("utf8"));
  } catch {
    throw new ProjectValidationError("Package JSON file is invalid", `/${packagePath}`);
  }
}
async function readPackageFile(root, path) {
  const absolute = (0, import_node_path8.resolve)(root, path);
  if ((0, import_node_path8.relative)(root, absolute).startsWith("..")) throw new ProjectValidationError("Package file escapes root", `/${path}`);
  const info = await (0, import_promises6.lstat)(absolute);
  if (!info.isFile() || info.isSymbolicLink()) throw new ProjectValidationError("Package file must be a real regular file", `/${path}`);
  return (0, import_promises6.readFile)(absolute);
}
function requireRecord2(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProjectValidationError("Expected JSON object", path);
  return value;
}
function requireString(value, path) {
  if (typeof value !== "string") throw new ProjectValidationError("Expected string", path);
  return value;
}
function requireText4(value, path, maximumLength) {
  const text = requireString(value, path).trim();
  if (text.length < 1 || text.length > maximumLength || /[\x00-\x1f\x7f]/.test(text)) throw new ProjectValidationError("Invalid text", path);
  return text;
}
function requireIdentifier(value, path) {
  const identifier = requireString(value, path);
  if (/^[a-z0-9][a-z0-9-]{0,63}$/.test(identifier)) return identifier;
  // Real DAO3/box3 packages use CJK entity identifiers (e.g. parkour
  // checkpoints named 存档点_1).
  if (identifier.length < 1 || identifier.length > 64 || /[\x00-\x1f\x7f/\\]/.test(identifier)) {
    throw new ProjectValidationError("Invalid package identifier", path);
  }
  return identifier;
}
function requireCapabilityId(value, path) {
  const capability = requireString(value, path);
  if (!/^[a-z][a-z0-9-]{0,63}(?:\.[a-z][a-z0-9-]{0,63})*$/.test(capability)) throw new ProjectValidationError("Invalid capability identifier", path);
  return capability;
}
function requireSha2562(value, path) {
  const digest = requireString(value, path);
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new ProjectValidationError("Invalid SHA-256 digest", path);
  return digest;
}
function requireMimeType(value, path) {
  const mimeType = requireString(value, path);
  if (!/^[a-z]+\/[a-z0-9.+-]+$/i.test(mimeType)) throw new ProjectValidationError("Invalid MIME type", path);
  return mimeType.toLowerCase();
}
function requireVersion(value, path) {
  const version = requireString(value, path);
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new ProjectValidationError("Invalid runtime API version", path);
  return version;
}
function requireTickRate(value) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 120) {
    throw new ProjectValidationError("Invalid tick rate", "/engine/tickRate");
  }
  return value;
}
function requireVoxelPosition(value, path, positive) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((component) => !Number.isSafeInteger(component) || (positive ? component < 1 : component < 0))) {
    throw new ProjectValidationError("Expected voxel position", path);
  }
  return Object.freeze([value[0], value[1], value[2]]);
}
function requireVector3(value, path) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((component) => typeof component !== "number" || !Number.isFinite(component))) {
    throw new ProjectValidationError("Expected finite vector", path);
  }
  return vector32(value[0], value[1], value[2]);
}
function requireEntityKind(value, path) {
  if (value !== "player" && value !== "entity" && value !== "prop") throw new ProjectValidationError("Invalid entity kind", path);
  return value;
}
function requireEntityVisual(value, path, assets) {
  const visual = requireRecord2(value, path);
  if (visual.kind !== "billboard") throw new ProjectValidationError("Unsupported entity visual kind", `${path}/kind`);
  const assetPath = requirePackagePath(visual.assetPath, `${path}/assetPath`);
  const asset = assets?.assets.find((candidate) => candidate.logicalPath === assetPath);
  if (!asset) throw new ProjectValidationError("Entity billboard references an undeclared asset", `${path}/assetPath`);
  if (!ENTITY_BILLBOARD_IMAGE_MIME_TYPES.includes(asset.mimeType)) {
    throw new ProjectValidationError("Entity billboard asset MIME type is unsupported", `${path}/assetPath`);
  }
  if (!Array.isArray(visual.size) || visual.size.length !== 2 || visual.size.some((component) => typeof component !== "number" || !Number.isFinite(component) || component <= 0 || component > MAX_ENTITY_BILLBOARD_WORLD_SIZE)) {
    throw new ProjectValidationError("Entity billboard size is invalid", `${path}/size`);
  }
  return Object.freeze({
    kind: "billboard",
    assetPath,
    size: Object.freeze([visual.size[0], visual.size[1]])
  });
}
function requireTags(value, path) {
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== "string" || !isValidSourceTag(tag))) {
    throw new ProjectValidationError("Invalid entity tags", path);
  }
  return [...new Set(value)].sort();
}
function isValidSourceTag(tag) {
  if (/^[a-z][a-z0-9-]{0,63}$/.test(tag)) return true;
  // Real DAO3/box3 maps use CJK entity ids which the importer stores as
  // "id-<name>" tags (e.g. "id-存档点_1" parkour checkpoints).
  return tag.length > 0 && tag.length <= 64 && !/[\x00-\x1f\x7f/\\]/.test(tag);
}
function requireInteger(value, path, minimum, maximum) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new ProjectValidationError("Expected bounded integer", path);
  }
  return value;
}
function requirePackagePath(value, path) {
  const packagePath = requireString(value, path);
  if (packagePath.length > 512 || packagePath.startsWith("/") || packagePath.includes(String.fromCharCode(92))) {
    throw new ProjectValidationError("Invalid package path", path);
  }
  const segments = packagePath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new ProjectValidationError("Invalid package path", path);
  }
  return packagePath;
}
function errorMessage(error) {
  return error instanceof Error ? error.message : "Unknown package validation error";
}

// legacy/box3-compat/src/archive/block-info.ts
var import_schema4 = __toESM(require_schema(), 1);
var import_stream2 = __toESM(require_stream(), 1);

// legacy/box3-compat/src/archive/relative-array.ts
var import_schema3 = __toESM(require_schema(), 1);
var RelativeArray = class {
  muType = "relative array";
  muData;
  json;
  identity;
  arraySchema;
  capacity;
  constructor(schema, capacity, identity) {
    this.muData = schema;
    this.capacity = capacity;
    this.arraySchema = new import_schema3.MuArray(schema, capacity, identity);
    this.identity = this.arraySchema.identity;
    this.json = { type: this.muType, value: schema.json };
  }
  alloc() {
    return this.arraySchema.alloc();
  }
  free(value) {
    this.arraySchema.free(value);
  }
  equal(a, b) {
    return this.arraySchema.equal(a, b);
  }
  clone(value) {
    return this.arraySchema.clone(value);
  }
  assign(destination, source) {
    return this.arraySchema.assign(destination, source);
  }
  toJSON(value) {
    return this.arraySchema.toJSON(value);
  }
  fromJSON(json) {
    return this.arraySchema.fromJSON(json);
  }
  diff(base, target, output) {
    const head = output.offset;
    const length = target.length;
    const trackerBytes = Math.ceil(length / 8);
    output.grow(4 + trackerBytes);
    output.writeUint32(length);
    let trackerOffset = output.offset;
    output.offset += trackerBytes;
    let tracker = 0;
    let patches = 0;
    let previous = base.length > 0 ? base[0] : this.muData.identity;
    for (let index = 0; index < length; index++) {
      if (this.muData.diff(previous, target[index], output)) {
        tracker |= 1 << (index & 7);
        patches++;
      }
      if ((index & 7) === 7) {
        output.writeUint8At(trackerOffset++, tracker);
        tracker = 0;
      }
      previous = target[index];
    }
    if (length & 7) output.writeUint8At(trackerOffset, tracker);
    if (patches > 0 || base.length !== length) return true;
    output.offset = head;
    return false;
  }
  patch(base, input2) {
    const result = this.clone(base);
    const length = input2.readUint32();
    if (length > this.capacity) throw new RangeError(`target length ${length} exceeds capacity ${this.capacity}`);
    result.length = length;
    let trackerOffset = input2.offset;
    input2.offset += Math.ceil(length / 8);
    input2.checkBounds();
    let tracker = 0;
    let previous = base.length > 0 ? base[0] : this.muData.identity;
    for (let index = 0; index < length; index++) {
      const bit = index & 7;
      if (bit === 0) tracker = input2.readUint8At(trackerOffset++);
      result[index] = tracker & 1 << bit ? this.muData.patch(previous, input2) : this.muData.clone(previous);
      previous = result[index];
    }
    return result;
  }
};

// legacy/box3-compat/src/archive/block-info.ts
var unlimited = Number.POSITIVE_INFINITY;
var hashSchema = new import_schema4.MuASCII();
var blockInfoSchema = new import_schema4.MuStruct({
  ids: new RelativeArray(new import_schema4.MuRelativeVarint(), unlimited, [0]),
  names: new import_schema4.MuArray(new import_schema4.MuUTF8(), unlimited, ["air"]),
  emissive: new RelativeArray(new import_schema4.MuVarint(), unlimited, [0]),
  texture: new RelativeArray(new import_schema4.MuRelativeVarint(), unlimited, [0, 0, 0, 0, 0, 0]),
  animLength: new RelativeArray(new import_schema4.MuVarint(1), unlimited, [1, 1, 1, 1, 1, 1]),
  friction: new RelativeArray(new import_schema4.MuQuantizedFloat(1 / 256, 1), unlimited, [0]),
  restitution: new RelativeArray(new import_schema4.MuQuantizedFloat(1 / 256, 0), unlimited, [0]),
  velocity: new RelativeArray(new import_schema4.MuFloat32(0), unlimited, [0, 0, 0]),
  fluids: new import_schema4.MuArray(new import_schema4.MuStruct({
    id: new import_schema4.MuVarint(),
    info: new import_schema4.MuUint32(),
    mass: new import_schema4.MuFloat64(1)
  }), unlimited, [{ id: 0, info: 0, mass: 0 }]),
  category: new import_schema4.MuDictionary(
    new RelativeArray(new import_schema4.MuRelativeVarint(), unlimited),
    unlimited,
    { default: [0] }
  ),
  atlasRadius: new import_schema4.MuVarint(16),
  blockBumpShift: new import_schema4.MuVarint(6),
  blockColorShift: new import_schema4.MuVarint(4),
  colorAtlas: new import_schema4.MuArray(hashSchema, unlimited),
  materialAtlas: new import_schema4.MuArray(hashSchema, unlimited),
  bumpAtlas: new import_schema4.MuArray(hashSchema, unlimited)
});
function decodeBlockInfo(bytes) {
  const input2 = new import_stream2.MuReadStream(bytes);
  const value = blockInfoSchema.patch(blockInfoSchema.identity, input2);
  if (input2.offset !== input2.length) {
    throw new Error(`Block info has ${input2.length - input2.offset} trailing bytes`);
  }
  validateBlockInfo(value);
  return { value, bytesRead: input2.offset };
}
function validateBlockInfo(value) {
  const count = value.ids.length;
  const sameLength = [value.names, value.emissive, value.friction, value.restitution];
  if (sameLength.some((items) => items.length !== count)) {
    throw new Error("Block info parallel arrays have inconsistent lengths");
  }
  if (value.texture.length !== count * 6 || value.animLength.length !== count * 6) {
    throw new Error("Block info face arrays must contain six entries per block");
  }
  if (value.velocity.length !== count * 3) {
    throw new Error("Block info velocity array must contain three entries per block");
  }
  const seen = /* @__PURE__ */ new Set();
  for (const id of value.ids) {
    if (!Number.isInteger(id) || id < 0 || id > 4095) throw new Error(`Invalid block id: ${id}`);
    if (seen.has(id)) throw new Error(`Duplicate block id: ${id}`);
    seen.add(id);
  }
}

// legacy/box3-compat/src/world/contracts.ts
function compareTerrainBoxes(a, b) {
  return a.minZ - b.minZ || a.minY - b.minY || a.minX - b.minX || a.maxX - b.maxX || a.maxY - b.maxY || a.maxZ - b.maxZ || a.block - b.block || a.faces - b.faces;
}
function normalizeChunkIds(values, chunkCount) {
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  for (const value of values) {
    if (!Number.isInteger(value) || value < 0 || value >= chunkCount || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (result.length === chunkCount) break;
  }
  return result;
}

// legacy/box3-compat/src/world/empty-world.ts
var PRESERVED_BLOCK_INFO_HASH = "QmW2E9E8ipYUifsCfkMj5SULYMYbFQvP6BQxo52atXw7Zj";
var EmptyWorld = class {
  kind = "empty";
  initialTerrain() {
    return {
      positionX: 16,
      positionY: 8,
      positionZ: 16,
      resetCounter: 1,
      nx: 32,
      ny: 32,
      nz: 32,
      innerAO: false,
      blocks: PRESERVED_BLOCK_INFO_HASH,
      hashes: [""]
    };
  }
  voxelAt(x, y, z) {
    if (!isVoxelCoordinate2(x) || !isVoxelCoordinate2(y) || !isVoxelCoordinate2(z)) return void 0;
    return 0;
  }
  collisionBoxes(_chunkId) {
    return [];
  }
  hashes(request) {
    return {
      startI: request.startI,
      startJ: request.startJ,
      startK: request.startK,
      chunksInfo: [],
      dirtyChunks: normalizeChunkIds(request.dirtyChunks, 1)
    };
  }
};
function isVoxelCoordinate2(value) {
  return Number.isInteger(value) && value >= 0 && value < 32;
}

// legacy/box3-compat/src/world/project-package-world.ts
var chunkSize = 32;
var maxMutableDimension = 1024;
var maxBlockId2 = 4095;
var maxLegacyRotation = 3;
var maxUint324 = 4294967295;
var blockInfoCidPattern = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
var worldFactoryToken = /* @__PURE__ */ Symbol("ProjectPackageCompatibilityWorld");
var worldSnapshots = /* @__PURE__ */ new WeakMap();
function projectPackageCompatibilityWorldSnapshot(value) {
  return value !== null && typeof value === "object" ? worldSnapshots.get(value) : void 0;
}
async function loadProjectPackageCompatibilityWorld(projectRoot, assetRoot, options = {}) {
  return ProjectPackageCompatibilityWorldInstance.load(projectRoot, assetRoot, options);
}
var ProjectPackageCompatibilityWorldInstance = class _ProjectPackageCompatibilityWorldInstance {
  kind = "project-package-v1";
  gameplayMode = "base";
  project;
  shape;
  spawn;
  chunkShape;
  chunkHashes;
  voxelChunks = /* @__PURE__ */ new Map();
  chunkBoxes = /* @__PURE__ */ new Map();
  usedBlockIds = /* @__PURE__ */ new Set();
  blocks;
  innerAO;
  resetCounter;
  static async load(projectRoot, assetRoot, options = {}) {
    const project = await loadProjectPackageDirectory(projectRoot);
    const blocks = options.blocks ?? PRESERVED_BLOCK_INFO_HASH;
    if (!blockInfoCidPattern.test(blocks)) throw new Error("Compatibility block catalog must be a CIDv0");
    const assetStore = new FileArchiveAssetStore(assetRoot);
    const blockInfoAsset = await assetStore.get("block", blocks);
    if (!blockInfoAsset) throw new Error(`Compatibility block catalog is unavailable: ${blocks}`);
    const blockInfo = decodeBlockInfo(blockInfoAsset.bytes).value;
    const atlasFiles = /* @__PURE__ */ new Set([...blockInfo.colorAtlas, ...blockInfo.materialAtlas, ...blockInfo.bumpAtlas]);
    await Promise.all([...atlasFiles].map(async (filename) => {
      if (!await assetStore.get("block", filename)) throw new Error(`Compatibility block atlas is unavailable: ${filename}`);
    }));
    const world = Object.freeze(new _ProjectPackageCompatibilityWorldInstance(
      worldFactoryToken,
      project,
      options,
      new Set(blockInfo.ids)
    ));
    worldSnapshots.set(world, project);
    return world;
  }
  constructor(factoryToken, project, options, blockIds) {
    if (factoryToken !== worldFactoryToken) {
      throw new TypeError("ProjectPackageCompatibilityWorld instances must be created by loadProjectPackageCompatibilityWorld");
    }
    this.project = project;
    const shape = normalizeShape(project.world.shape);
    const spawn = normalizeSpawn2(project.world.spawn, shape);
    const blocks = options.blocks ?? PRESERVED_BLOCK_INFO_HASH;
    if (!blockInfoCidPattern.test(blocks)) throw new Error("Compatibility block catalog must be a CIDv0");
    const resetCounter = options.resetCounter ?? 1;
    if (!Number.isInteger(resetCounter) || resetCounter < 0 || resetCounter > maxUint324) {
      throw new RangeError("Compatibility terrain reset counter is outside uint32 range");
    }
    if (options.innerAO !== void 0 && typeof options.innerAO !== "boolean") {
      throw new TypeError("Compatibility terrain innerAO must be boolean");
    }
    this.shape = shape;
    this.spawn = spawn;
    this.chunkShape = [shape[0] / chunkSize, shape[1] / chunkSize, shape[2] / chunkSize];
    this.chunkHashes = new Array(this.chunkCount).fill("");
    this.blocks = blocks;
    this.innerAO = options.innerAO ?? false;
    this.resetCounter = resetCounter;
    this.loadTerrain(project);
    this.assertBlockCatalog(blockIds);
  }
  initialTerrain() {
    return {
      positionX: this.spawn[0],
      positionY: this.spawn[1],
      positionZ: this.spawn[2],
      resetCounter: this.resetCounter,
      nx: this.shape[0],
      ny: this.shape[1],
      nz: this.shape[2],
      innerAO: this.innerAO,
      blocks: this.blocks,
      hashes: this.chunkHashes.slice()
    };
  }
  voxelAt(x, y, z) {
    if (!this.contains(x, y, z)) return void 0;
    const cells = this.voxelChunks.get(this.chunkIdFor(x, y, z));
    return cells ? cells[chunkCellIndex(x & 31, y & 31, z & 31)] : 0;
  }
  collisionBoxes(chunkId) {
    if (!Number.isInteger(chunkId) || chunkId < 0 || chunkId >= this.chunkCount) return [];
    const boxes = this.chunkBoxes.get(chunkId) ?? this.createChunkBoxes(chunkId);
    return boxes.map((box) => ({ ...box }));
  }
  hashes(request) {
    const chunkIds = normalizeChunkIds(request.chunkIds, this.chunkCount);
    return {
      startI: request.startI,
      startJ: request.startJ,
      startK: request.startK,
      chunksInfo: chunkIds.map((idx) => ({ idx, hash: this.chunkHashes[idx] })),
      dirtyChunks: normalizeChunkIds(request.dirtyChunks, this.chunkCount)
    };
  }
  assertBlockCatalog(blockIds) {
    for (const blockId of this.usedBlockIds) {
      if (!blockIds.has(blockId)) throw new Error(`Project package block ID is absent from the compatibility block catalog: ${blockId}`);
    }
  }
  get chunkCount() {
    return this.chunkShape[0] * this.chunkShape[1] * this.chunkShape[2];
  }
  loadTerrain(project) {
    const seen = /* @__PURE__ */ new Set();
    for (const voxel of project.terrain) {
      const [x, y, z] = normalizeVoxelPosition(voxel.position, this.shape);
      const key = `${x},${y},${z}`;
      if (seen.has(key)) throw new Error(`Project package terrain contains duplicate position: ${key}`);
      seen.add(key);
      const blockId = voxel.value.blockId;
      const rotation = voxel.value.rotation;
      if (!Number.isInteger(blockId) || blockId < 0 || blockId > maxBlockId2) {
        throw new RangeError(`Project package block ID is outside compatibility range at ${key}`);
      }
      if (blockId === 0) continue;
      if (!Number.isInteger(rotation) || rotation < 0 || rotation > maxLegacyRotation) {
        throw new RangeError(`Project package rotation cannot be represented by the recovered Player at ${key}`);
      }
      this.usedBlockIds.add(blockId);
      const chunkId = this.chunkIdFor(x, y, z);
      let cells = this.voxelChunks.get(chunkId);
      if (!cells) {
        cells = new Uint16Array(chunkSize ** 3);
        this.voxelChunks.set(chunkId, cells);
      }
      cells[chunkCellIndex(x & 31, y & 31, z & 31)] = blockId | rotation << 14;
    }
  }
  createChunkBoxes(chunkId) {
    const cells = this.voxelChunks.get(chunkId);
    const boxes = cells ? buildChunkBoxes(cells.slice()) : [];
    const immutable = Object.freeze(boxes.map((box) => Object.freeze(box)));
    this.chunkBoxes.set(chunkId, immutable);
    return immutable;
  }
  contains(x, y, z) {
    return Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) && x >= 0 && y >= 0 && z >= 0 && x < this.shape[0] && y < this.shape[1] && z < this.shape[2];
  }
  chunkIdFor(x, y, z) {
    const chunkX = Math.floor(x / chunkSize);
    const chunkY = Math.floor(y / chunkSize);
    const chunkZ = Math.floor(z / chunkSize);
    return chunkX + this.chunkShape[0] * (chunkY + this.chunkShape[1] * chunkZ);
  }
};
function normalizeShape(value) {
  if (value.length !== 3 || value.some((component) => !Number.isSafeInteger(component) || component < chunkSize || component > maxMutableDimension)) {
    throw new RangeError(`Recovered Player compatibility requires terrain dimensions between ${chunkSize} and ${maxMutableDimension}`);
  }
  if (value.some((component) => component % chunkSize !== 0)) {
    throw new Error("Recovered Player compatibility requires terrain dimensions divisible by 32");
  }
  return Object.freeze([value[0], value[1], value[2]]);
}
function normalizeSpawn2(value, shape) {
  if (value.length !== 3 || value.some((component) => !Number.isFinite(component)) || value[0] < 0 || value[0] >= shape[0] || value[1] < 0 || value[1] >= shape[1] || value[2] < 0 || value[2] >= shape[2]) {
    throw new RangeError("Project package spawn is outside compatibility terrain bounds");
  }
  return Object.freeze([value[0], value[1], value[2]]);
}
function normalizeVoxelPosition(value, shape) {
  if (value.length !== 3 || value.some((component) => !Number.isSafeInteger(component)) || value[0] < 0 || value[0] >= shape[0] || value[1] < 0 || value[1] >= shape[1] || value[2] < 0 || value[2] >= shape[2]) {
    throw new RangeError("Project package terrain voxel is outside compatibility terrain bounds");
  }
  return [value[0], value[1], value[2]];
}
function buildChunkBoxes(cells) {
  const boxes = [];
  for (let z = 0; z < chunkSize; z++) {
    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        const block = cells[chunkCellIndex(x, y, z)];
        if (block === 0) continue;
        let maxX = x + 1;
        while (maxX < chunkSize && cells[chunkCellIndex(maxX, y, z)] === block) maxX += 1;
        let maxY = y + 1;
        while (maxY < chunkSize && rectangleHasBlock(cells, x, maxX, maxY, maxY + 1, z, z + 1, block)) {
          maxY += 1;
        }
        let maxZ = z + 1;
        while (maxZ < chunkSize && rectangleHasBlock(cells, x, maxX, y, maxY, maxZ, maxZ + 1, block)) {
          maxZ += 1;
        }
        for (let fillZ = z; fillZ < maxZ; fillZ++) {
          for (let fillY = y; fillY < maxY; fillY++) {
            for (let fillX = x; fillX < maxX; fillX++) cells[chunkCellIndex(fillX, fillY, fillZ)] = 0;
          }
        }
        boxes.push({ minX: x, minY: y, minZ: z, maxX, maxY, maxZ, block, faces: 0 });
      }
    }
  }
  boxes.sort(compareTerrainBoxes);
  return boxes;
}
function rectangleHasBlock(cells, minX, maxX, minY, maxY, minZ, maxZ, block) {
  for (let z = minZ; z < maxZ; z++) {
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        if (cells[chunkCellIndex(x, y, z)] !== block) return false;
      }
    }
  }
  return true;
}
function chunkCellIndex(x, y, z) {
  return x + (y << 5) + (z << 10);
}

// legacy/box3-compat/src/app/legacy-historical-project-instance.ts
var LegacyHistoricalProjectInstance = class {
  constructor(options) {
    this.options = options;
    const terrain = options.world.initialTerrain();
    this.gameClock = new GameClock();
    this.gameRuntime = new AuthoritativeGameRuntime({ gameClock: this.gameClock });
    this.legacyProjectMount = mountLegacyProjectForInstance(options, this.gameRuntime);
    this.projectPackagePlayerProjectionMount = mountProjectPackagePlayerProjectionForInstance(options, this.gameRuntime);
    this.projectPackagePlayerProjection = options.projectPackagePlayerProjection?.projection;
    this.gameNetPublicSessions = new GameNetPublicSessions({ gameClock: this.gameClock, runtime: this.gameRuntime });
    this.mutableTerrain = new MutableArchiveWorld(terrain, options.world);
    this.terrainSessions = new TerrainSessions();
    this.dialogSessions = new DialogSessions();
    this.guiSessions = new GuiSessions();
    this.gameChatSessions = new GameChatSessions();
    this.playerProtocolSessions = new PlayerProtocolSessions();
    this.refSessions = new RefSessions();
    this.remoteChannelSessions = new RemoteChannelSessions();
    const legacyGameplayDisabled = process.env.BOX3_DISABLE_LEGACY_GAMEPLAY === "1";
    const bedwarsEnabled = !legacyGameplayDisabled && (options.world.gameplayMode !== "base" || process.env.BOX3_ENABLE_REMOTE_SESSIONS === "1");
    this.bedwarsMatch = bedwarsEnabled ? new BedwarsMatch() : void 0;
    this.bedwarsRemoteSessions = this.bedwarsMatch ? new BedwarsRemoteSessions({ match: this.bedwarsMatch }) : void 0;
    this.forgeResources = this.bedwarsMatch && this.bedwarsRemoteSessions ? new ForgeResourceService({
      match: this.bedwarsMatch,
      runtime: this.gameRuntime,
      grantItem: (sessionId, item, count) => this.bedwarsRemoteSessions.grantItem(sessionId, item, count)
    }) : void 0;
    this.terrainInteraction = new TerrainInteractionService({
      terrain: this.mutableTerrain,
      terrainSessions: this.terrainSessions,
      ...this.bedwarsMatch && this.bedwarsRemoteSessions ? {
        match: this.bedwarsMatch,
        onMatchChanged: () => this.bedwarsRemoteSessions.syncMatch(),
        selectedPlacement: (sessionId) => this.bedwarsRemoteSessions.selectedPlacement(sessionId),
        consumePlacement: (sessionId, item) => this.bedwarsRemoteSessions.consumeSelectedPlacement(sessionId, item),
        openInventory: (sessionId, type) => {
          this.bedwarsRemoteSessions.openInventory(sessionId, type);
        }
      } : {}
    });
    this.gameNetHandshakes = new GameNetHandshakeSessions({
      currentTick: () => this.gameClock.currentTick(),
      initialSpawn: [terrain.positionX, terrain.positionY, terrain.positionZ],
      bodyHalfExtents: options.playerBodyProfile?.boundsHalfExtents ?? options.playerBodyProfile?.halfExtents ?? [1, 1, 1],
      bodyShapeHalfExtents: options.playerBodyProfile?.shapeHalfExtents ?? options.playerBodyProfile?.halfExtents ?? [1, 1, 1],
      ...this.bedwarsMatch ? { spawnForSession: (sessionId) => this.bedwarsMatch.spawnFor(sessionId) } : {}
    });
    this.keyboardInteraction = new KeyboardInteractionService({
      playerIdForSession: (sessionId) => this.gameNetHandshakes.get(sessionId)?.playerId,
      onKeyPress: (sessionId, keyCode) => {
        this.bedwarsRemoteSessions?.handleKeyPress(sessionId, keyCode);
      },
      onTransitions: (sessionId, transitions) => {
        if (process.env.BOX3_LOG_SCRIPT_INPUT_EVENTS === "1") {
          options.logger.info(`[game-net:keyboard] ${sessionBridgeLabel(sessionId)} ${JSON.stringify(transitions)}`);
        }
      }
    });
    this.projectBootstrapSessions = new ProjectBootstrapSessions({
      bootstrap: options.projectBootstrap,
      clientScripts: options.clientScripts,
      clientUiRequired: Boolean(options.clientUiState),
      world: options.world
    });
    this.protocolContext = {
      clientScripts: options.clientScripts,
      clientUiState: options.clientUiState,
      remoteChannelSessions: this.remoteChannelSessions,
      bedwarsRemoteSessions: this.bedwarsRemoteSessions,
      dialogSessions: this.dialogSessions,
      guiSessions: this.guiSessions,
      gameChatSessions: this.gameChatSessions,
      playerProtocolSessions: this.playerProtocolSessions,
      refSessions: this.refSessions,
      gameClock: this.gameClock,
      gameNetHandshakes: this.gameNetHandshakes,
      gameNetPublicSessions: this.gameNetPublicSessions,
      mutableTerrain: this.mutableTerrain,
      terrainInteraction: this.terrainInteraction,
      keyboardInteraction: this.keyboardInteraction,
      terrainSessions: this.terrainSessions,
      issuedSessions: options.issuedSessions,
      logger: options.logger,
      projectBootstrapSessions: this.projectBootstrapSessions,
      stats: options.stats,
      world: options.world
    };
  }
  options;
  gameClock;
  gameRuntime;
  legacyProjectMount;
  projectPackagePlayerProjectionMount;
  projectPackagePlayerProjection;
  gameNetPublicSessions;
  mutableTerrain;
  terrainSessions;
  dialogSessions;
  guiSessions;
  gameChatSessions;
  playerProtocolSessions;
  refSessions;
  remoteChannelSessions;
  bedwarsMatch;
  bedwarsRemoteSessions;
  terrainInteraction;
  gameNetHandshakes;
  keyboardInteraction;
  forgeResources;
  projectBootstrapSessions;
  protocolContext;
  disposed = false;
  playerRuntimeState(sessionLabel) {
    const frame = this.gameRuntime.snapshot();
    const player = frame.players.find((candidate) => matchesSessionLabel(candidate.sessionId, sessionLabel));
    if (!player) return void 0;
    return { tick: frame.tick, playerId: player.playerId, position: player.position, velocity: player.velocity, bodyHalfExtents: player.bodyHalfExtents, bodyShapeHalfExtents: player.bodyShapeHalfExtents, ...neaPlayerPublicState(player) };
  }
  queuePlayerRuntimeState(sessionLabel, state) {
    const frame = this.gameRuntime.snapshot();
    const player = frame.players.find((candidate) => matchesSessionLabel(candidate.sessionId, sessionLabel));
    if (!player) return false;
    return this.gameRuntime.enqueueInput(player.sessionId, {
      kind: "temporary-legacy-position-transform",
      position: state.position ?? player.position,
      velocity: state.velocity ?? player.velocity,
      ...neaPlayerPublicState(state)
    });
  }
  kickPlayer(sessionLabel) {
    return this.gameNetPublicSessions.kick(sessionLabel);
  }
  linkPlayer(sessionLabel, href, options) {
    return this.refSessions.open(sessionLabel, href, options);
  }
  queueDamageRuntimeState(target, state, events) {
    const frame = this.gameRuntime.snapshot();
    let entityId = target.entityId;
    if (target.sessionLabel !== void 0) {
      const player = frame.players.find((candidate) => matchesSessionLabel(candidate.sessionId, target.sessionLabel));
      if (!player) return false;
      entityId = player.playerId;
    }
    if (!Number.isSafeInteger(entityId) || entityId < 1) return false;
    return this.gameNetPublicSessions.updateDamage(entityId, state, events);
  }
  destroyRuntimeEntity(entityId) {
    if (!Number.isSafeInteger(entityId) || entityId < 1) return false;
    return this.gameNetPublicSessions.destroyEntity(entityId);
  }
  createRuntimeEntity(entity) {
    if (!entity || typeof entity !== "object" || Array.isArray(entity) || typeof entity.mesh !== "string") return void 0;
    const projection = this.projectPackagePlayerProjection;
    if (!isProjectPackagePlayerProjection(projection)) return void 0;
    const mesh = projection.resolveRuntimeMesh(entity.mesh);
    if (!mesh) return void 0;
    return this.gameRuntime.spawnEntity({
      kind: "object",
      position: entity.position,
      ...entity.velocity === void 0 ? {} : { velocity: entity.velocity },
      ...entity.name === void 0 ? {} : { name: entity.name },
      ...entity.tags === void 0 ? {} : { tags: entity.tags },
      ...entity.enableInteract === void 0 ? {} : { interactable: entity.enableInteract },
      replica: {
        body: {
          bounds: entity.bounds ?? mesh.bounds,
          ...entity.meshOrientation === void 0 ? {} : { orientation: entity.meshOrientation },
          ...entity.collides === void 0 ? {} : { collides: entity.collides },
          ...entity.fixed === void 0 ? {} : { fixed: entity.fixed },
          ...entity.gravity === void 0 ? {} : { gravity: entity.gravity },
          ...entity.mass === void 0 ? {} : { mass: entity.mass },
          ...entity.friction === void 0 ? {} : { friction: entity.friction },
          ...entity.restitution === void 0 ? {} : { restitution: entity.restitution }
        },
        model: {
          meshId: mesh.meshId,
          ...entity.meshInvisible === void 0 ? {} : { invisible: entity.meshInvisible },
          ...entity.meshColor === void 0 ? {} : { color: entity.meshColor },
          ...entity.meshScale === void 0 ? {} : { scale: entity.meshScale },
          ...entity.meshOffset === void 0 ? {} : { offset: entity.meshOffset },
          ...entity.meshEmissive === void 0 ? {} : { emissive: entity.meshEmissive },
          ...entity.meshShininess === void 0 ? {} : { shininess: entity.meshShininess },
          ...entity.meshMetalness === void 0 ? {} : { metalness: entity.meshMetalness }
        },
        ...entity.nameplate === null || entity.nameplate === void 0 ? {} : { nameplate: entity.nameplate }
      }
    });
  }
  queueRuntimeEntityState(entityId, state) {
    if (!Number.isSafeInteger(entityId) || entityId < 1) return false;
    return this.gameRuntime.updateEntityTransform(entityId, state) !== void 0;
  }
  /** Starts services whose timers must begin only after the gateway is listening. */
  start() {
    this.forgeResources?.start();
  }
  /** Applies the existing per-SID cleanup order for this project instance. */
  expireSession(sessionId) {
    this.gameNetHandshakes.delete(sessionId);
    this.gameNetPublicSessions.delete(sessionId);
    this.terrainSessions.delete(sessionId);
    this.remoteChannelSessions.delete(sessionId);
    this.bedwarsRemoteSessions?.delete(sessionId);
    this.dialogSessions.delete(sessionId);
    this.guiSessions.delete(sessionId);
    this.gameChatSessions.delete(sessionId);
    this.playerProtocolSessions.delete(sessionId);
    this.refSessions.delete(sessionId);
    this.projectBootstrapSessions.delete(sessionId);
  }
  sendGlobalNotice(sessionId, notice) {
    return this.gameChatSessions.sendGlobalNotice(sessionId, notice);
  }
  sendChatMessage(sessionId, message) {
    return sessionId === void 0 ? this.gameChatSessions.broadcastLog(message) : this.gameChatSessions.sendLog(sessionId, message);
  }
  sendChatMessages(deliveries) {
    if (!Array.isArray(deliveries)) throw new TypeError("chat deliveries must be an array");
    let delivered = 0;
    for (const delivery of deliveries) {
      if (!delivery || typeof delivery !== "object" || Array.isArray(delivery)) throw new TypeError("chat delivery must be an object");
      if (delivery.session !== void 0 && typeof delivery.session !== "string") throw new TypeError("chat session must be a string");
      const count = this.sendChatMessage(delivery.session, delivery.message);
      delivered += delivery.session === void 0 ? count : count === false ? 0 : 1;
    }
    return delivered;
  }
  openUserProfile(sessionId, userId) {
    return this.playerProtocolSessions.openUserProfile(sessionId, userId);
  }
  /**
   * Preserves the legacy gateway's teardown order for instance-owned state.
   * Admission remains gateway-owned and is disposed between chat and profile state.
   */
  dispose(afterGameChat) {
    if (this.disposed) return;
    this.disposed = true;
    this.gameNetHandshakes.dispose();
    this.gameNetPublicSessions.dispose();
    this.projectPackagePlayerProjectionMount?.dispose();
    this.legacyProjectMount?.dispose();
    this.gameRuntime.dispose();
    this.terrainSessions.dispose();
    this.forgeResources?.dispose();
    this.remoteChannelSessions.dispose();
    this.bedwarsRemoteSessions?.dispose();
    this.dialogSessions.dispose();
    this.guiSessions.dispose();
    this.gameChatSessions.dispose();
    try {
      afterGameChat?.();
    } finally {
      this.playerProtocolSessions.dispose();
      this.refSessions.dispose();
      this.projectBootstrapSessions.dispose();
    }
  }
};
function mountLegacyProjectForInstance(options, runtime) {
  const legacyProject = options.legacyProject;
  if (!legacyProject) return void 0;
  if (!legacyProject.meshRegistry.matchesBootstrap(options.projectBootstrap)) {
    throw new Error("Legacy project mesh registry is incompatible with the configured project bootstrap");
  }
  return mountLegacyProject({
    project: legacyProject.project,
    resolveMesh: legacyProject.meshRegistry.resolveMesh,
    runtime
  });
}
function mountProjectPackagePlayerProjectionForInstance(options, runtime) {
  const projectionOptions = options.projectPackagePlayerProjection;
  if (!projectionOptions) return void 0;
  const projection = projectionOptions.projection;
  const project = projectPackageCompatibilityWorldSnapshot(options.world);
  if (!project) {
    throw new Error("Local Player entity projection requires a v1 project-package compatibility world");
  }
  if (!isProjectPackagePlayerProjection(projection)) {
    throw new Error("Local Player entity projection must be created by the validated projection factory");
  }
  if (!isProjectPackagePlayerProjectionBoundToProject(projection, project)) {
    throw new Error("Local Player entity projection is not bound to the loaded v1 package");
  }
  if (!projection.matchesBootstrap(options.projectBootstrap)) {
    throw new Error("Local Player entity projection is incompatible with the configured project bootstrap");
  }
  return mountProjectPackagePlayerProjection(projection, runtime);
}

// legacy/box3-compat/src/observability/logger.ts
function createConsoleLogger() {
  return {
    info: (message) => console.log(message),
    log: (message) => console.log(message),
    error: (message) => console.error(message),
    exception: (error) => console.error(error)
  };
}

// legacy/box3-compat/src/observability/server-stats.ts
var ServerStats = class {
  startedAt = (/* @__PURE__ */ new Date()).toISOString();
  sessions = /* @__PURE__ */ new Set();
  totalConnections = 0;
  messageCount = 0;
  byProtocol = {};
  byMessage = {};
  connect(sessionId) {
    if (!this.sessions.has(sessionId)) this.totalConnections += 1;
    this.sessions.add(sessionId);
  }
  disconnect(sessionId) {
    this.sessions.delete(sessionId);
  }
  record(protocol, message) {
    this.messageCount += 1;
    this.byProtocol[protocol] = (this.byProtocol[protocol] ?? 0) + 1;
    const key = `${protocol}.${message}`;
    this.byMessage[key] = (this.byMessage[key] ?? 0) + 1;
  }
  snapshot() {
    return {
      startedAt: this.startedAt,
      activeSessions: this.sessions.size,
      totalConnections: this.totalConnections,
      messages: this.messageCount,
      byProtocol: { ...this.byProtocol },
      byMessage: { ...this.byMessage }
    };
  }
};

// legacy/box3-compat/src/wire/protocols.ts
var import_schema5 = __toESM(require_schema(), 1);

// legacy/box3-compat/src/wire/custom-schema.ts
var SCHROEPPEL2 = 2863311530;
function encodeRelative2(delta) {
  return (SCHROEPPEL2 + delta ^ SCHROEPPEL2) >>> 0;
}
function decodeRelative2(encoded) {
  return (SCHROEPPEL2 ^ encoded) - SCHROEPPEL2 >> 0;
}
var MuQuantizedVec3 = class {
  muType = "quantized-vec3";
  precision;
  invPrecision;
  identity;
  muData;
  json;
  constructor(precision, identity) {
    this.precision = precision;
    this.invPrecision = 1 / precision;
    this.identity = identity ? [
      Math.round(1 / precision * identity[0]) * precision,
      Math.round(1 / precision * identity[1]) * precision,
      Math.round(1 / precision * identity[2]) * precision
    ] : [0, 0, 0];
    this.muData = {
      type: "quantized-vec3",
      precision: this.precision,
      identity: [this.identity[0], this.identity[1], this.identity[2]]
    };
    this.json = this.muData;
  }
  alloc() {
    return [0, 0, 0];
  }
  free(_v) {
  }
  clone(v) {
    return [v[0], v[1], v[2]];
  }
  assign(dst, src) {
    const inv = this.invPrecision;
    const prec = this.precision;
    dst[0] = (Math.round(inv * src[0]) >> 0) * prec;
    dst[1] = (Math.round(inv * src[1]) >> 0) * prec;
    dst[2] = (Math.round(inv * src[2]) >> 0) * prec;
    return dst;
  }
  equal(a, b) {
    const inv = this.invPrecision;
    return Math.round(inv * a[0]) >> 0 === Math.round(inv * b[0]) >> 0 && Math.round(inv * a[1]) >> 0 === Math.round(inv * b[1]) >> 0 && Math.round(inv * a[2]) >> 0 === Math.round(inv * b[2]) >> 0;
  }
  toJSON(v) {
    const inv = this.invPrecision;
    const prec = this.precision;
    return [
      (Math.round(inv * v[0]) >> 0) * prec,
      (Math.round(inv * v[1]) >> 0) * prec,
      (Math.round(inv * v[2]) >> 0) * prec
    ];
  }
  fromJSON(json) {
    if (Array.isArray(json) && json.length === 3 && typeof json[0] === "number") {
      return this.clone(json);
    }
    return this.clone(this.identity);
  }
  diff(base, target, out) {
    const inv = this.invPrecision;
    const qb0 = Math.round(inv * base[0]) >> 0;
    const qb1 = Math.round(inv * base[1]) >> 0;
    const qb2 = Math.round(inv * base[2]) >> 0;
    const qt0 = Math.round(inv * target[0]) >> 0;
    const qt1 = Math.round(inv * target[1]) >> 0;
    const qt2 = Math.round(inv * target[2]) >> 0;
    if (qb0 === qt0 && qb1 === qt1 && qb2 === qt2) {
      return false;
    }
    const magic = 2863311530;
    const d0 = (magic + (qt0 - qb0) ^ magic) >>> 0;
    const d1 = (magic + (qt1 - qb1) ^ magic) >>> 0;
    const d2 = (magic + (qt2 - qb2) ^ magic) >>> 0;
    const mask = (d0 ? 1 : 0) | (d1 ? 2 : 0) | (d2 ? 4 : 0);
    const writeFirst = value => {
      const low = value & 15;
      const rest = value >>> 4;
      out.writeUint8((mask | (rest ? 8 : 0)) << 4 | low);
      if (rest) out.writeVarint(rest);
    };
    out.grow(16);
    if (d0) { writeFirst(d0); if (d1) out.writeVarint(d1); if (d2) out.writeVarint(d2); }
    else if (d1) { writeFirst(d1); if (d2) out.writeVarint(d2); }
    else writeFirst(d2);
    return true;
  }
  patch(base, inp) {
    const n = inp.readUint8();
    const magic = 2863311530;
    const readFirst = () => {
      let value = n & 15;
      if (n & 128) value += inp.readVarint() << 4;
      return (magic ^ value) - magic >> 0;
    };
    const readNext = () => { const value = inp.readVarint(); return (magic ^ value) - magic >> 0; };
    let r = 0, a = 0, o = 0;
    if (n & 16) { r = readFirst(); if (n & 32) a = readNext(); if (n & 64) o = readNext(); }
    else if (n & 32) { a = readFirst(); if (n & 64) o = readNext(); }
    else o = readFirst();
    const inv = this.invPrecision;
    const prec = this.precision;
    const qb0 = Math.round(inv * base[0]) >> 0;
    const qb1 = Math.round(inv * base[1]) >> 0;
    const qb2 = Math.round(inv * base[2]) >> 0;
    const result = this.alloc();
    result[0] = (qb0 + r) * prec;
    result[1] = (qb1 + a) * prec;
    result[2] = (qb2 + o) * prec;
    return result;
  }
};
var MuQuantizedVec2 = class {
  muType = "quantized-vec2";
  precision;
  invPrecision;
  identity;
  muData;
  json;
  constructor(precision, identity) {
    this.precision = precision;
    this.invPrecision = 1 / precision;
    this.identity = identity ? [
      Math.round(1 / precision * identity[0]) * precision,
      Math.round(1 / precision * identity[1]) * precision
    ] : [0, 0];
    this.muData = {
      type: "quantized-vec2",
      precision: this.precision,
      identity: [this.identity[0], this.identity[1]]
    };
    this.json = this.muData;
  }
  alloc() {
    return [0, 0];
  }
  free(_v) {
  }
  clone(v) {
    return [v[0], v[1]];
  }
  assign(dst, src) {
    const inv = this.invPrecision;
    const prec = this.precision;
    dst[0] = (Math.round(inv * src[0]) >> 0) * prec;
    dst[1] = (Math.round(inv * src[1]) >> 0) * prec;
    return dst;
  }
  equal(a, b) {
    const inv = this.invPrecision;
    return Math.round(inv * a[0]) >> 0 === Math.round(inv * b[0]) >> 0 && Math.round(inv * a[1]) >> 0 === Math.round(inv * b[1]) >> 0;
  }
  toJSON(v) {
    const inv = this.invPrecision;
    const prec = this.precision;
    return [
      (Math.round(inv * v[0]) >> 0) * prec,
      (Math.round(inv * v[1]) >> 0) * prec
    ];
  }
  fromJSON(json) {
    if (Array.isArray(json) && json.length === 2 && typeof json[0] === "number") {
      return this.clone(json);
    }
    return this.clone(this.identity);
  }
  diff(base, target, out) {
    const inv = this.invPrecision;
    const qb0 = Math.round(inv * base[0]) >> 0;
    const qb1 = Math.round(inv * base[1]) >> 0;
    const qt0 = Math.round(inv * target[0]) >> 0;
    const qt1 = Math.round(inv * target[1]) >> 0;
    if (qb0 === qt0 && qb1 === qt1) return false;
    const magic = 2863311530;
    const d0 = (magic + (qt0 - qb0) ^ magic) >>> 0;
    const d1 = (magic + (qt1 - qb1) ^ magic) >>> 0;
    const mask = (d0 ? 1 : 0) | (d1 ? 2 : 0);
    const value = d0 || d1;
    const low = value & 31;
    const rest = value >>> 5;
    out.grow(16);
    out.writeUint8((mask | (rest ? 4 : 0)) << 5 | low);
    if (rest) out.writeVarint(rest);
    if (d0 && d1) out.writeVarint(d1);
    return true;
  }
  patch(base, inp) {
    const n = inp.readUint8();
    const magic = 2863311530;
    const readFirst = () => {
      let value = n & 31;
      if (n & 128) value += inp.readVarint() << 5;
      return (magic ^ value) - magic >> 0;
    };
    const readNext = () => { const value = inp.readVarint(); return (magic ^ value) - magic >> 0; };
    let r = 0, a = 0;
    if (n & 32) { r = readFirst(); if (n & 64) a = readNext(); }
    else a = readFirst();
    const inv = this.invPrecision;
    const prec = this.precision;
    const qb0 = Math.round(inv * base[0]) >> 0;
    const qb1 = Math.round(inv * base[1]) >> 0;
    const result = this.alloc();
    result[0] = (qb0 + r) * prec;
    result[1] = (qb1 + a) * prec;
    return result;
  }
};
var MuCubeAxis = class _MuCubeAxis {
  static instance = new _MuCubeAxis();
  muType = "cube-axis";
  muData = { type: "cube-axis" };
  json = { type: "cube-axis" };
  identity = [1, 0, 0];
  static CUBE_AXIS = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1]
  ];
  static axisToIndex(v) {
    for (let i = 0; i < 6; i++) {
      const a = _MuCubeAxis.CUBE_AXIS[i];
      if (Math.round(v[0]) === a[0] && Math.round(v[1]) === a[1] && Math.round(v[2]) === a[2]) return i;
    }
    return 0;
  }
  alloc() {
    return [0, 0, 0];
  }
  free(_v) {
  }
  clone(v) {
    return [v[0], v[1], v[2]];
  }
  assign(dst, src) {
    dst[0] = src[0];
    dst[1] = src[1];
    dst[2] = src[2];
    return dst;
  }
  equal(a, b) {
    return _MuCubeAxis.axisToIndex(a) === _MuCubeAxis.axisToIndex(b);
  }
  diff(base, target, out) {
    const bi = _MuCubeAxis.axisToIndex(base);
    const ti = _MuCubeAxis.axisToIndex(target);
    if (bi === ti) return false;
    out.grow(1);
    out.writeUint8(ti);
    return true;
  }
  patch(_base, inp) {
    const idx = inp.readUint8();
    if (idx < 0 || idx >= 6) return [0, 0, 0];
    const a = _MuCubeAxis.CUBE_AXIS[idx];
    return [a[0], a[1], a[2]];
  }
  toJSON(v) {
    return _MuCubeAxis.axisToIndex(v);
  }
  fromJSON(json) {
    if (typeof json === "number" && json >= 0 && json <= 5) {
      const a = _MuCubeAxis.CUBE_AXIS[json];
      return [a[0], a[1], a[2]];
    }
    return [1, 0, 0];
  }
};
var MuFloat32Vec3 = {
  muType: "vector",
  muData: void 0,
  json: { type: "vector", data: [0, 0, 0] },
  identity: [0, 0, 0],
  alloc: () => [0, 0, 0],
  free: (_v) => {
  },
  clone: (v) => [v[0], v[1], v[2]],
  assign: (dst, src) => {
    dst[0] = src[0];
    dst[1] = src[1];
    dst[2] = src[2];
    return dst;
  },
  equal: (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2],
  diff: (base, target, out) => {
    const bx = base[0] !== target[0] ? 1 : 0;
    const by = base[1] !== target[1] ? 2 : 0;
    const bz = base[2] !== target[2] ? 4 : 0;
    const mask = bx + by + bz;
    if (mask === 0) return false;
    out.grow(13);
    out.writeUint8(mask);
    if (bx) out.writeFloat32(target[0]);
    if (by) out.writeFloat32(target[1]);
    if (bz) out.writeFloat32(target[2]);
    return true;
  },
  patch: (base, inp) => {
    const mask = inp.readUint8();
    const result = [0, 0, 0];
    result[0] = mask & 1 ? inp.readFloat32() : base[0];
    result[1] = mask & 2 ? inp.readFloat32() : base[1];
    result[2] = mask & 4 ? inp.readFloat32() : base[2];
    return result;
  },
  toJSON: (v) => [v[0], v[1], v[2]],
  fromJSON: (json) => {
    if (Array.isArray(json) && json.length === 3) {
      return [+(json[0] ?? 0), +(json[1] ?? 0), +(json[2] ?? 0)];
    }
    return [0, 0, 0];
  }
};

// legacy/box3-compat/src/wire/protocols.ts
var netLog = {
  name: "net-log",
  client: {
    log: new import_schema5.MuStruct({
      level: new import_schema5.MuUint8(),
      message: new import_schema5.MuUTF8(),
      prefix: new import_schema5.MuArray(new import_schema5.MuASCII()),
      timestamp: new import_schema5.MuDate(),
      uuid: new import_schema5.MuASCII()
    })
  },
  server: {
    log: new import_schema5.MuStruct({
      level: new import_schema5.MuVarint(),
      message: new import_schema5.MuUTF8(),
      prefix: new import_schema5.MuArray(new import_schema5.MuASCII())
    }),
    logASCII: new import_schema5.MuStruct({
      level: new import_schema5.MuVarint(),
      message: new import_schema5.MuASCII(),
      prefix: new import_schema5.MuArray(new import_schema5.MuASCII())
    }),
    logPino: new import_schema5.MuJSON()
  }
};
var models = {
  name: "models",
  client: {
    appendMeshHashes: new import_schema5.MuArray(new import_schema5.MuStruct({
      bodyBX: new import_schema5.MuQuantizedFloat(1, 64),
      bodyBY: new import_schema5.MuQuantizedFloat(1, 64),
      bodyBZ: new import_schema5.MuQuantizedFloat(1, 64),
      bodyOffsetX: new import_schema5.MuQuantizedFloat(1, 64),
      bodyOffsetY: new import_schema5.MuQuantizedFloat(1, 64),
      bodyOffsetZ: new import_schema5.MuQuantizedFloat(1, 64),
      meshBX: new import_schema5.MuQuantizedFloat(1, 64),
      meshBY: new import_schema5.MuQuantizedFloat(1, 64),
      meshBZ: new import_schema5.MuQuantizedFloat(1, 64),
      renderBoxOffsetX: new import_schema5.MuQuantizedFloat(1, 64),
      renderBoxOffsetY: new import_schema5.MuQuantizedFloat(1, 64),
      renderBoxOffsetZ: new import_schema5.MuQuantizedFloat(1, 64),
      hash: new import_schema5.MuASCII(),
      hashType: new import_schema5.MuUTF8()
    })),
    appendSkinHashes: new import_schema5.MuArray(new import_schema5.MuStruct({
      hash: new import_schema5.MuASCII(),
      parts: new import_schema5.MuStruct({
        head: new import_schema5.MuASCII(),
        hips: new import_schema5.MuASCII(),
        leftFoot: new import_schema5.MuASCII(),
        leftHand: new import_schema5.MuASCII(),
        leftLowerArm: new import_schema5.MuASCII(),
        leftLowerLeg: new import_schema5.MuASCII(),
        leftShoulder: new import_schema5.MuASCII(),
        leftUpperArm: new import_schema5.MuASCII(),
        leftUpperLeg: new import_schema5.MuASCII(),
        neck: new import_schema5.MuASCII(),
        rightFoot: new import_schema5.MuASCII(),
        rightHand: new import_schema5.MuASCII(),
        rightLowerArm: new import_schema5.MuASCII(),
        rightLowerLeg: new import_schema5.MuASCII(),
        rightShoulder: new import_schema5.MuASCII(),
        rightUpperArm: new import_schema5.MuASCII(),
        rightUpperLeg: new import_schema5.MuASCII(),
        torso: new import_schema5.MuASCII()
      })
    })),
    appendSkinPartHashes: new import_schema5.MuSortedArray(new import_schema5.MuStruct({
      id: new import_schema5.MuVarint(),
      hash: new import_schema5.MuASCII()
    }))
  },
  server: {}
};
var gameNet = {
  name: "game-net",
  client: {
    scriptEvents: new import_schema5.MuStruct({
      damage: new import_schema5.MuStruct({
        die: new import_schema5.MuArray(new import_schema5.MuVarint()),
        hurt: new import_schema5.MuArray(new import_schema5.MuStruct({
          damage: new import_schema5.MuVarint(),
          id: new import_schema5.MuVarint()
        })),
        respawn: new import_schema5.MuArray(new import_schema5.MuVarint())
      })
    }),
    exceedUserLimit: new import_schema5.MuVarint(),
    kickSessionReason: new import_schema5.MuUint8(),
    syncClientScriptModules: new import_schema5.MuDictionary(new import_schema5.MuUTF8())
  },
  server: {
    join: new import_schema5.MuVoid(),
    synchronize: new import_schema5.MuVoid(),
    acknowledge: new import_schema5.MuUint32(),
    unpause: new import_schema5.MuUint32(),
    pause: new import_schema5.MuVoid(),
    input: new import_schema5.MuStruct({
      pauseCounter: new import_schema5.MuRelativeVarint(),
      tick: new import_schema5.MuRelativeVarint(),
      events: new import_schema5.MuArray(new import_schema5.MuStruct({
        rayTime: new import_schema5.MuQuantizedFloat(390625e-8, -1),
        tick: new import_schema5.MuQuantizedFloat(0.015625, 0),
        rayHitEntity: new import_schema5.MuVarint(),
        rayHitVoxelX: new import_schema5.MuVarint(),
        rayHitVoxelY: new import_schema5.MuVarint(),
        rayHitVoxelZ: new import_schema5.MuVarint(),
        buttonState: new import_schema5.MuUint8(),
        prevButtonState: new import_schema5.MuUint8(),
        position: new MuQuantizedVec3(390625e-8, [0, 0, 0]),
        rayDirection: new MuQuantizedVec3(9765625e-10, [0, 0, 0]),
        rayHitNormal: new MuCubeAxis(),
        rayOrigin: new MuQuantizedVec3(390625e-8, [0, 0, 0])
      })),
      input: new import_schema5.MuStruct({
        inputState: new import_schema5.MuUint16(),
        inputAngle: new import_schema5.MuUint8(),
        inputCameraAngle: new import_schema5.MuUint8(),
        inputPitch: new import_schema5.MuUint8(),
        bodies: new import_schema5.MuSortedArray(new import_schema5.MuStruct({
          px: new import_schema5.MuQuantizedFloat(390625e-8, 0),
          py: new import_schema5.MuQuantizedFloat(390625e-8, 0),
          pz: new import_schema5.MuQuantizedFloat(390625e-8, 0),
          vx: new import_schema5.MuQuantizedFloat(390625e-8, 0),
          vy: new import_schema5.MuQuantizedFloat(390625e-8, 0),
          vz: new import_schema5.MuQuantizedFloat(390625e-8, 0),
          id: new import_schema5.MuVarint()
        }))
      })
    }),
    sendKeyBoardEvent: new import_schema5.MuStruct({
      id: new import_schema5.MuVarint(),
      tick: new import_schema5.MuVarint(),
      keyDownState: new import_schema5.MuArray(new import_schema5.MuUint8()),
      prevKeyDownState: new import_schema5.MuArray(new import_schema5.MuUint8())
    })
  }
};
var gameClock = {
  name: "game-clock",
  client: {
    pong: new import_schema5.MuStruct({
      frameSkip: new import_schema5.MuVarint(),
      clientClock: new import_schema5.MuFloat64(),
      serverClock: new import_schema5.MuFloat64()
    }),
    frameSkip: new import_schema5.MuVarint()
  },
  server: {
    ping: new import_schema5.MuFloat64()
  }
};
var input = {
  name: "input",
  client: {
    setCameraPitch: new import_schema5.MuUint8(),
    setCameraYaw: new import_schema5.MuUint8()
  },
  server: {}
};
var sound = {
  name: "sound",
  client: {
    resetDictionary: new import_schema5.MuArray(new import_schema5.MuASCII()),
    play: new import_schema5.MuStruct({
      gain: new import_schema5.MuQuantizedFloat(390625e-8, 1),
      pitch: new import_schema5.MuQuantizedFloat(390625e-8, 1),
      radius: new import_schema5.MuQuantizedFloat(0.0625, 0),
      sampleId: new import_schema5.MuVarint(),
      soundId: new import_schema5.MuVarint(),
      position: new import_schema5.MuUnion({
        global: new import_schema5.MuVoid(),
        player: new import_schema5.MuVarint(),
        entity: new import_schema5.MuVarint(),
        position: new MuQuantizedVec3(0.0625, [0, 0, 0])
      })
    }),
    resume: new import_schema5.MuVarint(),
    pause: new import_schema5.MuVarint(),
    stop: new import_schema5.MuVarint(),
    setCurrentTime: new import_schema5.MuStruct({
      soundId: new import_schema5.MuVarint(),
      currentTime: new import_schema5.MuFloat32()
    }),
    setCurrentTimeAndResume: new import_schema5.MuStruct({
      soundId: new import_schema5.MuVarint(),
      currentTime: new import_schema5.MuFloat32()
    })
  },
  server: {}
};
var gameTerrain = {
  name: "game-terrain",
  client: {
    reset: new import_schema5.MuStruct({
      positionX: new import_schema5.MuFloat64(),
      positionY: new import_schema5.MuFloat64(),
      positionZ: new import_schema5.MuFloat64(),
      resetCounter: new import_schema5.MuUint32(),
      nx: new import_schema5.MuUint16(),
      ny: new import_schema5.MuUint16(),
      nz: new import_schema5.MuUint16(),
      innerAO: new import_schema5.MuBoolean(),
      blocks: new import_schema5.MuASCII(),
      hashes: new import_schema5.MuArray(new import_schema5.MuASCII())
    }),
    voxelChange: new import_schema5.MuArray(new import_schema5.MuStruct({
      block: new import_schema5.MuRelativeVarint(),
      count: new import_schema5.MuVarint(),
      offset: new import_schema5.MuVarint()
    })),
    chunkResponse: new import_schema5.MuStruct({
      rpcId: new import_schema5.MuVarint(),
      boxes: new import_schema5.MuSortedArray(new import_schema5.MuStruct({
        block: new import_schema5.MuVarint(),
        faces: new import_schema5.MuUint8(),
        maxX: new import_schema5.MuUint8(),
        maxY: new import_schema5.MuUint8(),
        maxZ: new import_schema5.MuUint8(),
        minX: new import_schema5.MuUint8(),
        minY: new import_schema5.MuUint8(),
        minZ: new import_schema5.MuUint8()
      }), Infinity, compareTerrainBoxes)
    }),
    lightMapResponse: new import_schema5.MuBoolean(),
    hashesResponse: new import_schema5.MuStruct({
      startI: new import_schema5.MuVarint(),
      startJ: new import_schema5.MuVarint(),
      startK: new import_schema5.MuVarint(),
      chunksInfo: new import_schema5.MuArray(new import_schema5.MuStruct({
        idx: new import_schema5.MuVarint(),
        hash: new import_schema5.MuASCII()
      })),
      dirtyChunks: new import_schema5.MuArray(new import_schema5.MuVarint())
    })
  },
  server: {
    ready: new import_schema5.MuVarint(),
    fetchChunk: new import_schema5.MuStruct({
      chunkId: new import_schema5.MuVarint(),
      rpcId: new import_schema5.MuVarint()
    }),
    rebuildLightMap: new import_schema5.MuBoolean(),
    fetchHashes: new import_schema5.MuStruct({
      startI: new import_schema5.MuVarint(),
      startJ: new import_schema5.MuVarint(),
      startK: new import_schema5.MuVarint(),
      chunkIds: new import_schema5.MuArray(new import_schema5.MuVarint()),
      dirtyChunks: new import_schema5.MuArray(new import_schema5.MuVarint())
    })
  }
};
var gameChat = {
  name: "game-chat",
  client: {
    log: new import_schema5.MuStruct({
      duration: new import_schema5.MuInt32(),
      id: new import_schema5.MuUint32(),
      msgType: new import_schema5.MuUint8(),
      hideFloat: new import_schema5.MuBoolean(),
      private: new import_schema5.MuBoolean(),
      valid: new import_schema5.MuBoolean(),
      i18nPrefix: new import_schema5.MuASCII(),
      i18nSuffix: new import_schema5.MuASCII(),
      text: new import_schema5.MuUTF8()
    }),
    globalNotice: new import_schema5.MuStruct({
      detail: new import_schema5.MuUTF8(),
      title: new import_schema5.MuUTF8()
    })
  },
  server: {
    noticeMessage: new import_schema5.MuStruct({
      detail: new import_schema5.MuUTF8(),
      title: new import_schema5.MuUTF8()
    })
  }
};
var playerProtocol = {
  name: "player-protocol",
  client: {
    playerJoin: new import_schema5.MuStruct({
      id: new import_schema5.MuVarint(),
      position: MuFloat32Vec3
    }),
    playerLeave: new import_schema5.MuStruct({
      id: new import_schema5.MuVarint(),
      position: MuFloat32Vec3
    }),
    openUserProfileDialog: new import_schema5.MuStruct({
      userId: new import_schema5.MuUTF8()
    })
  },
  server: {
    updateAvatarSkin: new import_schema5.MuVoid()
  }
};
var entityInteract = {
  name: "entity-interact",
  client: {
    acknowledgeInteract: new import_schema5.MuVoid(),
    emoteEvent: new import_schema5.MuStruct({
      id: new import_schema5.MuVarint(),
      emote: new import_schema5.MuUint8()
    })
  },
  server: {
    interact: new import_schema5.MuStruct({
      id: new import_schema5.MuVarint(),
      tick: new import_schema5.MuQuantizedFloat(0.0625, 0)
    }),
    playEmote: new import_schema5.MuUint8()
  }
};
var dialogCommon = new import_schema5.MuStruct({
  lookEyeEntity: new import_schema5.MuVarint(),
  lookTargetEntity: new import_schema5.MuVarint(),
  lookEyeEnabled: new import_schema5.MuBoolean(),
  lookTargetEnabled: new import_schema5.MuBoolean(),
  lookUpEnabled: new import_schema5.MuBoolean(),
  content: new import_schema5.MuUTF8(),
  contentBackgroundColor: new import_schema5.MuStruct({
    a: new import_schema5.MuQuantizedFloat(390625e-8, 1),
    b: new import_schema5.MuQuantizedFloat(390625e-8, 1),
    g: new import_schema5.MuQuantizedFloat(390625e-8, 1),
    r: new import_schema5.MuQuantizedFloat(390625e-8, 1)
  }),
  contentTextColor: new import_schema5.MuStruct({
    a: new import_schema5.MuQuantizedFloat(390625e-8, 1),
    b: new import_schema5.MuQuantizedFloat(390625e-8, 1),
    g: new import_schema5.MuQuantizedFloat(390625e-8, 1),
    r: new import_schema5.MuQuantizedFloat(390625e-8, 1)
  }),
  lookEyeOffset: new import_schema5.MuStruct({
    x: new import_schema5.MuQuantizedFloat(0.015625, 0),
    y: new import_schema5.MuQuantizedFloat(0.015625, 0),
    z: new import_schema5.MuQuantizedFloat(0.015625, 0)
  }),
  lookTargetOffset: new import_schema5.MuStruct({
    x: new import_schema5.MuQuantizedFloat(0.015625, 0),
    y: new import_schema5.MuQuantizedFloat(0.015625, 0),
    z: new import_schema5.MuQuantizedFloat(0.015625, 0)
  }),
  lookUp: new import_schema5.MuStruct({
    x: new import_schema5.MuQuantizedFloat(0.015625, 0),
    y: new import_schema5.MuQuantizedFloat(0.015625, 0),
    z: new import_schema5.MuQuantizedFloat(0.015625, 0)
  }),
  title: new import_schema5.MuUTF8(),
  titleBackgroundColor: new import_schema5.MuStruct({
    a: new import_schema5.MuQuantizedFloat(390625e-8, 1),
    b: new import_schema5.MuQuantizedFloat(390625e-8, 1),
    g: new import_schema5.MuQuantizedFloat(390625e-8, 1),
    r: new import_schema5.MuQuantizedFloat(390625e-8, 1)
  }),
  titleTextColor: new import_schema5.MuStruct({
    a: new import_schema5.MuQuantizedFloat(390625e-8, 1),
    b: new import_schema5.MuQuantizedFloat(390625e-8, 1),
    g: new import_schema5.MuQuantizedFloat(390625e-8, 1),
    r: new import_schema5.MuQuantizedFloat(390625e-8, 1)
  })
});
var dialog = {
  name: "dialog",
  client: {
    open: new import_schema5.MuStruct({
      rpcId: new import_schema5.MuVarint(),
      config: new import_schema5.MuUnion({
        text: new import_schema5.MuStruct({
          hasArrow: new import_schema5.MuBoolean(),
          common: dialogCommon
        }),
        input: new import_schema5.MuStruct({
          common: dialogCommon,
          confirmText: new import_schema5.MuUTF8(),
          placeholder: new import_schema5.MuUTF8()
        }),
        select: new import_schema5.MuStruct({
          common: dialogCommon,
          options: new import_schema5.MuArray(new import_schema5.MuUTF8())
        })
      })
    }),
    cancelDialogs: new import_schema5.MuVoid(),
    cancelDialog: new import_schema5.MuVarint()
  },
  server: {
    close: new import_schema5.MuStruct({
      rpcId: new import_schema5.MuVarint(),
      result: new import_schema5.MuUnion({
        close: new import_schema5.MuVoid(),
        text: new import_schema5.MuUTF8(),
        input: new import_schema5.MuUTF8(),
        select: new import_schema5.MuStruct({
          index: new import_schema5.MuVarint(),
          value: new import_schema5.MuUTF8()
        })
      })
    })
  }
};
var navigator = {
  name: "navigator",
  client: {
    postMessage: new import_schema5.MuStruct({
      isOld: new import_schema5.MuBoolean(),
      type: new import_schema5.MuUTF8(),
      value: new import_schema5.MuUTF8()
    })
  },
  server: {
    messageEvent: new import_schema5.MuStruct({
      data: new import_schema5.MuJSON()
    })
  }
};
var ref = {
  name: "ref",
  client: {
    openLink: new import_schema5.MuStruct({
      isConfirm: new import_schema5.MuBoolean(),
      isNewTab: new import_schema5.MuBoolean(),
      warning: new import_schema5.MuBoolean(),
      href: new import_schema5.MuUTF8()
    })
  },
  server: {}
};
var rtc = {
  name: "rtc",
  client: {
    join: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      appId: new import_schema5.MuASCII(),
      channelId: new import_schema5.MuASCII(),
      token: new import_schema5.MuASCII()
    }),
    leave: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      channelId: new import_schema5.MuASCII()
    }),
    unpublish: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      channelId: new import_schema5.MuASCII()
    }),
    publishMicrophone: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      channelId: new import_schema5.MuASCII()
    }),
    getVolume: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      channelId: new import_schema5.MuASCII()
    }),
    setVolume: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      volume: new import_schema5.MuFloat32(),
      channelId: new import_schema5.MuASCII()
    }),
    getMicrophonePermission: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint()
    }),
    tokenReturn: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      token: new import_schema5.MuASCII()
    })
  },
  server: {
    return: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint()
    }),
    volumeReturn: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      volume: new import_schema5.MuFloat32()
    }),
    permissionReturn: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      permission: new import_schema5.MuBoolean()
    }),
    throw: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      message: new import_schema5.MuUTF8()
    }),
    fetchToken: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      uid: new import_schema5.MuVarint(),
      channelId: new import_schema5.MuASCII()
    })
  }
};
var gui = {
  name: "gui",
  client: {
    init: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      data: new import_schema5.MuUTF8()
    }),
    append: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      data: new import_schema5.MuUTF8(),
      selector: new import_schema5.MuUTF8()
    }),
    remove: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      selector: new import_schema5.MuUTF8()
    }),
    show: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      allowMultiple: new import_schema5.MuBoolean(),
      name: new import_schema5.MuUTF8()
    }),
    getAttribute: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      name: new import_schema5.MuUTF8(),
      selector: new import_schema5.MuUTF8()
    }),
    setAttribute: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      name: new import_schema5.MuUTF8(),
      selector: new import_schema5.MuUTF8(),
      value: new import_schema5.MuUTF8()
    }),
    reset: new import_schema5.MuVoid()
  },
  server: {
    return: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      value: new import_schema5.MuUTF8()
    }),
    throw: new import_schema5.MuStruct({
      handle: new import_schema5.MuVarint(),
      message: new import_schema5.MuUTF8()
    }),
    sendMessage: new import_schema5.MuStruct({
      name: new import_schema5.MuUTF8(),
      payload: new import_schema5.MuUTF8()
    })
  }
};
var market = {
  name: "market",
  client: {
    openMarketplace: new import_schema5.MuStruct({
      productIds: new import_schema5.MuArray(new import_schema5.MuUTF8())
    })
  },
  server: {}
};
var teleport = {
  name: "teleport",
  client: {
    teleport: new import_schema5.MuStruct({
      playHash: new import_schema5.MuASCII(),
      serverId: new import_schema5.MuUTF8()
    }),
    editTeleport: new import_schema5.MuASCII()
  },
  server: {}
};
var remoteChannel = {
  name: "remote-channel",
  client: {
    sendClientEvent: new import_schema5.MuStruct({
      tick: new import_schema5.MuVarint(),
      args: new import_schema5.MuUTF8()
    })
  },
  server: {
    sendServerEvent: new import_schema5.MuStruct({
      tick: new import_schema5.MuVarint(),
      args: new import_schema5.MuUTF8()
    })
  }
};
function createGameUIProtocol() {
  const coord2d = (offset, ratio) => new import_schema5.MuStruct({
    offset: new MuQuantizedVec2(390625e-8, offset),
    ratio: new MuQuantizedVec2(9765625e-10, ratio)
  });
  const autoLayoutSchema = new import_schema5.MuStruct({
    cellSize: coord2d([50, 50], [0, 0]),
    lineHeightEnabled: new import_schema5.MuBoolean(true),
    columnWidthEnabled: new import_schema5.MuBoolean(true),
    startCorner: new import_schema5.MuUint8(0),
    fillDirection: new import_schema5.MuUint8(0),
    maxCells: new import_schema5.MuVarint(3),
    maxCellsEnabled: new import_schema5.MuBoolean(true),
    cellPadding: coord2d([5, 5], [0, 0]),
    horizontalAlignment: new import_schema5.MuUint8(1),
    verticalAlignment: new import_schema5.MuUint8(1)
  });
  const layoutUnion = new import_schema5.MuUnion({ none: new import_schema5.MuVoid(), autoLayout: autoLayoutSchema }, "none");
  const screenSchema = new import_schema5.MuStruct({
    enable: new import_schema5.MuBoolean(true),
    layout: layoutUnion,
    zIndex: new import_schema5.MuVarint(1)
  });
  const common = (size, backgroundOpacity = 1, clipsDescendants = false) => ({
    anchor: new MuQuantizedVec2(9765625e-10, [0, 0]),
    position: coord2d([0, 0], [0, 0]),
    size: coord2d(size, [0, 0]),
    autoResize: new import_schema5.MuUint8(0),
    visible: new import_schema5.MuBoolean(true),
    backgroundColor: new MuQuantizedVec3(1, [255, 255, 255]),
    backgroundOpacity: new import_schema5.MuQuantizedFloat(9765625e-10, backgroundOpacity),
    zIndex: new import_schema5.MuVarint(1),
    layoutOrder: new import_schema5.MuVarint(1),
    layout: layoutUnion,
    clipsDescendants: new import_schema5.MuBoolean(clipsDescendants)
  });
  const rotation = () => new import_schema5.MuQuantizedFloat(9765625e-10, 0);
  const textStroke = () => ({
    textStrokeColor: new MuQuantizedVec3(1, [255, 255, 255]),
    textStrokeOpacity: new import_schema5.MuQuantizedFloat(9765625e-10, 1),
    textStrokeThickness: new import_schema5.MuQuantizedFloat(9765625e-10, 0),
    textFontFamily: new import_schema5.MuUint8(0)
  });
  const boxSchema = new import_schema5.MuStruct({ ...common([400, 300]), rotation: rotation() });
  const inputFieldSchema = new import_schema5.MuStruct({
    ...common([200, 50]),
    textContent: new import_schema5.MuUTF8(""),
    textFontSize: new import_schema5.MuUint8(14),
    textColor: new MuQuantizedVec3(1, [0, 0, 0]),
    textOpacity: new import_schema5.MuQuantizedFloat(9765625e-10, 1),
    textXAlignment: new import_schema5.MuUint8(0),
    textYAlignment: new import_schema5.MuUint8(0),
    textLineHeight: new import_schema5.MuQuantizedFloat(390625e-8, 1.2),
    autoWordWrap: new import_schema5.MuBoolean(false),
    placeholder: new import_schema5.MuUTF8("Type something here"),
    placeholderColor: new MuQuantizedVec3(1, [172, 172, 164]),
    placeholderOpacity: new import_schema5.MuQuantizedFloat(9765625e-10, 1),
    rotation: rotation(),
    ...textStroke()
  });
  const textSchema = new import_schema5.MuStruct({
    ...common([200, 50], 0),
    textContent: new import_schema5.MuUTF8("Text"),
    textFontSize: new import_schema5.MuUint8(14),
    textColor: new MuQuantizedVec3(1, [0, 0, 0]),
    textOpacity: new import_schema5.MuQuantizedFloat(9765625e-10, 1),
    textXAlignment: new import_schema5.MuUint8(0),
    textYAlignment: new import_schema5.MuUint8(0),
    textLineHeight: new import_schema5.MuQuantizedFloat(390625e-8, 1.2),
    autoWordWrap: new import_schema5.MuBoolean(false),
    ...textStroke(),
    richText: new import_schema5.MuBoolean(false),
    rotation: rotation()
  });
  const imageSchema = new import_schema5.MuStruct({
    ...common([200, 200]),
    image: new import_schema5.MuUTF8(""),
    imageOpacity: new import_schema5.MuQuantizedFloat(9765625e-10, 1),
    imageDisplayMode: new import_schema5.MuUint8(0),
    rotation: rotation()
  });
  const scrollBoxSchema = new import_schema5.MuStruct({
    ...common([300, 300], 1, true),
    scrollDirection: new import_schema5.MuUint8(1),
    scrollbarHorizontal: new import_schema5.MuUint8(1),
    scrollbarVertical: new import_schema5.MuUint8(1),
    scrollbarVisibility: new import_schema5.MuUint8(1),
    scrollbarThickness: new import_schema5.MuVarint(8),
    scrollbarColor: new MuQuantizedVec3(1, [153, 153, 153]),
    scrollbarOpacity: new import_schema5.MuQuantizedFloat(9765625e-10, 1),
    scrollCanvasAutoResize: new import_schema5.MuUint8(0),
    scrollCanvasSize: coord2d([500, 500], [0, 0]),
    scrollPosition: new MuQuantizedVec2(390625e-8, [0, 0]),
    rotation: rotation()
  });
  const elementUnion = new import_schema5.MuUnion({ box: boxSchema, image: imageSchema, text: textSchema, scrollBox: scrollBoxSchema, input: inputFieldSchema });
  return {
    name: "gameUI",
    client: {
      reset: new import_schema5.MuStruct({
        running: new import_schema5.MuBoolean(),
        uiTree: new import_schema5.MuDictionary(new import_schema5.MuStruct({
          id: new import_schema5.MuASCII(),
          type: new import_schema5.MuVarint(),
          name: new import_schema5.MuUTF8(),
          parentId: new import_schema5.MuASCII(),
          childrenIds: new import_schema5.MuArray(new import_schema5.MuASCII()),
          value: new import_schema5.MuOption(new import_schema5.MuUnion({ screen: screenSchema, element: elementUnion }), void 0, true)
        }), Number.POSITIVE_INFINITY, {
          ROOT_ID: { type: 0, childrenIds: ["DEFAULT_SCREEN_ID"], id: "ROOT_ID", name: "Root", parentId: "", value: void 0 },
          DEFAULT_SCREEN_ID: { type: 2, childrenIds: [], id: "DEFAULT_SCREEN_ID", name: "screen", parentId: "ROOT_ID", value: { type: "screen", data: { enable: true, layout: { type: "none", data: void 0 }, zIndex: 1 } } }
        }),
        pictureAssets: new import_schema5.MuDictionary(new import_schema5.MuStruct({
          metadataHash: new import_schema5.MuASCII(),
          hash: new import_schema5.MuASCII(),
          width: new import_schema5.MuInt32(),
          height: new import_schema5.MuInt32()
        })),
        defaultScreenId: new import_schema5.MuUTF8("")
      })
    },
    server: {}
  };
}
var gameUI = createGameUIProtocol();
var admin = {
  name: "admin",
  client: {
    redirect: new import_schema5.MuUTF8(),
    alert: new import_schema5.MuUTF8()
  },
  server: {
    closeWebsocket: new import_schema5.MuVoid(),
    logCurrentStore: new import_schema5.MuVoid()
  }
};
var box3Protocols = [
  netLog,
  models,
  gameNet,
  gameClock,
  input,
  sound,
  gameTerrain,
  gameChat,
  playerProtocol,
  entityInteract,
  dialog,
  navigator,
  ref,
  rtc,
  gui,
  market,
  teleport,
  remoteChannel,
  gameUI,
  admin
];

// legacy/box3-compat/src/protocol/handlers/clock.ts
function createClockHandlers(context) {
  return {
    ping(client, clientClock) {
      context.stats.record("game-clock", "ping");
      client.message.pong({
        clientClock,
        serverClock: context.gameClock.milliseconds(),
        frameSkip: 0
      });
    }
  };
}

// legacy/box3-compat/src/protocol/handlers/dialog.ts
function createDialogHandlers(context) {
  return {
    close(client, data, unreliable) {
      if (unreliable) return;
      context.stats.record("dialog", "close");
      context.dialogSessions.close(client, data);
    }
  };
}

// legacy/box3-compat/src/protocol/handlers/entity-interact.ts
function createGuiHandlers(context) {
  return {
    return(client, message) {
      context.stats.record("gui", "return");
      context.guiSessions.resolve(client, message);
    },
    throw(client, message) {
      context.stats.record("gui", "throw");
      context.guiSessions.reject(client, message);
    },
    sendMessage(client, message) {
      context.stats.record("gui", "sendMessage");
      context.logger.info(`[gui:message] ${sessionBridgeLabel(client.sessionId)} ${JSON.stringify(message)}`);
    }
  };
}

function createEntityInteractHandlers(context) {
  return {
    interact(client, message) {
      context.stats.record("entity-interact", "interact");
      if (process.env.BOX3_LOG_SCRIPT_INTERACT_EVENTS === "1") {
        context.logger.info(`[entity-interact] ${sessionBridgeLabel(client.sessionId)} ${JSON.stringify(message)}`);
      }
      client.message.acknowledgeInteract();
    }
  };
}

// legacy/box3-compat/src/protocol/types.ts
function shortSession(value) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
function sessionBridgeLabel(value) {
  return `session-sha256-${(0, import_node_crypto8.createHash)("sha256").update(value, "utf8").digest("hex")}`;
}
function matchesSessionLabel(sessionId, label) {
  return sessionId === label || sessionBridgeLabel(sessionId) === label || shortSession(sessionId) === label;
}

// legacy/box3-compat/src/protocol/handlers/game-net.ts
function createGameNetHandlers(context) {
  return {
    join(client) {
      context.stats.record("game-net", "join");
      const packets = context.gameNetHandshakes.getOrCreate(client.sessionId).takeInitialPacketsFor(client);
      if (packets) client.sendRaw(packets.secret, false);
      context.projectBootstrapSessions.joinGameNet(
        client,
        packets ? () => context.gameNetPublicSessions.start(client, packets) : void 0
      );
      context.logger.info(`[session] join ${sessionBridgeLabel(client.sessionId)}`);
    },
    synchronize(client) {
      context.stats.record("game-net", "synchronize");
      context.gameNetPublicSessions.synchronize(client);
      context.logger.info(`[session] synchronize ${shortSession(client.sessionId)}`);
    },
    acknowledge(client, tick) {
      context.stats.record("game-net", "acknowledge");
      context.gameNetPublicSessions.acknowledge(client.sessionId, tick);
    },
    unpause(client) {
      context.stats.record("game-net", "unpause");
      context.gameNetPublicSessions.unpause(client);
    },
    input(client, data) {
      context.stats.record("game-net", "input");
      const accepted = context.gameNetPublicSessions.acceptInput(client.sessionId, data);
      if (accepted && process.env.BOX3_LOG_SCRIPT_INPUT_EVENTS === "1" && Array.isArray(data.events) && data.events.length > 0) {
        context.logger.info(`[game-net:input] ${sessionBridgeLabel(client.sessionId)} ${JSON.stringify({ tick: data.tick, events: data.events })}`);
      }
      if (accepted) context.terrainInteraction.handleInput(client.sessionId, data);
    },
    sendKeyBoardEvent(client, data) {
      context.stats.record("game-net", "sendKeyBoardEvent");
      context.keyboardInteraction.handle(client.sessionId, data);
    }
  };
}

// legacy/box3-compat/src/protocol/handlers/remote-channel.ts
function createRemoteChannelHandlers(context) {
  return {
    sendServerEvent(client, data) {
      context.stats.record("remote-channel", "sendServerEvent");
      const relayed = context.remoteChannelSessions.handleServerEvent(client, data);
      const legacyHandled = context.bedwarsRemoteSessions?.handleServerEvent(client, data) ?? false;
      const handled = relayed || legacyHandled;
      if (relayed && process.env.BOX3_LOG_REMOTE_EVENTS === "1") {
        context.logger.info(`[remote-channel:event] ${sessionBridgeLabel(client.sessionId)} ${JSON.stringify(data)}`);
      }
      context.logger.info(
        `[remote-channel] ${handled ? "handled" : "ignored"} event from ${shortSession(client.sessionId)}`
      );
    }
  };
}

// legacy/box3-compat/src/protocol/handlers/terrain.ts
function createTerrainHandlers(context) {
  return {
    ready(client, resetCounter) {
      context.stats.record("game-terrain", "ready");
      context.terrainSessions.connect(client);
      context.terrainSessions.send(client, context.mutableTerrain.snapshotRuns());
      context.logger.info(`[game-terrain] client ready at reset ${resetCounter} (${client.sessionId})`);
    },
    fetchChunk(client, request) {
      context.stats.record("game-terrain", "fetchChunk");
      client.message.chunkResponse({
        rpcId: request.rpcId,
        boxes: context.world.collisionBoxes(request.chunkId)
      });
    },
    fetchHashes(client, request) {
      context.stats.record("game-terrain", "fetchHashes");
      client.message.hashesResponse(context.world.hashes(request));
    },
    rebuildLightMap(client, enabled) {
      context.stats.record("game-terrain", "rebuildLightMap");
      client.message.lightMapResponse(enabled);
    }
  };
}

// legacy/box3-compat/src/protocol/register-protocols.ts
function registerProtocols(server, contexts) {
  for (const schema of box3Protocols) {
    const protocol = server.protocol(schema);
    const handlers = {};
    for (const messageName of Object.keys(schema.server)) {
      handlers[messageName] = (client, data, unreliable) => {
        const context = resolveContext(contexts, client);
        if (!context) {
          closeUnresolvedClient(client);
          return;
        }
        const specialized = specializedMessageHandler(schema, messageName, context);
        if (specialized) {
          specialized(client, data, unreliable);
          return;
        }
        context.stats.record(schema.name, messageName);
        if (process.env.BOX3_LOG_NET_EVENTS === "1" && schema === box3Protocols[0]) {
          context.logger.info(`[net-log:event] ${shortSession(client.sessionId)} ${JSON.stringify(data)}`);
        }
        context.logger.info(`[${schema.name}] ${messageName}${unreliable ? " (unreliable)" : ""}`);
      };
    }
    protocol.configure({
      message: handlers,
      raw: (client, data, unreliable) => {
        const context = resolveContext(contexts, client);
        if (!context) {
          closeUnresolvedClient(client);
          return;
        }
        context.stats.record(schema.name, "raw");
        const bytes = typeof data === "string" ? data.length : data.byteLength;
        context.logger.info(
          `[${schema.name}] raw ${bytes} bytes${unreliable ? " (unreliable)" : ""} from ${shortSession(client.sessionId)}`
        );
      },
      connect: (client) => {
        const context = resolveContext(contexts, client);
        if (!context) {
          closeUnresolvedClient(client);
          return;
        }
        if (schema === box3Protocols[0]) {
          context.projectBootstrapSessions.beginConnection(client.sessionId);
          context.stats.connect(client.sessionId);
          context.logger.info(`[session] connected ${shortSession(client.sessionId)}`);
        }
        if (schema === models) context.projectBootstrapSessions.connectModels(client);
        if (schema === sound) context.projectBootstrapSessions.connectSound(client);
        if (schema === gameTerrain) context.projectBootstrapSessions.connectTerrain(client);
        if (schema === gameUI) {
          const reset = client.message.reset;
          const clientUiState = context.clientUiState ?? (process.env.BOX3_MINIMAL_GAME_UI === "1" ? {
            running: true,
            defaultScreenId: "DEFAULT_SCREEN_ID",
            pictureAssets: {},
            uiTree: {
              ROOT_ID: {
                type: 0,
                childrenIds: ["DEFAULT_SCREEN_ID"],
                id: "ROOT_ID",
                name: "Root",
                parentId: "",
                value: void 0
              },
              DEFAULT_SCREEN_ID: {
                type: 2,
                childrenIds: [],
                id: "DEFAULT_SCREEN_ID",
                name: "screen",
                parentId: "ROOT_ID",
                value: {
                  type: "screen",
                  data: { zIndex: 1, enable: true, layout: { type: "none", data: void 0 } }
                }
              }
            }
          } : void 0);
          if (clientUiState && typeof reset === "function") {
            reset(clientUiState);
            context.projectBootstrapSessions.connectGameUi(client);
          }
        }
        if (schema === dialog) context.dialogSessions.connect(client);
        if (schema === gui) context.guiSessions.connect(client);
        if (schema === gameChat) context.gameChatSessions.connect(client);
        if (schema === playerProtocol) context.playerProtocolSessions.connect(client);
        if (schema === ref) context.refSessions.connect(client);
        if (schema === remoteChannel) {
          context.remoteChannelSessions.connect(client);
          context.bedwarsRemoteSessions?.connect(client);
        }
      },
      disconnect: (client) => {
        const context = resolveContext(contexts, client);
        if (!context) return;
        if (schema === box3Protocols[0]) {
          context.issuedSessions.markDisconnected(client.sessionId);
          context.stats.disconnect(client.sessionId);
          context.logger.info(`[session] disconnected ${sessionBridgeLabel(client.sessionId)}`);
        }
        if (schema === gameNet) context.gameNetPublicSessions.disconnect(client);
        if (schema === gameTerrain) context.terrainSessions.disconnect(client);
        if (schema === dialog) context.dialogSessions.disconnect(client);
        if (schema === gui) context.guiSessions.disconnect(client);
        if (schema === gameChat) context.gameChatSessions.disconnect(client);
        if (schema === playerProtocol) context.playerProtocolSessions.disconnect(client);
        if (schema === ref) context.refSessions.disconnect(client);
        if (schema === remoteChannel) {
          context.remoteChannelSessions.disconnect(client);
          context.bedwarsRemoteSessions?.disconnect(client);
        }
      }
    });
  }
}
function specializedMessageHandler(schema, messageName, context) {
  if (schema === gameClock) return createClockHandlers(context)[messageName];
  if (schema === dialog) return createDialogHandlers(context)[messageName];
  if (schema === gui) return createGuiHandlers(context)[messageName];
  if (schema === entityInteract) return createEntityInteractHandlers(context)[messageName];
  if (schema === gameNet) return createGameNetHandlers(context)[messageName];
  if (schema === remoteChannel) return createRemoteChannelHandlers(context)[messageName];
  if (schema === gameTerrain) return createTerrainHandlers(context)[messageName];
  return void 0;
}
function resolveContext(contexts, client) {
  if (!client || typeof client.sessionId !== "string") return void 0;
  return contexts.resolve(client.sessionId);
}
function closeUnresolvedClient(client) {
  if (typeof client?.close === "function") client.close();
}

// legacy/box3-compat/src/session/historical-protocol-context-registry.ts
var HistoricalProtocolContextRegistry = class {
  constructor(targets) {
    this.targets = targets;
  }
  targets;
  contexts = /* @__PURE__ */ new Map();
  get size() {
    return this.contexts.size;
  }
  register(target, context) {
    if (!isHistoricalProjectTarget(target)) {
      throw new HistoricalProjectCatalogError("Historical protocol context requires a mounted runtime target");
    }
    if (!isObject3(context)) {
      throw new TypeError("Historical protocol context must be an object");
    }
    if (this.contexts.has(target)) {
      throw new HistoricalProjectCatalogError("Historical protocol context is already registered for this target");
    }
    this.contexts.set(target, context);
  }
  resolve(sessionId) {
    if (typeof sessionId !== "string" || sessionId.length === 0) return void 0;
    const target = this.targets.targetForSession(sessionId);
    return target ? this.resolveTarget(target) : void 0;
  }
  resolveTarget(target) {
    if (!isHistoricalProjectTarget(target)) return void 0;
    return this.contexts.get(target);
  }
  dispose() {
    this.contexts.clear();
  }
};
function isObject3(value) {
  return typeof value === "object" && value !== null;
}

// legacy/box3-compat/src/session/historical-project-session-admission.ts
var HistoricalProjectSessionAdmission = class {
  constructor(options) {
    this.options = options;
  }
  options;
  bindings = /* @__PURE__ */ new Map();
  get size() {
    return this.bindings.size;
  }
  /**
   * Admission is synchronous: resolve the catalog target, create its SID, and
   * store the binding before the HTTP handler can serialize the config.
   */
  issueForContentId(contentId, socketServerUrl) {
    const catalog = this.options.catalog;
    if (!catalog) throw new HistoricalProjectAdmissionError("project-unavailable");
    const descriptor = catalog.admit(contentId);
    const config = this.options.issuedSessions.issue(socketServerUrl);
    this.bindings.set(config.sessionId, descriptor);
    return config;
  }
  descriptorForSession(sessionId) {
    return this.bindings.get(sessionId);
  }
  targetForSession(sessionId) {
    return this.bindings.get(sessionId)?.target;
  }
  delete(sessionId) {
    this.bindings.delete(sessionId);
  }
  dispose() {
    this.bindings.clear();
  }
};

// legacy/box3-compat/src/session/local-session-config.ts
var import_node_crypto8 = require("node:crypto");
var LOCAL_PREFETCH_HASH = "QmTn4FL6hBnoD469zujDAFMpQtZMNwF5Wcc4LtHTqWNYHZ.png";
var LocalSessionConfigIssuer = class {
  constructor(socketServerUrl) {
    this.socketServerUrl = socketServerUrl;
  }
  socketServerUrl;
  issue(socketServerUrl = this.socketServerUrl()) {
    return Object.freeze({
      prefetchHashes: Object.freeze([LOCAL_PREFETCH_HASH]),
      sessionId: `local-${(0, import_node_crypto8.randomUUID)()}`,
      socketServerUrl,
      maxSockets: 3,
      configuredAudioHashes: Object.freeze([]),
      admin: false
    });
  }
};

// packages/transport-mudb/src/web-server.ts
var import_server = __toESM(require_server2(), 1);
function createMuDbWebTransport(options) {
  if (!options.reserveUpgrade && !options.authorizeUpgrade) {
    throw new Error("MuDB Web transport requires an upgrade authorization hook");
  }
  const transport = new import_server.MuWebSocketServer({
    server: options.httpServer,
    path: options.path,
    logger: options.logger,
    maxPayload: options.maxPayloadBytes
  });
  const internals = transport;
  internals._options.verifyClient = (info, done) => {
    void authorizeUpgrade(options, info).then((authorization) => {
      if (!authorization.allowed) {
        done(false, authorization.statusCode ?? 401);
        return;
      }
      const sessionId = authorization.sessionId;
      if (!isValidSessionId(sessionId)) {
        done(false, 503);
        return;
      }
      rewriteRequestSessionId(info.req, sessionId);
      done(true);
    }).catch(() => done(false, 503));
  };
  return transport;
}
function trackMuDbWebTransportSessions(transport, sessions) {
  const webSocketServer = transport._wsServer;
  if (!webSocketServer) throw new Error("MuDB WebSocket server is not ready");
  webSocketServer.on("connection", (socket, request) => {
    const sessionId = sessionIdFromUpgrade(request.url);
    if (!sessionId || !sessions.attachSession(sessionId)) {
      if (typeof socket.terminate === "function") socket.terminate();
      else socket.close?.();
      return;
    }
    let detached = false;
    socket.once("close", () => {
      if (detached) return;
      detached = true;
      sessions.detachSession(sessionId);
    });
  });
}
function closeMuDbWebTransportClients(transport) {
  for (const client of [...transport.clients]) {
    const connection = client._connection;
    const reliableSocket = connection?.reliableSocket;
    if (typeof reliableSocket?.terminate === "function") reliableSocket.terminate();
    else client.close();
  }
}
function sessionIdFromUpgrade(requestUrl) {
  return queryValueFromUpgrade(requestUrl, "sid", 256);
}
function roomTicketFromUpgrade(requestUrl) {
  return queryValueFromUpgrade(requestUrl, "ticket", 4 * 1024);
}
function queryValueFromUpgrade(requestUrl, key, maxLength) {
  if (!requestUrl) return void 0;
  let url;
  try {
    url = new URL(requestUrl, "http://localhost");
  } catch {
    return void 0;
  }
  const values = url.searchParams.getAll(key);
  if (values.length !== 1) return void 0;
  const value = values[0];
  if (!value || value.length > maxLength) return void 0;
  return value;
}
async function authorizeUpgrade(options, info) {
  if (!options.isAllowedOrigin(info.origin)) return Object.freeze({ allowed: false, statusCode: 403 });
  const sessionId = sessionIdFromUpgrade(info.req.url);
  if (!sessionId) return Object.freeze({ allowed: false, statusCode: 401 });
  if (options.authorizeUpgrade) {
    const authorization = await options.authorizeUpgrade(Object.freeze({
      origin: info.origin,
      request: info.req,
      sessionId,
      ticket: roomTicketFromUpgrade(info.req.url)
    }));
    return authorization;
  }
  return Object.freeze({
    allowed: options.reserveUpgrade(sessionId),
    sessionId,
    statusCode: 401
  });
}
function rewriteRequestSessionId(request, sessionId) {
  const url = new URL(request.url ?? "/", "http://localhost");
  request.url = `${url.pathname}?sid=${encodeURIComponent(sessionId)}`;
}
function isValidSessionId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 256 && !/[\x00-\x1f\x7f]/.test(value);
}

// packages/transport-mudb/src/room-ticket.ts
var MAX_TICKET_BYTES = 4 * 1024;

// legacy/box3-compat/src/transport/mudb-transport.ts
function createMudbTransport(httpServer, config, logger, issuedSessions, historicalProjectSessions, protocolContexts) {
  return createMuDbWebTransport({
    httpServer,
    path: config.path,
    logger,
    maxPayloadBytes: config.maxPayloadBytes,
    isAllowedOrigin: (origin) => isAllowedOrigin(origin, config.allowedOrigins),
    authorizeUpgrade: ({ sessionId }) => {
      const target = historicalProjectSessions.targetForSession(sessionId);
      if (!target || !protocolContexts.resolveTarget(target)) {
        return { allowed: false, statusCode: 401 };
      }
      return {
        allowed: issuedSessions.reserveUpgrade(sessionId),
        sessionId,
        statusCode: 401
      };
    }
  });
}
function trackMudbTransportSessions(transport, issuedSessions) {
  trackMuDbWebTransportSessions(transport, {
    attachSession: (sessionId) => issuedSessions.attachSocket(sessionId),
    detachSession: (sessionId) => issuedSessions.detachSocket(sessionId)
  });
}
function closeMudbTransportClients(transport) {
  closeMuDbWebTransportClients(transport);
}

// legacy/box3-compat/src/app/box3-server.ts
var Box3Server = class {
  config;
  stats = new ServerStats();
  world;
  logger;
  assetStore;
  clientRuntime;
  clientScripts;
  clientUiState;
  projectBootstrap;
  legacyProject;
  projectPackagePlayerProjection;
  playerBodyProfile;
  testSessionRegistryOptions;
  httpServer;
  mudbServer;
  mudbTransport;
  issuedSessions;
  historicalProjectSessions;
  historicalProtocolContexts;
  historicalProjectInstance;
  boundPort;
  constructor(options = {}) {
    this.config = resolveServerConfig(options);
    this.logger = options.logger ?? createConsoleLogger();
    this.world = options.world ?? new EmptyWorld();
    this.assetStore = options.assetStore ?? new FileArchiveAssetStore(this.config.assetRoot);
    this.clientRuntime = options.clientRuntime ?? emptyClientRuntime;
    this.clientScripts = options.clientScripts ?? Object.freeze({});
    this.clientUiState = options.clientUiState;
    this.projectBootstrap = options.projectBootstrap ?? emptyProjectBootstrap;
    this.testSessionRegistryOptions = options.testSessionRegistryOptions;
    if (options.legacyProject && options.projectPackagePlayerProjection) {
      throw new Error("A Box3 server cannot mount both a legacy project and a v1 local Player projection");
    }
    this.legacyProject = options.legacyProject;
    this.projectPackagePlayerProjection = options.projectPackagePlayerProjection;
    this.playerBodyProfile = options.playerBodyProfile;
    // Map registry (M1c): mapSlots is an array of per-map project slots. When
    // absent, fall back to a single slot built from the individual options so
    // the single-map env-var mode keeps working unchanged.
    this.mapSlots = options.mapSlots ?? [{
      contentId: this.clientRuntime.contentId,
      label: "legacy-mounted-runtime",
      world: this.world,
      clientRuntime: this.clientRuntime,
      clientScripts: this.clientScripts,
      clientUiState: this.clientUiState,
      projectBootstrap: this.projectBootstrap,
      legacyProject: this.legacyProject,
      projectPackagePlayerProjection: this.projectPackagePlayerProjection,
      playerBodyProfile: this.playerBodyProfile,
    }];
  }
  get host() {
    return this.config.host;
  }
  get port() {
    return this.boundPort ?? this.config.port;
  }
  get path() {
    return this.config.path;
  }
  get running() {
    return Boolean(this.httpServer?.listening && this.mudbServer?.running);
  }
  /**
   * Host-only ingress for the recovered game-chat.globalNotice transport.
   * This is not an HTTP route, project API, chat service, or world.say bridge.
   */
  sendGlobalNotice(sessionId, notice) {
    if (!this.running) return false;
    return this.historicalProjectInstance?.sendGlobalNotice(sessionId, notice) ?? false;
  }
  /** Loopback-only ingress used by the NEA Script Runtime bridge. */
  sendRemoteClientEvent(sessionLabel, event) {
    if (!this.running) return false;
    return this.historicalProjectInstance?.remoteChannelSessions.sendExternalEvent(sessionLabel, event) ?? false;
  }
  sendChatMessage(sessionId, message) {
    if (!this.running) return false;
    return this.historicalProjectInstance?.sendChatMessage(sessionId, message) ?? false;
  }
  sendChatMessages(deliveries) {
    if (!this.running) return false;
    return this.historicalProjectInstance?.sendChatMessages(deliveries) ?? false;
  }
  playerRuntimeState(sessionLabel) {
    if (!this.running) return void 0;
    return this.historicalProjectInstance?.playerRuntimeState(sessionLabel);
  }
  queuePlayerRuntimeState(sessionLabel, state) {
    if (!this.running) return false;
    return this.historicalProjectInstance?.queuePlayerRuntimeState(sessionLabel, state) ?? false;
  }
  kickPlayer(sessionLabel) {
    if (!this.running) return false;
    return this.historicalProjectInstance?.kickPlayer(sessionLabel) ?? false;
  }
  linkPlayer(sessionLabel, href, options) {
    if (!this.running) return false;
    return this.historicalProjectInstance?.linkPlayer(sessionLabel, href, options) ?? false;
  }
  queueDamageRuntimeState(target, state, events) {
    if (!this.running) return false;
    return this.historicalProjectInstance?.queueDamageRuntimeState(target, state, events) ?? false;
  }
  destroyRuntimeEntity(entityId) {
    if (!this.running) return false;
    return this.historicalProjectInstance?.destroyRuntimeEntity(entityId) ?? false;
  }
  /** Loopback-only ingress used by the NEA Script Runtime entity projection bridge. */
  createRuntimeEntity(entity) {
    if (!this.running) return void 0;
    return this.historicalProjectInstance?.createRuntimeEntity(entity);
  }
  /** Loopback-only ingress used by the NEA Script Runtime entity transform bridge. */
  queueRuntimeEntityState(entityId, state) {
    if (!this.running) return false;
    return this.historicalProjectInstance?.queueRuntimeEntityState(entityId, state) ?? false;
  }
  /**
   * Host-only ingress for the recovered player-protocol profile-dialog frame.
   * This is not an HTTP route, project API, profile service, or account bridge.
   */
  openUserProfile(sessionId, userId) {
    if (!this.running) return false;
    return this.historicalProjectInstance?.openUserProfile(sessionId, userId) ?? false;
  }
  /**
   * Host-only ingress for the recovered dialog.open transport. This is not a
   * dialog API bridge, project API, or Player UI implementation.
   */
  sendGuiCommand(sessionId, command) {
    if (!this.running) return false;
    const guiSessions = this.historicalProjectInstance?.guiSessions;
    if (!guiSessions?.hasActiveClient(sessionId)) return false;
    return guiSessions.command(sessionId, command);
  }
  sendSoundCommand(command) {
    if (!this.running) return false;
    return this.historicalProjectInstance?.projectBootstrapSessions.sendSoundCommand(command) ?? false;
  }
  openDialog(sessionId, config) {
    if (!this.running) return false;
    const dialogSessions = this.historicalProjectInstance?.dialogSessions;
    if (!dialogSessions?.hasActiveClient(sessionId)) return false;
    return dialogSessions.open(sessionId, config);
  }
  /** Host-only ingress for cancelling a recovered dialog call. */
  cancelDialog(sessionId, rpcId) {
    if (!this.running) return false;
    const dialogSessions = this.historicalProjectInstance?.dialogSessions;
    if (!dialogSessions?.hasActiveClient(sessionId)) return false;
    return dialogSessions.cancel(sessionId, rpcId);
  }
  /** Host-only ingress for cancelling every recovered dialog call in a session. */
  cancelDialogs(sessionId) {
    if (!this.running) return false;
    const dialogSessions = this.historicalProjectInstance?.dialogSessions;
    if (!dialogSessions?.hasActiveClient(sessionId)) return false;
    return dialogSessions.cancelAll(sessionId);
  }
  async start() {
    if (this.httpServer || this.mudbServer) throw new Error("Server has already been started");
    const protocols = box3Protocols.map((protocol) => protocol.name);
    // Public origin override: when deployed behind a reverse proxy / Cloudflare,
    // the generated session asset/ws URLs must use the PUBLIC origin instead of
    // the loopback listen address. Without this the backend leaks
    // ws://127.0.0.1:<port>/ws into session configs and the proxy has to patch
    // response bodies (sub_filter) — an over-coupling symptom.
    const publicOrigin = () => {
      const configured = process.env.BOX3_PUBLIC_ORIGIN;
      if (configured) return configured.replace(/\/+$/, "");
      return void 0;
    };
    const localOrigin = () => {
      const configured = publicOrigin();
      if (configured) return configured;
      const host = this.host.includes(":") ? `[${this.host}]` : this.host;
      return `http://${host}:${this.port}`;
    };
    const sessionConfigIssuer = new LocalSessionConfigIssuer(() => {
      const configured = publicOrigin();
      if (configured) return socketUrlForOrigin(configured, this.path);
      const host = this.host.includes(":") ? `[${this.host}]` : this.host;
      return `ws://${host}:${this.port}${this.path}`;
    });
    let historicalProjectSessions;
    let historicalProjectInstance;
    const issuedSessions = new IssuedSessionRegistry(
      (socketServerUrl) => sessionConfigIssuer.issue(socketServerUrl),
      {
        ...this.testSessionRegistryOptions,
        onExpired: (sessionId) => {
          historicalProjectSessions.delete(sessionId);
          const expiredDescriptor = historicalProjectSessions.descriptorForSession(sessionId);
          const expiredInstance = expiredDescriptor ? targetInstances.get(expiredDescriptor.target) : void 0;
          expiredInstance?.expireSession(sessionId);
        }
      }
    );
    // Map registry (M1c): one LegacyHistoricalProjectInstance per map slot.
    // Each slot owns its world/project/scripts; the catalog admits any of the
    // registered contentIds and routes the session to that instance.
    const instances = this.mapSlots.map((slot) => new LegacyHistoricalProjectInstance({
      clientScripts: slot.clientScripts,
      clientUiState: slot.clientUiState,
      issuedSessions,
      legacyProject: slot.legacyProject,
      logger: this.logger,
      projectBootstrap: slot.projectBootstrap,
      projectPackagePlayerProjection: slot.projectPackagePlayerProjection,
      playerBodyProfile: slot.playerBodyProfile,
      stats: this.stats,
      world: slot.world
    }));
    const catalogEntries = this.mapSlots
      .map((slot, index) => (slot.contentId && instances[index] ? createHistoricalProjectDescriptor({
        contentId: String(slot.contentId),
        target: createHistoricalProjectTarget(slot.label || "legacy-mounted-runtime", instances[index]),
        available: true
      }) : void 0))
      .filter(Boolean);
    const historicalProjectCatalog = catalogEntries.length > 0 ? new HistoricalProjectCatalog(catalogEntries) : void 0;
    historicalProjectSessions = new HistoricalProjectSessionAdmission({ catalog: historicalProjectCatalog, issuedSessions });
    const protocolContexts = new HistoricalProtocolContextRegistry(historicalProjectSessions);
    instances.forEach((instance, index) => {
      const contentId = this.mapSlots[index].contentId;
      if (contentId && catalogEntries[index]) protocolContexts.register(catalogEntries[index].target, instance.protocolContext);
    });
    const defaultSlot = this.mapSlots[0] ?? {};
    const handler = createRequestHandler({
      stats: this.stats,
      world: defaultSlot.world ?? this.world,
      protocols,
      wsPath: this.path,
      assetStore: this.assetStore,
      clientRuntime: defaultSlot.clientRuntime ?? this.clientRuntime,
      clientScriptModules: Object.keys(defaultSlot.clientScripts ?? this.clientScripts),
      localOrigin,
      issueLocalSession: (contentId, origin) => historicalProjectSessions.issueForContentId(
        contentId,
        socketUrlForOrigin(origin, this.path)
      ),
      projectBootstrap: {
        meshHashes: (defaultSlot.projectBootstrap ?? this.projectBootstrap).meshHashes.length,
        skinHashes: (defaultSlot.projectBootstrap ?? this.projectBootstrap).skinHashes.length,
        skinPartHashBatches: (defaultSlot.projectBootstrap ?? this.projectBootstrap).skinPartHashBatches.map((batch) => batch.length),
        soundDictionary: (defaultSlot.projectBootstrap ?? this.projectBootstrap).soundDictionary.length
      },
      projectBootstrapDiagnostics: () => (instances[0]?.projectBootstrapSessions ?? { diagnosticsSnapshot: () => ({}) }).diagnosticsSnapshot()
    });
    const httpServer = (0, import_node_http.createServer)(handler);
    const transport = createMudbTransport(
      httpServer,
      this.config,
      this.logger,
      issuedSessions,
      historicalProjectSessions,
      protocolContexts
    );
    const mudbServer = new import_mudb.MuServer(transport, this.logger, true);
    registerProtocols(mudbServer, protocolContexts);
    this.httpServer = httpServer;
    this.mudbServer = mudbServer;
    this.mudbTransport = transport;
    this.issuedSessions = issuedSessions;
    this.historicalProjectSessions = historicalProjectSessions;
    this.historicalProtocolContexts = protocolContexts;
    this.historicalProjectInstance = instances[0];
    instances.forEach((instance, index) => {
      const label = this.mapSlots[index]?.label ?? "map";
      if (instance.legacyProjectMount) {
        this.logger.info(`[${label}] Legacy project entities: ${instance.legacyProjectMount.spawned.length} mounted, ${instance.legacyProjectMount.unresolved.length} awaiting mesh mappings`);
      }
      if (instance.projectPackagePlayerProjectionMount) {
        this.logger.info(
          `[${label}] Local v1 Player entity projection: ${instance.projectPackagePlayerProjectionMount.spawned.length} mounted, ${instance.projectPackagePlayerProjectionMount.diagnostics.length} static entities unmapped`
        );
      }
      if (process.env.BOX3_LOG_SCRIPT_INPUT_EVENTS === "1") {
        const legacyBindings = instance.legacyProjectMount?.spawned.map((entry) => ({ sourceId: entry.sourceId, entityId: entry.entityId })) ?? [];
        const projectionBindings = instance.projectPackagePlayerProjectionMount?.spawned.map((entry) => ({ entityIndex: entry.entityIndex, entityId: entry.entityId })) ?? [];
        const entityBindings = [...legacyBindings, ...projectionBindings];
        if (entityBindings.length > 0) this.logger.info(`[${label}] [game-net:entity-map] ${JSON.stringify({ entities: entityBindings })}`);
      }
    });
    const mudbReady = new Promise((resolve9, reject) => {
      mudbServer.start({
        ready: resolve9,
        close: (error) => reject(error instanceof Error ? error : new Error(String(error ?? "mudb transport closed")))
      });
    });
    try {
      await mudbReady;
      trackMudbTransportSessions(transport, issuedSessions);
      await listen(httpServer, this.config.port, this.config.host);
      instances.forEach((instance) => instance.start());
    } catch (error) {
      await this.stop();
      throw error;
    }
    const address = httpServer.address();
    if (!address || typeof address === "string") throw new Error("Server did not bind a TCP port");
    this.boundPort = address.port;
    this.logger.info(`Box3 server: http://${this.host}:${this.port}`);
    this.logger.info(`Box3 WebSocket: ws://${this.host}:${this.port}${this.path}`);
    return this;
  }
  async stop() {
    const httpServer = this.httpServer;
    const mudbServer = this.mudbServer;
    const mudbTransport = this.mudbTransport;
    const issuedSessions = this.issuedSessions;
    const historicalProjectSessions = this.historicalProjectSessions;
    const historicalProtocolContexts = this.historicalProtocolContexts;
    const historicalProjectInstance = this.historicalProjectInstance;
    this.httpServer = void 0;
    this.mudbServer = void 0;
    this.mudbTransport = void 0;
    this.issuedSessions = void 0;
    this.historicalProjectSessions = void 0;
    this.historicalProtocolContexts = void 0;
    this.historicalProjectInstance = void 0;
    this.boundPort = void 0;
    historicalProtocolContexts?.dispose();
    if (historicalProjectInstance) {
      historicalProjectInstance.dispose(() => historicalProjectSessions?.dispose());
    } else {
      historicalProjectSessions?.dispose();
    }
    issuedSessions?.dispose();
    if (mudbTransport) closeMudbTransportClients(mudbTransport);
    if (mudbServer?.running) mudbServer.destroy();
    if (httpServer?.listening) await new Promise((resolve9) => httpServer.close(() => resolve9()));
  }
};
function socketUrlForOrigin(origin, path) {
  const url = new URL(origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${url.origin}${path}`;
}
function listen(server, port, host) {
  return new Promise((resolve9, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve9();
    });
  });
}

// legacy/box3-compat/src/world/archive-world.ts
var import_promises7 = require("node:fs/promises");
var import_node_path9 = require("node:path");

// legacy/box3-compat/src/archive/voxel-chunk.ts
var import_stream3 = __toESM(require_stream(), 1);
var chunkMask = 31;
var maxPaletteEntries = 4096;
var maxBoxes = 32768;
function decodeVoxelChunk(bytes) {
  const input2 = new import_stream3.MuReadStream(bytes);
  const paletteLength = input2.readVarint();
  const boxCount = input2.readVarint();
  if (paletteLength > maxPaletteEntries) throw new RangeError(`Chunk palette is too large: ${paletteLength}`);
  if (boxCount > maxBoxes) throw new RangeError(`Chunk box count is too large: ${boxCount}`);
  const palette = new Array(paletteLength);
  for (let index = 0; index < paletteLength; index++) palette[index] = input2.readVarint();
  const boxes = new Array(boxCount);
  let previousX = 0;
  let previousY = 0;
  let previousZ = 0;
  for (let index = 0; index < boxCount; index++) {
    const minimum = input2.readVarint();
    const size = input2.readVarint();
    const paletteIndex = input2.readVarint();
    if (paletteIndex >= palette.length) throw new RangeError(`Invalid chunk palette index: ${paletteIndex}`);
    const minX = previousX + decodeZigZag(deinterleave3(minimum)) & chunkMask;
    const minY = previousY + decodeZigZag(deinterleave3(minimum >>> 1)) & chunkMask;
    const minZ = previousZ + decodeZigZag(deinterleave3(minimum >>> 2)) & chunkMask;
    const maxX = minX + deinterleave3(size);
    const maxY = minY + deinterleave3(size >>> 1);
    const maxZ = minZ + deinterleave3(size >>> 2);
    if (maxX <= minX || maxY <= minY || maxZ <= minZ || maxX > 32 || maxY > 32 || maxZ > 32) {
      throw new RangeError(`Invalid chunk box bounds at index ${index}: ${minX},${minY},${minZ}..${maxX},${maxY},${maxZ}`);
    }
    boxes[index] = {
      minX,
      minY,
      minZ,
      maxX,
      maxY,
      maxZ,
      block: palette[paletteIndex],
      faces: 0
    };
    previousX = minX;
    previousY = minY;
    previousZ = minZ;
  }
  for (let index = 1; index < boxes.length; index++) {
    if (compareTerrainBoxes(boxes[index - 1], boxes[index]) > 0) {
      throw new Error(`Voxel chunk boxes are not sorted at index ${index}`);
    }
  }
  if (input2.offset !== input2.length) throw new Error(`Voxel chunk has ${input2.length - input2.offset} trailing bytes`);
  return { palette, boxes, bytesRead: input2.offset };
}
function decodeZigZag(value) {
  return value & 1 ? -(value >>> 1) - 1 : value >>> 1;
}
function deinterleave3(value) {
  let result = 1227133513 & value;
  result = 3272356035 & (result | result >>> 2);
  result |= result >>> 4;
  result &= 251719695;
  result |= result >>> 8;
  result &= 4278190335;
  result |= result >>> 16;
  result &= 1023;
  return result;
}

// legacy/box3-compat/src/world/archive-world.ts
var cidV0Pattern = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
var maxUint16 = 65535;
var maxUint325 = 4294967295;
var maxWorldChunks = 1e6;
var ArchiveWorld = class _ArchiveWorld {
  kind;
  manifest;
  chunkBoxes;
  chunkHashes;
  constructor(manifest, chunkBoxes, chunkHashes) {
    this.kind = manifest.layout === "legacy-project" ? "archive-legacy-project" : manifest.layout === "captured" ? "archive-captured" : manifest.layout === "src-main" ? "archive-src-main" : manifest.provenance.placementKnown ? "archive-partial" : "archive-gallery";
    this.manifest = manifest;
    this.chunkBoxes = chunkBoxes;
    this.chunkHashes = chunkHashes;
  }
  static async load(assetRoot, manifestName = "world-bedwars.json") {
    const root = (0, import_node_path9.resolve)(assetRoot);
    const manifestPath = resolveInside4(root, manifestName);
    const value = JSON.parse(await (0, import_promises7.readFile)(manifestPath, "utf8"));
    const manifest = validateManifest3(value);
    const chunkCount = manifest.chunkShape[0] * manifest.chunkShape[1] * manifest.chunkShape[2];
    const chunkHashes = manifest.hashes?.slice() ?? new Array(chunkCount).fill("");
    const chunkBoxes = new Array(chunkCount);
    const blockInfoBytes = await readVerifiedBlockAsset(root, manifest.provenance.blockInfo, "Block catalog");
    const blockInfo = decodeBlockInfo(blockInfoBytes).value;
    const blockIds = new Set(blockInfo.ids);
    const atlasFiles = /* @__PURE__ */ new Set([...blockInfo.colorAtlas, ...blockInfo.materialAtlas, ...blockInfo.bumpAtlas]);
    await Promise.all([...atlasFiles].map((file) => readVerifiedBlockAsset(root, file, "Block atlas")));
    const decodedByHash = /* @__PURE__ */ new Map();
    const loadChunk = (entry) => {
      let pending = decodedByHash.get(entry.hash);
      if (!pending) {
        pending = readVerifiedBlockAsset(root, entry.hash, "Chunk").then((bytes) => {
          const boxes = decodeVoxelChunk(bytes).boxes;
          for (const box of boxes) {
            const blockId = box.block & 4095;
            if (!blockIds.has(blockId)) throw new Error(`Chunk references unknown block id ${blockId}`);
          }
          return { bytes: bytes.byteLength, boxes };
        });
        decodedByHash.set(entry.hash, pending);
      }
      return pending;
    };
    await Promise.all(manifest.chunks.map(async (entry, position) => {
      const index = entry.index ?? position;
      const decoded = await loadChunk(entry);
      if (decoded.bytes !== entry.bytes || decoded.boxes.length !== entry.boxes) {
        throw new Error(`Chunk ${index} does not match its manifest metadata`);
      }
      chunkBoxes[index] = decoded.boxes;
      if (!manifest.hashes) chunkHashes[index] = entry.hash;
    }));
    return new _ArchiveWorld(manifest, chunkBoxes, chunkHashes);
  }
  initialTerrain() {
    return {
      positionX: this.manifest.spawn[0],
      positionY: this.manifest.spawn[1],
      positionZ: this.manifest.spawn[2],
      resetCounter: this.manifest.resetCounter ?? 1,
      nx: this.manifest.voxelShape[0],
      ny: this.manifest.voxelShape[1],
      nz: this.manifest.voxelShape[2],
      innerAO: this.manifest.innerAO ?? false,
      blocks: this.manifest.provenance.blockInfo,
      hashes: this.chunkHashes.slice()
    };
  }
  voxelAt(x, y, z) {
    if (!isVoxelCoordinate3(x, this.manifest.voxelShape[0]) || !isVoxelCoordinate3(y, this.manifest.voxelShape[1]) || !isVoxelCoordinate3(z, this.manifest.voxelShape[2])) return void 0;
    const chunkX = Math.floor(x / 32);
    const chunkY = Math.floor(y / 32);
    const chunkZ = Math.floor(z / 32);
    const chunkId = chunkX + this.manifest.chunkShape[0] * (chunkY + this.manifest.chunkShape[1] * chunkZ);
    const localX = x & 31;
    const localY = y & 31;
    const localZ = z & 31;
    const boxes = this.chunkBoxes[chunkId];
    if (!boxes) return void 0;
    for (const box of boxes) {
      if (localX >= box.minX && localX < box.maxX && localY >= box.minY && localY < box.maxY && localZ >= box.minZ && localZ < box.maxZ) return box.block;
    }
    return 0;
  }
  collisionBoxes(chunkId) {
    return this.chunkBoxes[chunkId]?.map((box) => ({ ...box })) ?? [];
  }
  hashes(request) {
    const chunkIds = normalizeChunkIds(request.chunkIds, this.chunkHashes.length);
    return {
      startI: request.startI,
      startJ: request.startJ,
      startK: request.startK,
      chunksInfo: chunkIds.map((idx) => ({ idx, hash: this.chunkHashes[idx] })),
      dirtyChunks: normalizeChunkIds(request.dirtyChunks, this.chunkHashes.length)
    };
  }
};
function validateManifest3(value) {
  if (!isRecord8(value) || value.format !== "nea-recovered-world" || value.version !== 1) {
    throw new Error("Unsupported world manifest");
  }
  if (typeof value.layout !== "string" || !isRecord8(value.provenance)) throw new Error("Invalid world provenance");
  const provenance = value.provenance;
  if (typeof provenance.blockInfo !== "string" || !cidV0Pattern.test(provenance.blockInfo) || typeof provenance.placementKnown !== "boolean" || typeof provenance.note !== "string") {
    throw new Error("Invalid world provenance");
  }
  if (value.chunkSize !== 32) throw new Error(`Unsupported chunk size: ${String(value.chunkSize)}`);
  if (!isShape(value.chunkShape) || !isShape(value.voxelShape) || !isSpawn(value.spawn)) {
    throw new Error("Invalid world dimensions");
  }
  const chunkShape = value.chunkShape;
  const voxelShape = value.voxelShape;
  const chunkCount = chunkShape[0] * chunkShape[1] * chunkShape[2];
  if (!Number.isSafeInteger(chunkCount) || chunkCount > maxWorldChunks || voxelShape.some((size) => size > maxUint16)) {
    throw new Error("World dimensions exceed compatibility server limits");
  }
  if (voxelShape.some((size, axis) => size !== chunkShape[axis] * 32)) {
    throw new Error("World voxel shape does not match chunk shape");
  }
  if (value.resetCounter !== void 0 && (typeof value.resetCounter !== "number" || !Number.isInteger(value.resetCounter) || value.resetCounter < 0 || value.resetCounter > maxUint325)) {
    throw new Error("Invalid terrain reset counter");
  }
  if (value.innerAO !== void 0 && typeof value.innerAO !== "boolean") throw new Error("Invalid innerAO value");
  if (value.hashes !== void 0) {
    if (!Array.isArray(value.hashes) || value.hashes.length !== chunkCount || !value.hashes.every((hash) => typeof hash === "string" && (hash === "" || cidV0Pattern.test(hash)))) {
      throw new Error("Invalid runtime chunk hash list");
    }
  }
  if (!Array.isArray(value.chunks)) throw new Error("Invalid world chunk list");
  if (!value.hashes && value.chunks.length !== chunkCount) {
    throw new Error("A world without an explicit hash list must contain every chunk");
  }
  const chunks = value.chunks.map((entry, position) => validateChunkEntry(entry, position, chunkCount));
  const indexes = chunks.map((entry, position) => entry.index ?? position);
  if (new Set(indexes).size !== indexes.length) throw new Error("World manifest contains duplicate chunk indexes");
  const hashes = value.hashes;
  if (hashes && chunks.some((entry, position) => {
    const wireHash = hashes[entry.index ?? position];
    return entry.source === "captured-chunk-response" ? wireHash !== "" : wireHash !== entry.hash;
  })) {
    throw new Error("Runtime chunk hashes do not match recovered chunk entries");
  }
  if (value.completeness !== void 0) {
    if (!isRecord8(value.completeness)) throw new Error("Invalid world completeness metadata");
    const completeness = value.completeness;
    const fields = ["chunks", "recovered", "streamed", "unavailable", "uniqueMissingContentAddresses"];
    if (!fields.every((field) => Number.isSafeInteger(completeness[field]) && completeness[field] >= 0)) {
      throw new Error("Invalid world completeness metadata");
    }
    if (completeness.chunks !== chunkCount || completeness.recovered !== chunks.length || completeness.unavailable !== chunkCount - chunks.length) {
      throw new Error("World completeness metadata does not match chunk entries");
    }
    if (completeness.unavailable === 0 && indexes.length !== chunkCount) {
      throw new Error("Complete world manifest does not cover every chunk index");
    }
  }
  return value;
}
function validateChunkEntry(value, position, chunkCount) {
  if (!isRecord8(value)) throw new Error(`Invalid world chunk entry at ${position}`);
  const index = value.index ?? position;
  if (!Number.isSafeInteger(index) || index < 0 || index >= chunkCount || typeof value.hash !== "string" || !cidV0Pattern.test(value.hash) || !Number.isSafeInteger(value.bytes) || value.bytes <= 0 || !Number.isSafeInteger(value.boxes) || value.boxes < 0 || value.source !== void 0 && typeof value.source !== "string") {
    throw new Error(`Invalid world chunk entry at ${position}`);
  }
  return value;
}
async function readVerifiedBlockAsset(root, filename, label) {
  if (!contentAddressFromFilename(filename)) throw new Error(`${label} has an invalid content-addressed filename`);
  const bytes = await (0, import_promises7.readFile)((0, import_node_path9.resolve)(root, "block", filename));
  if (verifyContentAddress(filename, bytes) !== true) {
    throw new Error(`${label} does not match content address ${filename}`);
  }
  return bytes;
}
function resolveInside4(root, path) {
  const target = (0, import_node_path9.resolve)(root, path);
  const local = (0, import_node_path9.relative)(root, target);
  if (local === "" || local.startsWith("..") || (0, import_node_path9.isAbsolute)(local)) throw new Error("World manifest must be inside the archive root");
  return target;
}
function isVoxelCoordinate3(value, bound) {
  return Number.isInteger(value) && value >= 0 && value < bound;
}
function isShape(value) {
  return Array.isArray(value) && value.length === 3 && value.every((item) => Number.isSafeInteger(item) && item > 0);
}
function isSpawn(value) {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "number" && Number.isFinite(item));
}
function isRecord8(value) {
  return typeof value === "object" && value !== null;
}

// legacy/box3-compat/src/bundled-cli.ts
async function main() {
  const config = resolveServerConfig();
  const logger = createConsoleLogger();
  const projectRoot = process.env.BOX3_PROJECT_ROOT;
  const playerBodyProfile = parsePlayerBodyProfile(process.env.BOX3_PLAYER_BODY_PROFILE);
  if (projectRoot && !playerBodyProfile) throw new Error("BOX3_PLAYER_BODY_PROFILE is required for project-package Player sessions");
  const projectBlockInfo = process.env.BOX3_PROJECT_BLOCK_INFO;
  if (projectBlockInfo && !projectRoot) {
    throw new Error("BOX3_PROJECT_BLOCK_INFO requires BOX3_PROJECT_ROOT");
  }
  const projectResetCounter = optionalProjectResetCounter(process.env.BOX3_PROJECT_RESET_COUNTER);
  const projectInnerAO = optionalProjectInnerAO(process.env.BOX3_PROJECT_INNER_AO);
  if ((projectResetCounter !== void 0 || projectInnerAO !== void 0) && !projectRoot) {
    throw new Error("Project terrain metadata requires BOX3_PROJECT_ROOT");
  }
  const projectionDescriptor = process.env.BOX3_PLAYER_PROJECTION_DESCRIPTOR;
  if (projectionDescriptor && !projectRoot) {
    throw new Error("BOX3_PLAYER_PROJECTION_DESCRIPTOR requires BOX3_PROJECT_ROOT");
  }
  const projectWorld = projectRoot ? await loadProjectPackageCompatibilityWorld(projectRoot, config.assetRoot, {
    ...projectBlockInfo ? { blocks: projectBlockInfo } : {},
    ...projectResetCounter === void 0 ? {} : { resetCounter: projectResetCounter },
    ...projectInnerAO === void 0 ? {} : { innerAO: projectInnerAO }
  }) : void 0;
  const mapRegistryPath = process.env.BOX3_MAP_REGISTRY;
  let mapSlots;
  if (mapRegistryPath) {
    // Map registry mode (M1c): BOX3_MAP_REGISTRY points at a JSON file with a
    // non-empty "maps" array. Each entry declares a contentId and its own
    // world/project manifests, so adding a map = adding a registry entry +
    // archive files; the client selects it via ?contentId=.
    const registryText = await require("node:fs/promises").readFile(mapRegistryPath, "utf8");
    const registry = JSON.parse(registryText);
    if (!Array.isArray(registry.maps) || registry.maps.length === 0) {
      throw new Error("BOX3_MAP_REGISTRY must contain a non-empty maps array");
    }
    mapSlots = [];
    for (const entry of registry.maps) {
      if (!entry.contentId || !entry.world) throw new Error("Each map registry entry requires contentId and world");
      const slotWorld = await ArchiveWorld.load(config.assetRoot, entry.world);
      const slotRuntime = await loadClientRuntime(config.assetRoot, entry.clientRuntime);
      const slotScripts = await loadClientScriptModules(config.assetRoot, entry.clientScripts);
      const slotUi = await loadClientUiState(config.assetRoot, entry.clientUi);
      const slotBootstrap = await loadProjectBootstrap(config.assetRoot, entry.bootstrap);
      mapSlots.push({
        contentId: String(entry.contentId),
        label: entry.label || `map-${entry.contentId}`,
        world: slotWorld,
        clientRuntime: slotRuntime,
        clientScripts: slotScripts,
        clientUiState: slotUi,
        projectBootstrap: slotBootstrap,
        playerBodyProfile,
      });
    }
  } else {
    const world = projectWorld ?? await ArchiveWorld.load(config.assetRoot, config.worldManifest);
    const clientRuntimeManifest = process.env.BOX3_CLIENT_RUNTIME_MANIFEST;
    const clientRuntime = await loadClientRuntime(config.assetRoot, clientRuntimeManifest);
    if (projectWorld) clientRuntime.bindProjectIdentity(projectWorld.project.manifest.packageId, projectWorld.project.manifest.display?.name ?? projectWorld.project.manifest.packageId);
    const clientScriptManifest = process.env.BOX3_CLIENT_SCRIPT_MANIFEST;
    const clientScripts = projectRoot && !clientScriptManifest ? Object.freeze({}) : await loadClientScriptModules(config.assetRoot, clientScriptManifest);
    const clientUiManifest = process.env.BOX3_CLIENT_UI_MANIFEST;
    const clientUiState = await loadClientUiState(config.assetRoot, clientUiManifest);
    const projectBootstrapManifest = process.env.BOX3_PROJECT_BOOTSTRAP_MANIFEST;
    const projectBootstrap = await loadProjectBootstrap(config.assetRoot, projectBootstrapManifest);
    const projectPackagePlayerProjection = projectionDescriptor && projectWorld ? await loadProjectPackagePlayerProjection(projectWorld.project, projectBootstrap, projectionDescriptor) : void 0;
    mapSlots = [{
      contentId: clientRuntime.contentId,
      label: "legacy-mounted-runtime",
      world,
      clientRuntime,
      clientScripts,
      clientUiState,
      projectBootstrap,
      projectPackagePlayerProjection: projectPackagePlayerProjection === void 0 ? void 0 : { projection: projectPackagePlayerProjection },
      playerBodyProfile,
    }];
    if (clientUiManifest) logger.info(`Client UI manifest: ${clientUiManifest} nodes=${Object.keys(clientUiState.uiTree).length}`);
  }
  const server = await new Box3Server({
    ...config,
    mapSlots,
    logger,
  }).start();
  const neaControlServer = await startNeaControlBridge(server, logger);
  if (projectRoot) logger.info(`Player compatibility project package: ${projectRoot}`);
  if (playerBodyProfile) logger.info(`Player body profile: ${playerBodyProfile.profileId} halfExtents=${playerBodyProfile.halfExtents.join(",")} sizeStatus=${playerBodyProfile.sizeStatus}`);
  if (projectionDescriptor) logger.info(`Local Player entity projection descriptor: ${projectionDescriptor}`);
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await stopNeaControlBridge(neaControlServer);
    await server.stop();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
function optionalProjectResetCounter(value) {
  if (value === void 0 || value === "") return void 0;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maxUint324) throw new Error("BOX3_PROJECT_RESET_COUNTER must be a uint32");
  return parsed;
}
function optionalProjectInnerAO(value) {
  if (value === void 0 || value === "") return void 0;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new Error("BOX3_PROJECT_INNER_AO must be a boolean");
}
async function startNeaControlBridge(server, logger) {
  const token = process.env.BOX3_CONTROL_TOKEN;
  const portText = process.env.BOX3_CONTROL_PORT;
  if (!token || !portText) return void 0;
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("BOX3_CONTROL_PORT must be a valid TCP port");
  const controlServer = (0, import_node_http2.createServer)(async (request, response) => {
    response.setHeader("content-type", "application/json; charset=utf-8");
    if (request.socket.remoteAddress !== "127.0.0.1" && request.socket.remoteAddress !== "::1") {
      response.statusCode = 403;
      response.end(JSON.stringify({ ok: false, error: "loopback only" }));
      return;
    }
    if (request.headers.authorization !== "Bearer " + token) {
      response.statusCode = 401;
      response.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      return;
    }
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (request.method === "GET" && url.pathname === "/__nea/control/player-state") {
        const session = url.searchParams.get("session");
        if (!session) throw new Error("session is required");
        const state = server.playerRuntimeState(session);
        response.statusCode = state ? 200 : 404;
        response.end(JSON.stringify(state ? { ok: true, state } : { ok: false, error: "player state not found" }));
        return;
      }
      const chunks = [];
      let bytes = 0;
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 64 * 1024) throw new Error("request body too large");
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (request.method === "POST" && url.pathname === "/__nea/control/send-client-event") {
        if (typeof body.session !== "string" || body.session.length === 0 || !Object.prototype.hasOwnProperty.call(body, "event")) {
          throw new Error("session and event are required");
        }
        const delivered = server.sendRemoteClientEvent(body.session, body.event);
        response.statusCode = delivered ? 200 : 404;
        response.end(JSON.stringify(delivered ? { ok: true } : { ok: false, error: "session not connected" }));
        return;
      }
      if (request.method === "POST" && url.pathname === "/__nea/control/sound-command") {
        const command = body.command;
        if (!command || typeof command !== "object" || Array.isArray(command)) throw new Error("sound command is required");
        if (!Number.isSafeInteger(command.soundId) || command.soundId < 1) throw new Error("soundId must be a positive safe integer");
        if (!["play", "resume", "pause", "stop", "setCurrentTime", "setCurrentTimeAndResume"].includes(command.action)) throw new Error("invalid sound command action");
        if (command.action === "play") {
          if (typeof command.sample !== "string" || command.sample.length === 0) throw new Error("sound sample is required");
          if (!Number.isFinite(command.gain) || command.gain < 0) throw new Error("sound gain must be non-negative");
          if (!Number.isFinite(command.pitch) || command.pitch < 0.1) throw new Error("sound pitch must be at least 0.1");
          if (!Number.isFinite(command.radius) || command.radius < 0) throw new Error("sound radius must be non-negative");
          const position = command.position;
          if (!position || typeof position !== "object" || !["global", "player", "entity", "position"].includes(position.type)) throw new Error("invalid sound position");
          if (position.type === "position" && !isNeaVector(position.data)) throw new Error("sound position data must be a finite vector");
          if ((position.type === "player" || position.type === "entity") && (!Number.isSafeInteger(position.data) || position.data < 1)) throw new Error("sound target must be a positive entity id");
        } else if ((command.action === "setCurrentTime" || command.action === "setCurrentTimeAndResume") && !Number.isFinite(command.currentTime)) {
          throw new Error("sound currentTime must be finite");
        }
        const delivered = server.sendSoundCommand(command);
        response.statusCode = delivered === false ? 404 : 200;
        response.end(JSON.stringify(delivered === false ? { ok: false, error: "sound client not connected" } : { ok: true, delivered }));
        return;
      }
      if (request.method === "POST" && url.pathname === "/__nea/control/gui-command") {
        if (typeof body.session !== "string" || body.session.length === 0 || !body.command || typeof body.command !== "object" || Array.isArray(body.command)) {
          throw new Error("session and GUI command are required");
        }
        const pending = server.sendGuiCommand(body.session, body.command);
        if (pending === false) {
          response.statusCode = 404;
          response.end(JSON.stringify({ ok: false, error: "GUI client not connected" }));
          return;
        }
        const result = await pending;
        response.statusCode = 200;
        response.end(JSON.stringify({ ok: true, result }));
        return;
      }
      if (request.method === "POST" && url.pathname === "/__nea/control/dialog") {
        if (typeof body.session !== "string" || body.session.length === 0 || !body.config || typeof body.config !== "object" || Array.isArray(body.config)) {
          throw new Error("session and dialog config are required");
        }
        const pending = server.openDialog(body.session, body.config);
        if (pending === false) {
          response.statusCode = 404;
          response.end(JSON.stringify({ ok: false, error: "dialog client not connected" }));
          return;
        }
        const result = await pending;
        response.statusCode = 200;
        response.end(JSON.stringify({ ok: true, result }));
        return;
      }
      if (request.method === "POST" && url.pathname === "/__nea/control/dialog-cancel-all") {
        if (typeof body.session !== "string" || body.session.length === 0) throw new Error("dialog session is required");
        const cancelled = server.cancelDialogs(body.session);
        if (cancelled === false) {
          response.statusCode = 404;
          response.end(JSON.stringify({ ok: false, error: "dialog client not connected" }));
          return;
        }
        response.statusCode = 200;
        response.end(JSON.stringify({ ok: true, cancelled }));
        return;
      }
      if (request.method === "POST" && url.pathname === "/__nea/control/chat-message") {
        if (body.deliveries !== void 0) {
          const delivered = server.sendChatMessages(body.deliveries);
          response.statusCode = 200;
          response.end(JSON.stringify({ ok: true, delivered }));
          return;
        }
        if (body.session !== void 0 && (typeof body.session !== "string" || body.session.length === 0)) throw new Error("chat session must be a non-empty string");
        const delivered = server.sendChatMessage(body.session, body.message);
        if (body.session !== void 0 && delivered === false) {
          response.statusCode = 404;
          response.end(JSON.stringify({ ok: false, error: "chat client not connected" }));
          return;
        }
        response.statusCode = 200;
        response.end(JSON.stringify({ ok: true, delivered: body.session === void 0 ? delivered : 1 }));
        return;
      }
      if (request.method === "POST" && url.pathname === "/__nea/control/player-state") {
        if (typeof body.session !== "string" || body.session.length === 0 || !body.state || typeof body.state !== "object" || Array.isArray(body.state)) {
          throw new Error("session and state are required");
        }
        const state = body.state;
        if (state.position !== void 0 && !isNeaVector(state.position)) throw new Error("position must be a finite vector");
        if (state.velocity !== void 0 && !isNeaVector(state.velocity)) throw new Error("velocity must be a finite vector");
        if (state.avatarSkin !== void 0 && !isRuntimeAvatarSkin(state.avatarSkin)) throw new Error("avatarSkin must contain unsigned ids for every body part");
        for (const field of neaPlayerPublicNumberFields) {
          if (state[field] !== void 0 && !isNeaPlayerPublicNumber(state[field])) throw new Error(field + " must be a finite number from 0 to 1024");
        }
        const queued = server.queuePlayerRuntimeState(body.session, state);
        response.statusCode = queued ? 202 : 404;
        response.end(JSON.stringify(queued ? { ok: true, queued: true } : { ok: false, error: "player state not found" }));
        return;
      }
      if (request.method === "POST" && url.pathname === "/__nea/control/player-kick") {
        if (typeof body.session !== "string" || body.session.length === 0) throw new Error("kick session is required");
        const kicked = server.kickPlayer(body.session);
        response.statusCode = kicked ? 202 : 404;
        response.end(JSON.stringify(kicked ? { ok: true, kicked: true } : { ok: false, error: "player session not found" }));
        return;
      }
      if (request.method === "POST" && url.pathname === "/__nea/control/player-link") {
        if (typeof body.session !== "string" || body.session.length === 0 || typeof body.href !== "string") throw new Error("link session and href are required");
        if (body.options !== void 0 && (!body.options || typeof body.options !== "object" || Array.isArray(body.options))) throw new Error("link options must be an object");
        const delivered = server.linkPlayer(body.session, body.href, body.options);
        response.statusCode = delivered ? 200 : 404;
        response.end(JSON.stringify(delivered ? { ok: true, delivered: true } : { ok: false, error: "ref client not connected" }));
        return;
      }
      if (request.method === "POST" && url.pathname === "/__nea/control/damage-state") {
        const hasSession = typeof body.session === "string" && body.session.length > 0;
        const hasEntityId = Number.isSafeInteger(body.entityId) && body.entityId > 0;
        if (hasSession === hasEntityId || !body.state || typeof body.state !== "object" || Array.isArray(body.state)) {
          throw new Error("exactly one damage target and a state object are required");
        }
        if (body.events !== void 0 && (!body.events || typeof body.events !== "object" || Array.isArray(body.events))) {
          throw new Error("damage events must be an object");
        }
        const queued = server.queueDamageRuntimeState(
          hasSession ? { sessionLabel: body.session } : { entityId: body.entityId },
          body.state,
          body.events ?? {}
        );
        response.statusCode = queued ? 202 : 404;
        response.end(JSON.stringify(queued ? { ok: true, queued: true } : { ok: false, error: "damage target not found" }));
        return;
      }
      if (request.method === "POST" && url.pathname === "/__nea/control/entity-destroy") {
        if (!Number.isSafeInteger(body.entityId) || body.entityId < 1) throw new Error("entityId must be a positive safe integer");
        const destroyed = server.destroyRuntimeEntity(body.entityId);
        response.statusCode = destroyed ? 200 : 404;
        response.end(JSON.stringify(destroyed ? { ok: true, destroyed: true } : { ok: false, error: "entity not found" }));
        return;
      }
      if (request.method === "POST" && url.pathname === "/__nea/control/entity-create") {
        const created = server.createRuntimeEntity(body.entity);
        if (!created) {
          response.statusCode = 422;
          response.end(JSON.stringify({ ok: false, error: "runtime entity mesh is not available" }));
          return;
        }
        response.statusCode = 200;
        response.end(JSON.stringify({ ok: true, entityId: created.entityId }));
        return;
      }
      if (request.method === "POST" && url.pathname === "/__nea/control/entity-state") {
        if (!Number.isSafeInteger(body.entityId) || body.entityId < 1) throw new Error("entityId must be a positive safe integer");
        const queued = server.queueRuntimeEntityState(body.entityId, body.state);
        response.statusCode = queued ? 202 : 404;
        response.end(JSON.stringify(queued ? { ok: true, queued: true } : { ok: false, error: "entity not found" }));
        return;
      }
      response.statusCode = 404;
      response.end(JSON.stringify({ ok: false, error: "not found" }));
    } catch (error) {
      response.statusCode = 400;
      response.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    }
  });
  await new Promise((resolve9, reject) => {
    controlServer.once("error", reject);
    controlServer.listen(port, "127.0.0.1", () => {
      controlServer.off("error", reject);
      resolve9();
    });
  });
  logger.info("[nea-control] listening on 127.0.0.1:" + port);
  return controlServer;
}
async function stopNeaControlBridge(server) {
  if (!server?.listening) return;
  await new Promise((resolve9, reject) => server.close((error) => error ? reject(error) : resolve9()));
}
function isNeaVector(value) {
  return Array.isArray(value) && value.length === 3 && value.every((component) => typeof component === "number" && Number.isFinite(component));
}
var neaPlayerPublicNumberFields = Object.freeze([
  "walkSpeed",
  "runSpeed",
  "runAcceleration",
  "jumpPower",
  "jumpSpeedFactor",
  "jumpAccelerationFactor",
  "doubleJumpPower",
  "crouchSpeed",
  "crouchAcceleration",
  "flySpeed",
  "flyAcceleration",
  "swimAcceleration",
  "swimSpeed",
  "walkAcceleration"
]);
function isNeaPlayerPublicNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1024;
}
function neaPlayerPublicState(source) {
  const state = {};
  for (const field of neaPlayerPublicNumberFields) {
    const value = source[field];
    if (isNeaPlayerPublicNumber(value)) state[field] = value;
  }
  if (isRuntimeAvatarSkin(source.avatarSkin)) state.avatarSkin = copyRuntimeAvatarSkin(source.avatarSkin);
  return state;
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
