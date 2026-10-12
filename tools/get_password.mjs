import { readFileSync } from "fs";
import MDBReader from "mdb-reader";

// --- port decodeSmd dari engine.js (XOR 32-byte) ---
const KEY_EVEN = Uint8Array.from([0xbd,0xde,0xef,0xf7,0xfb,0x7d,0x3e,0x9f,0xcf,0xe7,0xf3,0xf9,0xfc,0xfe,0xff,0xff]);
const KEY_ODD = new Uint8Array(16).fill(0xff);
const KEYSTREAM = new Uint8Array([...KEY_EVEN, ...KEY_ODD]);
function decodeSmd(raw) {
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw[i] ^ KEYSTREAM[i % 32];
  return out;
}

const path = process.argv[2];
if (!path) { console.error("Pakai: node get_password.mjs <file.smd>"); process.exit(1); }

const raw = readFileSync(path);
const dec = decodeSmd(new Uint8Array(raw));
const reader = new MDBReader(Buffer.from(dec));

console.log("Creation date :", reader.getCreationDate());
console.log("Password      :", reader.getPassword());