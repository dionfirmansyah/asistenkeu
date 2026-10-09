import { Buffer } from "buffer";

// mdb-reader butuh Node Buffer & process di browser.
// Diimpor pertama di main.tsx agar polyfill jalan sebelum modul mdb-reader dievaluasi.
const g = globalThis as unknown as { Buffer?: typeof Buffer; process?: unknown };
if (typeof g.Buffer === "undefined") {
  g.Buffer = Buffer;
}
if (typeof g.process === "undefined") {
  g.process = { env: {}, version: "v20.0.0", browser: true };
}
