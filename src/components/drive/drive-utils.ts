import type { ComponentType } from "react";
import { File as FileIcon, FileSpreadsheet, FileText, Folder, Image as ImageIcon, Link2, Presentation } from "lucide-react";
import type { DriveItem } from "@/lib/googleDrive";
import {
  downloadFile,
  exportGoogleFile,
  GOOGLE_EXPORT_MIME,
  googleKindOf,
  isFolder,
  isGoogleNative,
  isShortcut,
} from "@/lib/googleDrive";

export type DriveIcon = ComponentType<{ className?: string }>;

const modifiedFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "10 Okt 2026 14.32" — bila tidak ada waktu, tetap tampil tanggalnya. */
export function formatModified(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return modifiedFmt.format(date);
}

export function itemIcon(item: Pick<DriveItem, "mimeType">): DriveIcon {
  if (isFolder(item)) return Folder;
  if (isShortcut(item)) return Link2;
  const kind = googleKindOf(item.mimeType);
  if (kind === "document") return FileText;
  if (kind === "spreadsheet") return FileSpreadsheet;
  if (kind === "presentation") return Presentation;
  if (item.mimeType.startsWith("image/")) return ImageIcon;
  if (item.mimeType === "application/pdf") return FileText;
  return FileIcon;
}

export function isPreviewable(item: Pick<DriveItem, "mimeType">): boolean {
  if (isFolder(item) || isGoogleNative(item) || isShortcut(item)) return false;
  return item.mimeType.startsWith("image/") || item.mimeType === "application/pdf";
}

function withExtension(name: string, ext: string): string {
  const lower = name.toLowerCase();
  return lower.endsWith(`.${ext}`) ? name : `${name}.${ext}`;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Unduh isi file. File Google native diekspor dulu
 * (default: Docs → .docx, Sheets → .xlsx, Slides → .pptx; `pdf` memakai PDF).
 */
export async function downloadDriveItem(item: DriveItem, options: { pdf?: boolean } = {}): Promise<void> {
  if (isFolder(item)) return;
  let blob: Blob;
  let filename = item.name;
  if (isGoogleNative(item)) {
    const kind = googleKindOf(item.mimeType);
    const pack = kind ? GOOGLE_EXPORT_MIME[kind] : null;
    const mime = !pack || options.pdf ? "application/pdf" : pack.office;
    const ext = !pack || options.pdf ? "pdf" : pack.officeExt;
    blob = await exportGoogleFile(item.id, mime);
    filename = withExtension(filename, ext);
  } else {
    blob = await downloadFile(item.id);
  }
  saveBlob(blob, filename);
}

/** Buka tautan Drive di tab baru (tanpa token di URL). */
export function openInDrive(item: DriveItem): void {
  if (!item.webViewLink) return;
  window.open(item.webViewLink, "_blank", "noopener,noreferrer");
}

/** Batas folder per batch agar tidak kena rate limit Drive. */
export const MAX_BULK_FOLDERS = 50;

/**
 * Pecah textarea menjadi daftar nama folder: satu per baris,
 * buang baris kosong, jaga urutan pertama.
 */
export function parseFolderNames(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Salin teks lewat Clipboard API dengan fallback textarea lawas. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn("Clipboard API gagal, coba fallback.", e);
  }
  try {
    if (typeof document === "undefined") return false;
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch (e) {
    console.warn("Gagal menyalin tautan.", e);
    return false;
  }
}
