const nf = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfInt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const nfRp = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** Format angka id-ID dengan dua desimal: 1.234.567,00 */
export const nf0 = (n: number): string => nf.format(Number.isFinite(n) ? n : 0);
/** Format angka bulat (tanpa desimal) untuk jumlah/persen */
export const nfInt0 = (n: number): string => nfInt.format(Math.round(n || 0));
/** Format uang Rupiah tanpa desimal: Rp 1.234.567 */
export const rp = (n: number): string => "Rp " + nfRp.format(Number.isFinite(n) ? n : 0);
/** Format uang dengan tanda minus eksplisit */
export const rpS = (n: number): string => (n < 0 ? "-Rp " : "Rp ") + nfRp.format(Math.abs(Number.isFinite(n) ? n : 0));

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Format tanggal pendek ala dokumen: 10 Okt 2026 (terima Date atau string ISO). */
export const tgl = (v: unknown): string => {
  let y = 0, m = 0, d = 0;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    y = v.getFullYear();
    m = v.getMonth() + 1;
    d = v.getDate();
  } else {
    const mt = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? "").slice(0, 10));
    if (!mt) return "";
    y = Number(mt[1]);
    m = Number(mt[2]);
    d = Number(mt[3]);
  }
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return "";
  return `${d} ${BULAN[m - 1]} ${y}`;
};
