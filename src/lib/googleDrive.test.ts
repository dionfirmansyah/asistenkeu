import { describe, expect, it } from "vitest";
import {
  buildMultipartBody,
  buildQuery,
  decodeStoredSession,
  describeError,
  DriveError,
  encodeStoredSession,
  folderIdFromSetting,
  formatSize,
  googleKindOf,
  isFolder,
  isGoogleNative,
  isShortcut,
  validateItemName,
} from "./googleDrive";

describe("buildQuery", () => {
  it("escape kutip tunggal dan backslash", () => {
    expect(buildQuery("APBDes '2026")).toBe("APBDes \\'2026");
    expect(buildQuery("c:\\folder")).toBe("c:\\\\folder");
    expect(buildQuery("a\\'b")).toBe("a\\\\\\'b");
  });

  it("tidak mengubah spasi dan huruf non-Latin", () => {
    expect(buildQuery("Laporan Desa Sukamaju")).toBe("Laporan Desa Sukamaju");
    expect(buildQuery("Dana Desa Ω 中文")).toBe("Dana Desa Ω 中文");
  });
});

describe("validateItemName", () => {
  it("menolak kosong dan hanya spasi", () => {
    expect(validateItemName("")).toBeTruthy();
    expect(validateItemName("   ")).toBeTruthy();
  });

  it("menolak lebih dari 255 karakter", () => {
    expect(validateItemName("x".repeat(256))).toBeTruthy();
    expect(validateItemName("x".repeat(255))).toBe("");
  });

  it("menerima nama biasa", () => {
    expect(validateItemName("LPJ 2026 'Tahun Anggaran'")).toBe("");
  });
});

describe("formatSize", () => {
  it("format ala Indonesia", () => {
    expect(formatSize(undefined)).toBe("—");
    expect(formatSize("abc")).toBe("—");
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(1024)).toBe("1 KB");
    expect(formatSize(1536)).toBe("1,5 KB");
    expect(formatSize(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatSize(2 * 1024 * 1024 * 1024)).toBe("2 GB");
  });
});

describe("folderIdFromSetting", () => {
  it("menerima tautan folder dan ID polos", () => {
    expect(folderIdFromSetting("https://drive.google.com/drive/folders/14TxIhpe3th7zsrWVhgrLXF2ASTq-j96D")).toBe(
      "14TxIhpe3th7zsrWVhgrLXF2ASTq-j96D",
    );
    expect(folderIdFromSetting("https://drive.google.com/drive/folders/abc123?usp=sharing")).toBe("abc123");
    expect(folderIdFromSetting("https://drive.google.com/open?id=abc123")).toBe("abc123");
    expect(folderIdFromSetting("abc123")).toBe("abc123");
    expect(folderIdFromSetting("  abc123  ")).toBe("abc123");
    expect(folderIdFromSetting(undefined)).toBe("");
    expect(folderIdFromSetting("   ")).toBe("");
  });
});

describe("buildMultipartBody", () => {
  it("menyusun multipart/related: metadata lalu isi file", async () => {
    const boundary = "test-boundary-123";
    const meta = { name: "laporan.pdf", parents: ["root-id"] };
    const data = new Blob(["isi-file"], { type: "application/pdf" });
    const { body, contentType } = buildMultipartBody(meta, data, "application/pdf", boundary);

    expect(contentType).toBe("multipart/related; boundary=test-boundary-123");
    expect(body.type).toBe("multipart/related; boundary=test-boundary-123");

    const text = await body.text();
    const metaIndex = text.indexOf(`--${boundary}`);
    expect(metaIndex).toBe(0);
    expect(text).toContain('Content-Type: application/json; charset=UTF-8');
    expect(text).toContain('{"name":"laporan.pdf","parents":["root-id"]}');
    expect(text).toContain(`Content-Type: application/pdf`);
    expect(text).toContain("isi-file");
    expect(text.trimEnd().endsWith(`--${boundary}--`)).toBe(true);
    // Metadata mendahului isi file.
    expect(text.indexOf("isi-file")).toBeGreaterThan(text.indexOf('"laporan.pdf"'));
  });
});

describe("pemetaan jenis file", () => {
  it("folder, shortcut, dan file Google native", () => {
    expect(isFolder({ mimeType: "application/vnd.google-apps.folder" })).toBe(true);
    expect(isShortcut({ mimeType: "application/vnd.google-apps.shortcut" })).toBe(true);
    expect(isGoogleNative({ mimeType: "application/vnd.google-apps.document" })).toBe(true);
    expect(isGoogleNative({ mimeType: "application/pdf" })).toBe(false);
    expect(isGoogleNative({ mimeType: "application/vnd.google-apps.folder" })).toBe(false);
    expect(googleKindOf("application/vnd.google-apps.spreadsheet")).toBe("spreadsheet");
    expect(googleKindOf("application/vnd.google-apps.presentation")).toBe("presentation");
    expect(googleKindOf("application/pdf")).toBeNull();
  });
});

describe("encodeStoredSession / decodeStoredSession", () => {
  it("round-trip token dan masa berlaku", () => {
    const raw = encodeStoredSession("ya29.abc", 1791900000000);
    expect(decodeStoredSession(raw)).toEqual({ token: "ya29.abc", expiresAt: 1791900000000 });
  });

  it("menolak nilai kosong, rusak, atau tak lengkap", () => {
    expect(decodeStoredSession(null)).toBeNull();
    expect(decodeStoredSession("")).toBeNull();
    expect(decodeStoredSession("bukan-json")).toBeNull();
    expect(decodeStoredSession("{}")).toBeNull();
    expect(decodeStoredSession('{"t":""}')).toBeNull();
    expect(decodeStoredSession('{"t":"x"}')).toBeNull();
    expect(decodeStoredSession('{"t":"x","e":"nanti"}')).toBeNull();
    expect(decodeStoredSession('{"t":"x","e":null}')).toBeNull();
  });
});

describe("describeError", () => {
  it("401 menjadi pesan sesi berakhir", () => {
    expect(describeError(new DriveError(401, "unauthorized"))).toBe("Sesi berakhir. Masuk lagi.");
  });

  it("404, 429, dan 5xx menjadi pesan Indonesia", () => {
    expect(describeError(new DriveError(404, "notFound"))).toContain("tidak ditemukan");
    expect(describeError(new DriveError(429, "userRateLimitExceeded"))).toContain("terlalu sering");
    expect(describeError(new DriveError(503, "backendError"))).toContain("bermasalah");
  });

  it("melewati pesan teks biasa", () => {
    expect(describeError(new Error("gagal lokal"))).toBe("gagal lokal");
    expect(describeError("aneh")).toBe("Terjadi kesalahan yang tidak dikenal. Coba lagi.");
  });
});
