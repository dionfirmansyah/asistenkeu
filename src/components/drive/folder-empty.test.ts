import { afterEach, describe, expect, it, vi } from "vitest";
import type { DriveItem } from "@/lib/googleDrive";
import { resolveFolderEmpty, resolveFolderTree } from "@/hooks/useDriveFolder";

function folder(id: string, name: string): DriveItem {
  return { id, name, mimeType: "application/vnd.google-apps.folder" };
}

function file(id: string, name: string): DriveItem {
  return { id, name, mimeType: "application/pdf" };
}

describe("resolveFolderEmpty", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("daftar children kosong berarti kosong tanpa memanggil API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("tidak boleh dipanggil"));
    await expect(resolveFolderEmpty("folder-a", [])).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("daftar children berisi berarti tidak kosong tanpa memanggil API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("tidak boleh dipanggil"));
    await expect(resolveFolderEmpty("folder-a", [folder("anak-1", "Berkas")])).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("resolveFolderTree", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tanpa children berarti kosong tanpa memanggil API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("tidak boleh dipanggil"));
    await expect(resolveFolderTree("folder-a", [])).resolves.toBe("empty");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("children berisi file berarti berisi tanpa memanggil API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("tidak boleh dipanggil"));
    await expect(resolveFolderTree("folder-a", [folder("anak-1", "Sub"), file("anak-2", "Dokumen")])).resolves.toBe(
      "nonempty",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
