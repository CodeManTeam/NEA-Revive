import { readFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import vm from "node:vm";

const textEncoder = new TextEncoder();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = textEncoder.encode(type);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);
  const result = new Uint8Array(12 + data.length);
  const view = new DataView(result.buffer);
  view.setUint32(0, data.length, false);
  result.set(body, 4);
  view.setUint32(result.length - 4, crc32(body), false);
  return result;
}

function encodeRgbaPng(width, height, rgba) {
  const scanlines = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    scanlines.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), rowStart + 1);
  }
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width, false);
  headerView.setUint32(4, height, false);
  header[8] = 8;
  header[9] = 6;
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const compressed = new Uint8Array(deflateSync(scanlines));
  const chunks = [signature, pngChunk("IHDR", header), pngChunk("IDAT", compressed), pngChunk("IEND", new Uint8Array())];
  const output = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function createCanvasDocument() {
  return {
    createElement(type) {
      if (type !== "canvas") throw new Error(`Unsupported document element: ${type}`);
      const canvas = {
        width: 0,
        height: 0,
        _rgba: new Uint8Array(),
        getContext(kind) {
          if (kind !== "2d") return null;
          return {
            createImageData(width, height) {
              return { width, height, data: new Uint8ClampedArray(width * height * 4) };
            },
            putImageData(imageData) {
              canvas._rgba = new Uint8Array(imageData.data);
            },
          };
        },
        toBlob(callback) {
          const png = encodeRgbaPng(canvas.width, canvas.height, canvas._rgba);
          callback(new Blob([png], { type: "image/png" }));
        },
      };
      return canvas;
    },
  };
}

function createContext() {
  const context = {
    console,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Uint8ClampedArray,
    Uint16Array,
    Float32Array,
    ArrayBuffer,
    DataView,
    Math,
    JSON,
    Number,
    String,
    Object,
    Array,
    Promise,
    Error,
    Map,
    Set,
    Blob,
    Buffer,
    atob,
    btoa,
    fetch,
  };
  context.window = context;
  context.globalThis = context;
  context.document = createCanvasDocument();
  return context;
}

export async function loadVbConverter(converterPath) {
  const source = await readFile(converterPath, "utf8");
  const context = createContext();
  vm.runInNewContext(source, context, { filename: converterPath });
  if (!context.VBConverter) throw new Error(`Invalid VB converter: ${converterPath}`);
  return context.VBConverter;
}

export async function convertVbBuffer(converter, bytes, name) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const [vox, gltf] = await Promise.all([
    Promise.resolve(converter.convertVbToVox(input)),
    converter.convertVbToGltf(input, name),
  ]);
  return { vox: new Uint8Array(vox), gltf: gltf.gltfText, summary: gltf.summary };
}
