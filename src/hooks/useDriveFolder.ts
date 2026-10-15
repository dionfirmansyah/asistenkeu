import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { DriveItem, GoogleDocKind } from "@/lib/googleDrive";
import {
  createFolder,
  createGoogleFile,
  describeError,
  isAuthError,
  isFolder,
  isFolderEmpty,
  isNotFound,
  listChildren,
  moveItem,
  renameItem,
  searchInFolder,
  trashItem,
} from "@/lib/googleDrive";

/** Isi folder per sesi; dikosongkan lewat tombol Segarkan dan saat keluar. */
const folderCache = new Map<string, DriveItem[]>();
/** Hasil cek kekosongan per sesi; dihapus setiap isi folder berubah. */
const emptyCache = new Map<string, boolean>();
/** Cek yang sedang berjalan (dedup mount ganda/StrictMode). */
const emptyPending = new Map<string, Promise<boolean>>();

/**
 * Jawab apakah folder kosong tanpa request tambahan bila daftar children-nya
 * sudah diketahui (dari listing yang dibuka atau cache sesi); selain itu
 * memakai `isFolderEmpty` (satu item) dengan cache + dedup per sesi.
 */
export function resolveFolderEmpty(folderId: string, knownChildren?: DriveItem[]): Promise<boolean> {
  if (knownChildren) return Promise.resolve(knownChildren.length === 0);
  const kids = folderCache.get(folderId);
  if (kids) return Promise.resolve(kids.length === 0);
  const known = emptyCache.get(folderId);
  if (known !== undefined) return Promise.resolve(known);
  const inflight = emptyPending.get(folderId);
  if (inflight) return inflight;
  const pending = isFolderEmpty(folderId).then(
    (empty) => {
      emptyCache.set(folderId, empty);
      emptyPending.delete(folderId);
      return empty;
    },
    (e: unknown) => {
      emptyPending.delete(folderId);
      throw e;
    },
  );
  emptyPending.set(folderId, pending);
  return pending;
}

/** Intip children folder yang pernah dibuka pada sesi ini (tanpa request). */
export function peekCachedChildren(folderId: string): DriveItem[] | undefined {
  return folderCache.get(folderId);
}

/** Status isi pohon folder: kosong, hanya berisi folder-folder kosong, atau berisi. */
export type FolderTreeState = "empty" | "only-empty-folders" | "nonempty";

/** Penelusuran pohon dibatasi agar struktur dalam tidak membanjiri API. */
const MAX_TREE_DEPTH = 3;

const treeStateCache = new Map<string, FolderTreeState>();
const treePending = new Map<string, Promise<FolderTreeState>>();

/** Hapus semua cache turunan agar label tak basi setelah isi berubah. */
function clearTreeCaches(folderId: string): void {
  treeStateCache.delete(folderId);
  emptyCache.delete(folderId);
}

/**
 * Status isi pohon folder untuk label baris: tanpa isi ("empty"), tanpa file
 * tetapi semua subfoldernya kosong ("only-empty-folders"), atau berisi
 * file/subfolder berisi ("nonempty"). Malas per folder tampil: cache dipakai
 * dulu, request (listing + cek murah) hanya untuk yang belum diketahui dan
 * hasilnya di-cache per sesi. Melebihi `MAX_TREE_DEPTH` dinilai konservatif.
 */
export function resolveFolderTree(folderId: string, knownChildren?: DriveItem[]): Promise<FolderTreeState> {
  const hit = treeStateCache.get(folderId);
  if (hit) return Promise.resolve(hit);
  if (knownChildren) {
    if (knownChildren.length === 0) return Promise.resolve("empty");
    const subfolders = knownChildren.filter((k) => isFolder(k));
    if (subfolders.length !== knownChildren.length) return Promise.resolve("nonempty");
    return finishAllFolders(subfolders, 0);
  }
  return subTreeState(folderId, 0);
}

function subTreeState(folderId: string, depth: number): Promise<FolderTreeState> {
  const hit = treeStateCache.get(folderId);
  if (hit) return Promise.resolve(hit);
  const inflight = treePending.get(folderId);
  if (inflight) return inflight;
  const pending = walkFolderTree(folderId, depth).then(
    (state) => {
      treeStateCache.set(folderId, state);
      treePending.delete(folderId);
      return state;
    },
    (e: unknown) => {
      treePending.delete(folderId);
      throw e;
    },
  );
  treePending.set(folderId, pending);
  return pending;
}

async function walkFolderTree(folderId: string, depth: number): Promise<FolderTreeState> {
  let kids = folderCache.get(folderId);
  if (!kids) {
    kids = await listChildren(folderId);
    // Mentah tidak apa: pembaca folderCache selalu mengurutkan saat tampil.
    folderCache.set(folderId, kids);
  }
  if (kids.length === 0) return "empty";
  const subfolders = kids.filter((k) => isFolder(k));
  if (subfolders.length !== kids.length) return "nonempty";
  return finishAllFolders(subfolders, depth);
}

async function finishAllFolders(subfolders: DriveItem[], depth: number): Promise<FolderTreeState> {
  if (depth >= MAX_TREE_DEPTH) {
    const checks = await Promise.all(subfolders.map((s) => resolveFolderEmpty(s.id)));
    return checks.every((v) => v) ? "only-empty-folders" : "nonempty";
  }
  const states = await Promise.all(subfolders.map((s) => subTreeState(s.id, depth + 1)));
  return states.every((st) => st !== "nonempty") ? "only-empty-folders" : "nonempty";
}

/** Urutan tampil isi folder. */
export type DriveSort = "nama" | "terbaru" | "terlama";

function timeOf(item: DriveItem): number | null {
  if (!item.modifiedTime) return null;
  const t = Date.parse(item.modifiedTime);
  return Number.isNaN(t) ? null : t;
}

/** Folder lebih dulu, lalu nama (locale id-ID). Untuk terbaru/terlama: tanggal ubah, tak diketahui selalu terakhir. */
export function sortItems(list: DriveItem[], sort: DriveSort = "nama"): DriveItem[] {
  if (sort === "terbaru" || sort === "terlama") {
    return [...list].sort((a, b) => {
      const ta = timeOf(a);
      const tb = timeOf(b);
      if (ta === null && tb === null) return a.name.localeCompare(b.name, "id");
      if (ta === null) return 1;
      if (tb === null) return -1;
      if (ta !== tb) return sort === "terbaru" ? tb - ta : ta - tb;
      return a.name.localeCompare(b.name, "id");
    });
  }
  return [...list].sort((a, b) => {
    const byKind = Number(!isFolder(a)) - Number(!isFolder(b));
    if (byKind !== 0) return byKind;
    return a.name.localeCompare(b.name, "id");
  });
}

export interface UseDriveFolderOptions {
  /** Folder root hasil verifikasi auth; `null` berarti belum login / sudah keluar. */
  root: DriveItem | null;
  onSessionExpired: () => void;
}

export interface DriveFolderApi {
  path: DriveItem[];
  current: DriveItem | null;
  /** `null` = sedang memuat. */
  items: DriveItem[] | null;
  error: string | null;
  busy: boolean;
  query: string;
  searching: boolean;
  /** Hasil pencarian pada folder aktif; `null` = menampilkan isi folder. */
  results: DriveItem[] | null;
  visible: DriveItem[] | null;
  sort: DriveSort;
  setSort: (value: DriveSort) => void;
  setQuery: (value: string) => void;
  openFolder: (item: DriveItem) => void;
  goTo: (index: number) => void;
  refresh: () => void;
  insertItem: (item: DriveItem) => void;
  createNewFolder: (name: string) => Promise<boolean>;
  createManyFolders: (names: string[]) => Promise<{ created: DriveItem[]; failed: string[] }>;
  createNewFile: (name: string, kind: GoogleDocKind) => Promise<DriveItem | null>;
  rename: (id: string, name: string) => Promise<boolean>;
  trash: (item: DriveItem) => Promise<boolean>;
  move: (item: DriveItem, newParentId: string) => Promise<boolean>;
}

/** Folder aktif, path breadcrumb, cache, muat/segarkan, dan mutasi tulis. */
export function useDriveFolder(options: UseDriveFolderOptions): DriveFolderApi {
  const { root } = options;
  const [path, setPath] = useState<DriveItem[]>([]);
  const [items, setItems] = useState<DriveItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DriveItem[] | null>(null);
  const [sort, setSortState] = useState<DriveSort>("nama");

  const expiredRef = useRef(options.onSessionExpired);
  useEffect(() => {
    expiredRef.current = options.onSessionExpired;
  });

  const sortRef = useRef<DriveSort>(sort);
  useEffect(() => {
    sortRef.current = sort;
  }, [sort]);

  const load = useCallback((folderId: string, useCache: boolean): void => {
    setError(null);
    const cached = useCache ? folderCache.get(folderId) : undefined;
    if (cached) {
      setItems(sortItems(cached, sortRef.current));
      return;
    }
    setItems(null);
    void listChildren(folderId).then(
      (children) => {
        const sorted = sortItems(children, sortRef.current);
        folderCache.set(folderId, sorted);
        setItems(sorted);
      },
      (e: unknown) => {
        toast.error(describeError(e));
        if (isAuthError(e)) expiredRef.current();
        setError(describeError(e));
      },
    );
  }, []);

  const refreshFolder = useCallback(
    (folderId: string) => {
      folderCache.delete(folderId);
      clearTreeCaches(folderId);
      load(folderId, false);
    },
    [load],
  );

  const reportFailure = useCallback(
    (e: unknown, folderId?: string) => {
      toast.error(describeError(e));
      if (isAuthError(e)) expiredRef.current();
      if (folderId && isNotFound(e)) refreshFolder(folderId);
    },
    [refreshFolder],
  );

  const current = path.length > 0 ? path[path.length - 1] : null;
  const currentId = current?.id;

  // Mulai dari root terverifikasi; bersihkan saat keluar.
  useEffect(() => {
    setQuery("");
    setResults(null);
    setError(null);
    if (!root) {
      setPath([]);
      setItems(null);
      folderCache.clear();
      emptyCache.clear();
      emptyPending.clear();
      treeStateCache.clear();
      treePending.clear();
      return;
    }
    setPath([root]);
    load(root.id, true);
  }, [root, load]);

  const openFolder = useCallback(
    (item: DriveItem) => {
      if (!isFolder(item)) return;
      setQuery("");
      setResults(null);
      setPath((prev) => [...prev, item]);
      load(item.id, true);
    },
    [load],
  );

  const goTo = useCallback(
    (index: number) => {
      const next = path.slice(0, index + 1);
      const target = next[next.length - 1];
      if (!target) return;
      setQuery("");
      setResults(null);
      setPath(next);
      load(target.id, true);
    },
    [path, load],
  );

  const refresh = useCallback(() => {
    setQuery("");
    setResults(null);
    if (currentId) refreshFolder(currentId);
  }, [currentId, refreshFolder]);

  const commit = useCallback(
    (updater: (list: DriveItem[]) => DriveItem[]) => {
      if (!currentId) return;
      const base = folderCache.get(currentId) ?? [];
      const next = sortItems(updater(base), sortRef.current);
      folderCache.set(currentId, next);
      clearTreeCaches(currentId);
      setItems(next);
    },
    [currentId],
  );

  const insertItem = useCallback(
    (item: DriveItem) => {
      // Masukkan ke folder induk item — aman walau pengguna sudah berpindah folder.
      const parentId = item.parents?.[0];
      if (!parentId) return;
      const base = folderCache.get(parentId) ?? [];
      if (base.some((f) => f.id === item.id)) return;
      const next = sortItems([...base, item], sortRef.current);
      folderCache.set(parentId, next);
      clearTreeCaches(parentId);
      if (parentId === currentId) setItems(next);
    },
    [currentId],
  );

  const setSort = useCallback(
    (value: DriveSort) => {
      setSortState(value);
      sortRef.current = value;
      setItems((prev) => (prev ? sortItems(prev, value) : prev));
      setResults((prev) => (prev ? sortItems(prev, value) : prev));
      if (currentId) {
        const base = folderCache.get(currentId);
        if (base) folderCache.set(currentId, sortItems(base, value));
      }
    },
    [currentId],
  );

  const createNewFolder = useCallback(
    async (name: string): Promise<boolean> => {
      if (!current) return false;
      setBusy(true);
      try {
        const item = await createFolder(current.id, name);
        insertItem(item);
        toast.success(`Folder "${item.name}" dibuat.`);
        return true;
      } catch (e) {
        reportFailure(e, current.id);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [current, insertItem, reportFailure],
  );

  const createNewFile = useCallback(
    async (name: string, kind: GoogleDocKind): Promise<DriveItem | null> => {
      if (!current) return null;
      setBusy(true);
      try {
        const item = await createGoogleFile(current.id, name, kind);
        insertItem(item);
        return item;
      } catch (e) {
        reportFailure(e, current.id);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [current, insertItem, reportFailure],
  );

  const createManyFolders = useCallback(
    async (names: string[]): Promise<{ created: DriveItem[]; failed: string[] }> => {
      const created: DriveItem[] = [];
      const failed: string[] = [];
      if (!current || names.length === 0) return { created, failed };
      setBusy(true);
      try {
        for (const name of names) {
          try {
            const item = await createFolder(current.id, name);
            insertItem(item);
            created.push(item);
          } catch (e) {
            if (isAuthError(e)) {
              reportFailure(e, current.id);
              failed.push(name);
              break;
            }
            console.warn(`Gagal membuat folder "${name}"`, e);
            failed.push(name);
          }
        }
      } finally {
        setBusy(false);
      }
      return { created, failed };
    },
    [current, insertItem, reportFailure],
  );

  const rename = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      if (!current) return false;
      setBusy(true);
      try {
        const item = await renameItem(id, name);
        commit((list) => list.map((f) => (f.id === item.id ? { ...f, name: item.name } : f)));
        toast.success(`Nama diubah menjadi "${item.name}".`);
        return true;
      } catch (e) {
        reportFailure(e, current.id);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [current, commit, reportFailure],
  );

  const trash = useCallback(
    async (item: DriveItem): Promise<boolean> => {
      if (!current) return false;
      setBusy(true);
      try {
        await trashItem(item.id);
        commit((list) => list.filter((f) => f.id !== item.id));
        toast.success(`"${item.name}" dibuang ke Sampah. Bisa dipulihkan dari Sampah di Google Drive.`);
        return true;
      } catch (e) {
        reportFailure(e, current.id);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [current, commit, reportFailure],
  );

  const move = useCallback(
    async (item: DriveItem, newParentId: string): Promise<boolean> => {
      if (!current) return false;
      const oldParentId = item.parents?.[0];
      if (!oldParentId || oldParentId === newParentId) return false;
      setBusy(true);
      try {
        const moved = await moveItem(item.id, newParentId, oldParentId);
        commit((list) => list.filter((f) => f.id !== moved.id));
        toast.success(`"${item.name}" dipindahkan.`);
        return true;
      } catch (e) {
        reportFailure(e, current.id);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [current, commit, reportFailure],
  );

  // FR-10: pencarian nama dibatasi folder aktif (Drive tidak mendukung query rekursif).
  useEffect(() => {
    const text = query.trim();
    if (!currentId || !text) {
      setResults(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchInFolder(currentId, text).then(
        (list) => {
          if (cancelled) return;
          setResults(sortItems(list, sortRef.current));
          setSearching(false);
        },
        (e: unknown) => {
          if (cancelled) return;
          setSearching(false);
          reportFailure(e);
        },
      );
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, currentId, reportFailure]);

  return {
    path,
    current,
    items,
    error,
    busy,
    query,
    searching,
    results,
    visible: results ?? items,
    sort,
    setSort,
    setQuery,
    openFolder,
    goTo,
    refresh,
    insertItem,
    createNewFolder,
    createManyFolders,
    createNewFile,
    rename,
    trash,
    move,
  };
}
