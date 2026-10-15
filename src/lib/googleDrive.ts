/**
 * Data layer Google Drive API v3 — tanpa backend, langsung dari browser.
 * Token OAuth hanya di memori modul (tidak pernah ke storage).
 */

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
export const DRIVE_API = "https://www.googleapis.com";
export const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

export const FOLDER_MIME = "application/vnd.google-apps.folder";
export const SHORTCUT_MIME = "application/vnd.google-apps.shortcut";

const FIELDS =
  "id,name,mimeType,size,modifiedTime,webViewLink,parents,trashed,capabilities(canAddChildren,canRename,canTrash,canDownload)";

/** Batas unggah per file (bisa diubah): 100 MB agar browser tidak kehabisan memori. */
export const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;
/** Batas multipart 5 MB; di atasnya memakai resumable upload. */
export const MULTIPART_LIMIT = 5 * 1024 * 1024;
/** Batas ekspor Google Drive per file: 10 MB (di atasnya Google menolak export). */
export const EXPORT_SIZE_LIMIT = 10 * 1024 * 1024;

export interface DriveCapabilities {
  canAddChildren?: boolean;
  canRename?: boolean;
  canTrash?: boolean;
  canDownload?: boolean;
}

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
  trashed?: boolean;
  capabilities?: DriveCapabilities;
}

export type GoogleDocKind = "document" | "spreadsheet" | "presentation";

export const GOOGLE_MIME: Record<GoogleDocKind, string> = {
  document: "application/vnd.google-apps.document",
  spreadsheet: "application/vnd.google-apps.spreadsheet",
  presentation: "application/vnd.google-apps.presentation",
};

export const GOOGLE_EXPORT_MIME: Record<GoogleDocKind, { office: string; officeExt: string; pdf: string }> = {
  document: {
    office: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    officeExt: "docx",
    pdf: "application/pdf",
  },
  spreadsheet: {
    office: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    officeExt: "xlsx",
    pdf: "application/pdf",
  },
  presentation: {
    office: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    officeExt: "pptx",
    pdf: "application/pdf",
  },
};

export class DriveError extends Error {
  status: number;
  reason: string;
  constructor(status: number, reason: string, message?: string) {
    super(message ?? reason);
    this.name = "DriveError";
    this.status = status;
    this.reason = reason;
  }
}

/** True bila error berarti sesi/token kedaluwarsa (401) — UI menampilkan banner "Sesi berakhir". */
export function isAuthError(e: unknown): boolean {
  return e instanceof DriveError && (e.status === 401 || e.reason === "unauthorized");
}

/** True bila item tidak ditemukan (404) — folder perlu dimuat ulang. */
export function isNotFound(e: unknown): boolean {
  return e instanceof DriveError && e.status === 404;
}

/** Pesan yang aman ditampilkan ke pengguna (tanpa token/URL), sesuai tabel penanganan error. */
export function describeError(e: unknown): string {
  if (e instanceof DriveError) {
    if (isAuthError(e)) return "Sesi berakhir. Masuk lagi.";
    if (e.reason === "insufficientPermissions") return e.message;
    if (e.status === 404 || e.reason === "notFound") {
      return "Item tidak ditemukan — mungkin sudah dipindah atau dibuang.";
    }
    if (e.status === 429 || e.reason === "userRateLimitExceeded" || e.reason === "rateLimitExceeded") {
      return "Permintaan terlalu sering. Tunggu sebentar lalu coba lagi.";
    }
    if (e.status >= 500) return "Layanan Drive sedang bermasalah. Coba lagi beberapa saat.";
    if (e.reason === "aborted") return "Unggahan dibatalkan.";
    if (/quota|too large|export/i.test(e.message)) {
      return "File terlalu besar untuk diekspor (batas 10 MB). Buka di Google Drive untuk mengunduh.";
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return "Terjadi kesalahan yang tidak dikenal. Coba lagi.";
}

// ---- state token (memori modul + salinan sesi di sessionStorage per-tab) ----
//
// PRD minta token hanya hidup di memori. Atas keputusan pengguna, token juga
// disimpan di `sessionStorage` (scope per-tab, ikut hilang saat tab ditutup)
// agar refresh halaman tidak perlu login ulang. Hapus blok penyimpanan di
// bawah ini untuk kembali patuh penuh pada PRD.

const TOKEN_STORAGE_KEY = "driveToken";

let accessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Ambil ID folder dari nilai `VITE_ROOT_FOLDER_ID`.
 * Menerima ID polos maupun tautan Drive (`.../drive/folders/<id>?usp=...`).
 */
export function folderIdFromSetting(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  const folderMatch = /\/folders\/([^/?#]+)/.exec(value);
  if (folderMatch?.[1]) return folderMatch[1];
  const idMatch = /[?&]id=([^&#]+)/.exec(value);
  if (idMatch?.[1]) return decodeURIComponent(idMatch[1]);
  return value.split(/[?#]/)[0] ?? value;
}

export function rootFolderId(): string {
  return folderIdFromSetting(import.meta.env.VITE_ROOT_FOLDER_ID);
}

/**
 * Verifikasi keamanan: `id` berada di subtree folder root (termasuk root itu sendiri).
 * Token mencakup seluruh Drive akun, jadi setiap tujuan navigasi/pemindahan wajib lolos pemeriksaan ini.
 */
export async function isUnderRoot(id: string): Promise<boolean> {
  const root = rootFolderId();
  if (!root || !id) return false;
  const seen = new Set<string>();
  let cursor = id;
  for (let hop = 0; hop < 50; hop += 1) {
    if (cursor === root) return true;
    if (seen.has(cursor)) return false;
    seen.add(cursor);
    let item: DriveItem;
    try {
      item = await getItem(cursor);
    } catch (e) {
      if (e instanceof DriveError && e.status === 404) return false;
      throw e;
    }
    const parent = item.parents?.[0];
    if (!parent) return false;
    cursor = parent;
  }
  return false;
}

export function isTokenValid(): boolean {
  return accessToken !== null && Date.now() < tokenExpiresAt;
}

export function getTokenExpiry(): number | null {
  return accessToken === null ? null : tokenExpiresAt;
}

function setToken(token: string, expiresInSec: number): void {
  accessToken = token;
  tokenExpiresAt = Date.now() + Math.max(0, expiresInSec) * 1000 - 30000;
  writeStoredSession();
}

function clearToken(): void {
  accessToken = null;
  tokenExpiresAt = 0;
  writeStoredSession();
}

/** Tulis/bersihkan salinan sesi; storage nonaktif/penuh tidak menggagalkan login. */
function writeStoredSession(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (accessToken === null) sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    else sessionStorage.setItem(TOKEN_STORAGE_KEY, encodeStoredSession(accessToken, tokenExpiresAt));
  } catch {
    /* abaikan: sesi hanya hidup di memori */
  }
}

/** Pulihkan token dari sesi tab ini; nilai rusak/kedaluwarsa dibuang. */
function restoreStoredSession(): void {
  if (typeof sessionStorage === "undefined") return;
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return;
  }
  const stored = decodeStoredSession(raw);
  if (!stored) return;
  if (Date.now() >= stored.expiresAt) {
    clearToken();
    return;
  }
  accessToken = stored.token;
  tokenExpiresAt = stored.expiresAt;
}

restoreStoredSession();

// ---- Google Identity Services ----

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

/** Tunggu script GIS (`window.google`) siap, maksimal ~15 detik. */
export function ensureGisLoaded(): Promise<void> {
  if (typeof window !== "undefined" && window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(timer);
        resolve();
      } else if (tries >= 150) {
        window.clearInterval(timer);
        reject(new DriveError(0, "gis_unavailable", "Pustaka login Google belum termuat. Periksa koneksi lalu coba lagi."));
      }
    }, 100);
  });
}

function clientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!id) throw new DriveError(0, "no_client_id", "VITE_GOOGLE_CLIENT_ID belum diisi di .env.local.");
  return id;
}

/** Login lewat klik pengguna (jangan dipanggil otomatis agar popup tak diblokir). */
export async function signInGoogle(): Promise<void> {
  await ensureGisLoaded();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new DriveError(0, "gis_unavailable", "Pustaka login Google belum termuat.");
  const token = await new Promise<{ access_token?: string; expires_in?: number; error?: string }>((resolve) => {
    const client = oauth2.initTokenClient({
      client_id: clientId(),
      scope: DRIVE_SCOPE,
      callback: (resp) => resolve(resp),
    });
    client.requestAccessToken({ prompt: "" });
  });
  if (!token.access_token || token.error) {
    throw new DriveError(0, "login_cancelled", "Login Google dibatalkan atau gagal.");
  }
  setToken(token.access_token, token.expires_in ?? 3600);
}

export function signOutGoogle(): void {
  if (accessToken && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(accessToken);
    } catch {
      /* abaikan: token lokal tetap dibersihkan */
    }
  }
  clearToken();
}

// ---- helper murni (diuji Vitest) ----

/** Bentuk simpanan sesi di `sessionStorage`: token plus masa berlaku absolut (epoch ms). */
export interface StoredSession {
  token: string;
  expiresAt: number;
}

export function encodeStoredSession(token: string, expiresAt: number): string {
  return JSON.stringify({ t: token, e: expiresAt });
}

/** Baca ulang simpanan sesi; `null` untuk nilai kosong, rusak, atau tak lengkap. */
export function decodeStoredSession(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { t?: unknown; e?: unknown };
    if (typeof parsed.t !== "string" || parsed.t.length === 0) return null;
    if (typeof parsed.e !== "number" || !Number.isFinite(parsed.e)) return null;
    return { token: parsed.t, expiresAt: parsed.e };
  } catch {
    return null;
  }
}

/** Escape nilai untuk klausa `q` Drive API: backslash dulu, lalu kutip tunggal. */
export function buildQuery(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Validasi nama file/folder: "" bila valid, pesan Indonesia bila tidak. */
export function validateItemName(name: string): string {
  if (!name.trim()) return "Nama tidak boleh kosong.";
  if (name.trim().length > 255) return "Nama maksimal 255 karakter.";
  return "";
}

/** Format ukuran ala Indonesia: "1,5 KB", "12 MB", "—" bila tak diketahui. */
export function formatSize(size: string | number | undefined): string {
  const n = typeof size === "number" ? size : Number(size ?? NaN);
  if (!Number.isFinite(n) || n < 0) return "—";
  const fmt = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (n < 1024) return `${fmt(n)} B`;
  if (n < 1024 * 1024) return `${fmt(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${fmt(n / 1024 / 1024)} MB`;
  return `${fmt(n / 1024 / 1024 / 1024)} GB`;
}

export interface MultipartPart {
  body: Blob;
  contentType: string;
}

/** Susun body multipart/related untuk upload kecil. Boundary diinjeksikan agar testable. */
export function buildMultipartBody(
  meta: Record<string, unknown>,
  data: Blob,
  mime: string,
  boundary: string,
): MultipartPart {
  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify(meta),
      `\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
      data,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

export function isFolder(item: Pick<DriveItem, "mimeType">): boolean {
  return item.mimeType === FOLDER_MIME;
}

export function isShortcut(item: Pick<DriveItem, "mimeType">): boolean {
  return item.mimeType === SHORTCUT_MIME;
}

export function isGoogleNative(item: Pick<DriveItem, "mimeType">): boolean {
  return item.mimeType.startsWith("application/vnd.google-apps.") && !isFolder(item) && !isShortcut(item);
}

export function googleKindOf(mimeType: string): GoogleDocKind | null {
  if (mimeType === GOOGLE_MIME.document) return "document";
  if (mimeType === GOOGLE_MIME.spreadsheet) return "spreadsheet";
  if (mimeType === GOOGLE_MIME.presentation) return "presentation";
  return null;
}

// ---- HTTP ----

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ApiOptions {
  retries?: number;
}

function authHeader(): Record<string, string> {
  if (!isTokenValid() || accessToken === null) {
    throw new DriveError(401, "unauthorized", "Sesi berakhir. Masuk lagi.");
  }
  return { Authorization: `Bearer ${accessToken}` };
}

function driveErrorFrom(status: number, payload: unknown): DriveError {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const err = (payload as { error?: { message?: string; errors?: Array<{ reason?: string }> } }).error;
    const reason = err?.errors?.[0]?.reason ?? "";
    const message = err?.message ?? `Drive API error ${status}.`;
    if (status === 403 && (reason === "insufficientPermissions" || /scope|permission/i.test(message))) {
      return new DriveError(status, "insufficientPermissions", "Izin Drive belum sesuai. Keluar lalu masuk lagi untuk menyetujui akses.");
    }
    return new DriveError(status, reason || `http_${status}`, message);
  }
  return new DriveError(status, `http_${status}`, `Drive API error ${status}.`);
}

function isRateLimit(status: number, err: DriveError): boolean {
  return (
    status === 429 ||
    (status === 403 && (err.reason === "userRateLimitExceeded" || err.reason === "rateLimitExceeded"))
  );
}

/** Satu pintu request Drive API: Bearer, supportsAllDrives, 401, retry backoff. */
async function api<T>(path: string, init: RequestInit = {}, opts: ApiOptions = {}): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${DRIVE_API}${path}${sep}supportsAllDrives=true`;
  const headers = { ...authHeader(), ...(init.headers as Record<string, string> | undefined) };
  const retries = opts.retries ?? 5;
  let attempt = 0;
  for (;;) {
    let res: Response;
    try {
      res = await fetch(url, { ...init, headers });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new DriveError(0, "aborted", "Unggahan dibatalkan.");
      }
      throw new DriveError(0, "network", e instanceof Error ? `Jaringan gagal: ${e.message}` : "Jaringan gagal.");
    }
    if (res.status === 401) {
      clearToken();
      throw new DriveError(401, "unauthorized", "Sesi berakhir. Masuk lagi.");
    }
    if (!res.ok) {
      let payload: unknown = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }
      const err = driveErrorFrom(res.status, payload);
      if (isRateLimit(res.status, err) && attempt < retries) {
        attempt += 1;
        const delay = Math.min(1000 * 2 ** (attempt - 1) + Math.random() * 500, 15000);
        await sleep(delay);
        continue;
      }
      throw err;
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

function toItem(raw: unknown): DriveItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : "";
  const name = typeof r.name === "string" ? r.name : "";
  const mimeType = typeof r.mimeType === "string" ? r.mimeType : "";
  if (!id) throw new DriveError(0, "bad_response", "Respons Drive tidak valid.");
  const item: DriveItem = { id, name, mimeType };
  if (typeof r.size === "string") item.size = r.size;
  if (typeof r.modifiedTime === "string") item.modifiedTime = r.modifiedTime;
  if (typeof r.webViewLink === "string") item.webViewLink = r.webViewLink;
  if (Array.isArray(r.parents)) item.parents = r.parents.filter((p): p is string => typeof p === "string");
  if (typeof r.trashed === "boolean") item.trashed = r.trashed;
  if (typeof r.capabilities === "object" && r.capabilities !== null) {
    const c = r.capabilities as Record<string, unknown>;
    const pick = (k: string): boolean | undefined => (typeof c[k] === "boolean" ? (c[k] as boolean) : undefined);
    item.capabilities = {
      canAddChildren: pick("canAddChildren"),
      canRename: pick("canRename"),
      canTrash: pick("canTrash"),
      canDownload: pick("canDownload"),
    };
  }
  return item;
}

// ---- operasi baca ----

export async function listChildren(folderId: string): Promise<DriveItem[]> {
  const q = `'${buildQuery(folderId)}' in parents and trashed = false`;
  const out: DriveItem[] = [];
  let pageToken: string | undefined;
  for (;;) {
    const params = new URLSearchParams({
      q,
      fields: `nextPageToken,files(${FIELDS})`,
      orderBy: "folder,name",
      pageSize: "1000",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = (await api<unknown>(`/drive/v3/files?${params.toString()}`)) as {
      files?: unknown[];
      nextPageToken?: string;
    };
    for (const f of res.files ?? []) out.push(toItem(f));
    pageToken = res.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

export async function getItem(id: string): Promise<DriveItem> {
  const params = new URLSearchParams({ fields: FIELDS });
  return toItem(await api<unknown>(`/drive/v3/files/${encodeURIComponent(id)}?${params.toString()}`));
}

export async function downloadFile(id: string): Promise<Blob> {
  if (!isTokenValid() || accessToken === null) {
    throw new DriveError(401, "unauthorized", "Sesi berakhir. Masuk lagi.");
  }
  const res = await fetch(
    `${DRIVE_API}/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (res.status === 401) {
    clearToken();
    throw new DriveError(401, "unauthorized", "Sesi berakhir. Masuk lagi.");
  }
  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
    throw driveErrorFrom(res.status, payload);
  }
  return res.blob();
}

export async function exportGoogleFile(id: string, mimeType: string): Promise<Blob> {
  const params = new URLSearchParams({ mimeType });
  const res = await (async () => {
    if (!isTokenValid() || accessToken === null) {
      throw new DriveError(401, "unauthorized", "Sesi berakhir. Masuk lagi.");
    }
    return fetch(
      `${DRIVE_API}/drive/v3/files/${encodeURIComponent(id)}/export?${params.toString()}&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  })();
  if (res.status === 401) {
    clearToken();
    throw new DriveError(401, "unauthorized", "Sesi berakhir. Masuk lagi.");
  }
  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
    throw driveErrorFrom(res.status, payload);
  }
  return res.blob();
}

export async function searchInFolder(folderId: string, text: string): Promise<DriveItem[]> {
  const q = `'${buildQuery(folderId)}' in parents and trashed = false and name contains '${buildQuery(text)}'`;
  const params = new URLSearchParams({
    q,
    fields: `files(${FIELDS})`,
    orderBy: "folder,name",
    pageSize: "100",
    includeItemsFromAllDrives: "true",
  });
  const res = (await api<unknown>(`/drive/v3/files?${params.toString()}`)) as { files?: unknown[] };
  return (res.files ?? []).map(toItem);
}

/**
 * True bila folder tidak berisi item aktif (file/subfolder non-sampah).
 * Meminta satu item saja (`pageSize: 1`) agar murah; error API dilempar
 * sebagai `DriveError` lewat `api()` seperti operasi baca lain.
 */
export async function isFolderEmpty(folderId: string): Promise<boolean> {
  const q = `'${buildQuery(folderId)}' in parents and trashed = false`;
  const params = new URLSearchParams({
    q,
    fields: "files(id)",
    pageSize: "1",
    includeItemsFromAllDrives: "true",
  });
  const res = (await api<unknown>(`/drive/v3/files?${params.toString()}`)) as { files?: unknown };
  return !Array.isArray(res.files) || res.files.length === 0;
}

// ---- operasi tulis ----

export async function createFolder(parentId: string, name: string): Promise<DriveItem> {
  const params = new URLSearchParams({ fields: FIELDS });
  return toItem(
    await api<unknown>(`/drive/v3/files?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ name: name.trim(), mimeType: FOLDER_MIME, parents: [parentId] }),
    }),
  );
}

export async function createGoogleFile(parentId: string, name: string, kind: GoogleDocKind): Promise<DriveItem> {
  const params = new URLSearchParams({ fields: FIELDS });
  return toItem(
    await api<unknown>(`/drive/v3/files?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ name: name.trim(), mimeType: GOOGLE_MIME[kind], parents: [parentId] }),
    }),
  );
}

export interface UploadHooks {
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}

export async function uploadFile(parentId: string, file: File, hooks: UploadHooks = {}): Promise<DriveItem> {
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new DriveError(400, "file_too_large", `Ukuran maksimal ${formatSize(MAX_UPLOAD_SIZE)} per file.`);
  }
  if (file.size <= MULTIPART_LIMIT) {
    const { body, contentType } = buildMultipartBody(
      { name: file.name, parents: [parentId] },
      file,
      file.type || "application/octet-stream",
      uid(),
    );
    const item = toItem(
      await api<unknown>(`/upload/drive/v3/files?uploadType=multipart&fields=${encodeURIComponent(FIELDS)}`, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body,
        signal: hooks.signal,
      }),
    );
    hooks.onProgress?.(1);
    return item;
  }
  return uploadResumable(parentId, file, hooks);
}

function uploadResumable(parentId: string, file: File, hooks: UploadHooks): Promise<DriveItem> {
  return new Promise((resolve, reject) => {
    if (!isTokenValid() || accessToken === null) {
      reject(new DriveError(401, "unauthorized", "Sesi berakhir. Masuk lagi."));
      return;
    }
    const token = accessToken;
    const params = new URLSearchParams({ uploadType: "resumable", fields: FIELDS });
    void fetch(`${DRIVE_UPLOAD_API}?${params.toString()}&supportsAllDrives=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": file.type || "application/octet-stream",
        "X-Upload-Content-Length": String(file.size),
      },
      body: JSON.stringify({ name: file.name, parents: [parentId] }),
      signal: hooks.signal,
    }).then(
      (res) => {
        if (res.status === 401) {
          clearToken();
          reject(new DriveError(401, "unauthorized", "Sesi berakhir. Masuk lagi."));
          return;
        }
        if (!res.ok) {
          void res
            .json()
            .catch(() => null)
            .then((payload) => reject(driveErrorFrom(res.status, payload)));
          return;
        }
        const sessionUrl = res.headers.get("Location");
        if (!sessionUrl) {
          reject(new DriveError(0, "no_session", "Server Drive tidak memberi alamat unggah."));
          return;
        }
        const xhr = new XMLHttpRequest();
        if (hooks.signal) {
          const onAbort = (): void => xhr.abort();
          if (hooks.signal.aborted) {
            reject(new DriveError(0, "aborted", "Unggahan dibatalkan."));
            return;
          }
          hooks.signal.addEventListener("abort", onAbort, { once: true });
        }
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) hooks.onProgress?.(e.loaded / e.total);
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(toItem(JSON.parse(xhr.responseText) as unknown));
            } catch {
              reject(new DriveError(0, "bad_response", "Respons Drive tidak valid."));
            }
          } else {
            let payload: unknown = null;
            try {
              payload = JSON.parse(xhr.responseText) as unknown;
            } catch {
              payload = null;
            }
            reject(driveErrorFrom(xhr.status, payload));
          }
        });
        xhr.addEventListener("error", () => reject(new DriveError(0, "network", "Jaringan gagal saat mengunggah.")));
        xhr.addEventListener("abort", () => reject(new DriveError(0, "aborted", "Unggahan dibatalkan.")));
        xhr.open("PUT", sessionUrl);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      },
      (e: unknown) => {
        reject(
          e instanceof DriveError
            ? e
            : new DriveError(0, "network", e instanceof Error ? `Jaringan gagal: ${e.message}` : "Jaringan gagal."),
        );
      },
    );
  });
}

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `b-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export async function renameItem(id: string, name: string): Promise<DriveItem> {
  const params = new URLSearchParams({ fields: FIELDS });
  return toItem(
    await api<unknown>(`/drive/v3/files/${encodeURIComponent(id)}?${params.toString()}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ name: name.trim() }),
    }),
  );
}

export async function trashItem(id: string): Promise<void> {
  await api<unknown>(`/drive/v3/files/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ trashed: true }),
  });
}

export async function moveItem(id: string, newParentId: string, oldParentId: string): Promise<DriveItem> {
  // Tujuan wajib di subtree root (token mencakup seluruh Drive akun).
  if (!(await isUnderRoot(newParentId))) {
    throw new DriveError(403, "outside_root", "Tujuan pemindahan harus berada di dalam folder root.");
  }
  const params = new URLSearchParams({
    addParents: newParentId,
    removeParents: oldParentId,
    fields: FIELDS,
  });
  return toItem(
    await api<unknown>(`/drive/v3/files/${encodeURIComponent(id)}?${params.toString()}`, { method: "PATCH" }),
  );
}
