import { describe, expect, it } from "vitest";
import { buildDriveLinkExcelDoc } from "./excel";

describe("buildDriveLinkExcelDoc", () => {
  it("header memakai tiga kolom yang diminta", () => {
    const doc = buildDriveLinkExcelDoc("Isi folder", []);
    expect(doc).toContain("<th>NO.</th>");
    expect(doc).toContain("<th>Nama</th>");
    expect(doc).toContain("<th>Link Gdrive</th>");
  });

  it("nomor urut mulai dari 1 dan tautan jadi hyperlink", () => {
    const doc = buildDriveLinkExcelDoc("Isi folder", [
      { name: "SPJ Januari", link: "https://drive.google.com/drive/folders/abc" },
      { name: "Tanpa tautan", link: "" },
    ]);
    expect(doc).toContain('<td class="c-no num">1</td>');
    expect(doc).toContain('<td class="c-no num">2</td>');
    expect(doc).toContain('<a href="https://drive.google.com/drive/folders/abc">');
    expect(doc).toContain("Tanpa tautan");
  });

  it("escape HTML pada nama dan tautan", () => {
    const doc = buildDriveLinkExcelDoc("A&B", [{ name: "<folder>", link: "https://x/?a=1&b=2" }]);
    expect(doc).toContain("A&amp;B");
    expect(doc).toContain("&lt;folder&gt;");
    expect(doc).toContain("https://x/?a=1&amp;b=2");
    expect(doc).not.toContain("<folder>");
  });
});
