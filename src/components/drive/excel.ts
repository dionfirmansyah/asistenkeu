export interface DriveLinkRow {
  name: string;
  link: string;
}

const excelEsc = (s: unknown): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const linkCell = (link: string): string => {
  const href = excelEsc(link);
  if (!href) return "";
  return `<a href="${href}">${href}</a>`;
};

/** Ekspor Excel (.xls berisi HTML table): daftar isi folder beserta tautan Drive. */
export function buildDriveLinkExcelDoc(title: string, rows: DriveLinkRow[]): string {
  let no = 1;
  let body = "";
  for (const r of rows) {
    body +=
      `<tr><td class="c-no num">${no++}</td>` +
      `<td>${excelEsc(r.name)}</td>` +
      `<td>${linkCell(r.link)}</td></tr>`;
  }
  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><title>${excelEsc(title)}</title><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Drive</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style>
    table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:10pt}
    th{background:#eef4e2;border:1px solid #000;padding:4px 6px;text-align:center}
    td{border:1px solid #b9c4a6;padding:3px 6px;vertical-align:top}
    .num{mso-number-format:"\\#\\,\\#\\#0";text-align:right}
    td.c-no{width:6%;text-align:center}
  </style></head><body>
  <p style="font-size:13pt;font-weight:bold">${excelEsc(title)}</p>
  <table><thead><tr><th>NO.</th><th>Nama</th><th>Link Gdrive</th></tr></thead><tbody>${body}</tbody></table></body></html>`;
}
