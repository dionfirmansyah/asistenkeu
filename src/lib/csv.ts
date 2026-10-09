import { vt } from "@/lib/engine/util";

const csvCell = (v: unknown): string => {
  const s = vt(v);
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCSV = (cols: [string, string][], rows: Record<string, unknown>[]): string =>
  "\uFEFF" +
  [cols.map((c) => csvCell(c[1])), ...rows.map((r) => cols.map((c) => csvCell(r[c[0]])))]
    .map((a) => a.join(","))
    .join("\r\n");

export function download(name: string, text: string, mime = "text/csv;charset=utf-8"): void {
  const u = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1500);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text.replace(/^\uFEFF/, ""));
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text.replace(/^\uFEFF/, "");
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}
