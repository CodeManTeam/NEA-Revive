import { createHash } from "node:crypto";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function cidV0(bytes) {
  const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), createHash("sha256").update(bytes).digest()]);
  let value = BigInt(`0x${multihash.toString("hex")}`);
  let encoded = "";
  while (value > 0n) {
    const remainder = Number(value % 58n);
    encoded = ALPHABET[remainder] + encoded;
    value /= 58n;
  }
  for (const byte of multihash) {
    if (byte !== 0) break;
    encoded = ALPHABET[0] + encoded;
  }
  return encoded;
}
