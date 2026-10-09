const BASE = "http://127.0.0.1:8743";

async function withTimeout(ms: number): Promise<AbortSignal> {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

export interface ServerStatus {
  ok: boolean;
  driver: string | null;
  nodeBits: number | string;
}

export async function serverStatus(): Promise<ServerStatus | null> {
  try {
    const r = await fetch(`${BASE}/api/status`, { signal: await withTimeout(2500) });
    if (!r.ok) return null;
    return (await r.json()) as ServerStatus;
  } catch {
    return null;
  }
}

export interface PatchResult {
  ok: boolean;
  applied?: number;
  verified?: number;
  inserted?: number;
  mismatches?: string[];
  smdBase64?: string;
  outName?: string;
  error?: string;
}

export async function patchSpp(body: {
  fileName: string;
  smdBase64: string;
  edits: Array<{ table: string; keys: Record<string, string>; sets: Record<string, unknown> }>;
  inserts?: Array<{ table: string; values: Record<string, unknown> }>;
  password?: string;
}): Promise<PatchResult> {
  const r = await fetch(`${BASE}/api/patch-spp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await r.json()) as PatchResult;
}

export function downloadBase64(name: string, b64: string): void {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const u = URL.createObjectURL(new Blob([buf], { type: "application/octet-stream" }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1500);
}
