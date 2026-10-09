const KEY_EVEN = Uint8Array.from([
  0xbd, 0xde, 0xef, 0xf7, 0xfb, 0x7d, 0x3e, 0x9f, 0xcf, 0xe7, 0xf3, 0xf9, 0xfc, 0xfe, 0xff, 0xff,
]);
const KEY_ODD = new Uint8Array(16).fill(0xff);
const KEYSTREAM = new Uint8Array([...KEY_EVEN, ...KEY_ODD]);
const JET4_MAGIC = new TextEncoder().encode("Standard Jet DB");

/** XOR decode file .SMD (port persis js/core/engine.js#decodeSmd) */
export function decodeSmd(raw: Uint8Array): Uint8Array {
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw[i] ^ KEYSTREAM[i % 32];
  return out;
}

export function hasJetMagic(dec: Uint8Array): boolean {
  if (dec.length < 24) return false;
  if (!(dec[0] === 0 && dec[1] === 1 && dec[2] === 0 && dec[3] === 0)) return false;
  for (let i = 0; i < JET4_MAGIC.length; i++) if (dec[4 + i] !== JET4_MAGIC[i]) return false;
  return true;
}
