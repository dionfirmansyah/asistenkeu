import { useCallback, useEffect, useState } from "react";
import type { DriveItem } from "@/lib/googleDrive";
import {
  describeError,
  DriveError,
  getItem,
  isAuthError,
  isFolder,
  isTokenValid,
  rootFolderId,
  signInGoogle,
  signOutGoogle,
} from "@/lib/googleDrive";

export type DriveAuthStatus = "disconnected" | "connecting" | "connected" | "expired" | "error";

export interface DriveAuth {
  status: DriveAuthStatus;
  /** Folder root terverifikasi (bukan folder / tidak ada akses → status error). */
  root: DriveItem | null;
  error: string | null;
  /** Panggil hanya dari aksi klik pengguna agar popup tidak diblokir browser. */
  connect: () => Promise<boolean>;
  logout: () => void;
  /** Dipanggil data layer saat API menjawab 401. */
  markExpired: () => void;
}

/**
 * Status login Google Drive. Token OAuth hidup di memori modul `googleDrive.ts`
 * plus salinan sesi di `sessionStorage` (per-tab) agar refresh tak perlu login
 * ulang; tidak pernah disimpan di localStorage/cookie.
 */
export function useDriveAuth(): DriveAuth {
  const [status, setStatus] = useState<DriveAuthStatus>("disconnected");
  const [root, setRoot] = useState<DriveItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Ambil dan validasi folder root dari `VITE_ROOT_FOLDER_ID`. */
  const verifyRoot = useCallback(async (): Promise<DriveItem> => {
    const id = rootFolderId();
    if (!id) {
      throw new DriveError(0, "no_root_id", "VITE_ROOT_FOLDER_ID belum diisi di .env.local.");
    }
    const rootItem = await getItem(id);
    if (!isFolder(rootItem)) {
      throw new DriveError(0, "root_not_folder", "VITE_ROOT_FOLDER_ID menunjuk ke file, bukan folder.");
    }
    return rootItem;
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    setStatus("connecting");
    setError(null);
    try {
      await signInGoogle();
      const rootItem = await verifyRoot();
      setRoot(rootItem);
      setStatus("connected");
      return true;
    } catch (e) {
      const cancelled = e instanceof DriveError && e.reason === "login_cancelled";
      setRoot(null);
      if (cancelled) {
        setStatus("disconnected");
        setError(null);
        return false;
      }
      setStatus(isAuthError(e) ? "expired" : "error");
      setError(describeError(e));
      return false;
    }
  }, [verifyRoot]);

  // Sesi tab ini masih ada di sessionStorage → pulihkan tanpa memunculkan popup login.
  useEffect(() => {
    if (!isTokenValid()) return;
    let cancelled = false;
    setStatus("connecting");
    setError(null);
    verifyRoot().then(
      (rootItem) => {
        if (cancelled) return;
        setRoot(rootItem);
        setStatus("connected");
      },
      (e: unknown) => {
        if (cancelled) return;
        setRoot(null);
        if (isAuthError(e)) {
          // Token sudah dibersihkan data layer; mulai dari layar hubungkan.
          setStatus("disconnected");
          setError(null);
        } else {
          setStatus("error");
          setError(describeError(e));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [verifyRoot]);

  const logout = useCallback(() => {
    signOutGoogle();
    setRoot(null);
    setError(null);
    setStatus("disconnected");
  }, []);

  const markExpired = useCallback(() => {
    setStatus((s) => (s === "connected" ? "expired" : s));
  }, []);

  // Deteksi token kedaluwarsa tanpa memunculkan popup login otomatis.
  useEffect(() => {
    if (status !== "connected") return;
    const timer = window.setInterval(() => {
      if (!isTokenValid()) setStatus("expired");
    }, 20000);
    return () => window.clearInterval(timer);
  }, [status]);

  return { status, root, error, connect, logout, markExpired };
}
