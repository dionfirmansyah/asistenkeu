import { describe, expect, it } from "vitest";
import type { DriveItem } from "@/lib/googleDrive";
import { sortItems } from "@/hooks/useDriveFolder";
import { parseFolderNames } from "@/components/drive/drive-utils";

function item(name: string, mimeType: string, modifiedTime?: string): DriveItem {
  return { id: name, name, mimeType, modifiedTime };
}

const FOLDER = "application/vnd.google-apps.folder";
const PDF = "application/pdf";

describe("sortItems", () => {
  it("nama: folder dulu lalu abjad", () => {
    const list = [item("b.pdf", PDF), item("A folder", FOLDER), item("a.pdf", PDF)];
    expect(sortItems(list, "nama").map((f) => f.name)).toEqual(["A folder", "a.pdf", "b.pdf"]);
  });

  it("terbaru: tanggal turun, tak diketahui terakhir", () => {
    const list = [
      item("lama", PDF, "2026-01-01T00:00:00Z"),
      item("tanpa-tanggal", PDF),
      item("baru", PDF, "2026-10-01T00:00:00Z"),
    ];
    expect(sortItems(list, "terbaru").map((f) => f.name)).toEqual(["baru", "lama", "tanpa-tanggal"]);
  });

  it("terlama: tanggal naik, tak diketahui terakhir", () => {
    const list = [
      item("baru", PDF, "2026-10-01T00:00:00Z"),
      item("tanpa-tanggal", PDF),
      item("lama", PDF, "2026-01-01T00:00:00Z"),
    ];
    expect(sortItems(list, "terlama").map((f) => f.name)).toEqual(["lama", "baru", "tanpa-tanggal"]);
  });
});

describe("parseFolderNames", () => {
  it("satu per baris, buang kosong", () => {
    expect(parseFolderNames("SPJ Januari\n\n  SPJ Februari  \r\n")).toEqual(["SPJ Januari", "SPJ Februari"]);
  });

  it("kosong menjadi daftar kosong", () => {
    expect(parseFolderNames("   \n  ")).toEqual([]);
  });
});
